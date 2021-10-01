const socketio              = require('socket.io');
const jwtAuth               = require('socketio-jwt-auth');
const geoip                 = require('geoip-lite');
const User                  = require('../../models/user');
const Game                  = require('../../models/game'); // TEMP
const Ticket                = require('../../models/ticket'); // TEMP
const log4js                = require('log4js');
const Lottery               = require('../../models/lottery');
const logger                = log4js.getLogger('lobby');
const GameApp               = require('../game/gameapp');
const co                    = require('co');
const redis                 = require("redis"), sub = redis.createClient();

class LobbyApp
{
    constructor(server,redis,config)
    {
        this.io = socketio(server);
        this.redis = redis;
        this.config = config;
        this.apps = [];
    }


    start()
    {
        logger.info("Starting lobby application");

        const self = this;

        this.io.use(jwtAuth.authenticate({
            secret: process.env.JWT_SECRET
        }, this.onAuthenticate));

        this.io.on('connection', this.onConnection.bind(this));

        sub.on("message", co.wrap(this.onKachingMessage.bind(this)));

        logger.info("Subscribing to kaching channel");

        sub.subscribe("kaching");

        logger.info("Running lotteries");

        co(function* () {

           var games = yield Game.findOpen();

           for(var i = 0; i < games.length; i++)
           {
                self.startGame(games[i]);
           }
        });
    }

    startGame(game)
    {
        logger.info("Starting game: " + game.name + "(" + game.id + ")");

        var app = new GameApp(game,this.io);

        app.start();

        this.apps.push( app );

        return app;
    }

    *onKachingMessage(channel, json)
    {
        logger.info("Received kaching app message:" + json);

        var message = JSON.parse( json );

        if( message.event == 'game-add')
        {
            var game = yield Game.findById( message.game ).exec();

            this.startGame(game);

            this.io.in('lobby').emit('game-add', game.getVO());
        }
        else if( message.event == 'game-remove')
        {
            this.io.in('lobby').emit('game-remove', message.game );
        }
    }

    *getAppByGameId( lotteryId, date )
    {
        logger.debug("Looking for game for lottery " + lotteryId + ", date:" + date);

        for(let i = 0; i < this.apps.length; i++)
        {
            if(this.apps[i].game.lottery.toString() == lotteryId &&
                this.apps[i].game.beginAt.getTime() === date.getTime())
            {
                logger.debug("Found game:" + this.apps[i].game.id);

                return this.apps[i];
            }
        }

        logger.info("Creating new application for lottery:" + lotteryId);

        let lottery = yield Lottery.findById( lotteryId );

        logger.info("Found lottery:" + lottery.name + ", repeat:" + lottery.repeat);

        let game = yield Game.findByLottery( lottery, date ).exec();

        if(game == null)
        {
            logger.info("Game not found, creating one...");

            game = new Game();
            game.applyLottery( lottery, date );

            yield game.save();

            logger.info("Created game:" + game.id);
        }
        else
        {
            logger.info("Game found, id:" + game.id);
        }

        return this.startGame( game );
    }

    onConnection(socket)
    {
        const user = socket.request.user;

        const self = this;

        logger.info("User " + user.displayName + " connected");

        socket.join('lobby');

        this.redis.incr('users-online', function(err, reply)
        {
            logger.debug("Users online:" + reply);

            self.io.in('lobby').emit('lobby-update', {online:reply});
        });

        socket.on('disconnect', co.wrap(function* ( room )
        {
            self.redis.decr('users-online', function(err, reply)
            {
                logger.debug("Users online:" + reply);

                self.io.in('lobby').emit('lobby-update', {online:reply});
            });
        }));

        socket.on('join', co.wrap(function* (message)
        {
            let date = message.date;

            logger.debug("User " + socket.request.user.displayName + " requested join to lottery " + message.lotteryId + " for date " + date);

            logger.debug("Date type " + ( message.date instanceof Date) );

            if( !( date instanceof Date) )
            {
                date = new Date(Date.parse(message.date));
            }

            let app = yield co.wrap(self.getAppByGameId.bind(self))(message.lotteryId, date);

            if( app )
                app.join( socket );
            else
                logger.warn("Game for lottery " + message.lotteryId + " does not started, date:" + date);
        }));

    }
    

    onAuthenticate(payload,done)
    {
        logger.info("authenticating socket.io, payload:" + JSON.stringify(payload));

        if( payload.app != process.env.APP_ID )
        {
            return done(null,false,'invalid app id');
        }

        User.findById(payload.id, function(err, user)
        {
            if (err)
            {
                logger.error(err);

                return done(err);
            }

            if (!user)
            {
                logger.info("user not found");

                return done(null, false, 'user not exist');
            }

            return done(null, user);
        });
    }
}


module.exports = LobbyApp;