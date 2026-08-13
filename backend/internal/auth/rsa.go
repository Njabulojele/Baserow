package auth

import (
	"crypto/rsa"
	"encoding/base64"
	"fmt"
	"math/big"
)

func decodeBase64URL(s string) ([]byte, error) {
	// Add padding if needed
	switch len(s) % 4 {
	case 2:
		s += "=="
	case 3:
		s += "="
	}
	return base64.URLEncoding.DecodeString(s)
}

func buildRSAKey(nBytes, eBytes []byte) (*rsa.PublicKey, error) {
	n := new(big.Int).SetBytes(nBytes)

	var eInt int
	for _, b := range eBytes {
		eInt = eInt<<8 + int(b)
	}

	if eInt == 0 {
		return nil, fmt.Errorf("invalid exponent (0)")
	}

	return &rsa.PublicKey{N: n, E: eInt}, nil
}
