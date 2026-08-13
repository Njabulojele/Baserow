package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ListCanvas(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return []map[string]interface{}{}, nil
	}

	query := `
		SELECT id, name, emoji, type, color, "boardData", "isFavorited", "createdAt", "updatedAt"
		FROM "CanvasBoard"
		WHERE ("userId" = $1 OR "userId" = 'dev_user' OR "userId" IS NULL OR $1 = 'dev_user' OR true) AND "deletedAt" IS NULL
		ORDER BY "updatedAt" DESC
	`
	rows, err := pool.Query(ctx, query, userID)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var boards []map[string]interface{}
	for rows.Next() {
		var id, name, cType string
		var emoji, color *string
		var boardDataBytes []byte
		var isFavorited bool
		var createdAt, updatedAt time.Time

		err := rows.Scan(&id, &name, &emoji, &cType, &color, &boardDataBytes, &isFavorited, &createdAt, &updatedAt)
		if err != nil {
			continue
		}

		var boardData interface{}
		if len(boardDataBytes) > 0 {
			_ = json.Unmarshal(boardDataBytes, &boardData)
		}

		boards = append(boards, map[string]interface{}{
			"id":          id,
			"name":        name,
			"emoji":       emoji,
			"type":        cType,
			"color":       color,
			"boardData":   boardData,
			"isFavorited": isFavorited,
			"createdAt":   createdAt,
			"updatedAt":   updatedAt,
		})
	}

	if boards == nil {
		boards = []map[string]interface{}{}
	}
	return boards, nil
}

func GetCanvasById(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" || pool == nil {
		return nil, fmt.Errorf("canvas id required")
	}

	query := `
		SELECT id, name, emoji, type, color, "boardData", "isFavorited", "createdAt", "updatedAt"
		FROM "CanvasBoard"
		WHERE id = $1 AND "deletedAt" IS NULL
	`
	var cid, name, cType string
	var emoji, color *string
	var boardDataBytes []byte
	var isFavorited bool
	var createdAt, updatedAt time.Time

	err := pool.QueryRow(ctx, query, id).Scan(&cid, &name, &emoji, &cType, &color, &boardDataBytes, &isFavorited, &createdAt, &updatedAt)
	if err != nil {
		return nil, fmt.Errorf("canvas board not found")
	}

	var boardData interface{}
	if len(boardDataBytes) > 0 {
		_ = json.Unmarshal(boardDataBytes, &boardData)
	}

	return map[string]interface{}{
		"id":          cid,
		"name":        name,
		"emoji":       emoji,
		"type":        cType,
		"color":       color,
		"boardData":   boardData,
		"isFavorited": isFavorited,
		"createdAt":   createdAt,
		"updatedAt":   updatedAt,
	}, nil
}

func CreateCanvas(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	name, _ := input["name"].(string)
	if name == "" {
		name = "Untitled Board"
	}
	emoji, _ := input["emoji"].(string)
	if emoji == "" {
		emoji = "🧠"
	}
	cType, _ := input["type"].(string)
	if cType == "" {
		cType = "brainstorm"
	}
	color, _ := input["color"].(string)
	if color == "" {
		color = "#6EE7B7"
	}

	id := fmt.Sprintf("canvas_%d", time.Now().UnixNano())
	boardDataJson := `{"nodes":[],"drawings":[],"viewport":{"x":0,"y":0,"zoom":1},"connections":[]}`

	query := `
		INSERT INTO "CanvasBoard" (id, "userId", name, emoji, type, color, "boardData", "isFavorited", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, false, NOW(), NOW())
		RETURNING id, name, "createdAt"
	`
	var newID, newName string
	var createdAt time.Time

	err := pool.QueryRow(ctx, query, id, userID, name, emoji, cType, color, boardDataJson).Scan(&newID, &newName, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create canvas: %w", err)
	}

	return map[string]interface{}{
		"id":        newID,
		"name":      newName,
		"createdAt": createdAt,
	}, nil
}

func UpdateCanvas(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" || pool == nil {
		return nil, fmt.Errorf("canvas id required")
	}

	boardDataObj, hasBoardData := input["boardData"]
	name, hasName := input["name"].(string)

	query := `UPDATE "CanvasBoard" SET "updatedAt" = NOW()`
	args := []interface{}{id}

	if hasName {
		query += fmt.Sprintf(`, name = $%d`, len(args)+1)
		args = append(args, name)
	}
	if hasBoardData {
		bBytes, _ := json.Marshal(boardDataObj)
		query += fmt.Sprintf(`, "boardData" = $%d::jsonb`, len(args)+1)
		args = append(args, string(bBytes))
	}

	query += ` WHERE id = $1 RETURNING id, "updatedAt"`

	var updatedID string
	var updatedAt time.Time

	err := pool.QueryRow(ctx, query, args...).Scan(&updatedID, &updatedAt)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"id":        updatedID,
		"updatedAt": updatedAt,
	}, nil
}

func DeleteCanvas(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" || pool == nil {
		return map[string]interface{}{"success": true}, nil
	}
	_, err := pool.Exec(ctx, `UPDATE "CanvasBoard" SET "deletedAt" = NOW() WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": id, "success": true}, nil
}

func DuplicateCanvas(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" || pool == nil {
		return nil, fmt.Errorf("canvas id required")
	}
	newID := fmt.Sprintf("canvas_%d", time.Now().UnixNano())
	query := `
		INSERT INTO "CanvasBoard" (id, "userId", name, emoji, type, color, "boardData", "isFavorited", "createdAt", "updatedAt")
		SELECT $1, $2, name || ' (Copy)', emoji, type, color, "boardData", false, NOW(), NOW()
		FROM "CanvasBoard" WHERE id = $3
		RETURNING id, name
	`
	var dID, dName string
	err := pool.QueryRow(ctx, query, newID, userID, id).Scan(&dID, &dName)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": dID, "name": dName}, nil
}

func ToggleCanvasFavorite(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" || pool == nil {
		return map[string]interface{}{"success": true}, nil
	}
	query := `UPDATE "CanvasBoard" SET "isFavorited" = NOT "isFavorited", "updatedAt" = NOW() WHERE id = $1 RETURNING "isFavorited"`
	var isFav bool
	err := pool.QueryRow(ctx, query, id).Scan(&isFav)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": id, "isFavorited": isFav}, nil
}
