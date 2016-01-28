/*
	Copyright (c) 2015-2016, Loic Blot <loic.blot@unix-experience.fr>
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

var async = require('async')
var express  = require('express')
var app = express()
var bodyParser = require('body-parser')
var elasticsearch = require('elasticsearch');
var elscli = undefined
var http = require('http')
var request = require('request')
var jsdom = require('jsdom')
var striptags = require('striptags')
var swig = require('swig')
var urlparse = require('url')
var fs = require("fs")
var pg = require('pg')
var config = undefined

request = request.defaults({
	jar: true,
	headers: {
		'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:44.0) Gecko/20100101 Firefox/44.0',
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'Accept-Language': 'en-US,en;q=0.5',
		'Referrer': 'https://www.google.fr',
		'Pragma': 'no-cache',
		'Cache-Control': 'no-cache'
	},
	gzip: true
});

// Global regex
var regexHTTPProto = new RegExp(/^https?:.*/);

function getSearchResults(searchString, nPage, callback) {
	async.parallel({
		remote_engine: function (callback) {
			getGoogleSearchResults(searchString, nPage, callback)
		},
		exact: function (callback) {
			getELSExactResults(searchString, callback)
		}
	},
	function (err, results) {
		callback(results)
	})
}

function getELSExactResults(searchString, callback) {
	elscli.search({
		index: 'mysearch',
		type: 'interesting_url',
		method: 'POST',
		body: { query: {
			filtered: { filter: {
				term: {"research_done_na": searchString}
			}}
		}}
	}).then(function (resp) {
		var results = []
		if (resp.hits !== undefined && resp.hits.hits !== undefined) {
			for (var i = 0; i < resp.hits.hits.length; i++) {
				if (resp.hits.hits[i]._source === undefined) {
					continue
				}

				results.push({
					url : resp.hits.hits[i]._source.url,
					content: resp.hits.hits[i]._source.content,
					title: resp.hits.hits[i]._source.title
				})
				console.log(resp.hits.hits[i])
			}
		}
		callback(null, results)
	}, function (err) {
		callback(null, [])
	})
}

function getGoogleSearchResults(searchString, nPage, callback) {
	gStart = nPage * 10 - 10
	request("https://www.google.fr/search?q="+searchString+"&ie=utf-8&oe=utf-8&start="+gStart, function(error, response, body) {
		if (error !== null) {
			console.log("Invalid request sent for getGoogleSearchResults: " + error)
			callback(null, [])
			return
		}

		jsdom.env(body, ["jquery-2.2.0.min.js"], function (error, window) {
			if (error !== null) {
				console.log("Invalid dom to parse for getGoogleSearchResults")
				callback(null, [])
				return
			}

			var results = []
			var idx = 0
			var $ = window.$
			$('.g').each(function () {
				var o = $(this).find('.r a')
				if (o.attr("href") !== undefined) {
					var rlink = urlparse.parse(o.attr("href"), true).href
					if (rlink !== undefined && rlink.match(regexHTTPProto)) {
						if (results[idx] === undefined) {
							results[idx] = {}
						}

						results[idx]["title"] = striptags(o.html())
						results[idx]["link"] = (rlink !== undefined ? rlink : o.attr("href"))

						var o = $(this).find('.s .st')
						results[idx]["body"] = striptags(o.html()).replace("&nbsp;"," ")

						idx++
					}
				}
			})

			callback(null, results)
		})
	})
}

function pushToMemory(clientIP, _req) {
	pg.connect(config.pg_url, function(err, client, done) {
		if(err) {
			done()
			console.log("pushToMemory error: " + err)
			return
		}

		var query = client.query("INSERT INTO interesting_link (ip, url, terms, content, title) VALUES ($1, $2, $3, $4, $5) ON CONFLICT ON CONSTRAINT interesting_link_pkey DO NOTHING;",
			[clientIP, _req.url, _req.terms_searched, _req.content, _req.title])
		query.on('end', function() {
			done()
			return
		})
	})
}
function pushToElasticsearch(_req, callback) {
	elscli.search({
		index: 'mysearch',
		type: 'interesting_url',
		method: 'POST',
		body: { query: {
			filtered: { filter: {
				term: {"research_done_na": _req.terms_searched},
				term: {"url": _req.url},
				term: {"content_na": _req.content},
				term: {"title_na": _req.title}
			}}
		}}
	}).then(function (resp) {
		if (resp.hits.hits.length == 0) {
			elscli.index({
				index: 'mysearch',
				type: 'interesting_url',
				body: {
					url: _req.url,
					research_done: _req.terms_searched,
					research_done_na: _req.terms_searched,
					content: _req.content,
					content_na: _req.content,
					title: _req.title,
					title_na: _req.title
				}
			}, function (err, resp) {
				callback({ok: true})
				return
			})
		}
		else {
			callback({ok: true})
			return
		}
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
	if (req.body.s === undefined || req.body.p === undefined || isNaN(req.body.p) || req.body.p < 0
		|| req.body.p > 100) {
		res.status(500).send("Invalid request")
		return
	}
	getSearchResults(req.body.s, req.body.p, function(data) { res.status(200).send(data) })
})
.post('/interest', function (req, res) {
	res.setHeader('Content-Type', 'application/json')
	if (req.body.url === undefined || req.body.terms_searched === undefined ||
		req.body.content === undefined || req.body.title === undefined) {
		res.status(500).send("Invalid request")
		return
	}

	// data pushed to memory should be exactly data pushed to ELS
	pushToMemory(req.headers['x-real-ip'] !== undefined ? req.headers['x-real-ip'] : '127.0.0.1', req.body)
	pushToElasticsearch(req.body,
		function(data) { res.status(200).send(data) })
})
.get('/cleanup_interest', function (req, res) {
	res.setHeader('Content-Type', 'application/json')
	elscli.indices.delete({index: 'mysearch_interesting'}, function () { res.status(200).send({ok: true })})
})
.use(function (req, res, next) {
	res.setHeader('Content-Type','text/plain')
	res.status(404).send('La page que vous cherchez s\'est perdue dans les méandres du web profond')
})

// Load configuration
var contents = fs.readFileSync("config.js");
config = JSON.parse(contents);
console.log("Configuration loaded")

// Test pgsql connection
var pgclient = new pg.Client(config.pg_url)
pgclient.connect()
console.log("Connection to PostgreSQL database established with success.")
pgclient.end()

// Init ELS connection
elscli = new elasticsearch.Client(config.elasticsearch);
console.log("Elasticsearch client loaded.")

// And now listen
app.listen(8080)

console.log("Searchserver started")
