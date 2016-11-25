//include dependencies
var express = require('express');
var serveStatic = require('serve-static');
var bodyParser = require('body-parser')
var mongo = require('mongodb').MongoClient;
var unless = require('express-unless');

//include config file
var config = require('./server.conf');

//create express server
var app = express();
app.use(bodyParser.json());	//to support json bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use(serveStatic(__dirname + '/public'));	//serve files in /public dir

//bind to interface localhost:9000
app.listen(9000, function(){
	console.log("Server running on localhost, port %d.", this.address().port);
});

//TODO replace with express-session
var session=false;

function authenticate(user, pass, res){
	//connect to MongoDB - TODO add auth
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
				session=true;
				res.redirect('/secure/invoices');
			}
			else
				res.redirect('/');
		});
		
	});	
}

//If logged in, continue; else, redirect to index page
var isLoggedIn = function(req, res, next){
	if(session)
		next();
	else
		res.redirect('/');	
}

//add express-unless to isLoggedIn
isLoggedIn.unless = unless;

//apply isLoggedIn to routes
app.use(isLoggedIn.unless({path: /^(?!\/secure).*/}));

//route - index page with login form
app.get('/', function(req, res){
	res.sendFile('./public/index.html', {root: __dirname})
});

app.get('/secure/invoices', function(req, res){
	res.sendFile('./public/invoices.html', {root: __dirname})
});

app.post('/login', function(req, res){
	authenticate(req.body.user, req.body.pass, res);
});

app.post('/secure/query', function(req, res){
	res.status(200).send('query request received...');
});

