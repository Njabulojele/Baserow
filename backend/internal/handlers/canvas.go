package handlers

import (
	"context"
	"encoding/json"
	"fmt"

	"anchor-backend/internal/auth"
	"anchor-backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// maxBoardDataBytes is the API-layer cap the audit flagged as missing.
// Postgres will happily store an enormous JSONB document — this stops it before
// the INSERT/UPDATE runs.
const maxBoardDataBytes = 2 << 20 // 2MB

func ListCanvas(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	rows, err := pool.Query(ctx, `
		SELECT id, title, board_type, is_favorited, created_at, updated_at
		FROM canvas_boards WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY updated_at DESC`, userID)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var boards []map[string]interface{}
	for rows.Next() {
		var id, title, boardType string
		var favorited bool
		var createdAt, updatedAt interface{}
		if err := rows.Scan(&id, &title, &boardType, &favorited, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		boards = append(boards, map[string]interface{}{
			"id": id, "name": title, "title": title, "boardType": boardType,
			"type":        boardType,
			"isFavorited": favorited, "createdAt": createdAt, "updatedAt": updatedAt,
		})
	}
	if boards == nil {
		boards = []map[string]interface{}{}
	}
	return boards, rows.Err()
}

// GetCanvasById previously had no user filter — any user who knew or guessed a board
// id could read its full contents including all board_data.
func GetCanvasById(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "canvas_boards", id, userID, true); err != nil {
		return nil, err
	}
	var title, boardType string
	var boardData []byte
	err := pool.QueryRow(ctx, `
		SELECT title, board_type, board_data FROM canvas_boards
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, id, userID,
	).Scan(&title, &boardType, &boardData)
	if err != nil {
		return nil, db.ErrNotFound
	}
	var parsed interface{}
	_ = json.Unmarshal(boardData, &parsed)
	return map[string]interface{}{
		"id": id, "name": title, "title": title, "boardType": boardType, "type": boardType,
		"boardData": parsed,
	}, nil
}

func CreateCanvas(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	title, _ := input["name"].(string)
	if t, ok := input["title"].(string); ok && t != "" {
		title = t
	}
	boardType, _ := input["type"].(string)
	if bt, ok := input["boardType"].(string); ok && bt != "" {
		boardType = bt
	}
	if title == "" {
		title = "Untitled board"
	}
	if boardType == "" {
		boardType = "brainstorm"
	}

	var newID string
	err := pool.QueryRow(ctx, `
		INSERT INTO canvas_boards (user_id, title, board_type) VALUES ($1, $2, $3) RETURNING id`,
		userID, title, boardType).Scan(&newID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": newID, "name": title, "title": title}, nil
}

// UpdateCanvas previously had no ownership check — any user could overwrite any other
// user's board. It also had no size guard on board_data.
func UpdateCanvas(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "canvas_boards", id, userID, true); err != nil {
		return nil, err
	}

	name, _ := input["name"].(string)
	if t, ok := input["title"].(string); ok && t != "" {
		name = t
	}

	if boardDataRaw, ok := input["boardData"]; ok {
		boardData, err := json.Marshal(boardDataRaw)
		if err != nil {
			return nil, fmt.Errorf("invalid boardData")
		}
		if len(boardData) > maxBoardDataBytes {
			return nil, fmt.Errorf("board data exceeds %d byte limit", maxBoardDataBytes)
		}
		_, err = pool.Exec(ctx, `
			UPDATE canvas_boards SET board_data = $3, title = COALESCE(NULLIF($4,''), title), updated_at = NOW()
			WHERE id = $1 AND user_id = $2`, id, userID, boardData, name)
		if err != nil {
			return nil, err
		}
	} else if name != "" {
		_, err := pool.Exec(ctx, `
			UPDATE canvas_boards SET title = $3, updated_at = NOW()
			WHERE id = $1 AND user_id = $2`, id, userID, name)
		if err != nil {
			return nil, err
		}
	}

	return map[string]interface{}{"id": id, "success": true}, nil
}

func DeleteCanvas(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "canvas_boards", id, userID, true); err != nil {
		return nil, err
	}
	_, err := pool.Exec(ctx, `UPDATE canvas_boards SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": id, "success": true}, nil
}

// DuplicateCanvas previously read the source board with no ownership check, meaning a
// user could duplicate someone else's private board into their own account.
func DuplicateCanvas(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	sourceID, _ := input["id"].(string)
	if sourceID == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "canvas_boards", sourceID, userID, true); err != nil {
		return nil, err
	}

	var title, boardType string
	var boardData []byte
	err := pool.QueryRow(ctx, `
		SELECT title, board_type, board_data FROM canvas_boards
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, sourceID, userID,
	).Scan(&title, &boardType, &boardData)
	if err != nil {
		return nil, db.ErrNotFound
	}

	var newID string
	err = pool.QueryRow(ctx, `
		INSERT INTO canvas_boards (user_id, title, board_type, board_data)
		VALUES ($1, $2, $3, $4) RETURNING id`,
		userID, title+" (copy)", boardType, boardData).Scan(&newID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": newID, "name": title + " (copy)"}, nil
}

func ToggleCanvasFavorite(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "canvas_boards", id, userID, true); err != nil {
		return nil, err
	}
	var favorited bool
	err := pool.QueryRow(ctx, `
		UPDATE canvas_boards SET is_favorited = NOT is_favorited, updated_at = NOW()
		WHERE id = $1 AND user_id = $2 RETURNING is_favorited`, id, userID).Scan(&favorited)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": id, "isFavorited": favorited}, nil
}
