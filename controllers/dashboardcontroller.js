const co        = require('co');
const redis     = require("redis"), redisClient = redis.createClient();
const logger    = require('log4js').getLogger('dashboardcontroller');
const User      = require('../models/user');
const Game      = require('../models/game');
const admin = require("firebase-admin");

module.exports =
    {
        index:co.wrap(function* (req, res, next)
        {
            try
            {
                const payload = {title:'Dashboard',totalUsers:0, usersOnline:0,users:[], games:[], totalGames:0,jackpot:0,totalJackpot:0};

                payload.usersOnline = yield redisClient.getAsync("users-online");
                payload.users = yield User.find({lastLoginAt:{$gt:new Date().addSeconds(-60*60)}}).exec();
                payload.totalUsers = yield User.count();
                payload.totalGames = yield Game.count();
                payload.games = yield Game.find({beginAt:{$gt:new Date()}}).exec();

                logger.debug(JSON.stringify(payload));
            
            
             //End Try
                res.render('dashboard',payload);
            
        }
            catch (err)
            {
                next(err);
            }
        }),
    };