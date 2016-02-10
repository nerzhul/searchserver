package main

import (
	"net/http"

	"github.com/go-martini/martini"
	"github.com/martini-contrib/gzip"
	"github.com/martini-contrib/render"
)

func search(r render.Render) {
	r.JSON(200, map[string]interface{}{"remote_engine": map[string]interface{}{}, "exact": map[string]interface{}{}})
}

func markInterest(r render.Render) {
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
