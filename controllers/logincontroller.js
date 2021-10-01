const User = require('../models/user');
const jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
const co = require('co');
const logger = require('log4js').getLogger('logincontroller');
const Ticket = require('../models/ticket');
const Game = require('../models/game');
const Lottery = require('../models/lottery');
const Notification = require('../models/notification');
var moment          = require("moment");
const unique          =  require('array-unique');

module.exports =
    {
        login: co.wrap(function* (req, res) {
            res.render('user/login');
        }),
        signup: co.wrap(function* (req, res) {
            res.render('user/signup');
        }),
        logout: co.wrap(function* (req, res) {
            req.logout();

            return res.redirect("/login");
        }),
        logoutApi: co.wrap(function* (req, res, next) {
            
            logger.debug("try to save device token for ");
            try {
                console.log(req.user);
                var deviceToken = req.body.deviceToken;
                if(deviceToken != null && deviceToken.length > 0){
                    var users =   yield User.update(
                        {  $or:[{
                            deviceToken: deviceToken},
                           { deviceTokenSilent: deviceToken,}
                        ]
                           
                       },
                        {$pull: {deviceToken: deviceToken, deviceTokenSilent: deviceToken }}, { multi: true }   
                       ).exec();
                    
                }
                req.logout();
                res.json({success:true});
            }
            catch (err) {
                const errors = Object.keys(err.errors)
                    .map(field => err.errors[field].message);

                    res.json({success:false,errors:errors});
            }
        }),
        register2: co.wrap(function* (req, res, next) {
            const user = new User();
            user.first_name = req.body.first_name;
            user.last_name = req.body.last_name;

            try {
                yield user.save();

                req.logIn(user, err => {
                    if (err) req.flash('info', 'Sorry! We are not able to log you in!');
                    return res.redirect('/admin/dashboard');
                });
            }
            catch (err) {
                const errors = Object.keys(err.errors)
                    .map(field => err.errors[field].message);

                res.render('user/signup', {
                    errors,
                    user
                });
            }
        }),

        loginWithUserNameAndPassword: co.wrap(function* (req, res, next) {
            try {
                var user = yield User.findOne({user_name: req.body.user_name});
                
                if (user != null) {
                    
                    if (user.createdAt == null ){
                        user.createdAt = new Date();
                    }

                    if (user.authenticate(req.body.password)) {
                        var date = new Date();
                        if(user.limitQuestionAt != null){
                            if(date.getTime() >= user.limitQuestionAt.addHours(24).getTime()){
                                user.limitQuestionAt = null;
                                user.countQuestion = 0;
                                user.countCorrectQuestion = 0;  
                            }
                        }
                        var token = jwt.sign({id: user.id}, process.env.JWT_SECRET);
                        
                           
                        var notifications = yield Notification.find({type:{$in:["nologin_week","nologin_3days","nologin_month","register_after_24hours"]}});
                        if(notifications.length > 0)
                        {
                            var start_date = moment(user.lastLoginAt);
                            var end_date = moment(new Date());
                            var duration = moment.duration(end_date.diff(start_date));
                            if(duration.asMonths() >= 1) {
                                var index = notifications.map(function(e) { return e.type; }).indexOf("nologin_month");
                                if(index != -1)
                                {
                                    if(notifications[index].receiversNotRead.indexOf(user.id) == -1)
                                    {
                                            notifications[index].receiversNotRead.push(user.id);
                                            yield notifications[index].save();
                                    }
                                }
                            }
                            else if(duration.asWeeks() >= 1) {
                                var index = notifications.map(function(e) { return e.type; }).indexOf("nologin_week");
                                if(index != -1)
                                {
                                    if(notifications[index].receiversNotRead.indexOf(user.id) == -1)
                                    {
                                            notifications[index].receiversNotRead.push(user.id);
                                            yield notifications[index].save();
                                    }
                                }
                            }
                            else if(duration.asDays() >= 3) {
                                var index = notifications.map(function(e) { return e.type; }).indexOf("nologin_3days");
                                if(index != -1)
                                {
                                    if(notifications[index].receiversNotRead.indexOf(user.id) == -1)
                                    {
                                            notifications[index].receiversNotRead.push(user.id);
                                            yield notifications[index].save();
                                    }
                                }
                            }
                        }
                        var index = notifications.map(function(e) { return e.type; }).indexOf("register_after_24hours");
                            if(index != -1)
                            {
                                if(notifications[index].receiversNotRead.indexOf(user.id) == -1 
                                && notifications[index].receivers.indexOf(user.id) == -1
                            
                            )
                                {
                                    var start_date_created = moment(user.createdAt);
                                    //end_date = moment(new Date());
                                   duration = moment.duration(end_date.diff(start_date_created));
                                   if(duration.asDays() >= 1)
                                    {
                                        notifications[index].receiversNotRead.push(user.id);
                                        notifications[index].receivers.push(user.id);
                                        yield notifications[index].save();
                                    }
                                }
                            }
                        user.lastLoginAt = new Date().toISOString();
                        yield user.save();
                        return res.json({success: true, token: token});
                    }
                    else
                        return res.json({success: false, invalidPassword: true});
                }
                else
                    return res.json({success: false, invalidLogin: true});
            }
            catch (err) {
                logger.error(err);

                res.json({success: false});
            }
        }),

        register: co.wrap(function* (req, res, next) {
            try {
                var game = yield Game.findOne({}).sort({ beginAt: -1 }).exec();
                if(game == null)
                {
                    game = new Game();
                    game.name = "Basic Settings";
                    game.rewardsPlinko = [100,250,500,50,1000,50,500,250,100];
                    yield game.save();
                    
                }
                var user = yield User.findOne({user_name: req.body.user_name});
                if (user != null) {
                    return res.json({success: false, emailAlreadyExists: true})
                }
                user = new User(req.body);
                user.createdAt = new Date();
                user.lastLoginAt = new Date();
                user.tokens += game.regRewardTokens;
                user.coins += game.regRewardCoins;
                yield user.save();
                var token = jwt.sign({id: user.id}, process.env.JWT_SECRET);
                ///api/signup
                if(game.regRewardTickets > 0){
                    var lottery =  yield Lottery.findOne({$or:[{winner:''},{ winner : { $exists: false }}]}).sort({availableAt:1});
                    var tickets = [];
                    for(var i=0; i < game.regRewardTickets;i++){
                        var ticket  = new Ticket();
                        ticket.createdAt = new Date().toISOString();
                        ticket.owner = user.id;
                        ticket.lottery = lottery.id;
                        tickets.push(ticket);
                    }        
                    yield Ticket.create(tickets);  
                }
               
                return res.json({success: true,
                    id: user.id,
                    auth_token: token,
                    reg_coins:game.regRewardCoins,
                    reg_tokens:game.regRewardTokens,
                    reg_tickets:game.regRewardTickets});
               
            }
            catch (err) {
                console.log(err);
                res.json({success: false});
            }
        }),
        saveDeviceToken: co.wrap(function* (req, res, next) {
            
            try {
                console.log(req.body.needSend);
                if(req.body.needSend){
                    logger.debug("try to save device token" + req.body.deviceToken + " for player " + req.user.id);
                }
                else{
                    logger.debug("try to remove device token" + req.body.deviceToken + " for player " + req.user.id);
                }
                var deviceToken = req.body.deviceToken;
                if(deviceToken != null && deviceToken.length > 0){
                  var users =   yield User.update(
                        {  $or:[{
                            deviceToken: deviceToken},
                           { deviceTokenSilent: deviceToken,}
                        ]
                           
                       },
                        {$pull: {deviceToken: deviceToken, deviceTokenSilent: deviceToken }}, { multi: true }   
                       ).exec();
                       
                       if(req.body.needSend){
                           req.user.deviceToken.push(deviceToken);
                            req.user.deviceTokenSilent.push(deviceToken);
                           console.log(req.user.deviceToken);
                       }else{
                            req.user.deviceTokenSilent.push(deviceToken);
                       }
                }
                yield req.user.save();
                res.json({success:true});
            }
            catch (err) {
                res.json({success:false});
            }
        }),
        updateLoginByToken: co.wrap(function* (req, res, next){
            try {
                var user = yield User.findById(req.user.id);

                if (user != null) {
                    
                    var gg = yield Notification.update(
                        {type:{$in:["nologin_week","nologin_3days","nologin_month"]}},
                        {$pull: { pushSend: req.user.id} }, { multi: true }   
                       );
                       console.log(gg);
                    var notifications = yield Notification.find({type:{$in:["nologin_week","nologin_3days","nologin_month","register_after_24hours"]}});
                    if(notifications.length > 0)
                    {
                        var start_date = moment(req.user.lastLoginAt);
                        var end_date = moment(new Date());
                        var duration = moment.duration(end_date.diff(start_date));
                        if(duration.asMonths() >= 1) {
                            var index = notifications.map(function(e) { return e.type; }).indexOf("nologin_month");
                            if(index != -1)
                            {
                                if(notifications[index].receiversNotRead.indexOf(user.id) == -1)
                                {
                                        notifications[index].receiversNotRead.push(user.id);
                                        unique(notifications[index].receiversNotRead);
                                        yield notifications[index].save();
                                }
                            }
                        }
                        else if(duration.asWeeks() >= 1) {
                            var index = notifications.map(function(e) { return e.type; }).indexOf("nologin_week");
                            if(index != -1)
                            {
                                if(notifications[index].receiversNotRead.indexOf(user.id) == -1)
                                {
                                        notifications[index].receiversNotRead.push(user.id);
                                        yield notifications[index].save();
                                }
                            }
                        }
                        else if(duration.asDays() >= 3) {
                            var index = notifications.map(function(e) { return e.type; }).indexOf("nologin_3days");
                            if(index != -1)
                            {
                                if(notifications[index].receiversNotRead.indexOf(user.id) == -1)
                                {
                                        notifications[index].receiversNotRead.push(user.id);
                                        yield notifications[index].save();
                                }
                            }
                        }

                        var index = notifications.map(function(e) { return e.type; }).indexOf("register_after_24hours");
                            if(index != -1)
                            {
                                if(notifications[index].receiversNotRead.indexOf(user.id) == -1 
                                && notifications[index].receivers.indexOf(user.id) == -1
                            
                            )
                                {
                                    var start_date_created = moment(req.user.createdAt);
                                    //end_date = moment(new Date());
                                   duration = moment.duration(end_date.diff(start_date_created));
                                   if(duration.asDays() >= 1)
                                    {
                                        notifications[index].receiversNotRead.push(user.id);
                                        notifications[index].receivers.push(user.id);
                                        yield notifications[index].save();
                                    }
                                }
                            }
                        
                        
                        user.lastLoginAt = new Date();
                        var date = new Date();
                        if(user.limitQuestionAt != null){
                            if(date.getTime() >= user.limitQuestionAt.addHours(24).getTime()){
                                user.limitQuestionAt = null;
                                user.countQuestion = 0;
                                user.countCorrectQuestion = 0;  
                            }
                        }
                        
                        yield user.save();
                    }

                    
                    return res.json({success: true});
                }
               
            }
            catch (err) {
                res.json({success: false});
            }
        })
    }

