const GameState             = require('./gamestate');
const GamePlayState         = require('./gameplaystate');
const log4js                = require('log4js');
const logger                = log4js.getLogger('WaitForDrawingState');

class WaitForDrawingState extends GameState
{
    constructor(app)
    {
        super( app );

        this.interval = 0;
        this.reject = null;
        this.resolve = null;
    }

    next()
    {
        const self = this;

        return new Promise(function (resolve,reject)
        {
            self.resolve = resolve;
            self.reject = reject;

            const timeleft = self.game.beginAt - new Date();

            if( timeleft > 0 )
            {
                logger.debug("Game " + self.game.name + " will be executed in " + timeleft + "ms");

                self.interval = setInterval(self.onCheckGameStart.bind(self), 1000);

                self.app.on('remove',self.onGameRemoved.bind(self));
            }
            else
            {
                logger.warn("Game " + self.game.id + " expired, application terminated.");

                resolve( null );
            }

        });
    }

    onGameRemoved( event )
    {
        logger.warn("Game " + this.game.id + " was removed");

        this.resolve( null );
    }

    onCheckGameStart()
    {
        var timeleft = this.app.game.beginAt - new Date();

        if( timeleft < 0 )
        {
            this.resolve( new GamePlayState( this.app ) );
        }
    }

    release()
    {
        clearInterval(this.interval);

        this.app.removeAllListeners('remove');
    }
}

module.exports = WaitForDrawingState;
