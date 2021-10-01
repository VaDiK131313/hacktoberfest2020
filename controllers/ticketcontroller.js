const Game          = require('../models/game');
const Lottery       = require('../models/lottery');
const User          = require('../models/user');
const co            = require('co');
const Ticket        = require('../models/ticket');
const redis         = require("redis"), pub = redis.createClient();
const logger        = require('log4js').getLogger('ticketcontroller');
const RNGService    = require('../services/rngservice');

module.exports =
{

    buy:co.wrap(function* (req, res, next)
    {
        let message = req.body;
        let user = req.user;

        logger.info("User " + user.displayName + " want to buy ticket for game " + message.game);

        let game = yield Game.findById(message.game).exec();

        if(game.limit && game.limit > 0)
        {
            if(game.limit == game.sold)
            {
                return res.json({success:false, ticketLimit:true});
            }
        }

        if(game.cost > user.balance)
        {
            return res.json({success:false, balance:user.balance});
        }

        let sellStopTime = new Date(game.beginAt.getTime()).addMinutes( -1 );

        if( sellStopTime.getTime() < new Date().getTime() )
        {
            return res.json({success:false, stopSell:true});
        }

        let existingTicket = yield Ticket.findOne({owner:user.id,game:game.id}).exec();

        if( existingTicket == null )
        {
            logger.debug("User " + user.displayName + " firstly buying ticket in lottery " + game.id);

            if( game.players < game.playersLimit || game.playersLimit == 0)
            {
                game.players++;
            }
            else
            {
                return res.json({success:false, playersLimit:true});
            }
        }

        existingTicket = yield Ticket.findOne( {game:game.id, numbers:message.numbers} );

        if( existingTicket != null )
        {
            logger.warn("User trying to buy existing ticket (" + message.numbers + ")");

            const availableTickets = [];

            for(let i = 0; i < 3; i++)
            {
                availableTickets.push(RNGService.generateTicket(game));
            }

            return res.json({success:false, suggest:availableTickets});
        }


        let ticket = new Ticket();

        ticket.game = game;
        ticket.owner = user;
        ticket.numbers = message.numbers;
        ticket.cost = game.cost;

        logger.info("Creating ticket :" + ticket.numbers);

        try
        {
            game.sold++;
            game.proceeds += game.cost;
            game.jackpot += game.cost;

            user.balance -= game.cost;
            user.spent += game.cost;
            user.plays++;

            yield user.save();
            yield ticket.save();
            yield game.save();

            pub.publish( game.id, JSON.stringify({event:'update'}) );

            res.json({success:true, ticket:ticket.getVO(), balance:user.balance});
        }
        catch(err)
        {
            logger.error("Unable to save ticket", err);

            res.json({success:false});
        }
    }), 
    createTickets:co.wrap(function* (req,res,next)
        {
            try
            { var response = {};
           
                response.success =  true; 
                var lottery = yield Lottery.findById(req.params.id);
                if(lottery != null)
                {
                    var userNames = req.body.user_names ;
                    if(userNames != null){
                       // response.success =  false; 
                       var users = yield User.find({user_name:{$in:userNames}});
                       if(users !=null)
                       {
                           //for(var i = 0;i < users.length; i++)
                           //{
                             var rand = Math.floor(Math.random() * (users.length * 6 - users.length * 3)) + users.length * 3;//Math.floor(Math.random() * Math.floor(6));
                                rand++;
                                for(var j = 0; j < rand; j++)
                                {
                                    var ticket  = new Ticket();
                                    ticket.createdAt = new Date().toISOString();
                                    ticket.owner = users[Math.floor(Math.random() * Math.floor(users.length))].id;
                                    ticket.lottery = lottery.id;
                                    yield ticket.save();
                                }

                          // }
                       }
                    }
                    else response.success =  false; 
                    console.log(userNames);
                }

                //console.log(lottery);
                response.lottery = lottery;
                res.json(response);
            }
            catch (err)
            {
                next(err);
            }
        }),
}
