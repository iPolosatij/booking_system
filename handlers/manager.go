package handlers

import (
	"booking-system/models"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

func ManagerHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "manager" {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

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

	start := time.Now()
	end := start.AddDate(0, 0, 7)
	rows, err = models.DB.Query("SELECT DISTINCT date FROM booking_slots WHERE date BETWEEN $1 AND $2 AND is_available = true ORDER BY date", start.Format("2006-01-02"), end.Format("2006-01-02"))
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
		"Users":          users,
		"AvailableDates": dates,
		"Items":          items,
	})
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
