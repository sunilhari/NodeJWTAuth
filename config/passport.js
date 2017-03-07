var JwtStrategy = require('passport-jwt').Strategy,
     CONSTANTS = require('./constants');

// load up the user model
var User = require('../app/models/user');
var config = require('../config/database'); // get db config file
var getCookie = function (req) {
    var token = null;
    if (req && req.cookies) {
        token = req.cookies[CONSTANTS.COOKIE_NAME];
    }
    return token;
};
module.exports = function (passport) {
    var opts = {};
    opts.jwtFromRequest = getCookie;
    opts.secretOrKey = config.secret;
    passport.use(new JwtStrategy(opts, function (jwt_payload, done) {
        User.findOne({
            id: jwt_payload.id,
            name: jwt_payload.name
        }, function (err, user) {
            if (err) {
                return done(err, false);
            }
            if (user) {
                done(null, user);
            } else {
                done(null, false);
            }
        });
    }));
};