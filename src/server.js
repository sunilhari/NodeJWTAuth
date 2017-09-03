var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    jwt = require('jwt-simple'),
    cors = require('cors'),
    uuid = require('uuid'),
    bluebird = require('bluebird'),
    config = require('../config/database'), // get db config file
    port = 8080,
    routes = express.Router(),
    cookieParser = require('cookie-parser'),
    messages = require('../config/messages'),
    CONSTANTS = require('../config/constants');
mongoose.Promise = bluebird;
var db = mongoose.createConnection(config.database, function(err) {
    if (err) {
        console.log("Failed to Connect to Database due to the following error", err.name, err.message);
    } else {
        console.log("Successfully connected to DataBase");
    }
});
var User = require('../app/models/user')(db);
// get our request parameter
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
//allow cors header
app.use(cors({
    'allowedHeaders': ['sessionId', 'Content-Type'],
    'exposedHeaders': ['sessionId'],
    'origin': '*',
    'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
    'preflightContinue': false


}));
// log to console
app.use(morgan('dev'));

//using cookie parser
app.use(cookieParser());

// Use the passport package in our application
app.use(passport.initialize());

app.get('/', function(req, res) {
    res
        .json({
            message: messages.SUCCESS.greet
        })
        .status(200)
        .send();;
});
// pass passport for configuration
require('../config/passport')(passport);


// create a new user account (POST http://localhost:8080/api/signup)
routes.post('/signup', function(req, res) {
    if (!req.body.name || !req.body.password) {
        res.json({
            success: false,
            msg: messages.ERRORS.userpass
        });
    } else {
        var newUser = new User({
            name: req.body.name,
            password: req.body.password
        });
        // save the user
        newUser.save(function(err) {
            if (err) {
                return res.json({
                    success: false,
                    msg: messages.ERRORS.exsistName
                });
            }
            res.json({
                success: true,
                msg: messages.SUCCESS.createdUser
            });
        });
    }
});

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
routes.post('/authenticate', (req, res) => {
    User.findOne({
        name: req.body.name
    }, function(err, user) {
        console.log("Err")
        if (err) throw err;
        if (!user) {
            res.send({
                success: false,
                msg: messages.ERRORS.noUser
            });
        } else {
            // check if password matches
            user.comparePassword(req.body.password, function(err, isMatch) {
                if (isMatch && !err) {
                    // if user is found and password is right create a token
                    var token = jwt.encode({ user: user, uuid: uuid.v4() }, config.secret);
                    // return the information including token as JSON
                    res.cookie('authorization', token, {
                            expires: new Date(Date.now() + CONSTANTS.COOKIE_EXPIRE),
                            httpOnly: false
                        })
                        .json({
                            success: true
                        })
                        .status(200).send();
                    /*res.json({
                        success: true,
                        token: 'JWT ' + token
                    });*/
                } else {
                    res.send({
                        success: false,
                        msg: messages.ERRORS.wrongPass
                    });
                }
            });
        }
    });
});
routes.get('/info', (req, res, next) => {
    passport.authenticate('jwt', function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.json({
                message: info.message,
                success: false
            });
        }
        res.json({
            success: true,
            message: user.name + messages.SUCCESS.entryallowed
        });
    })(req, res, next);
});

app.use('/api', routes);

// connect to database
function getToken(headers) {
    if (headers && headers.authorization) {
        var parted = headers.authorization.split(' ');
        if (parted.length === 2) {
            return parted[1];
        } else {
            return null;
        }
    } else {
        return null;
    }
};


// Start the server
module.exports = app.listen(port);