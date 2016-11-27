//include dependencies
var express = require('express');
var serveStatic = require('serve-static');
var bodyParser = require('body-parser')
var mongo = require('mongodb').MongoClient;
var unless = require('express-unless');
var session = require('express-session');

//include config file
var config = require('./server.conf');

//create express server and register global middleware
var app = express();
app.use(bodyParser.json());	//to support json bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use(serveStatic(__dirname + '/public'));	//serve files in /public dir
//note: session stored in memory only
app.use(session({
	secret: config.sessionSecret,
	resave: true,
	saveUninitialized: true,
}));

//bind to interface localhost:9000
app.listen(9000, function(){
	if(process.env.NODE_ENV === undefined)
		process.env.NODE_ENV = 'development';
	console.log("Server running on localhost, port %d in %s mode.", this.address().port, process.env.NODE_ENV);
});

function authenticate(user, pass, req, res){
	//connect to MongoDB - auth not enabled 
	//also, http interface enabled at http://localhost:28017/
	mongo.connect('mongodb://localhost:27017/users', function(err, db){
		if(err){ 
			console.log('MongoDB connection error...');
			return err;
		}
		db.collection('collection').findOne({username: user, password: pass, isActive: true},function(err, result){
			if(err){
				console.log('Query error...');
				return err;
			}
			if(result !== null){
				//generate new session once logged in
				req.session.regenerate(function(err){
					req.session.authenticated = true;
					res.redirect('/secure/invoices');
				});
			}
			else
				res.redirect('/?user='+user);
		});
		
	});	
}

var queryMongo = function(res, database, collectionName, field, value){
	//connect to MongoDB - auth not enabled 
	//also, http interface enabled at http://localhost:28017/
	mongo.connect('mongodb://localhost:27017/'+database, function(err, db){
		if(err){ 
			console.log('MongoDB connection error...');
			return err;
		}
		//must do this to set key:value pair dynamically
		var query = {}
		query[field] = value;
		//DEBUG
		//console.log(JSON.stringify(query));
		//query db
		db.collection(collectionName).find(query).toArray(function(err, result){
			if(err){
				console.log('Query error...');
				return err;
			}
			//return array of objects matching query
			res.send(result);
		});
	});
}

//If logged in, continue; else, redirect to index page
var isLoggedIn = function(req, res, next){
	if(req.session.authenticated)
		next();
	else
		res.redirect('/');	
}

//add express-unless to isLoggedIn
isLoggedIn.unless = unless;

//apply isLoggedIn to all routes beginning with /secure
app.use(isLoggedIn.unless({path: /^(?!\/secure).*/}));

//routes
app.get('/', function(req, res){
	res.sendFile('./index.html', {root: __dirname})
});

app.get('/about', function(req, res){
	res.sendFile('./about.html', {root: __dirname})
});

app.get('/secure/invoices', function(req, res){
	res.sendFile('./invoices.html', {root: __dirname})
});

app.get('/logout', function(req, res){
	req.session.destroy(function(err){
		res.redirect('/');	
	});
});

app.post('/login', function(req, res){
	authenticate(req.body.user, req.body.pass, req, res);
});

app.post('/secure/query', function(req, res){
	queryMongo(res, 'billing', 'invoices', req.body.field, req.body.value);
});

