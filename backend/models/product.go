package models

import "time"

// Product represents a product in the store
type Product struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	ImageURL    string    `json:"image_url"`
	Category    string    `json:"category"`
	InStock     bool      `json:"in_stock"`
	Quantity    int       `json:"quantity"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Admin represents an admin user
type Admin struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"` // never expose in JSON
	IsAdmin      bool   `json:"is_admin"`
}

// AuthToken represents a session token
type AuthToken struct {
	ID        int       `json:"id"`
	AdminID   int       `json:"admin_id"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// APIResponse is a generic API response
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// AuditLog represents security audit trail
type AuditLog struct {
	ID        int       `json:"id"`
	Action    string    `json:"action"`
	AdminID   int       `json:"admin_id"`
	Details   string    `json:"details"`
	IPAddress string    `json:"ip_address"`
	CreatedAt time.Time `json:"created_at"`
}

// User represents a registered user (separate from Admin)
type User struct {
	ID           int       `json:"id"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Phone        string    `json:"phone"`
	Provider     string    `json:"provider"` // email, google, facebook, telegram
	ProviderID   string    `json:"provider_id,omitempty"`
	IsVerified   bool      `json:"is_verified"`
	CreatedAt    time.Time `json:"created_at"`
}

// RegisterRequest for email registration
type RegisterRequest struct {
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
	Phone           string `json:"phone"`
}

// UserLoginRequest for email+password login
type UserLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// SocialAuthRequest for Google/Facebook/Telegram
type SocialAuthRequest struct {
	Provider   string `json:"provider"`    // google, facebook, telegram
	ProviderID string `json:"provider_id"` // unique id from provider
	Email      string `json:"email"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Phone      string `json:"phone,omitempty"`
}
