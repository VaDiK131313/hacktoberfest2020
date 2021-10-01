const User      = require('../models/user');
const co        = require('co');
const Notification    = require('../models/notification');
const LotteryActions    = require('../models/lotteryactions');
const redis     = require("redis"), pub = redis.createClient();
const logger    = require('log4js').getLogger('lotteryactionscontroller');

module.exports =
    {
        index:co.wrap(function* (req, res, next)
        {
            try
            {
                const payload = {title:'Lottery actions'};

                payload.lottery_actions = yield LotteryActions.find().exec();
                
                res.render('game/lotteriesactions', payload);
            }
            catch (err)
            {
                next(err);
            }
        }),

        create:co.wrap(function* (req,res,next)
        {
            logger.debug("Creating lottery actions ");
            try
            {
                var action = new LotteryActions();
                action.createdAt = new Date();
                action.title   = req.body.title;
                action.coins   = req.body.coins;
                action.tokens  = req.body.tokens;
                action.tickets = req.body.tickets;
                action.active  = req.body.active;
                yield action.save();
                res.json({success:true})
            }
            catch (err)
            {
                next(err);
            }
        }),
        save:co.wrap(function* (req,res,next)
        {
            logger.debug("Saving a lottery action " + req.params.id);
            try
            {
                var action = null;

                if(req.body.id != 0)
                    action = yield LotteryActions.findById( req.body.id );
                if(action == null)
                {
                    action = new LotteryActions();
                }

                action.createAt = new Date();
                action.title   = req.body.title;
                action.coins   = req.body.coins;
                action.tokens  = req.body.tokens;
                action.tickets = req.body.tickets;
                action.active  = req.body.active;
                
                yield action.save();
                res.send({id:action.id});
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
                logger.warn("Removing lottery action " + req.params.id);
                yield Notification.update(
                    {  
                       actions_ids: req.params.id
                   },
                    {$pull: { actions_ids: req.params.id} }, { multi: true }   
                   );
                

                var action = yield LotteryActions.findById(req.params.id);
                yield action.remove();
                res.json({success:true});
            }
            catch (err)
            {
                next(err);
            }
        }),
        getActiveActions:co.wrap(function* (req,res,next)
        {
            try
            {
                var response = {success:true, actions:[]};
                logger.warn("Get active lottery actions ");
                var actions = yield LotteryActions.find({active:true});
                if(actions.length > 0)
                {
                    response.actions = actions;
                }
                else{
                    response.success = false;
                }
                res.json(response);
            }
            catch (err)
            {
                next(err);
            }
        }),
       
    };