const Game      = require('../models/game');
const co        = require('co');
const Ticket    = require('../models/ticket');
const redis     = require("redis"), pub = redis.createClient();
const logger    = require('log4js').getLogger('gamescontroller');

module.exports =
    {
        index:co.wrap(function* (req, res, next)
        {
            try
            {
                const payload = {title:'Games'};

                payload.game = yield Game.findOne({}).sort({ beginAt: -1 }).exec();
                if(payload.game == null)
                {
                    var game = new Game();
                    game.name = "Basic Settings";
                    game.rewardsPlinko = [100,250,500,50,1000,50,500,250,100];
                    yield game.save();
                    payload.game = game;
                }
                res.render('game/index', payload);
            }
            catch (err)
            {
                next(err);
            }
        }),

        tickets:co.wrap(function* (req, res, next)
        {
            try
            {
                const game = yield Game.findById(req.params.id);
                const payload = {title:game.name + ' tickets',tickets:[], game:game};

                payload.tickets = yield Ticket.find({game:req.params.id}).populate('owner displayName').sort({ createdAt: -1 }).exec();

                res.render('game/tickets', payload);
            }
            catch (err)
            {
                next(err);
            }
        }),

        getTickets:co.wrap(function* (req, res, next)
        {
            logger.debug("User " + req.user.id + " requested tickets from game " + req.params.id);

            try
            {
                var message = {success:true,tickets:[]};

                message.tickets = yield Ticket.find({game:req.params.id, owner:req.user.id}).sort({ createdAt: -1 }).exec();

                logger.debug("Found " + message.tickets.length + " tickets");

                res.json(message);
            }
            catch (err)
            {
                next(err);
            }
        }),

        save:co.wrap(function* (req,res,next)
        {
            logger.debug("Saving game " + req.body.id);
            try
            {
                var game = null;

                if(req.body.id != 0)
                    game = yield Game.findById( req.body.id );
                if(game == null)
                {
                    game = new Game();
                }

                game.costPlinko = req.body.cost_plinko;
                game.rewardsPlinko = req.body['rewards_plinko[]'];
                game.minRewardPlinko = req.body.min_reward_plinko;
                game.rewardQuestion = req.body.reward_question;
                game.updatedAt = new Date();
                game.regRewardCoins = req.body.reg_coins;
                game.regRewardTokens = req.body.reg_tokens;
                game.regRewardTickets = req.body.reg_tickets;
                game.questionLimit = req.body.questions_limit;
                game.questionLimitText = req.body.questions_limit_text;
                game.questionCorrectLimit = req.body.questions_correct_limit;
                game.questionCorrectLimitText = req.body.questions_correct_limit_text;
                if( req.body.id != 0 )
                    pub.publish(game.id, JSON.stringify({event:'update'}));
                else
                    pub.publish('kaching',JSON.stringify({event:'game-add',game:game.id} ));
                yield game.save();
                res.send({id:game.id});
            }
            catch (err)
            {
                next(err);
            }
        }),

        remove:co.wrap(function* (req,res,next)
        {
            try
            {

                logger.warn("Removing game " + req.params.id);

                var tickets = yield Ticket.find({game:req.params.id}).exec();

                for(var i = 0; i < tickets.length; i++)
                {
                    logger.warn("Removing ticket " + tickets[i].numbers + " for game " + req.params.id);

                    yield tickets[i].remove();
                }

                var game = yield Game.findById(req.params.id);


                yield game.remove();

                pub.publish(game.id,JSON.stringify({event:'remove'}));

                pub.publish('kaching',JSON.stringify({event:'game-remove',game:game.id} ));

                res.json({success:true});
            }
            catch (err)
            {
                next(err);
            }
        }),

        removeTicket:co.wrap(function* (req,res,next)
        {
            try
            {
                var ticket = yield Ticket.findById(req.params.id);

                yield ticket.remove();

                var game = yield Game.findById(ticket.game);

                game.sold--;
                game.jackpot -= game.cost;

                pub.publish( game.id,JSON.stringify({event:'ticket-remove', id:ticket.id}) );

                yield game.save();

                res.json({success:true});
            }
            catch (err)
            {
                next(err);
            }
        }),
        getGameSettings:co.wrap(function* (req, res, next)
        {
            try
            {
                const payload = {success:true};

                payload.game = yield Game.findOne({}).sort({ beginAt: -1 }).exec();
                if(payload.game == null)
                {
                    var game = new Game();
                    game.name = "Basic Settings";
                    game.rewardsPlinko = [100,250,500,50,1000,50,500,250,100];
                    yield game.save();
                    payload.game = game;
                }
                payload.game = payload.game.getVO();
                res.json(payload);
            }
            catch (err)
            {
                next(err);
            }
        }),
    };