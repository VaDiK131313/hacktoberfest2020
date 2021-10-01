const User = require('../../models/user');
const Game = require('../../models/game'); // TEMP
const Ticket = require('../../models/ticket'); // TEMP
const log4js = require('log4js');
const Lottery = require('../../models/lottery');
const Notification = require('../../models/notification');
const logger = log4js.getLogger('NotificationApp');
const co = require('co');
const admin = require("firebase-admin");
const mongoose = require("mongoose");
var moment = require("moment");

// Code to run if we're in the master process

const foldm = (r,j) => r.reduce((a,b,i,g) => !(i % j) ? a.concat([g.slice(i,i+j)]) : a, []);
var not_valid_tokens = [];
 saveNotValidTokens = function(token_array,response_results){
   const not_valid = response_results.filter(function(r,i){
         if(r.error!=null){
             r.token = token_array[i];
             if(not_valid_tokens.indexOf(token_array[i])== -1){
                 not_valid_tokens.push(token_array[i]);
             }
             return r;
         }
     });
   console.log(not_valid_tokens);
}
const silent_message = {
    data: {
        tickets: "0"
    },
};
sendSilentNotification = function(token_array){
    const serviceAccount = require(process.env.FIREBASE_ADMIN_PATH);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
    console.log(token_array);
    var split_tokens = foldm(token_array, 100);
    for(var kk = 0;kk < split_tokens.length;kk++){
        var pull_tokens = split_tokens[kk];

        admin.messaging().sendToDevice(pull_tokens, silent_message)
            .then((response) => {
                // Response is a message ID string.
                console.log('Silent Successfully sent message:', response);
                if(response.failureCount != 0)
                    saveNotValidTokens(pull_tokens, response.results);
            })
            .catch((error) => {
                console.log('Silent Error sending message:', error);
            });
    }
}

class NotificationApp {
    constructor() {

    }


