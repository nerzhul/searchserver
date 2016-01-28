# SearchServer
SearchServer is a NodeJS/AngularJS web application which can substitute Google by fetching results from it,
cleaning it and showing them to the user in a proper way.

It offer the possibility to register interesting permitting to retrieve them fast if you research them another time.

SearchServer supports OpenSearch then you can add it as a browser search engine.

# Prerequisites
* PostgreSQL 9.5 or greater
* Elasticsearch 1.0 or higher

# How to install
* Install NodeJS & npm

Debian/Ubuntu:
```shell
apt-get install node npm
```

FreeBSD:
```shell
pkg install nodejs npm
```

* Clone the repository in /usr/local/www or /var/www, depending of your OS
* Launch server.js from node.js

```shell
git clone https://github.com/nerzhul/searchserver.git /usr/local/www
cd /usr/local/www
npm install
```

* Configure your postgresql database

Debian/Ubuntu:
```shell
apt-get install postgresql9.5-server
su - postgres
```

FreeBSD
```
pkg install postgresql95-server
su - pgsql
```

Create your user & database
```shell
createdb searchserver
createuser searchuser -P
psql searchserver
```

```SQL
create table interesting_link (
	ip inet NOT NULL,
	url TEXT NOT NULL,
	terms VARCHAR(1024) NOT NULL,
	content TEXT NOT NULL,
	title VARCHAR(256) NOT NULL,
	PRIMARY KEY (ip,url,terms,content,title)
);
grant insert, select on interesting_link to searchuser;
```

# How to use
Configure your database by copying config.js.example and changing the PostgreSQL chain

Launch NodeJS:
```shell
node server.js
```

Connect to the server on http://localhost:8080/

# Resources
# JS
* AngularJS 1.4 (https://angularjs.org/)

## CSS
* Spinkit spinner (http://tobiasahlin.com/spinkit/)

## Fonts
* Roboto (Google's Android) 

