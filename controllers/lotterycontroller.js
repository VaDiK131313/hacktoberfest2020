const Lottery = require('../models/lottery');
const LotteryActions = require('../models/lotteryactions');
const User = require('../models/user');
const Notification = require('../models/notification');
const co = require('co');
const Ticket = require('../models/ticket');
const logger = require('log4js').getLogger('lotterycontroller');

module.exports =
    {
        index: co.wrap(function* (req, res, next) {
            try {
                const payload = {title: 'Lotteries', games: [],sold:[]};

                const lotteries = yield Lottery.find({}).limit(1000).sort({beginAt: -1}).exec();

                for(let i = 0; i < lotteries.length; i++)
                {
                    let lottery = lotteries[i];
                    payload.sold[lottery.id] = yield Ticket.count({lottery:lottery.id});
                }

                payload.games = lotteries;

                res.render('game/lotteries', payload);
            }
            catch (err) {
                next(err);
            }
        }),

        save: co.wrap(function* (req, res, next) {
            logger.debug("Saving lottery " + req.body.id);
            
            try {
                var lottery = null;

                if (req.body.id != 0)
                    lottery = yield Lottery.findById(req.body.id);

                if (lottery == null)
                    lottery = new Lottery();
                lottery.cost = req.body.cost;
                //lottery.beginAt = req.body.beginAt;
                lottery.updatedAt = new Date();
                lottery.availableAt = req.body.availableAt;
                lottery.name = req.body.name;
                lottery.jackpotLimit = req.body.jackpotLimit;
                lottery.repeat = "month";//req.body.repeat;
                lottery.winner = "";
                lottery.needSend = true;
                if(lottery.availableAt.getDate() == 31)
                {
                    lottery.lastDay = true;
                }
                else 
                    lottery.lastDay = false;
                yield lottery.save();

                res.json({id: lottery.id});
            }
            catch (err) {
                next(err);
            }
        }),

        remove: co.wrap(function* (req, res, next) {
            try {
                logger.warn("Removing game " + req.params.id);

                var lottery = yield Lottery.findById(req.params.id);

                yield lottery.remove();

                res.json({success: true});
            }
            catch (err) {
                next(err);
            }
        }),

        removeTicket: co.wrap(function* (req, res, next) {
            try {
                var ticket = yield Ticket.findById(req.params.id);

                yield ticket.remove();

                var game = yield Game.findById(ticket.game);

                game.sold--;
                game.jackpot -= game.cost;

                pub.publish(game.id, JSON.stringify({event: 'ticket-remove', id: ticket.id}));

                yield game.save();

                res.json({success: true});
            }
            catch (err) {
                next(err);
            }
        }),

        getLotteryInfo: co.wrap(function* (req, res, next) {
            try {
                var response = {};
                response.success = true;
                var actions = yield LotteryActions.find({active:true}).exec(function(err,actions){
                    for(var i=0;i < actions.length; i++ ){
                        actions[i] = actions[i].getVO();
                    }
                    return actions;
                });
                if(actions.length > 0){
                    response.actions = actions;
                }
                else {
                    response.actions = [];
                }
                var lottery = yield Lottery.findOne({$or:[{winner:''},{ winner : { $exists: false }}]}).sort({availableAt:1});
                //var lottery = yield Lottery.findById('5a9d3062f93cec05fc18affb');
                if (lottery != null) {
                    var curDate = new Date();
                    response.success = true;
                    response.id = lottery.id;
                    response.endTime = lottery.availableAt.getTime();
                    var needWinner = lottery.availableAt.getTime() - curDate.getTime() < 0;
                    if (needWinner) {
                        if(lottery.repeat != "none"){
                            
                            var availableDate = new Date(lottery.availableAt.toISOString());
                            var availableDay = lottery.availableAt.getDate();
                            var availableMonth = lottery.availableAt.getMonth();
                            var availableYear = 1900 + lottery.availableAt.getYear();
                            
                            if(lottery.lastDay)
                            {
                                var date = new Date(availableYear, availableMonth + 2, 0);
                                var lastDay = date.getDate();
                               availableDate.setDate(lastDay);
                            }
                            availableDate.setMonth(availableMonth + 1); 
                            var diffYear = curDate.getYear() - availableDate.getYear();
                            var diffMonth = curDate.getMonth() - availableDate.getMonth();
                            var diffDay = curDate.getDate() - availableDate.getDate();
                            if(diffYear < 0)
                            {
                                availableDate.setFullYear(curDate.getYear());
                            }
                            if(diffMonth < 0)
                            {
                                availableDate.setMonth(curDate.getMonth() + 1);
                            }
                            else if(diffDay < 0)
                            {
                                availableDate.setMonth(availableDate.getMonth() + 1);
                            }

                            lottery.availableAt = availableDate;
                        }   
                        
                        var tickets = yield Ticket.find({lottery: lottery.id}).populate('owner', 'user_name');
                        response.total_tickets = tickets.length;
                        lottery.winner = "ANYone win!!!!!"
                        if(tickets.length !=  0)
                        {
                            var winner = tickets[Math.floor(Math.random() * tickets.length)];
                            lottery.winner = winner.owner != null ?  winner.owner.user_name : "";
                        }
                       // if (lottery.winner === req.user.user_name) {
                           // req.user.coins += lottery.jackpotLimit;
                           // yield req.user.save();
                       // }
                       //Removing tickets
                        //yield Ticket.remove({lottery:lottery.id});//({lottery:lottery.id,owner:req.user.id});
                        response.tickets = 0;
                       // yield lottery.save();
                    //    lottery.needSend = true;
                    //    yield lottery.save();
                         var notification = yield Notification.findOne({type:'lottery_win'});
                         if(notification!=null)
                         {
                             notification.updatedAt = new Date().toISOString();
                             if(notification.body != null){
                                 if(notification.body.id === lottery.id ){
                                     if(notification.body.availableAt.getTime() <= lottery.availableAt.getTime())
                                     {
                                         if(notification.body.winner != null)
                                         {
                                            var winner = yield User.findOne({user_name: notification.body.winner});
                                            if(winner != null){
                                                var index = notification.receiversNotRead.indexOf(winner.id);
                                                if(index != -1){
                                                    console.log(notification.body.jackpot);
                                                    winner.coins += notification.body.coins;
                                                    yield winner.save();
                                                }

                                            }
                                         }
                                     }
                                 }
                             }
                             notification.body = lottery.getVO();
                             var ids = yield User.find({}).select({_id:1}).exec(function(err,ids){
                                var result = [];
                                for(var i=0;i < ids.length; i++ ){
                                    result.push(ids[i]._id);
                                }
                                return result;
                             });
                             notification.receiversNotRead = ids;
                             yield notification.save();
                         }
                    }
                    else
                    {
                        var tickets = yield Ticket.find({lottery:lottery.id,owner:req.user.id})
                        response.tickets = tickets.length;
                    }

                    response.winner = lottery.winner;
                    response.name = lottery.name;
                    //if(lottery.winner.length > 0){
                        lottery.winner = "";
                        yield lottery.save();
                     //   continue;
                    //}
                    response.coins = lottery.jackpotLimit;
                    response.needNewRequest = response.winner.length > 0;
                }
                else response.success = false;
               
             return  res.json(response);
            
            }
            catch (err) {
                next(err);
            }
        }),
    };