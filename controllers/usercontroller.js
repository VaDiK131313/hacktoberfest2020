const User              = require('../models/user');
const co                = require('co');
const logger            = require('log4js').getLogger('usercontroller');
const Ticket            = require('../models/ticket');
const Game              = require('../models/game');
const Question          = require('../models/question');
var DateDiff            = require('date-diff');
module.exports =
    {
        index:co.wrap(function* (req, res, next)
        {
            try
            {
                const payload = {title:'Players',users:[],canAddAdmin:false};
                payload.users = yield User.find({role:'player'}).limit(1000).exec();
                payload.questions_count = yield Question.count({});
                for(var i=0;i < payload.users.length;i++){
                    var tickets = yield Ticket.find({owner:payload.users[i].id});
                    payload.users[i].tickets = tickets.length;
                }
                if(req.user.role === "main_admin" || req.user.role === "admin"){
                    payload.canAddAdmin = true;
                }
                res.render('user/players', payload);
            }
            catch (err)
            {
                next(err);
            }
        }),
       
        me:co.wrap(function* (req,res,next  )
        {
            var showUserName = req.user.user_name;
            if(req.user.user_name_show !=null && req.user.user_name_show != ""){
                showUserName = req.user.user_name_show;
            }
            else
            {
                req.user.user_name_show = showUserName;
                yield req.user.save();
            }
            return res.json(
                {
                    id: req.user.id, 
                    user_name: req.user.user_name,
                    user_name_show: showUserName,
                    first_name: req.user.first_name,
                    last_name: req.user.last_name,
                    tickets: req.user.tickets,
                    coins: req.user.coins,
                    tokens: req.user.tokens,
                    email: req.user.email,
                    phone: req.user.phone,
                    date_of_birth: req.user.date_of_birth.getTime(),
                    sex: req.user.sex,
                    race: req.user.race,
                    address: req.user.address,
                    city: req.user.city,
                    state: req.user.state,
                    zip: req.user.zip,
                    country: req.user.country,
                    question_ids: req.user.question_ids,
                    question__notcorrect_ids: req.user.questionNotCorrect_ids,
                    success: true,
                    showMainTutorial: req.user.showMainTutorial,
                    showGameTutorial: req.user.showGameTutorial,
                    countQuestion:  req.user.countQuestion,
                    countCorrectQuestion: req.user.countCorrectQuestion,
                    limitQuestionAt: req.user.limitQuestionAt!=null ? req.user.limitQuestionAt.addHours(24).toISOString().replace(/[A-Z]/g," ").trim():"",
                });
        }),

        checkUserName:co.wrap(function* (req,res,next  )
        {
            try
            {
                var user = yield User.findOne({ user_name: req.body.user_name });

                return res.json({success:user == null});
            }
            catch(err)
            {
                next(err);
            }
        }),

        checkEmail:co.wrap(function* (req,res,next  )
        {
            try
            {
                var user = yield User.findOne({ email: req.body.email });

                return res.json({success:user == null});
            }
            catch(err)
            {
                next(err);
            }
        }),

        save:co.wrap(function* (req, res, next)
        {
            logger.debug("Updating user " + req.params.id);
            try
            {
                var user = yield User.findById(req.params.id);

                logger.debug("User found, name " + user.user_name);

                user.first_name = req.body.first_name;
                user.last_name = req.body.last_name;
                user.date_of_birth = new Date(req.body.date_of_birth);
                user.sex = req.body.sex;
                user.city = req.body.city;
                user.state = req.body.state;
                user.zip = req.body.zip;
                user.phone  = req.body.phone;
                user.email = req.body.email;
                user.coins = req.body.coins;
                user.tokens = req.body.tokens;
                user.address = req.body.address;
                yield user.save();

                logger.debug("User updated.");

                res.json({success:true});
            }
            catch(err)
            {
                next( err );
            }
        }),

        admins:co.wrap(function* (req, res, next)
        {
            try
            {
                const payload = {title:'Administrators',users:[],canRevoke:false};

                payload.users = yield User.find({role:'admin'}).limit(1000);
                //console.log(payload.users);
                var pos =  yield User.findOne({role:'admin',addToAdminId:req.user.id});
                if(req.user.role === 'main_admin'){
                    payload.canRevoke = true; 
                }
                else if(req.user.role === 'admin' && pos != null){
                    payload.admin = req.user.id;
                }
                //console.log(payload);
                res.render('user/admins', payload);
            }
            catch (err)
            {
                next(err);
            }
        }),
        remokeAdmin:co.wrap(function* (req, res, next)
        {
            logger.debug("Revoke admin user " + req.params.id +" by "+ req.user.id);
            try
            {
                
                var user = yield User.findById(req.params.id);
                if
                (req.user.role != 'main_admin' &&
                (req.user.role == 'admin' && (user.addToAdminId != null && user.addToAdminId != req.user.id) || user.addToAdminId == null)){
                    return res.json({success:false});
                }
                logger.debug("User found, name " + user.user_name);

                user.role = 'player';
                delete user.addToAdminId;
                yield user.save();

                logger.debug("User updated.");

                res.json({success:true});
            }
            catch(err)
            {
                next( err );
            }
        }),
        addAdmin:co.wrap(function* (req, res, next)
        {
            logger.debug("Add admin user " + req.params.id +" by "+ req.user.id);
            try
            {
                console.log(req.user.role);
                if(req.user.role != 'main_admin' && req.user.role != 'admin'){
                    return res.json({success:false});
                }
                console.log("!!!!!!!!!!!!!!!");
                var user = yield User.findById(req.params.id);

                logger.debug("User found, name " + user.user_name);

                user.role = 'admin';
                user.addToAdminId = req.user.id;
                yield user.save();

                logger.debug("User updated.");

                res.json({success:true});
            }
            catch(err)
            {
                next( err );
            }
        }),
        remove:co.wrap(function* (req, res, next)
        {
            try
            {
                if(req.params.id != req.user.id){
                    var user = yield User.findById(req.params.id);

                    user.cues = [];
                    yield Ticket.remove({owner:user.id});
                    yield user.remove();
    
                    res.json({success:true});
                }
                else res.json({success:false});
            }
            catch (err)
            {
                next(err);
            }
        }),
        removeUsersByIds:co.wrap(function* (req, res, next)
        {
            try
            {
                console.log(req.body['ids[]']);
                if(req.body['ids[]'] != null ){
                    var ids = req.body['ids[]'];
                    console.log(ids);
                    //for(var i=0;i<req.body.ids.length;i++){
                        var index = ids.indexOf(req.user.id);
                        if(index != -1){
                        ids.splice(index, 1);
                    }
                    console.log(ids);
                    //}
                    yield Ticket.remove({owner:{$in:ids}});
                    yield User.remove({_id:{$in:ids}});
                    res.json({success:true});
                }
                else res.json({success:false});
            }
            catch (err)
            {
                next(err);
            }
        }),

        updateProfile:co.wrap(function* (req, res, next)
        {
            try
            {
                var user = req.user;
                user.email = req.body.email != null ? req.body.email : user.email;
                user.date_of_birth = req.body.date_of_birth != null ? req.body.date_of_birth : user.date_of_birth;
                user.sex = req.body.sex != null ? req.body.sex : user.sex;
                user.city = req.body.city != null ? req.body.city : user.city;
                user.address = req.body.address != null ? req.body.address : user.address;
                user.state = req.body.state != null ? req.body.state : user.state;
                user.zip = req.body.zip != null ? req.body.zip : user.zip;
                user.phone = req.body.phone != null ? req.body.phone : user.phone;
                user.first_name = req.body.first_name != null ? req.body.first_name : user.first_name;
                user.last_name = req.body.last_name != null ? req.body.last_name : user.last_name;
                user.showMainTutorial =  req.body.showMainTutorial !=null ? req.body.showMainTutorial : user.showMainTutorial;
                user.showGameTutorial =  req.body.showGameTutorial !=null ? req.body.showGameTutorial : user.showGameTutorial;
                if(req.body.password != null && req.body.password.length >=8 ){
                    user.password = req.body.password;
                }
                yield user.save();

                return res.json({success:true});
            }
            catch (err)
            {
                return res.json({success:false});
            }
        }),
        
        updateCurrentQuestion:co.wrap(function* (req, res, next)
        {
            try
            {
                
                var settings = yield Game.findOne({}).sort({ beginAt: -1 }).exec();
                
                
                var user = req.user;
                if(settings != null)
                {
                    if(req.body.correct){
                        req.user.countCorrectQuestion +=1;
                    }
                    else{

                    
                        req.user.countQuestion += 1;
                        }
                    
                    // if((req.user.countQuestion + req.user.countCorrectQuestion  >= settings.questionLimit)
                    //     && (req.user.countCorrectQuestion >= settings.questionCorrectLimit))
                    // {
                    //    var userDate = new Date(req.body.nowTime);
                    //    req.user.limitQuestionAt = new Date(); 
                    // }
                    yield req.user.save();
                }


                logger.debug("User "+ user.id + "set "+(req.body.correct?"correct":"uncorrect")+" answer to question " + req.body.question_id);
                var question_id = req.body.question_id != null ? req.body.question_id : 0; 
                if(question_id === "-1")
                {
                    user.question_ids = [];
                    user.questionNotCorrect_ids = [];
                    yield user.save();
                    return res.json({success:true});
                }

                var question = yield Question.findById(question_id);
                if(question != null)
                {
                    if(req.body.correct){
                        if(user.question_ids.indexOf(question.id) == -1)
                        {
                            user.question_ids.push(question.id);    
                        }
                    }
                    else{
                        if(user.questionNotCorrect_ids.indexOf(question.id) == -1)
                        {
                            user.questionNotCorrect_ids.push(question.id);    
                        }
                    }
                   
                    yield user.save();
                }

                //yield user.save();

                return res.json({success:true});
            }
            catch (err)
            {
                return res.json({success:false});
            }
        }),

        updateProfileStat:co.wrap(function* (req, res, next)
        {
            try
            {
                var user = req.user;
                user.tokens = req.body.tokens;
                user.coins = req.body.coins;
                user.tickets = req.body.tickets;
                yield user.save();

                return res.json({success:true});
            }
            catch (err)
            {
                return res.json({success:false});
            }
        }),

        updateProfileCoins:co.wrap(function* (req, res, next)
        {
            try
            {
                
                var user = req.user;
                if(req.body.add){
                    user.coins += req.body.count;
                }
                else
                {
                    user.coins -= req.body.count;
                }

                yield user.save();

                return res.json({success:true,user:req.user});
            }
            catch (err)
            {
                return res.json({success:false});
            }
        }),
        updateProfileTutorial:co.wrap(function* (req, res, next)
        {
            try
            {
                logger.debug("Updating Tutorials statuses for user " + req.params.id);
                var user = req.user;
                if(req.body.showMainTutorial != null){
                    user.showMainTutorial = req.body.showMainTutorial;
                }
                if(req.body.showGameTutorial != null){
                    user.showGameTutorial = req.body.showGameTutorial;
                }
                

                yield user.save();

                return res.json({success:true,user:req.user});
            }
            catch (err)
            {
                return res.json({success:false});
            }
        }),
        setKlinkoMinRewardValue:co.wrap(function* (req, res, next)
        {
            try
            {
                var reward = 50;
                var cost = 1
                var settings = yield Game.findOne({}).sort({ beginAt: -1 }).exec();
                if(settings !=null){
                    reward = settings.minRewardPlinko;
                    cost   = settings.costPlinko;
                }
                var user = req.user;
                user.tokens -= cost;
                user.coins +=reward;

                yield user.save();

                return res.json({success:true});
            }
            catch (err)
            {
                return res.json({success:false});
            }
        }),
        
        getUsers:co.wrap(function* (req, res, next)
        {
            try
            {
                const payload = {title:'Players',users:[]};
                payload.users = yield User.find({role:'player'}).limit(1000).exec();
                payload.questions_count = yield Question.count({});
                for(var i=0;i < payload.users.length;i++){
                    var tickets = yield Ticket.find({owner:payload.users[i].id});
                    payload.users[i].tickets = tickets.length;
                }
                res.send(payload);
            }
            catch (err)
            {
                next(err);
            }
        }),
        setAnswer:co.wrap(function* (req, res, next)
        {
            try
            {
                var userDate = new Date(req.body.nowTime);
                var settings = yield Game.findOne({}).sort({ beginAt: -1 }).exec();
                if(settings != null)
                {
                    req.user.countQuestion += 1;
                    
                    if(req.user.countQuestion >= settings.questionLimit){
                       req.user.limitQuestionAt = new Date().toISOString(); 
                    }
                    yield req.user.save();
                }
                return res.json({success:true});
            }
            catch (err)
            {
                return res.json({success:false});
            }
        }),
    };