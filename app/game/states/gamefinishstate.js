const GameState             = require('./gamestate');
const log4js                = require('log4js');
const logger                = log4js.getLogger('GameFinishState');
const Promise               = require('promise');
const co                    = require('co');

class GameFinishState extends GameState
{
    constructor(app, ticket)
    {
        super( app );

        this.ticket = ticket;
    }

    next()
    {
        const self = this;

        return co(function* ()
        {
            logger.info("Finishing lottery result");

            // update, sent messages

            self.room.emit('game-finish', self.ticket.getVO());

            return Promise.resolve( null );
        });
    }


    release()
    {
    }
}

module.exports = GameFinishState;
