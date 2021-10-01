const logger    = require('log4js').getLogger('StateMachine');
const co        = require('co');

class StateMachine
{
    constructor(name,terminateState = null)
    {
        this.name = name;
        this.terminateState = terminateState;
    }

    start(state)
    {
        const self = this;

        return co(function* ()
        {
            logger.debug("State machine " + self.name + " started");

            do
            {
                logger.debug("Executing state :" + state.constructor.name);

                var current = state;

                try
                {
                    state = yield state.next();
                }
                catch(err)
                {
                    logger.error(err);
                }

                current.release();
            }
            while(state != null)

            if(self.terminateState != null)
            {
                try
                {
                    logger.debug("Executing terminate state");

                    yield self.terminateState.next();
                }
                catch(err)
                {
                    logger.error(err);
                }
            }

            logger.debug("State machine terminated");
        });
    }
}

module.exports = StateMachine;
