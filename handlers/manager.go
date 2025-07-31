package handlers

import (
	"booking-system/models"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

func ManagerHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "manager" {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	// Get users
	rows, err := models.DB.Query("SELECT id, login, full_name, birth_date, gender FROM users WHERE role = 'user'")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		rows.Scan(&u.ID, &u.Login, &u.FullName, &u.BirthDate, &u.Gender)
		users = append(users, u)
	}

	// Get booking items
	rows, err = models.DB.Query("SELECT id, name FROM booking_items")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []models.BookingItem
	for rows.Next() {
		var i models.BookingItem
		rows.Scan(&i.ID, &i.Name)
		items = append(items, i)
	}

	models.Tmpl.ExecuteTemplate(w, "manager.html", map[string]interface{}{
		"Users": users,
		"Items": items,
	})
}

func ApiGetItemSlotsHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	itemID := vars["id"]

	rows, err := models.DB.Query("SELECT id, item_id, date, start_time, end_time, is_available FROM booking_slots WHERE item_id = $1 ORDER BY date, start_time", itemID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var slots []models.BookingSlot
	for rows.Next() {
		var s models.BookingSlot
		rows.Scan(&s.ID, &s.ItemID, &s.Date, &s.StartTime, &s.EndTime, &s.IsAvailable)
		slots = append(slots, s)
	}

	json.NewEncoder(w).Encode(slots)
}

func ApiUpdateItemSlotsHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	itemID := vars["id"]

	var slots []models.BookingSlot
	if err := json.NewDecoder(r.Body).Decode(&slots); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Start transaction
	tx, err := models.DB.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete old slots
	_, err = tx.Exec("DELETE FROM booking_slots WHERE item_id = $1", itemID)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Insert new slots
	for _, slot := range slots {
		_, err = tx.Exec("INSERT INTO booking_slots (item_id, date, start_time, end_time, is_available) VALUES ($1, $2, $3, $4, $5)",
			itemID, slot.Date, slot.StartTime, slot.EndTime, slot.IsAvailable)
		if err != nil {
			tx.Rollback()
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func ApiCreateSlotHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var slot models.BookingSlot
	if err := json.NewDecoder(r.Body).Decode(&slot); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := models.DB.QueryRow(
		"INSERT INTO booking_slots (item_id, date, start_time, end_time, is_available) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		slot.ItemID, slot.Date, slot.StartTime, slot.EndTime, slot.IsAvailable,
	).Scan(&slot.ID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(slot)
}

func ApiDeleteSlotHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	slotID := vars["id"]

	_, err := models.DB.Exec("DELETE FROM booking_slots WHERE id = $1", slotID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func ApiBlockSlotHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	slotID := vars["id"]

	_, err := models.DB.Exec("UPDATE booking_slots SET is_available = false WHERE id = $1", slotID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func ApiToggleDateAvailabilityHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	date := vars["date"]

	var req struct {
		Action string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	isAvailable := req.Action == "enable"
	_, err := models.DB.Exec("UPDATE booking_slots SET is_available = $1 WHERE date = $2", isAvailable, date)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
