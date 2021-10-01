const Notification  = require('../models/notification');
const User          = require('../models/user');
const Lottery       = require('../models/lottery');
const Ticket        = require('../models/ticket');
var DateDiff        = require('date-diff');

const co    = require('co');
const logger = require('log4js').getLogger('notificationcontroller');
const notificationTypes = [
    "template_custom","new_question","lottery_reminder","lottery_win",
    "register_after_24hours","nologin_3days","nologin_week",
    "nologin_month","custom"
];


module.exports =
{
    index:co.wrap(function* (req, res, next)
    {
        try
        {
            const payload = {title:'Notifications',template_notifications:[],custom_notifications:[],custom_template_notification:null};
            var notifications = yield Notification.find({type:{$nin:["custom","template_custom"]}});
            //TODO Maybe remove this
            //Creating standart Notification
            if(notifications.length == 0){
                var notification = new Notification();
                notification.title = "Custom";
                notification.type = notificationTypes[0];
                notification.message = "";
                notification.createdAt = new Date().toISOString();
                notification.pushTitle = "You have a Message";
                notification.pushBody = "Return to the game and check it";
                notifications.push(notification);
                //payload.custom_template_notification = notification;

                notification = new Notification();
                notification.title = "New Questions arrive!";
                notification.type = notificationTypes[1];
                notification.message = "We added some new questions, enjoy:)";
                notification.createdAt = new Date().toISOString();
                notification.pushTitle = "New Question For You";
                notification.pushBody = "Check a new question!!";
                notifications.push(notification);
                
                // notification = new Notification();
                // notification.title = "Lottery reminder";
                // notification.type = notificationTypes[2];
                // notification.message = "Check a lottery!";
                // notification.createdAt = new Date().toISOString();
                // notifications.push(notification);
                
                notification = new Notification();
                notification.title = "Lottery win/lose";
                notification.type = notificationTypes[3];
                notification.message = "";
                notification.createdAt = new Date().toISOString();
                notification.pushTitle = "Lottery END";
                notification.pushBody = "Return to the game and find out the result";
                notifications.push(notification);

                notification = new Notification();
                notification.title = "24 Hours of registration";
                notification.type = notificationTypes[4];
                notification.message = "";
                notification.createdAt = new Date().toISOString();
                notification.pushTitle = "Get a rewards for new player!";
                notification.pushBody = "Return to the game and check it";
                notifications.push(notification);

                notification = new Notification();
                notification.title = "No login for 3 days";
                notification.type = notificationTypes[5];
                notification.message = "";
                notification.createdAt = new Date().toISOString();
                notification.pushTitle = "Your last session was 3 days ago!";
                notification.pushBody = "Return to the game and get reward";
                notifications.push(notification);

                notification = new Notification();
                notification.title = "No login for a week";
                notification.type = notificationTypes[6];
                notification.message = "";
                notification.createdAt = new Date().toISOString();
                notification.pushTitle = "Your last session was 1 week ago!";
                notification.pushBody = "Return to the game and get reward";
                notifications.push(notification);

                notification = new Notification();
                notification.title = "No login for a month";
                notification.type = notificationTypes[7];
                notification.message = "";
                notification.createdAt = new Date().toISOString();
                notification.pushTitle = "Your last session was 1 month ago!";
                notification.pushBody = "Return to the game and get reward";
                notifications.push(notification);
                yield Notification.create(notifications);
                notifications.splice(0,1);
            }
            
            payload.template_notifications = notifications;
            payload.custom_notifications = yield Notification.find({type:"custom"});
            
            console.log(payload.custom_notifications);
            payload.custom_template_notification = yield Notification.findOne({type:"template_custom"});
            res.render('notifications', payload);
        }
        catch (err)
        {
            next(err);
        }
    }),

    create: co.wrap(function* (req, res, next) {
        try {
            
           
            logger.debug("User " + req.user.id + " try to create the custom notification ");
            var template_custom = yield Notification.findOne({type:"template_custom"});
            if(template_custom!=null){
                template_custom.pushTitle = req.body.pushTitle;
                template_custom.pushBody  =  req.body.pushBody;
                yield template_custom.save();
            }
            var receivers = JSON.parse(req.body.receiversIds);
            var actions = JSON.parse(req.body.actionsIds);
            console.log(req.body.beginAt);
            var dateObj = JSON.parse(req.body.beginAt);
            
            var date = new Date(dateObj.year,dateObj.month,dateObj.day,dateObj.hours,dateObj.minutes,"00");
            console.log(date);
            delete req.body.beginAt;
            var notification = new Notification(req.body);
            notification.type = notificationTypes[8];
            notification.receivers = receivers;
            notification.receiversNotRead = receivers;
            notification.owner = req.user.id;
            notification.active = true;
            notification.createdAt = new Date().toISOString();
            notification.updatedAt = new Date().toISOString();
            notification.beginAt = new Date().toISOString();
            //yield notification.save();
            //var notification = yield Notification.findById(notification.id);
            
            
            notification.beginAt.setDate(date.getDate());
            notification.beginAt.setMonth(date.getMonth());
            notification.beginAt.setYear(date.getFullYear());
            notification.beginAt.setHours(date.getHours());
            notification.beginAt.setMinutes(date.getMinutes());
            notification.beginAt.setSeconds(0);
            notification.beginAt = notification.beginAt.toISOString();
            console.log(notification.beginAt);
            ///var diffHours = parseInt(Date.diff(notification.beginAt, date).hours());
            //console.log("diff hours:"+diffHours);
           // var diffM = parseInt(Date.diff(notification.beginAt, date).minutes());
            //console.log("diff min:"+diffM);
            //notification.beginAt.addHours(diffHours);
            //yield Notification.findByIdAndUpdate(notification.id,notification);
            // if(process.env.MODE!=null && process.env.MODE == "global"){
            //     console.log(process.env.MODE);
            //     notification.beginAt = req.body.beginAt!=null ? date.getTime() : new Date().toISOString();
            //     console.log(notification.beginAt);
            // }
            // else{
            //     notification.beginAt = req.body.beginAt!=null ? req.body.beginAt : new Date();
            // }
            
            notification.actions_ids = actions;
            yield notification.save();
            res.json({
                success: true,
                owner: notification.owner,
                title: notification.title,
                message: notification.message,
                active: notification.active,
                coins: notification.coins,
                tokens: notification.tokens,
                tickets: notification.tickets,
                created_at: notification.createdAt,
                updated_at: notification.updatedAt,
            })
        }
        catch (err) {
            next(err);
        }
    }),

    save: co.wrap(function* (req, res, next) {
        logger.debug("User " + req.user.id + "try to updating a notification " + req.params.id);
        try {
            console.log(req.body);
            console.log(req.params);
            var notification = yield Notification.findById(req.params.id);

            if(notification.type == notificationTypes[8]){
                //var receivers = JSON.parse(req.body.receiversIds);
                 //notification.receivers = receivers;
                 //notification.receiversNotRead.push(receivers);
                 logger.error("A notification " + req.params.id + "can't updated becouse its type" + notificationTypes[8]);
                 return res.send({success: false});
                }
            notification.title = req.body.title!=null ? req.body.title : notification.title;
            notification.message = req.body.message;
            notification.active = req.body.active;
            notification.coins = req.body.coins;
            notification.tokens = req.body.tokens;
            notification.tickets = req.body.tickets;
            notification.updatedAt = new Date().toISOString();
            notification.pushTitle = req.body.pushTitle;
            notification.pushBody = req.body.pushBody;
            // if(notification.type != notificationTypes[4] 
            //     || notification.type != notificationTypes[5]
            //     || notification.type != notificationTypes[6]
            //     || notification.type != notificationTypes[7]   
            // )
            // {
            //     var ids = yield User.find({}).select({_id:1}).exec(function(err,ids){
            //         var result = [];
            //         for(var i=0;i < ids.length; i++ ){
            //             result.push(ids[i]._id);
            //         }
            //         return result;
            //     });
            //     notification.receiversNotRead = ids;
            // }
            yield notification.save();
            logger.debug("Notification updated.");
            res.send({success: true});
        }
        catch (err) {
            next(err);
        }
    }),

    remove: co.wrap(function* (req, res, next) {
        try {
            logger.debug("User " + req.user.id + " try to remove the custom notification "+req.params.id);
            var notification = yield Notification.findByIdAndRemove(req.params.id);
            res.json({success: true});
        }
        catch (err) {
            next(err);
        }
    }),

    getActiveNotifications: co.wrap(function* (req, res, next) {
        try {
            
            var response = {success:true, notifications:[],user:null};
            console.log(req.body.nowTime);
                var date1 = new Date(req.body.nowTime);
                console.log(date1);
                var dateNow = new Date();
                console.log(dateNow);
                var diffHours = parseInt(Date.diff(date1, dateNow).hours());
                dateNow.addHours(diffHours);
                console.log(diffHours);
                req.user.hoursDiff = diffHours;
                yield req.user.save();
            var notifications = yield Notification.find(
                {$or: [
                {active:true,receiversNotRead:req.user.id,type:"custom",beginAt:{$lte:dateNow}},
                {active:true,receiversNotRead:req.user.id,type:{$ne:"custom"},beginAt:{$lte: new Date()}}
                ]
                }
            );
                //$or:[ {type:'custom',receiversNotRead:req.user.id}, {type:{$ne:['custom','template_custom']}}]}).sort({updatedAt: -1});//.exec(function (err, notifications) {
            var lottery =  yield Lottery.findOne({$or:[{winner:''},{ winner : { $exists: false }}]}).sort({availableAt:1});
            var tickets = [];    
               // return sort_notifications;
            //});
            //while(notifications.length > 0){
                console.log(notifications);
                if(notifications==undefined || notifications==null){
                    response.notifications = [];
                    response.user = req.user.getVO();
                    return res.json(response);
                }
                var indexMonth = notifications.map(function(e) { return e.type; }).lastIndexOf(notificationTypes[7]);
                var indexDays =  notifications.map(function(e) { return e.type; }).lastIndexOf(notificationTypes[5]);
                var indexWeeks =  notifications.map(function(e) { return e.type; }).lastIndexOf(notificationTypes[6]);
                 
                var playerIndex = -1;
                if(indexMonth != -1){
                    if(indexWeeks != -1){
                        playerIndex = notifications[indexWeeks].receiversNotRead.indexOf(req.user.id);
                        if(playerIndex != -1)
                        {
                            notifications[indexWeeks].receiversNotRead.splice(playerIndex,1); 
                            yield notifications[indexWeeks].save();
                        }
                    }  
                    if(indexDays != -1){
                        playerIndex = notifications[indexDays].receiversNotRead.indexOf(req.user.id);
                        if(playerIndex != -1)
                        {
                            notifications[indexDays].receiversNotRead.splice(playerIndex,1); 
                            yield notifications[indexDays].save();
                        }
                        notifications.splice(indexDays,1);
                    }   
                    
                     
                     indexWeeks =  notifications.map(function(e) { return e.type; }).lastIndexOf(notificationTypes[6]);
                     if(indexWeeks != -1){
                        notifications.splice(indexWeeks,1);
                     }
                }
                else if(indexWeeks != -1){
                    console.log(indexWeeks + "index "+indexDays );
                    if(indexDays != -1){
                        playerIndex = notifications[indexDays].receiversNotRead.indexOf(req.user.id);
                        console.log("plyer "+playerIndex);
                        if(playerIndex != -1)
                        {
                            notifications[indexDays].receiversNotRead.splice(playerIndex,1); 
                            yield notifications[indexDays].save();
                        }
                        notifications.splice(indexDays,1);    
                    }   
                }   

            var sort_notifications = [];
               while(notifications.length != 0){
                var index = notifications.map(function(e) { return e.type; }).indexOf(notificationTypes[3]);
                var index_tmp = 0;
                var count_tickets = 0;
                
                if(index != -1)
                {
                    sort_notifications.splice(0,0,notifications[index].getVO());//push(notifications[index].getVO());
                    if(req.user.user_name == notifications[index].body.winner)
                    {
                        req.user.coins += notifications[index].body.coins;
                        req.user.tokens += notifications[index].tokens;
                        for(var i=0; i< notifications[index].tickets;i++)
                        {
                            var ticket  = new Ticket();
                            ticket.createdAt = new Date().toISOString();
                            ticket.owner = req.user.id;
                            ticket.lottery = lottery.id;
                            tickets.push(ticket);
                        }
                    }
                    var receiversIndex = notifications[index].receiversNotRead.indexOf(req.user.id);
                        if(receiversIndex != -1){
                            notifications[index].receiversNotRead.splice(receiversIndex,1);
                            yield notifications[index].save();
                        }
                    
                    notifications.splice(index,1);
                    
                }
                else{
                    index = notifications.map(function(e) { return e.type; }).indexOf(notificationTypes[8]);
                    
                    if(index != -1){
                        index_tmp = sort_notifications.map(function(e) { return e.type; }).lastIndexOf(notificationTypes[8]);
                        if(index_tmp !=-1)
                            sort_notifications.splice(index_tmp,0,notifications[index].getVO());//(notifications[index].getVO());
                        else 
                            sort_notifications.push(notifications[index].getVO());

                        req.user.coins += notifications[index].coins;
                        req.user.tokens += notifications[index].tokens;
                        for(var i=0; i< notifications[index].tickets;i++)
                        {
                            var ticket  = new Ticket();
                            ticket.createdAt = new Date().toISOString();
                            ticket.owner = req.user.id;
                            ticket.lottery = lottery.id;
                            tickets.push(ticket);
                        }
                        var receiversIndex = notifications[index].receiversNotRead.indexOf(req.user.id);
                        if(receiversIndex != -1){
                            notifications[index].receiversNotRead.splice(receiversIndex,1);
                            yield notifications[index].save();
                        }
                        notifications.splice(index,1);
                    }
                    else
                    {
                        
                        sort_notifications.push(notifications[0].getVO());
                        req.user.coins += notifications[0].coins;
                        req.user.tokens += notifications[0].tokens;
                        for(var i=0; i< notifications[0].tickets;i++)
                        {
                            var ticket  = new Ticket();
                            ticket.createdAt = new Date().toISOString();
                            ticket.owner = req.user.id;
                            ticket.lottery = lottery.id;
                            tickets.push(ticket);
                        }
                        var receiversIndex = notifications[0].receiversNotRead.indexOf(req.user.id);
                        if(receiversIndex != -1){
                            notifications[0].receiversNotRead.splice(receiversIndex,1);
                            console.log(notifications[0]);
                            yield notifications[0].save();
                        }
                        notifications.splice(0,1);
                    }
                }
               }
               yield Ticket.create(tickets);
            //}
            yield req.user.save();
            
            
            response.notifications = sort_notifications;
            response.user = req.user.getVO();
            res.json(response);
        }
        catch (err) {
            next(err);
        }
    }),


};