package handlers

import (
	"fmt"
	"net/mail"
	"strings"
)

// validateEmail returns an error for anything that isn't at least a plausible email
// address. Empty string is allowed since email is optional on clients and leads.
func validateEmail(email string) error {
	if email == "" {
		return nil
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("invalid email format")
	}
	return nil
}

// validateMaxLen is the cheap guard against unbounded strings landing in the database.
func validateMaxLen(field, value string, max int) error {
	if len(value) > max {
		return fmt.Errorf("%s exceeds maximum length of %d characters", field, max)
	}
	return nil
}

// validateEnum checks a string against a fixed allowed set instead of accepting any
// value the client sends. Every status/priority/type field should go through this.
func validateEnum(field, value string, allowed []string) error {
	for _, a := range allowed {
		if value == a {
			return nil
		}
	}
	return fmt.Errorf("%s must be one of: %s", field, strings.Join(allowed, ", "))
}

var (
	TaskStatuses    = []string{"not_started", "in_progress", "in_review", "done"}
	TaskPriorities  = []string{"low", "medium", "high", "urgent"}
	ProjectStatuses = []string{"active", "paused", "completed", "archived"}
	GoalStatuses    = []string{"on_track", "at_risk", "neglected"}
	LeadStatuses    = []string{"NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"}
)
