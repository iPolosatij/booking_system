package handlers

import (
	"booking-system/models"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

func ApiGetAvailableDatesHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	end := start.AddDate(0, 0, 7)

	rows, err := models.DB.Query(`
		SELECT DISTINCT date 
		FROM booking_slots 
		WHERE date BETWEEN $1 AND $2 AND is_available = true 
		ORDER BY date
	`, start.Format("2006-01-02"), end.Format("2006-01-02"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var dates []string
	for rows.Next() {
		var date string
		rows.Scan(&date)
		dates = append(dates, date)
	}

	json.NewEncoder(w).Encode(dates)
}

func ApiGetAvailableSlotsHandler(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	itemID := r.URL.Query().Get("item_id")

	rows, err := models.DB.Query(`
		SELECT id, date, start_time, end_time, item_id, is_available
		FROM booking_slots
		WHERE date = $1 AND item_id = $2 AND is_available = true
		ORDER BY start_time
	`, date, itemID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var slots []models.BookingSlot
	for rows.Next() {
		var slot models.BookingSlot
		rows.Scan(&slot.ID, &slot.Date, &slot.StartTime, &slot.EndTime, &slot.ItemID, &slot.IsAvailable)
		slots = append(slots, slot)
	}

	json.NewEncoder(w).Encode(slots)
}

func ApiBookSlotHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	userID, ok := session.Values["user_id"].(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	slotID := vars["id"]

	tx, err := models.DB.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var isAvailable bool
	err = tx.QueryRow("SELECT is_available FROM booking_slots WHERE id = $1 FOR UPDATE", slotID).
		Scan(&isAvailable)
	if err != nil {
		http.Error(w, "Slot not found", http.StatusNotFound)
		return
	}

	if !isAvailable {
		http.Error(w, "Slot is not available", http.StatusConflict)
		return
	}

	var bookingCount int
	err = tx.QueryRow("SELECT COUNT(*) FROM bookings WHERE user_id = $1", userID).
		Scan(&bookingCount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if bookingCount >= 3 {
		http.Error(w, "Booking limit reached", http.StatusForbidden)
		return
	}

	_, err = tx.Exec("INSERT INTO bookings (user_id, slot_id) VALUES ($1, $2)", userID, slotID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("UPDATE booking_slots SET is_available = false WHERE id = $1", slotID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func ApiCancelBookingHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	userID, ok := session.Values["user_id"].(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	bookingID := vars["id"]

	tx, err := models.DB.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var slotID string
	err = tx.QueryRow(`
		SELECT slot_id FROM bookings 
		WHERE id = $1 AND user_id = $2
	`, bookingID, userID).Scan(&slotID)
	if err != nil {
		http.Error(w, "Booking not found", http.StatusNotFound)
		return
	}

	_, err = tx.Exec("DELETE FROM bookings WHERE id = $1", bookingID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("UPDATE booking_slots SET is_available = true WHERE id = $1", slotID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func ApiGetUserBookingsHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	userID, ok := session.Values["user_id"].(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := models.DB.Query(`
		SELECT b.id, b.created_at, bs.date, bs.start_time, bs.end_time, bi.name 
		FROM bookings b
		JOIN booking_slots bs ON b.slot_id = bs.id
		JOIN booking_items bi ON bs.item_id = bi.id
		WHERE b.user_id = $1
		ORDER BY bs.date, bs.start_time
	`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var bookings []map[string]interface{}
	for rows.Next() {
		var b struct {
			ID        string
			CreatedAt string
			Date      string
			StartTime string
			EndTime   string
			ItemName  string
		}
		rows.Scan(&b.ID, &b.CreatedAt, &b.Date, &b.StartTime, &b.EndTime, &b.ItemName)
		bookings = append(bookings, map[string]interface{}{
			"id":         b.ID,
			"created_at": b.CreatedAt,
			"date":       b.Date,
			"start_time": b.StartTime,
			"end_time":   b.EndTime,
			"item_name":  b.ItemName,
		})
	}

	json.NewEncoder(w).Encode(bookings)
}
