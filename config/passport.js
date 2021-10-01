'use strict';

const mongoose = require('mongoose');
const User = mongoose.model('User');

const local = require('./passport/local');
const bearer = require('./passport/bearer');

module.exports = function (passport)
{

    passport.serializeUser((user, cb) => cb(null, user.id));
    passport.deserializeUser((id, cb) => User.findById(id, cb));

    passport.use(local);
    passport.use(bearer);
};
