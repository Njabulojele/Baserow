package auth

import (
	"context"
	"net/http"
	"os"
)

type contextKey string

const userIDContextKey contextKey = "userID"

// RequireAuth wraps a handler and refuses to serve it without a verified user id.
// The old behaviour fell back to "dev_user" whenever the JWT was missing or invalid,
// which combined with "OR true" in every query meant anyone could read or write
// anyone's data. This version fails closed: no valid Clerk JWT, no request served,
// except in local development where APP_ENV is explicitly "development".
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := VerifyRequest(r)
		if err != nil || userID == "" {
			if os.Getenv("APP_ENV") == "development" {
				// Local-only escape hatch. This id is a normal user id, not a
				// magic string checked for anywhere in SQL, so it behaves exactly
				// like any other user and only ever sees its own rows.
				userID = "dev_user_local_only"
			} else {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
		}
		ctx := context.WithValue(r.Context(), userIDContextKey, userID)
		next(w, r.WithContext(ctx))
	}
}

// UserIDFromContext extracts the verified user id set by RequireAuth. Handlers should
// never read the id from anywhere else (query params, request body, headers), since
// any of those can be spoofed by the client.
func UserIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(userIDContextKey).(string); ok {
		return v
	}
	return ""
}
