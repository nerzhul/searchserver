package main

import (
	"net/http"
	"io/ioutil"
	"encoding/json"

	"github.com/go-martini/martini"
	"github.com/martini-contrib/gzip"
	"github.com/martini-contrib/render"
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

	r.JSON(200, map[string]interface{}{"ok": true})
}

func main() {
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
