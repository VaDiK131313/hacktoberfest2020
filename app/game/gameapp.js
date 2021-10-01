const User                  = require('../../models/user');
const Game                  = require('../../models/game');
const Ticket                = require('../../models/ticket');
const log4js                = require('log4js');
const logger                = log4js.getLogger('game');
const WaitForDrawingState   = require('./states/waitfordrawingstate');
const StateMachine          = require('../core/statemachine');
const co                    = require('co');
const EventEmitter          = require('events');
const redis                 = require("redis");

class GameApp
{
    constructor(game,io)
    {
        this.game = game;
        this.io = io;
        this.events = new EventEmitter();
        this.sub = redis.createClient()
    }

    start()
    {
        logger.info("Starting game application");

        const self = this;

        var stateMachine = new StateMachine("Game:" + this.game.id);

        stateMachine.start(new WaitForDrawingState(this)).then(function ()
        {
            self.release();
        });


        this.sub.on("message", co.wrap(this.onGameMessage.bind(this)));

        logger.info("Subscribing to game channel " + this.game.id);

        this.sub.subscribe(this.game.id.toString());

    }

    *onGameMessage(channel, json)
    {
        var message = JSON.parse( json );

        logger.debug("Received game message:" + json + " from channel " + channel);

        if( message.event == "update" )
        {
            logger.debug("Updating game " + this.game.id);

            this.game = yield Game.findById( this.game.id ).exec();

            logger.debug("Informing connected peers about game changes");

            this.io.in(this.game.id).emit('game-update', this.game.getVO() );
        }
        else if( message.event == "remove" )
        {
            this.events.emit('remove');
        }
    }

    join(socket)
    {
        logger.info("User " + socket.request.user.displayName + " joined to game " + this.game.id);

        socket.join(this.game.id);

        const self = this;

        socket.once('disconnect', function ()
        {
            logger.info("User " + socket.request.user.displayName + " disconnected from game " + self.game.id);

            socket.leave(self.game.id);
        });

        co(function*()
        {
            let tickets = yield Ticket.find({game:self.game, owner:socket.request.user});

            socket.emit('joined', {tickets:tickets, game:self.game.getVO()});
        });


        this.events.emit('join', socket);
    }

    on(eventName, handler)
    {
        this.events.on(eventName,handler);
    }

    once(eventName, handler)
    {
        this.events.once(eventName,handler);
    }

    removeAllListeners(eventName)
    {
        this.events.removeAllListeners(eventName);
    }

    off(eventName, handler)
    {
        this.events.off(eventName,handler);
    }

    release()
    {

    }

}


module.exports = GameApp;