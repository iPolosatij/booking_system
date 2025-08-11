package handlers

import (
	"booking-system/models"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/sessions"
	"golang.org/x/crypto/bcrypt"
)

func IndexHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	if _, ok := session.Values["user_id"]; ok {
		http.Redirect(w, r, "/user", http.StatusSeeOther)
		return
	}
	models.Tmpl.ExecuteTemplate(w, "index.html", nil)
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		log.Println("DEBUG: Attempting to render login.html") // Добавьте это
		err := models.Tmpl.ExecuteTemplate(w, "login.html", nil)
		if err != nil {
			log.Printf("DEBUG: Template error: %v", err) // Логируем ошибку рендеринга
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}

	login := r.FormValue("login")
	password := r.FormValue("password")

	var user models.User
	err := models.DB.QueryRow("SELECT id, password, role FROM users WHERE login = $1", login).
		Scan(&user.ID, &user.Password, &user.Role)
	if err != nil {
		models.Tmpl.ExecuteTemplate(w, "login.html", map[string]string{"Error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		models.Tmpl.ExecuteTemplate(w, "login.html", map[string]string{"Error": "Invalid credentials"})
		return
	}

	session, _ := models.Store.New(r, "session")
	session.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	}

	session.Values["user_id"] = user.ID.String()
	session.Values["role"] = user.Role

	if err := session.Save(r, w); err != nil {
		log.Printf("Failed to save session: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	switch user.Role {
	case "admin":
		http.Redirect(w, r, "/admin", http.StatusSeeOther)
	case "manager":
		http.Redirect(w, r, "/manager", http.StatusSeeOther)
	default:
		http.Redirect(w, r, "/user", http.StatusSeeOther)
	}
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	session.Values["user_id"] = ""
	session.Values["role"] = ""
	session.Save(r, w)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

func ApiLoginHandler(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var user models.User
	err := models.DB.QueryRow("SELECT id, password, role FROM users WHERE login = $1", creds.Login).
		Scan(&user.ID, &user.Password, &user.Role)
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(creds.Password)); err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	session, _ := models.Store.Get(r, "session")
	session.Values["user_id"] = user.ID.String()
	session.Values["role"] = user.Role
	session.Save(r, w)

	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"role":   user.Role,
	})
}
