'use strict';

const mongoose          = require('mongoose');
const JWTBearerStrategy = require('passport-http-jwt-bearer').Strategy;
const User              = mongoose.model('User');
const logger            = require('log4js').getLogger("PassportBearer");


module.exports = new JWTBearerStrategy(
    process.env.JWT_SECRET,
    function(payload, done)
    {
        logger.debug("Authenticating user " + payload.id);

        User.findById(payload.id, function (err, user)
        {
            if (err)
            {
                return done(err);
            }

            if (!user)
            {
                return done(null, false);
            }

            return done(null, user, payload);
        });
    }
);
