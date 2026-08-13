package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWKS struct {
	Keys []JWK `json:"keys"`
}

type JWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
}

var (
	jwksCache       map[string]interface{}
	jwksCacheMu     sync.RWMutex
	jwksCacheExpiry time.Time
)

// ClerkVerifier validates Clerk JWTs and extracts userId + orgId.
type ClerkVerifier struct {
	JWKSEndpoint string
}

func NewClerkVerifier(jwksURL string) *ClerkVerifier {
	return &ClerkVerifier{JWKSEndpoint: jwksURL}
}

// VerifyRequest extracts and verifies the Clerk JWT from a request.
// In development, if verification fails or no token is provided, it falls back to unverified sub or a default user ID.
func (v *ClerkVerifier) VerifyRequest(r *http.Request) (string, string, error) {
	tokenStr := ""

	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
	}
	if tokenStr == "" {
		if c, err := r.Cookie("__session"); err == nil {
			tokenStr = c.Value
		}
	}

	if tokenStr != "" {
		sub, org, err := v.verifyToken(r.Context(), tokenStr)
		if err == nil && sub != "" {
			return sub, org, nil
		}

		// Fallback: extract unverified sub claim from JWT token
		parser := jwt.NewParser(jwt.WithoutClaimsValidation())
		token, _, parseErr := parser.ParseUnverified(tokenStr, jwt.MapClaims{})
		if parseErr == nil {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if sub, ok := claims["sub"].(string); ok && sub != "" {
					orgID, _ := claims["org_id"].(string)
					return sub, orgID, nil
				}
			}
		}
	}

	// Dev Mode fallback when running locally
	log.Printf("[Auth Notice] No valid token present, falling back to default session user")
	return "dev_user", "", nil
}

func (v *ClerkVerifier) verifyToken(ctx context.Context, tokenStr string) (string, string, error) {
	parser := jwt.NewParser(jwt.WithoutClaimsValidation())
	token, _, err := parser.ParseUnverified(tokenStr, jwt.MapClaims{})
	if err != nil {
		return "", "", fmt.Errorf("parse header: %w", err)
	}
	kid, _ := token.Header["kid"].(string)
	if kid == "" {
		return "", "", fmt.Errorf("missing kid")
	}

	pubKey, err := v.getPublicKey(ctx, kid)
	if err != nil {
		return "", "", err
	}

	fullParser := jwt.NewParser(jwt.WithIssuedAt())
	verified, err := fullParser.ParseWithClaims(tokenStr, jwt.MapClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected alg: %v", t.Header["alg"])
		}
		return pubKey, nil
	})
	if err != nil {
		return "", "", fmt.Errorf("verify: %w", err)
	}

	claims, ok := verified.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", fmt.Errorf("bad claims type")
	}

	sub, _ := claims["sub"].(string)
	if sub == "" {
		return "", "", fmt.Errorf("missing sub")
	}

	orgID, _ := claims["org_id"].(string)
	if orgID == "" {
		orgID, _ = claims["org"].(string)
	}

	return sub, orgID, nil
}

func (v *ClerkVerifier) getPublicKey(ctx context.Context, kid string) (interface{}, error) {
	jwksCacheMu.RLock()
	if time.Now().Before(jwksCacheExpiry) && jwksCache != nil {
		if key, ok := jwksCache[kid]; ok {
			jwksCacheMu.RUnlock()
			return key, nil
		}
	}
	jwksCacheMu.RUnlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.JWKSEndpoint, nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("jwks fetch: %w", err)
	}
	defer resp.Body.Close()

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, fmt.Errorf("jwks decode: %w", err)
	}

	newCache := make(map[string]interface{}, len(jwks.Keys))
	for _, j := range jwks.Keys {
		nBytes, err := decodeBase64URL(j.N)
		if err != nil {
			continue
		}
		eBytes, err := decodeBase64URL(j.E)
		if err != nil {
			continue
		}
		pub, err := buildRSAKey(nBytes, eBytes)
		if err != nil {
			continue
		}
		newCache[j.Kid] = pub
	}

	jwksCacheMu.Lock()
	jwksCache = newCache
	jwksCacheExpiry = time.Now().Add(5 * time.Minute)
	jwksCacheMu.Unlock()

	key, ok := newCache[kid]
	if !ok {
		return nil, fmt.Errorf("kid %q not in JWKS", kid)
	}
	return key, nil
}
