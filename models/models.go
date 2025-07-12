package models

import (
	"database/sql"
	"html/template"

	"github.com/google/uuid"
	"github.com/gorilla/sessions"
)

var (
	DB           *sql.DB
	Store        = sessions.NewCookieStore([]byte("super-secret-key"))
	Tmpl         *template.Template
	SlotDuration = 60
	DayStart     = "08:00"
	DayEnd       = "22:00"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	Login     string    `json:"login"`
	Password  string    `json:"-"`
	FullName  string    `json:"full_name"`
	BirthDate string    `json:"birth_date"`
	Gender    string    `json:"gender"`
	Role      string    `json:"role"`
}

type BookingItem struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

type BookingSlot struct {
	ID          uuid.UUID `json:"id"`
	Date        string    `json:"date"`
	StartTime   string    `json:"start_time"`
	EndTime     string    `json:"end_time"`
	ItemID      uuid.UUID `json:"item_id"`
	IsAvailable bool      `json:"is_available"`
}

type Booking struct {
	ID        uuid.UUID   `json:"id"`
	UserID    uuid.UUID   `json:"user_id"`
	SlotID    uuid.UUID   `json:"slot_id"`
	CreatedAt string      `json:"created_at"`
	Slot      BookingSlot `json:"slot"`
	Item      BookingItem `json:"item"`
}

type SystemSettings struct {
	SlotDurationMinutes int    `json:"slot_duration_minutes"`
	DayStartTime        string `json:"day_start_time"`
	DayEndTime          string `json:"day_end_time"`
}
