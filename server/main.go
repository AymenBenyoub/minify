package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

const charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

type shortenRequest struct {
	LongURL string `json:"long_url"`
}

func dbInit() (*sql.DB, error) {
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		dbUrl = "postgres://postgres:password@localhost:5432/postgres?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbUrl)

	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}
func redisInit() (*redis.Client, context.Context, error) {
	ctx := context.Background()
	redisUrl := os.Getenv("REDIS_URL")
	log.Println("redis url is", redisUrl)
	if redisUrl == "" {
		redisUrl = "redis://localhost:6379"
	}
	opt, err := redis.ParseURL(redisUrl)
	if err != nil {
		return nil, nil, err
	}
	client := redis.NewClient(opt)

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, nil, err
	}

	return client, ctx, nil
}
func main() {
	db, err := dbInit()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("DB connected")

	redisClient, ctx, err := redisInit()
	if err != nil {
		log.Fatalf("Failed to connect to redis: %v", err)
	}
	log.Println("redis connected")
	router := http.NewServeMux()
	router.HandleFunc("GET /{short}", func(w http.ResponseWriter, r *http.Request) {
		short := r.PathValue("short")

		val, err := redisClient.Get(ctx, short).Result()

		if err == redis.Nil {
			var longURL string

			log.Println("url not found in cache")
			err := db.QueryRow("SELECT long_url FROM urls WHERE short_url = $1", short).Scan(&longURL)
			if err != nil {
				http.Error(w, "URL not found", http.StatusNotFound)
				return
			}
			http.Redirect(w, r, ensureScheme(longURL), http.StatusPermanentRedirect)
			_, err = db.Exec("UPDATE urls SET click_count = click_count +1 WHERE short_url =$1", short)
			if err != nil {
				log.Printf("Failed to update click count for %s: %v", short, err)
			}
			return
		} else if err != nil {

			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		} else {
			http.Redirect(w, r, ensureScheme(val), http.StatusPermanentRedirect)
			log.Println("url found in cache")
			_, err = db.Exec("UPDATE urls SET click_count = click_count +1 WHERE short_url =$1", short)
			if err != nil {
				log.Printf("Failed to update click count for %s: %v", short, err)
			}

			return
		}

	})
	router.HandleFunc("POST /shorten", func(w http.ResponseWriter, r *http.Request) {

		var req shortenRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		short_code, err := shorten(req.LongURL, db)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		err = redisClient.Set(ctx, short_code, req.LongURL, time.Hour).Err()
		if err != nil {
			log.Printf("Redis set failed: %v", err)
		} else {
			log.Println("redis set ouccered")
		}
		short_url := fmt.Sprintf("%s/%s", os.Getenv("MINI_LINK_DOMAIN"), short_code)

		json.NewEncoder(w).Encode(map[string]string{"short_url": short_url})
		return
	})

	router.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
	})

	server := &http.Server{
		Addr:         ":8080",
		Handler:      corsMiddleware(log_middleware(router)),
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Println("Server running on port 8080")
		log.Fatal(server.ListenAndServe())
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	log.Println("Shutting down server...")

	// context to give current requests time to finish
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited cleanly")
}

func shorten(long string, db *sql.DB) (string, error) {

	var id int

	err := db.QueryRow("INSERT INTO urls (long_url) VALUES($1) RETURNING id", long).Scan(&id)
	if err != nil {
		return "", err
	}

	short := base62Encode(id)
	_, err = db.Exec("UPDATE urls SET short_url =$1 WHERE id = $2", short, id)
	if err != nil {
		return "", err
	}

	return short, nil
}

func base62Encode(n int) string {
	if n == 0 {
		return string(charset[0])
	}

	var result []byte
	for n > 0 {
		r := n % 62
		result = append([]byte{charset[r]}, result...)
		n = n / 62
	}
	return string(result)
}
func ensureScheme(url string) string {
	if strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://") {
		return url
	}
	return "https://" + url
}
func log_middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		now := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s %v", r.Method, r.URL.Path, r.RemoteAddr, time.Since(now))
	})
}
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Access-Control-Allow-Origin", "https://minify-iota.vercel.app")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
