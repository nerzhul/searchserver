/*
        Copyright (c) 2015, Loic Blot <loic.blot@unix-experience.fr> 
        All rights reserved.
        Redistribution and use in source and binary forms, with or without
        modification, are permitted provided that the following conditions are met:

        * Redistributions of source code must retain the above copyright
          notice, this list of conditions and the following disclaimer.
        * Redistributions in binary form must reproduce the above copyright
          notice, this list of conditions and the following disclaimer in the
          documentation and/or other materials provided with the distribution.

        THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS'' AND ANY
        EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
        WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
        DISCLAIMED. IN NO EVENT SHALL THE REGENTS AND CONTRIBUTORS BE LIABLE FOR ANY
        DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
        (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
        LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
        ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
        (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
        SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var express  = require('express')
var app = express()
var bodyParser = require('body-parser')
var http = require('http')
var request = require('request')
var jsdom = require('jsdom')
var striptags = require('striptags')
var swig = require('swig')
var urlparse = require('url')

function getGoogleSearchResults(searchString, callback) {
	request("https://www.google.fr/search?q="+searchString+"&ie=utf-8&oe=utf-8", function(error, response, body) {
		if (error !== null) {
			console.log("Invalid request sent for getGoogleSearchResults: " + error)
			callback([])
			return
		}

		jsdom.env(body, ['http://code.jquery.com/jquery-1.5.min.js'], function (error, window) {
			if (error !== null) {
				console.log("Invalid dom to parse for getGoogleSearchResults")
				callback([])
				return
			}

			var results = []
			window.$('.g .r a').each(function (i, obj) {
				if (results[i] === undefined) {
					results[i] = {}
				}
				var o = window.$(obj)
				results[i]["title"] = striptags(o.html())
				
				var rlink = urlparse.parse(o.attr("href"), true).query.q
				results[i]["link"] = (rlink !== undefined ? rlink : o.attr("href"))
			})
			// @TODO merge this .g selector with upper
			window.$('.g .s .st').each(function (i, obj) {
				if (results[i] === undefined) {
					results[i] = {}
				}

				var o = window.$(obj)
				results[i]["body"] = striptags(o.html())
			})

			callback(results)
		})
	})
}

function initTemplateRendering() {
	app.engine('html', swig.renderFile);
	app.set('view engine', 'html');
	app.set('views', __dirname + '/views');
}

// MAIN
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json())
app.use(bodyParser.json({ type: 'application/vnd.api+json' }))

app.get('/', function (req, res) {
	res.sendfile('./public/index.html');
})
.get('/search.xml', function (req, res) {
	initTemplateRendering()

	res.setHeader('Content-Type', 'application/opensearchdescription+xml')
	res.render('opensearch', {
		servername: 'search.unix-experience.fr',
		serverproto: 'http'
	})
		
})
.post('/search', function (req, res) {
	res.setHeader('Content-Type', 'application/json')
	if (req.body.s === undefined) {
		res.status(500).send("Invalid request")
	}
	getGoogleSearchResults(req.body.s, function(data) { res.status(200).send(data) })
})
.use(function (req, res, next) {
	res.setHeader('Content-Type','text/plain')
	res.status(404).send('La page que vous cherchez s\'est perdue dans les méandres du web profond')
})

app.listen(8080)
