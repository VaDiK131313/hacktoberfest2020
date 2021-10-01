const GameState             = require('./gamestate');
const GameFinishState       = require('./gamefinishstate');
const log4js                = require('log4js');
const logger                = log4js.getLogger('GamePlayState');
const Ticket                = require('../../../models/ticket');
const Promise               = require('promise');
const co                    = require('co');

class GamePlayState extends GameState
{
    constructor(app)
    {
        super( app );
    }

    next()
    {
        const self = this;

        return co(function* ()
        {
            logger.info("Starting lottery drawing");

            var tickets = yield Ticket.find({game:self.game.id}).exec();

            logger.info("Total tickets:" + tickets.length);

            if( tickets.length == 0 )
            {
                logger.warn("Lottery does not sold any tickets")

                return Promise.resolve( null );
            }

            var ticketIndex = yield self.getRng(0, tickets.length);

            logger.info("Winning ticket index is:" + ticketIndex);

            var ticket = tickets[ticketIndex];

            logger.info("Winning ticket is:" + ticket.numbers);

            self.room.emit('game-start', self.game.getVO());

            return new Promise(function(resolve,reject)
            {
                // Open numbers ...

                setTimeout(function ()
                {
                    resolve(new GameFinishState(self.app, ticket) );

                },5000);
            });
        });
    }

    //TODO: Need to add random.org implementation
    getRng(min, max)
    {
        var rng = function(from, to)
        {
            from = Math.ceil(from);
            to = Math.floor(to);

            return Math.floor(Math.random() * (to - from)) + from;
        };

        return new Promise(function(resolve,reject)
        {
            resolve( rng(min,max) );
        });
    }

    release()
    {
    }
}

module.exports = GamePlayState;