    start() {
        logger.info("Starting notifications application");

        const self = this;
        var timerId = setInterval(function () {
            co(function* () {
                var lottery = yield Lottery.findOne({
                    $or: [{winner: '', needSend: true}, {
                        winner: {$exists: false},
                        needSend: true
                    }]
                }).sort({availableAt: 1});
                //console.log(lottery.name);
                if (lottery != null) {
                    var curDate = new Date();
                    var needWinner = lottery.availableAt.getTime() - curDate.getTime() < 0;
                    if (needWinner) {
                        //console.log("true");

                        var notification = yield Notification.findOne({type: "lottery_win"}).exec();

                        if (notification != null && notification.active) {
                            var ids = yield User.find({}).select({_id: 1}).exec(function (err, ids) {
                                var result = [];
                                for (var i = 0; i < ids.length; i++) {
                                    result.push(ids[i]._id);
                                }
                                return result;
                            });


                            notification.receiversNotRead = ids;
                            yield notification.save();
                            console.log("try push Lottery");

                            var users = yield User.find({$or:[{deviceToken: {$exists: true, $not: {$size: 0}}},
                                                            {deviceTokenSilent: {$exists: true, $not: {$size: 0}}}]});
                            if (users.length > 0) {
                                const serviceAccount = require(process.env.FIREBASE_ADMIN_PATH);

                                if (!admin.apps.length) {
                                    admin.initializeApp({
                                        credential: admin.credential.cert(serviceAccount),
                                    });
                                }
                                var ids = [];
                                var ids_silent = [];
                                for (var i = 0; i < users.length; i++) {
                                    if(users[i].deviceToken != null || users[i].deviceToken.length > 0) {
                                        ids = ids.concat(users[i].deviceToken);
                                    }
                                     if(users[i].deviceTokenSilent != null || users[i].deviceTokenSilent.length > 0) {
                                         ids_silent = ids_silent.concat(users[i].deviceTokenSilent);
                                     }

                                }

                                var message = {
                                    notification: {
                                        title: (notification.pushTitle!="" ? notification.pushTitle : notification.title != "" ? notification.title : 'Lottery END'),
                                        body: (notification.pushBody!="" ? notification.pushBody : notification.message != "" ? notification.message : 'Return to the game and find out the result'),
                                        sound: "default",
                                        priority:"high"
                                    },
                                    data: {
                                        tickets: "" + notification.tickets,
                                        tokens: "" + notification.tokens,
                                        coins: "" + notification.coins,
                                    },
                                };
                                lottery.needSend = false;
                                yield lottery.save();
                                // Send a message to the device corresponding to the provided
                                // registration token.
                                //console.log(ids);
                                if(ids.length > 0){
                                    // Send a message to the device corresponding to the provided
                                    // registration token.

                                    var split_tokens = foldm(ids, 100);
                                    for(var kk = 0;kk < split_tokens.length;kk++){
                                        var pull_tokens = split_tokens[kk];

                                        admin.messaging().sendToDevice(pull_tokens, message)
                                            .then((response) => {
                                                // Response is a message ID string.
                                                console.log('Successfully sent message:', response);
                                                if(response.failureCount != 0)
                                                    saveNotValidTokens(pull_tokens, response.results);
                                            })
                                            .catch((error) => {
                                                console.log('Error sending message:', error);
                                            });
                                    }

                                }
                                if(ids_silent.length > 0){
                                    sendSilentNotification(ids_silent);
                                }
                            }
                        }
                    }

                }
                //End Lottery


            })
        }, 2000);
        var timerCustomId = setInterval(function () {
            co(function* () {
                //start custom notification
                var timestamp = new Date().addDays(1);


                var custom_notifications = yield Notification.find({
                    $or: [{
                        needSend: {$exists: false},
                        type: "custom",
                        beginAt: {$lte: timestamp}
                    }, {needSend: true, type: "custom", beginAt: {$lte: timestamp}}]
                });
                //console.log(custom_notifications);
                if (custom_notifications.length > 0) {
                    for (var i = 0; i < custom_notifications.length; i++) {
                        var notification = custom_notifications[i];
                        var tokens = [];
                        var tokens_silent = [];
                        if (notification.needSend) {
                            if(notification.pushSend.length > 0 && notification.pushSend[0]==null){
                                notification.needSend = false;
                                yield notification.save();
                                continue;
                            }
                            if (notification.pushSend == null || notification.pushSend.length == 0) {
                                notification.pushSend = notification.receivers;
                                yield notification.save();
                            }



                            var users = yield User.find({$or:[
                                    {_id: notification.pushSend,
                                    deviceToken: {$exists: true, $not: {$size: 0}}
                                    },
                                    {_id: notification.pushSend,
                                        deviceTokenSilent: {$exists: true, $not: {$size: 0}}
                                    },
                                ]
                            });

                            if (users.length > 0) {
                               // console.log(users);
                                for (var j = 0; j < users.length; j++) {
                                    var user = users[j];

                                    // console.log(notification.beginAt);
                                    // console.log(new Date().addHours(user.hoursDiff));
                                    // console.log(notification.beginAt.getTime());
                                    // console.log(new Date().addHours(user.hoursDiff).getTime());
                                    if (notification.beginAt.getTime() <= new Date().addHours(user.hoursDiff).getTime()) {

                                        if(user.deviceToken != null){
                                            for (var z = 0; z < user.deviceToken.length; z++) {
                                                tokens.push(user.deviceToken[z]);
                                            }
                                        }
                                        if(user.deviceTokenSilent!=null){
                                            for (var z = 0; z < user.deviceTokenSilent.length; z++) {
                                                tokens_silent.push(user.deviceTokenSilent[z]);
                                            }
                                        }
                                        //tokens.concat(user.deviceToken);

                                        var index = notification.pushSend.indexOf(user.id);


                                        if (index != -1) {
                                            notification.pushSend.splice(index, 1);

                                            // if (notification.pushSend.length <= 1 && notification.pushSend[0] == null) {
                                            //     notification.needSend = false;
                                            // }
                                            if(notification.pushSend.length <= 0){
                                                notification.pushSend.push(null);
                                            }

                                            notification.save();

                                        }

                                    }
                                }
                                //console.log(tokens.length);
                                //try push
                                if (tokens.length > 0) {
                                    const serviceAccount = require(process.env.FIREBASE_ADMIN_PATH);

                                    if (!admin.apps.length) {
                                        admin.initializeApp({
                                            credential: admin.credential.cert(serviceAccount),
                                        });
                                    }
                                    var message = {
                                        notification: {
                                            title: (notification.pushTitle!="" ? notification.pushTitle : notification.title != "" ? notification.title : 'You have a custom Message: ' + notification.title),
                                            body: (notification.pushBody!="" ? notification.pushBody : notification.message != "" ? notification.message : 'Return to the game and check it'),
                                            sound: "default",
                                            priority:"high"
                                        },
                                        data: {
                                            tickets: "" + notification.tickets,
                                            tokens: "" + notification.tokens,
                                            coins: "" + notification.coins,
                                        },
                                    };

                                    // Send a message to the device corresponding to the provided
                                    // registration token.

                                    var split_tokens = foldm(tokens, 100);
                                    for(var kk = 0;kk < split_tokens.length;kk++){
                                        var pull_tokens = split_tokens[kk];

                                        admin.messaging().sendToDevice(pull_tokens, message)
                                            .then((response) => {
                                                // Response is a message ID string.
                                                console.log('Successfully sent message:', response);
                                                if(response.failureCount != 0)
                                                    saveNotValidTokens(pull_tokens, response.results);
                                            })
                                            .catch((error) => {
                                                console.log('Error sending message:', error);
                                            });
                                    }

                                }
                                if (tokens_silent.length > 0) {
                                    sendSilentNotification(tokens_silent);
                                }
                            }
                        }
                    }
                }
                //end custom notification
            })
        }, 5000);
        var timerUserId = setInterval(function () {
            co(function* () {
                var notifications = yield Notification.find({
                    type: {
                        $in: ["nologin_week", "nologin_3days", "nologin_month", "register_after_24hours"],

                    }, active: true,
                });
                if (notifications.length > 0) {
                    var hours_tokens = [];
                    var hours_tokens_silent = [];


                    var users_24_hours = yield User.find(
                        {$or:[
                            {"createdAt": {
                                $gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
                                $lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
                            },
                            deviceToken: {$exists: true, $not: {$size: 0}}},
                                {"createdAt": {
                                        $gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
                                        $lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
                                    },
                                    deviceTokenSilent: {$exists: true, $not: {$size: 0}}},
                    ]});

                    if (users_24_hours.length > 0) {
                        var index = notifications.map(function (e) {
                            return e.type;
                        }).indexOf("register_after_24hours");
                        if (index != -1) {
                            for (var i = 0; i < users_24_hours.length; i++) {
                                var user = users_24_hours[i];
                                 if (notifications[index].receivers.indexOf(user.id) == -1) {
                                     notifications[index].receivers.push(user.id);
                                 }
                                if (notifications[index].receiversNotRead.indexOf(user.id) == -1) {
                                    notifications[index].receiversNotRead.push(user.id);
                                }
                                if (notifications[index].pushSend.indexOf(user.id) == -1) {

                                    //notifications[index].receiversNotRead.push(user.id);
                                    notifications[index].pushSend.push(user.id);
                                    yield notifications[index].save();
                                    //console.log(user.deviceToken.length);
                                    if(user.deviceToken!=null) {
                                        for (var j = 0; j < user.deviceToken.length; j++) {
                                            hours_tokens.push(user.deviceToken[j]);
                                        }
                                    }
                                    if(user.deviceTokenSilent!=null) {
                                        for (var j = 0; j < user.deviceTokenSilent.length; j++) {
                                            hours_tokens_silent.push(user.deviceTokenSilent[j]);
                                        }
                                    }
                                }
                            }
                            if (hours_tokens.length > 0) {
                                const serviceAccount = require(process.env.FIREBASE_ADMIN_PATH);

                                if (!admin.apps.length) {
                                    admin.initializeApp({
                                        credential: admin.credential.cert(serviceAccount),
                                    });
                                }
                                var message = {
                                    notification: {
                                        title: (notifications[index].pushTitle!="" ? notifications[index].pushTitle : notifications[index].title != "" ? notifications[index].title : 'Get a rewards for a new player!'),
                                        body: (notifications[index].pushBody!="" ? notifications[index].pushBody : notifications[index].message != "" ?notifications[index].message : 'Return to the game and check it'),
                                        sound: "default",
                                        priority:"high"
                                    },
                                    data: {
                                        tickets: "" + notifications[index].tickets,
                                        tokens: "" + notifications[index].tokens,
                                        coins: "" + notifications[index].coins,
                                    },
                                };

                                // Send a message to the device corresponding to the provided
                                // registration token.

                                var split_tokens = foldm(hours_tokens, 100);
                                for(var kk = 0;kk < split_tokens.length;kk++){
                                    var pull_tokens = split_tokens[kk];
                                    //console.log(pull_tokens);
                                    admin.messaging().sendToDevice(pull_tokens, message)
                                        .then((response) => {
                                            // Response is a message ID string.
                                            console.log('Successfully sent message:', response);
                                            if(response.failureCount != 0)
                                                saveNotValidTokens(pull_tokens, response.results);
                                        })
                                        .catch((error) => {
                                            console.log('Error sending message:', error);
                                        });
                                }

                            }
                            if (hours_tokens_silent.length > 0) {
                                sendSilentNotification(hours_tokens_silent);
                            }
                        }
                    }

                }
            })
        }, 5000);
        var timerUserId = setInterval(function () {
            co(function* () {
                var notifications = yield Notification.find({
                    type: {
                        $in: ["nologin_week", "nologin_3days", "nologin_month", "register_after_24hours"],

                    }, active: true,
                });
                if (notifications.length > 0) {
                    var tokens = [];
                    var tokens_w = [];
                    var tokens_m = [];
                    var tokens_silent = [];
                    var index_d = 0;
                    var index_w = 0;
                    var index_m = 0;
                    //for(var g=0;g < notifications.length; g++){
                    //    ids = ids.concat(notifications[g].pushSend);
                    //}
                    //console.log(ids);
                    var users = yield User.find({//{_id:{$not:{$in:ids}},
                        $or:[{deviceToken: {$exists: true, $not: {$size: 0}}},{deviceTokenSilent: {$exists: true, $not: {$size: 0}}}],


                    });
                    //console.log(users);
                    if (users.length > 0) {

                        for (var i = 0; i < users.length; i++) {
                            var user = users[i];

                            if(notifications.length > 0)
                            {
                                var start_date = moment(user.lastLoginAt);
                                var end_date = moment(new Date());
                                var duration = moment.duration(end_date.diff(start_date));
                                //console.log(user.user_name +"   "+duration.asMonths());
                                if(duration.asMonths() >= 1) {
                                    var index = notifications.map(function(e) { return e.type; }).indexOf("nologin_month");
                                    index_m = index;
                                    if(index != -1)
                                    {
                                        if(notifications[index].pushSend.indexOf(user.id) == -1)
                                        {
                                            notifications[index].pushSend.push(user.id);
                                            yield notifications[index].save();
                                            if(user.deviceToken!=null){
                                                for (var j = 0; j < user.deviceToken.length; j++) {
                                                    tokens_m.push(user.deviceToken[j]);
                                                }
                                            }
                                            if(user.deviceTokenSilent!=null){
                                                for (var j = 0; j < user.deviceTokenSilent.length; j++) {
                                                    if(tokens_silent.indexOf(user.deviceTokenSilent[j]) == -1);
                                                    tokens_silent.push(user.deviceTokenSilent[j]);
                                                }
                                            }

                                        }
                                    }
                                }
                                //console.log(user.user_name+"   "+duration.asWeeks());
                                if(duration.asWeeks() >= 1 ) {
                                    var index = notifications.map(function(e) { return e.type; }).indexOf("nologin_week");
                                    index_w = index;
                                    if(index != -1)
                                    {
                                        if(notifications[index].pushSend.indexOf(user.id) == -1)
                                        {
                                            notifications[index].pushSend.push(user.id);
                                            yield notifications[index].save();
                                            if(user.deviceToken!=null){
                                                for (var j = 0; j < user.deviceToken.length; j++) {
                                                    tokens_w.push(user.deviceToken[j]);
                                                }
                                            }
                                            if(user.deviceTokenSilent!=null){
                                                for (var j = 0; j < user.deviceTokenSilent.length; j++) {
                                                    if(tokens_silent.indexOf(user.deviceTokenSilent[j]) == -1);
                                                    tokens_silent.push(user.deviceTokenSilent[j]);
                                                }
                                            }

                                        }
                                    }
                                }
                                //console.log(user.user_name +"   "+duration.asDays());
                                if(duration.asDays() >= 3) {
                                    var index = notifications.map(function(e) { return e.type; }).indexOf("nologin_3days");
                                    index_d = index;
                                    if(index != -1)
                                    {
                                        // if(notifications[index].receiversNotRead.indexOf(user.id) == -1)
                                        // {
                                        //     notifications[index].receiversNotRead.push(user.id);
                                        //     yield notifications[index].save();
                                        // }
                                        if(notifications[index].pushSend.indexOf(user.id) == -1)
                                        {
                                            notifications[index].pushSend.push(user.id);
                                            yield notifications[index].save();
                                            if(user.deviceToken!=null){
                                                for (var j = 0; j < user.deviceToken.length; j++) {
                                                    tokens.push(user.deviceToken[j]);
                                                }
                                            }
                                            if(user.deviceTokenSilent!=null){
                                                for (var j = 0; j < user.deviceTokenSilent.length; j++) {
                                                    if(tokens_silent.indexOf(user.deviceTokenSilent[j]) == -1);
                                                    tokens_silent.push(user.deviceTokenSilent[j]);
                                                }
                                            }

                                        }
                                    }
                                }
                            }
                        }
                        //console.log(tokens.length);
                        //console.log(tokens_w.length);
                        // console.log(tokens_m.length);
                        const serviceAccount = require(process.env.FIREBASE_ADMIN_PATH);

                        if (!admin.apps.length) {
                            admin.initializeApp({
                                credential: admin.credential.cert(serviceAccount),
                            });
                        }

                        if (tokens.length > 0) {

                            var message_d = {
                                notification: {
                                    title: (index_d!=-1 && notifications[index_d].pushTitle!="" ? notifications[index_d].pushTitle : notifications[index_d].title != "" ? notifications[index_d].title : 'Your last session was 3 days ago!'),
                                    body: (index_d!=-1 && notifications[index_d].pushBody!="" ? notifications[index_d].pushBody : notifications[index_d].message != "" ? notifications[index_d].message : 'Return to the game and get reward'),
                                    sound: "default",
                                    priority:"high"
                                },
                                data: {

                                },
                            };

                            // Send a message to the device corresponding to the provided
                            // registration token.

                            var split_tokens = foldm(tokens, 100);
                            for(var kk = 0;kk < split_tokens.length;kk++){
                                var pull_tokens = split_tokens[kk];
                                //console.log(pull_tokens);
                                admin.messaging().sendToDevice(pull_tokens, message_d)
                                    .then((response) => {
                                        // Response is a message ID string.
                                        console.log('Successfully sent message:', response);
                                        if(response.failureCount != 0)
                                            saveNotValidTokens(pull_tokens, response.results);
                                    })
                                    .catch((error) => {
                                        console.log('Error sending message:', error);
                                    });
                            }

                        }
                        if (tokens_w.length > 0) {

                            var message_w = {
                                notification: {
                                    title: (index_w!=-1 && notifications[index_w].pushTitle!="" ? notifications[index_w].pushTitle : notifications[index_w].title != "" ? notifications[index_w].title : 'Your last session was 1 week ago!'),
                                    body: (index_w!=-1 && notifications[index_w].pushBody!="" ? notifications[index_w].pushBody : notifications[index_w].message != "" ? notifications[index_w].message : 'Return to the game and get reward'),
                                    sound: "default",
                                    priority:"high"
                                },
                                data: {

                                },
                            };

                            // Send a message to the device corresponding to the provided
                            // registration token.
                            // Send a message to the device corresponding to the provided
                            // registration token.

                            var split_tokens = foldm(tokens_w, 100);
                            for(var kk = 0;kk < split_tokens.length;kk++){
                                var pull_tokens = split_tokens[kk];
                                //console.log(pull_tokens);
                                admin.messaging().sendToDevice(pull_tokens, message_w)
                                    .then((response) => {
                                        // Response is a message ID string.
                                        console.log('Successfully sent message:', response);
                                        if(response.failureCount != 0)
                                            saveNotValidTokens(pull_tokens, response.results);
                                    })
                                    .catch((error) => {
                                        console.log('Error sending message:', error);
                                    });
                            }

                        }
                        if (tokens_m.length > 0) {

                            var message_m = {
                                notification: {
                                    title: (index_m!=-1 && notifications[index_m].pushTitle!="" ? notifications[index_m].pushTitle : notifications[index_m].title != "" ? notifications[index_m].title : 'Your last session was 1 month ago!'),
                                    body: (index_m!=-1 && notifications[index_m].pushBody!="" ? notifications[index_m].pushBody : notifications[index_m].message != "" ? notifications[index_m].message : 'Return to the game and get reward'),
                                    sound: "default",
                                    priority:"high"
                                },
                                data: {

                                },
                            };

                            // Send a message to the device corresponding to the provided
                            // registration token.
                            // Send a message to the device corresponding to the provided
                            // registration token.

                            var split_tokens = foldm(tokens_m, 100);
                            for(var kk = 0;kk < split_tokens.length;kk++){
                                var pull_tokens = split_tokens[kk];
                                //console.log(pull_tokens);
                                admin.messaging().sendToDevice(pull_tokens, message_m)
                                    .then((response) => {
                                        // Response is a message ID string.
                                        console.log('Successfully sent message:', response);
                                        if(response.failureCount != 0)
                                            saveNotValidTokens(pull_tokens, response.results);
                                    })
                                    .catch((error) => {
                                        console.log('Error sending message:', error);
                                    });
                            }

                        }

                        if (tokens_silent.length > 0) {
                            sendSilentNotification(tokens_silent);
                        }
                    }

                }
            })
        }, 10000);
        var removetokensId = setInterval(function () {
            co(function* () {
                if(not_valid_tokens.length > 0){
                    var users =   yield User.update(
                        {
                        },
                        {$pull: {deviceToken: {$in: not_valid_tokens }} }, { multi: true }
                    ).exec();
                        not_valid_tokens = [];
                }


            });},2000);
    }
}


module.exports = NotificationApp;