const User = require('../models/user');
const co = require('co');
const logger = require('log4js').getLogger('questioncontroller');
const Game = require('../models/game');
const Question = require('../models/question');
const Notification = require('../models/notification');
var DateDiff        = require('date-diff');
 const admin = require("firebase-admin");
// const serviceAccount = require(process.env.FIREBASE_ADMIN_PATH);
// admin.initializeApp({
// credential: admin.credential.cert(serviceAccount),
        
// });
const foldm = (r,j) => r.reduce((a,b,i,g) => !(i % j) ? a.concat([g.slice(i,i+j)]) : a, []);
//static silent push notification
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

module.exports =
    {
        index: co.wrap(function* (req, res, next) {
            try {
                const payload = {title: 'Questions', questions: []};
                payload.questions = yield Question.find().limit(100000).exec();
                res.render('question/index', payload);
            }
            catch (err) {
                next(err);
            }
        }),

        uploadCsv: co.wrap(function* (req, res, next) {
            try {
                logger.debug("User " + req.user.id + " try to upload questions");
                if(!req.files)
		            return res.status(400).send('No files were uploaded.');
              
                var authorFile = req.files.file;
                
                var request = [];
                var question = new Question();
                const payload = {title: 'Questions', questions: []};
                payload.questions = yield Question.find().limit(1000).exec();
                const csv = require('csvtojson')
                 csv({delimiter:[",",";"]})
                    .fromString(authorFile.data.toString())
                    .on('json', (jsonObj) => {
                       console.log(jsonObj);
//*Old export */
                        // if (jsonObj.question.length > 0
                        //     && jsonObj.answer.length === 0) {
                        //     if (question.question.length > 0) {
                        //         request.push(question);
                        //         question = new Question();
                        //     }
                        //     question.question = jsonObj.question;
                        // }
                        // else if (jsonObj.question.length === 0
                        //     && jsonObj.answer.length > 0
                        //     && jsonObj.correct !== '') {
                        //     question.answers.push(
                        //         {
                        //             Answer: jsonObj.answer,
                        //             IsTrue: (jsonObj.correct == '1' ? true : false)
                        //         });
                        // }
                        
                        if (jsonObj.Question.length > 0) {
                            
                            //request.push(question);
                            question = new Question();
                            question.question = jsonObj.Question;
                            question.labels = jsonObj.Labels.replace(/\ {1,}/g,"");
                            var correct_index = jsonObj.CorrectAnswer!=null && jsonObj.CorrectAnswer!='' ?
                                                 parseInt(jsonObj.CorrectAnswer) : 1;
                            for(var k = 1; k < 5; k++){
                                if(jsonObj["Choice"+k]!=null && jsonObj["Choice"+k]!=''){
                                    question.answers.push(
                                        {
                                            Answer: jsonObj["Choice"+k],
                                            IsTrue: (correct_index == k ? true : false)
                                        }); 
                                }
                            }
                            request.push(question);
                        }
                            
                        
                    })
                    .on('done', (error) => {
                        Question.create(request, function (err, documents) {
                            if (err) throw err;
                            return res.send(documents.length + ' questions have been successfully uploaded.');
                        });
                    });
            }
            catch (err) {
                next(err);
            }
        }),

        getQuestions: co.wrap(function* (req, res, next) {
            try {
                 var userDate = new Date(req.body.nowTime);
                 var nowDate = new Date();
                 var diffHours = parseInt(Date.diff(userDate, nowDate).hours());
                console.log("DIFFS time:")
                console.log(userDate);
                console.log(nowDate);
                console.log(diffHours);
                logger.debug("User " + req.user.id + " get questions");
                var settings = yield Game.findOne({}).sort({beginAt: -1}).exec();
                const response = {success: true, reward: 1, questions: [],timer:""};
                var request = {};
                if (req.user.question_ids != null) {

                    request = { $and:[{_id: {$not: {$in: req.user.question_ids}},active:true}]};
                }
                if(req.user.questionNotCorrect_ids != null){
                    if(request["$and"] == null){
                        request = {$and:[]}
                    }
                    request["$and"].push({_id: {$not: {$in: req.user.questionNotCorrect_ids}},active:true});
                    
                }
                request.active = true;
                request.is_new = false;
                var nowTime = new Date();
                var limitAt = new Date(req.user.limitQuestionAt);
                limitAt.addHours(24);
                //console.log(nowTime.getTime());
                //console.log(limitAt.getTime());
                if(req.user.limitQuestionAt == null ){
                    req.user.limitQuestionAt = nowTime;
                    
                }
                else if(limitAt.getTime() <= nowTime.getTime())
                {
                    
                    req.user.limitQuestionAt = new Date();
                    req.user.countQuestion = 0;
                    req.user.countCorrectQuestion = 0;
                    
                }
                
                yield req.user.save();
                response.user_count_question = req.user.countQuestion;
                response.user_count_correct_question = req.user.countCorrectQuestion;
                //response.timer = req.user.limitQuestionAt.addDays(1);
                
                // var date = new Date(req.user.limitQuestionAt.addHours(24) - (req.user.limitQuestionAt.addHours(24).getTimezoneOffset() * 60000))
                console.log(req.user.limitQuestionAt.getHours());
                var dateFormat = require('dateformat');
                response.timer = dateFormat(req.user.limitQuestionAt.addHours(24).addHours(diffHours),"yyyy-mm-dd HH:MM:ss")+".000";
                console.log(response.timer);
                //req.user.limitQuestionAt.addHours(24);//.addHours(diffHours);//.addHours(3).toISOString().replace(/[A-Z]/g," ").trim();
                
                // if(!reponse.success){
                
                //    return res.json(response);
                // }
                if(settings != null){
                    response.questionLimit = settings.questionLimit;
                    response.questionCorrectLimit = settings.questionCorrectLimit;
                    response.questionLimitText = settings.questionLimitText;
                    response.questionCorrectLimitText = settings.questionCorrectLimitText;
                }
                var countActiveQuestion = yield Question.count(request);
                console.log(countActiveQuestion);
                var sortreq = {'_id': 1};
                if(countActiveQuestion <= 0 && req.user.questionNotCorrect_ids > 0 ) {
                    req.user.questionNotCorrect_ids = [];
                    sortreq = {'_id': -1}
                }
                else if(countActiveQuestion <= settings.questionLimit && req.user.questionNotCorrect_ids.length > 0){
                    var diff = settings.questionLimit - countActiveQuestion;
                    if(req.user.questionNotCorrect_ids.length <= diff){
                        req.user.questionNotCorrect_ids = [];
                        sortreq = {'_id': -1}
                    }else{
                        req.user.questionNotCorrect_ids  = req.user.questionNotCorrect_ids.slice(diff-1);
                    }
                }
                yield req.user.save();
                response.questions = yield Question.find(request).sort(sortreq).limit(settings.questionLimit).exec(function (err, questions) {
                    for (var i = 0; i < questions.length; i++) {
                        questions[i] = questions[i].getVO();
                    }
                    return questions;
                });
                if (response.questions.length > 0) {
                    var game = yield Game.findOne({}).sort({beginAt: -1}).exec();
                    if (game != null) {
                        response.reward = game.rewardQuestion;
                    }
                    response.count_questions = response.questions.length;
                    res.json(response);
                }
                else {
                    response.success = false;
                    res.json(response);
                }
            }
            catch (err) {
                next(err);
            }
        }),

        create: co.wrap(function* (req, res, next) {
            try {
                logger.debug("User " + req.user.id + " try to create the question ");
                var answers = JSON.parse(req.body.answers);
                var question = new Question(req.body);
                question.owner = req.user._id;
                question.answers = answers;
                yield question.save();
                res.json({
                    success: true,
                    owner: question.owner,
                    title: question.title,
                    question: question.question,
                    active: question.active,
                    is_new: question.is_new,
                    reward: question.reward,
                    answers: question.answers,
                    labels: question.labels,
                    created_at: question.createdAt,
                    updated_at: question.updatedAt,
                })
            }
            catch (err) {
                next(err);
            }
        }),

        save: co.wrap(function* (req, res, next) {
            logger.debug("User " + req.user.id + " Updating question " + req.params.id);
            try {
                var question = yield Question.findById(req.params.id);
                var answers = JSON.parse(req.body.answers);
                question.question = req.body.question;
                question.active = req.body.active;
                question.labels = req.body.labels;
                if (question.active) {
                    if(question.is_new){
                       
                        var notification = yield Notification.findOne({type:"new_question"}).exec();
                        console.log(notification);
                        if(notification != null)
                        {
                            var ids = yield User.find({}).select({_id:1}).exec(function(err,ids){
                                var result = [];
                                for(var i=0;i < ids.length; i++ ){
                                    result.push(ids[i]._id);
                                }
                                return result;
                            });
                            notification.receiversNotRead = ids;
                            yield notification.save();
                            console.log("try push ");
                            
                            var users = yield User.find({$or:[
                                {deviceToken: {$exists: true, $not: {$size: 0}}},
                                {deviceTokenSilent: {$exists: true, $not: {$size: 0}}
                                },]});

                            if(users.length > 0){
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
                                //console.log(ids);
                                var message = {
                                    notification: {
                                        title: (notification.pushTitle!="" ? notification.pushTitle : notification.title != "" ? notification.title : "New question!"),
                                        body: (notification.pushBody!="" ? notification.pushBody : notification.message != "" ? notification.message : 'Check a new question!!'),
                                        sound:"default",
                                        priority:"high"
                                    },
                                    data: {
                                        tickets: ""+notification.tickets,
                                        tokens: ""+notification.tokens,
                                        coins: ""+notification.coins,
                                    },
                                };
                              
                                // Send a message to the device corresponding to the provided
                                // registration token.
                                if(ids.length > 0){
                                    var split_tokens = foldm(ids, 100);
                                    for(var kk = 0;kk < split_tokens.length;kk++){
                                        var pull_tokens = split_tokens[kk];
                                        //console.log(pull_tokens);
                                        admin.messaging().sendToDevice(pull_tokens, message)
                                            .then((response) => {
                                                // Response is a message ID string.
                                                console.log('Successfully sent message:', response);
        
                                            })
                                            .catch((error) => {
                                                console.log('Error sending message:', error);
                                            });
                                    }
                                }
                                if(ids_silent.length > 0){
                                    sendSilentNotification(ids_silent);
                                }
                                // admin.messaging().sendToDevice(ids,message)
                                //     .then((response) => {
                                //   // Response is a message ID string.
                                //         console.log('Successfully sent message:', response);
                                //     })
                                //     .catch((error) => {
                                //         console.log('Error sending message:', error);
                                //     });
                                }
                            }
                        
                            
            
                    }
                    question.is_new = false;
                }
                //question.is_new=req.body.is_new;
                question.reward = req.body.reward;
                question.answers = answers;
                question.updatedAt = new Date().toISOString(),
                    yield question.save();
                logger.debug("Question updated.");
                res.json({success: true});
            }
            catch (err) {
                next(err);
            }
        }),

        remove: co.wrap(function* (req, res, next) {
            try {
                
                yield User.update(
                 {  $or:[
                    {question_ids: req.params.id},
                    {questionNotCorrect_ids: req.params.id}
                    ]     
                },
                 {$pull: { question_ids: req.params.id, question_ids: req.params.id } }, { multi: true }   
                );
                var question = yield Question.remove({_id: req.params.id});
                res.json({success: true});
            }
            catch (err) {
                next(err);
            }
        }),

        removeQuestionsByIds: co.wrap(function* (req, res, next) {
            try {
                logger.debug("User " + req.user.id + " try remove questions");
                if (req.body['ids[]'] != null) {
                    var ids = req.body['ids[]'];
                    if (typeof ids === "string") {
                        var id = ids;
                        ids = [id];
                    }
                    yield User.update(
                        {  $or:[
                           {question_ids: {$all: ids}},
                           {questionNotCorrect_ids: {$all: ids}}
                           ]     
                       },
                        {$pull: { question_ids: {$in: ids}, question_ids: {$in: ids} } }, { multi: true }   
                       );
                    yield Question.remove({_id: {$in: ids}});
                    res.json({success: true});
                }
                else res.json({success: false});
            }
            catch (err) {
                next(err);
            }
        }),

        setActiveQuestionsByIds: co.wrap(function* (req, res, next) {
            try {
                logger.debug("User " + req.user.id + " try to set status of questions in game");
                
                var getNew = false;
                if (req.body['ids[]'] != null) {
                    var ids = req.body['ids[]'];
                    var question = yield Question.find({_id: {$in: ids}}).exec();
                    //console.log(question);
                    for (var i = 0; i < question.length; i++) {
                        question[i].active = req.body.active === 'true';
                        if(question[i].active){
                            if(question[i].is_new){
                                getNew = true;
                            }
                            question[i].is_new = false;
                        }
                        yield question[i].save();
                        
                    }
                    if(getNew){
                        var notification = yield Notification.findOne({type:"new_question"});
                        if(notification != null)
                        {
                             var ids = yield User.find({}).select({_id:1}).exec(function(err,ids){
                                var result = [];
                                for(var i=0;i < ids.length; i++ ){
                                   result.push(ids[i]._id);
                                }
                                return result;
                            });
                            notification.receiversNotRead = ids;
                            yield notification.save();
                            if(notification.active){
                                console.log("try push ");
                                if(notification.active){
                                    var users = yield User.find({$or:[
                                        {deviceToken: {$exists: true, $not: {$size: 0}}},
                                        {deviceTokenSilent: {$exists: true, $not: {$size: 0}}
                                        },]});
        
                                    if(users.length > 0){
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
                                        //console.log(ids);
                                        var message = {
                                            notification: {
                                                title: (notification.pushTitle!="" ? notification.pushTitle : notification.title != "" ? notification.title : "New question!"),
                                                body: (notification.pushBody!="" ? notification.pushBody : notification.message != "" ? notification.message : 'Check a new question!!'),
                                                sound:"default",
                                                priority:"high"
                                            },
                                            data: {
                                                tickets: ""+notification.tickets,
                                                tokens: ""+notification.tokens,
                                                coins: ""+notification.coins,
                                            },
                                        };
                                      
                                        // Send a message to the device corresponding to the provided
                                        // registration token.
                                        if(ids.length > 0){
                                            var split_tokens = foldm(ids, 100);
                                            for(var kk = 0;kk < split_tokens.length;kk++){
                                                var pull_tokens = split_tokens[kk];
                                                //console.log(pull_tokens);
                                                admin.messaging().sendToDevice(pull_tokens, message)
                                                    .then((response) => {
                                                        // Response is a message ID string.
                                                        console.log('Successfully sent message:', response);
                
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
                    }
                    res.json({success: true});
                }
                else res.json({success: false});
            }
            catch (err) {
                next(err);
            }
        }),

    };