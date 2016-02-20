package main

import (
	"net/http"
	"io/ioutil"
	"log"
	"os"
	"encoding/json"

	"github.com/go-martini/martini"
	"github.com/martini-contrib/gzip"
	"github.com/martini-contrib/render"
	"database/sql"
	_ "github.com/lib/pq"
)

type Config struct {
	pg_url string
}

var (
	Info    *log.Logger = log.New(os.Stdout, "INFO: ", log.Ldate|log.Ltime|log.Lshortfile)
	Warning *log.Logger = log.New(os.Stdout, "WARNING: ", log.Ldate|log.Ltime|log.Lshortfile)
	Error   *log.Logger = log.New(os.Stderr, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile)
	cfg Config
)

type SearchRequest struct {
	Request string `json:"s"`
	Page uint32 `json:"p"`
}

func search(r render.Render, req *http.Request) {
	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		r.JSON(500, map[string]interface{}{})
		return
	}

	var t SearchRequest
	err = json.Unmarshal(body, &t)
	if err != nil {
		r.JSON(500, map[string]interface{}{})
		return
	}

	// Empty requests or nil pages , or page greater than 100 are not allowed
	if len(t.Request) == 0 || t.Page == 0 || t.Page > 100 {
		r.JSON(500, map[string]interface{}{})
		return
	}

	r.JSON(200, map[string]interface{}{"remote_engine": map[string]interface{}{}, "exact": map[string]interface{}{}})
}

type InterestRequest struct {
	Url string `json:"url"`
	Searched_Terms string `json:"terms_searched"`
	Content string `json:"content"`
	Title string `json:"title"`
}

func markInterest(r render.Render, req *http.Request) {
	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		r.JSON(500, map[string]interface{}{})
		return
	}

	var t InterestRequest
	err = json.Unmarshal(body, &t)
	if err != nil {
		r.JSON(500, map[string]interface{}{})
		return
	}

	// Empty requests or nil pages , or page greater than 100 are not allowed
	if len(t.Url) == 0 || len(t.Searched_Terms) == 0 || len(t.Content) == 0 || len(t.Title) == 0 {
		r.JSON(500, map[string]interface{}{})
		return
	}


	var realIp string = "127.0.0.1"
	if len(req.Header["X-Real-IP"]) != 0 {
		realIp = req.Header["X-Real-IP"][0]
	}

	pushToMemory(realIp, t)
	pushToElasticsearch(t)

	r.JSON(200, map[string]interface{}{"ok": true})
}

func pushToMemory(clientIP string, t InterestRequest) bool {
	db, err := sql.Open("postgres", "postgres://ssuser:sspwd@127.0.0.1:5432/searchserver")
	if err != nil {
		Error.Printf("Failed to connect to PostgreSQL database. Error => %s\n", err)
		return false
	}

	_, err = db.Query("INSERT INTO interesting_link (ip, url, terms, content, title) VALUES ($1, $2, $3, $4, $5) " +
		"ON CONFLICT ON CONSTRAINT interesting_link_pkey DO NOTHING;",
		clientIP, t.Url, t.Searched_Terms, t.Content, t.Title)
	if (err != nil) {
		Error.Println("Failed to insert datas to interest memory")
		return false
	}

	return true
}

func pushToElasticsearch(t InterestRequest) {

}

func readConfig() {
	cfg.pg_url = "postgresql://user:password@localhost/searchserver"

	cfgFile, err := ioutil.ReadFile("config.js")
	if err != nil {
		Warning.Println("Unable to read config.js. Config set to defaults.")
		return
	}

	err = json.Unmarshal(cfgFile, &cfg)
	if err != nil {
		Warning.Println("Failed to parse config.js")
		return
	}
}
func main() {
	readConfig()

	m := martini.Classic()
	m.Use(gzip.All())

	m.Use(render.Renderer(render.Options{
		Directory:  "views",
		Extensions: []string{".html"},
	}))

	m.Post("/search", search)

	m.Post("/interest", markInterest)

	m.Get("/cleanup_interest", func(r render.Render) {
		r.JSON(200, map[string]interface{}{"ok": true})
	})

	m.Get("/search.xml", func(r render.Render, res http.ResponseWriter) {
		res.Header().Set("Content-Type", "application/xml")
		r.HTML(200, "opensearchgo", map[string]interface{}{"serverproto": "http", "servername": "search.unix-experience.fr"})
	})

	m.NotFound(func(r render.Render) {
		r.HTML(200, "404", "")
	})
	m.Run()
}
