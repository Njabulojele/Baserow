package handlers

import (
	"context"
	"encoding/json"
	"fmt"

	"anchor/internal/auth"
	"anchor/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// maxBoardDataBytes is the API-layer cap the audit flagged as missing on board_data.
// Postgres will happily store an enormous JSONB document, this is what actually stops
// it before the INSERT/UPDATE runs.
const maxBoardDataBytes = 2 << 20 // 2MB

func ListCanvas(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	rows, err := pool.Query(ctx, `
		SELECT id, title, board_type, is_favorited, created_at, updated_at
		FROM canvas_boards WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
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
			"id": id, "title": title, "boardType": boardType, "isFavorited": favorited,
			"createdAt": createdAt, "updatedAt": updatedAt,
		})
	}
	return boards, rows.Err()
}

// GetCanvasById previously had no user filter, any user who guessed or was handed a
// board id could read its full contents.
func GetCanvasById(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
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
	return map[string]interface{}{"id": id, "title": title, "boardType": boardType, "boardData": parsed}, nil
}

func CreateCanvas(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	title, _ := input["title"].(string)
	boardType, _ := input["boardType"].(string)
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
	return map[string]interface{}{"id": newID}, nil
}

// UpdateCanvas previously had no ownership check, any user could overwrite any other
// user's board content. It also had no size guard on board_data.
func UpdateCanvas(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if err := db.RequireOwner(ctx, pool, "canvas_boards", id, userID, true); err != nil {
		return nil, err
	}

	boardData, err := json.Marshal(input["boardData"])
	if err != nil {
		return nil, fmt.Errorf("invalid boardData")
	}
	if len(boardData) > maxBoardDataBytes {
		return nil, fmt.Errorf("board data exceeds %d byte limit", maxBoardDataBytes)
	}

	_, err = pool.Exec(ctx, `
		UPDATE canvas_boards SET board_data = $3, title = COALESCE(NULLIF($4,''), title), updated_at = NOW()
		WHERE id = $1 AND user_id = $2`, id, userID, boardData, input["title"])
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}

func DeleteCanvas(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if err := db.RequireOwner(ctx, pool, "canvas_boards", id, userID, true); err != nil {
		return nil, err
	}
	_, err := pool.Exec(ctx, `UPDATE canvas_boards SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}

// DuplicateCanvas previously read the source board with no ownership check, meaning a
// user could duplicate someone else's private board into their own account. Now the
// source read is ownership-checked exactly like every other read.
func DuplicateCanvas(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	sourceID, _ := input["id"].(string)
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
	return map[string]interface{}{"id": newID}, nil
}

func ToggleCanvasFavorite(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
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
	return map[string]interface{}{"isFavorited": favorited}, nil
}
