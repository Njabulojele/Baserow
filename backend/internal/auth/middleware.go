package auth

import (
	"context"
	"net/http"
	"os"
)

type contextKey string

// UserIDKey is exported so the tRPC router can inject the id into context directly
// before calling handlers. Handlers always use UserIDFromContext to read it.
const userIDContextKey contextKey = "userID"
const UserIDKey = userIDContextKey

// RequireAuth wraps a handler and refuses to serve it without a verified user id.
// The old behaviour fell back to "dev_user" whenever the JWT was missing or invalid,
// which combined with "OR true" in every query meant anyone could read or write
// anyone's data. This version fails closed: no valid Clerk JWT, no request served,
// except in local development where APP_ENV is explicitly "development".
func (v *ClerkVerifier) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, _, err := v.VerifyRequest(r)
		if err != nil || userID == "" || userID == "dev_user" {
			if os.Getenv("APP_ENV") == "development" {
				// Local-only escape hatch. This is a real user id, not a magic string
				// checked for in SQL, so it only ever sees its own rows.
				if userID == "" || userID == "dev_user" {
					userID = "dev_user_local_only"
				}
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
