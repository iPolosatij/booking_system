package main

import (
	"database/sql"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"

	"booking-system/handlers"
	"booking-system/models"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

func initDB() {
	var err error
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"))

	models.DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	err = models.DB.Ping()
	if err != nil {
		log.Fatal(err)
	}

	handlers.LoadSystemSettings()
}

func main() {
	initDB()
	defer models.DB.Close()

	models.Tmpl = template.Must(template.New("").Funcs(template.FuncMap{
		"sub": func(a, b int) int { return a - b },
	}).ParseGlob("templates/*.html"))

	r := mux.NewRouter()

	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	r.HandleFunc("/", handlers.IndexHandler).Methods("GET")
	r.HandleFunc("/login", handlers.LoginHandler).Methods("GET", "POST")
	r.HandleFunc("/logout", handlers.LogoutHandler).Methods("GET")
	r.HandleFunc("/admin", handlers.AdminHandler).Methods("GET")
	r.HandleFunc("/manager", handlers.ManagerHandler).Methods("GET")
	r.HandleFunc("/user", handlers.UserHandler).Methods("GET")
	r.HandleFunc("/user/create", handlers.UserCreateHandler).Methods("GET")

	r.HandleFunc("/api/login", handlers.ApiLoginHandler).Methods("POST")
	r.HandleFunc("/api/users", handlers.ApiCreateUserHandler).Methods("POST")
	r.HandleFunc("/api/users/{id}", handlers.ApiDeleteUserHandler).Methods("DELETE")
	r.HandleFunc("/api/booking-items", handlers.ApiCreateBookingItemHandler).Methods("POST")
	r.HandleFunc("/api/booking-items/{id}", handlers.ApiDeleteBookingItemHandler).Methods("DELETE")
	r.HandleFunc("/api/booking-slots", handlers.ApiGetAvailableSlotsHandler).Methods("GET")
	r.HandleFunc("/api/booking-slots/{id}/book", handlers.ApiBookSlotHandler).Methods("POST")
	r.HandleFunc("/api/booking-slots/{id}/cancel", handlers.ApiCancelBookingHandler).Methods("POST")
	r.HandleFunc("/api/booking-slots/{id}/block", handlers.ApiBlockSlotHandler).Methods("POST")
	r.HandleFunc("/api/bookings", handlers.ApiGetUserBookingsHandler).Methods("GET")
	r.HandleFunc("/api/available-dates", handlers.ApiGetAvailableDatesHandler).Methods("GET")
	r.HandleFunc("/api/settings", handlers.ApiUpdateSettingsHandler).Methods("POST")
	r.HandleFunc("/api/dates/{date}/availability", handlers.ApiToggleDateAvailabilityHandler).Methods("POST")

	log.Println("Server started on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
