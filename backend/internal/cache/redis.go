package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Cache struct {
	client *redis.Client
}

func NewCache(redisURL string) (*Cache, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		// Fallback to localhost if parse error
		opts = &redis.Options{Addr: "localhost:6379"}
	}

	rdb := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		fmt.Printf("[Cache Warning] Redis ping failed: %v. Running in cache-bypass mode.\n", err)
	}

	return &Cache{client: rdb}, nil
}

func (c *Cache) Get(ctx context.Context, key string, dest interface{}) bool {
	if c.client == nil {
		return false
	}
	val, err := c.client.Get(ctx, key).Result()
	if err != nil {
		return false
	}
	return json.Unmarshal([]byte(val), dest) == nil
}

func (c *Cache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if c.client == nil {
		return nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, key, data, ttl).Err()
}

func (c *Cache) Invalidate(ctx context.Context, pattern string) error {
	if c.client == nil {
		return nil
	}
	keys, err := c.client.Keys(ctx, pattern).Result()
	if err != nil || len(keys) == 0 {
		return nil
	}
	return c.client.Del(ctx, keys...).Err()
}
