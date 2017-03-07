var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    jwt = require('jwt-simple'),
    cors = require('cors'),
    config = require('./config/database'), // get db config file
    User = require('./app/models/user'), // get the mongoose model
    port = process.env.PORT || 8080,
    routes = express.Router(),
    cookieParser = require('cookie-parser'),
    messages = require('./config/messages'),
    CONSTANTS = require('./config/constants');

// get our request parameters
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
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

app.get('/', function (req, res) {
    res.send(messages.SUCCESS.greet);
});
// connect to database
mongoose.connect(config.database);

// pass passport for configuration
require('./config/passport')(passport);


// create a new user account (POST http://localhost:8080/api/signup)
routes.post('/signup', function (req, res) {
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
        newUser.save(function (err) {
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
routes.post('/authenticate', function (req, res) {
    User.findOne({
        name: req.body.name
    }, function (err, user) {
        if (err) throw err;
        if (!user) {
            res.send({
                success: false,
                msg: messages.ERRORS.noUser
            });
        } else {
            // check if password matches
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (isMatch && !err) {
                    // if user is found and password is right create a token
                    var token = jwt.encode(user, config.secret);
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
routes.get('/info', function (req, res, next) {
    passport.authenticate('jwt', function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.json({
                message: info.message,
                success:false
            });
        }
        res.json({
            success: true,
            message: user.name + messages.SUCCESS.entryallowed
        });
    })(req,res,next);
});
getToken = function (headers) {
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
app.use('/pleasedo', routes);
// Start the server
app.listen(port);