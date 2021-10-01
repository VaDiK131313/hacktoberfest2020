const DashboardController       = require('../controllers/dashboardcontroller');
const GamesController           = require('../controllers/gamescontroller');
const LoginController           = require('../controllers/logincontroller');
const UserController            = require('../controllers/usercontroller');
const NotificationController    = require('../controllers/notificationcontroller');
const TicketController          = require('../controllers/ticketcontroller');
const LotteryController         = require('../controllers/lotterycontroller');
const QuestionController        = require('../controllers/questioncontroller');
const OrderController           = require('../controllers/ordercontroller');
const LotteryActionsController         = require('../controllers/lotteryactionscontroller');
const auth = require('./middlewares/authorization');

module.exports = function (app,passport)
{
    app.get('/login',LoginController.login);
    app.get('/logout',LoginController.logout);

    app.get('/signup',LoginController.signup);
    app.post('/signup',LoginController.register);

    app.post('/login',passport.authenticate('local', { successRedirect: '/admin/dashboard',
        failureRedirect: '/login' ,failureFlash: true}));

    app.get('/admin/dashboard', auth.requiresLogin, DashboardController.index);
    app.get('/admin/users', auth.requiresLogin, UserController.index);
    app.get('/admin/users/get', auth.requiresLogin, UserController.getUsers);
    app.post('/admin/api/users/:id', auth.requiresLogin, UserController.save);
    app.post('/admin/api/remove/users', auth.requiresLogin, UserController.removeUsersByIds);
    app.delete('/admin/api/users/:id', auth.requiresLogin, UserController.remove);
    app.delete('/admin/api/ticket/:id', auth.requiresLogin, GamesController.removeTicket);
    app.get('/admin/api/admin_revoke/:id',auth.requiresLogin, UserController.remokeAdmin);
    app.get('/admin/api/admin_add/:id',auth.requiresLogin, UserController.addAdmin);

    app.get('/admin/games', auth.requiresLogin, GamesController.index);
    app.get('/admin/lotteries', auth.requiresLogin, LotteryController.index);
    app.get('/admin/games/:id/tickets', auth.requiresLogin, GamesController.tickets);
    
    app.get('/admin/lotteries/actions', auth.requiresLogin, LotteryActionsController.index);
    
    app.post('/admin/lottery_action/:id', auth.requiresLogin, LotteryActionsController.save);
    app.post('/admin/api/lottery_action/create',auth.requiresLogin, LotteryActionsController.create);
    app.delete('/admin/api/lottery_action/:id', auth.requiresLogin, LotteryActionsController.remove);
    app.get('/admin/lottery_actions/get',auth.requiresLogin, LotteryActionsController.getActiveActions);
    app.post('/api/lottery_action/get',passport.authenticate('jwt-bearer', { session: false }), LotteryActionsController.getActiveActions);

    app.get('/admin/admins', auth.requiresLogin, UserController.admins);
    
    app.delete('/admin/api/game/:id', auth.requiresLogin, GamesController.remove);
    app.post('/admin/api/game/', auth.requiresLogin, GamesController.save);

    app.delete('/admin/api/lottery/:id', auth.requiresLogin, LotteryController.remove);
    app.post('/admin/api/lottery/', auth.requiresLogin, LotteryController.save);


    /*Quesstion routes*/
    app.get('/admin/questions', auth.requiresLogin, QuestionController.index);
    app.post('/admin/question/:id', auth.requiresLogin, QuestionController.save);
    app.post('/admin/api/questions/create',auth.requiresLogin, QuestionController.create);
    app.delete('/admin/api/questions/:id', auth.requiresLogin, QuestionController.remove);
    app.post('/admin/api/remove/questions', auth.requiresLogin, QuestionController.removeQuestionsByIds);
    app.post('/admin/api/setactive/questions', auth.requiresLogin, QuestionController.setActiveQuestionsByIds);
    app.post('/api/questions/get', passport.authenticate('jwt-bearer', { session: false }), QuestionController.getQuestions);
    app.post('/admin/uploadcsv', auth.requiresLogin, QuestionController.uploadCsv);
    /*End question routes*/
    
    /*Notification routes*/
    app.get('/admin/notifications', auth.requiresLogin, NotificationController.index);
    app.post('/admin/notification/:id', auth.requiresLogin, NotificationController.save);
    app.post('/admin/api/notification/create_custom',auth.requiresLogin, NotificationController.create);
    app.delete('/admin/api/notification/:id', auth.requiresLogin, NotificationController.remove);
    app.post('/api/notifications/get',passport.authenticate('jwt-bearer', { session: false }), NotificationController.getActiveNotifications);
    /*End notification routes */

    app.post('/api/login', LoginController.loginWithUserNameAndPassword);
    app.post('/api/signup', LoginController.register);
    app.get('/api/logout', LoginController.logout);
    app.post('/api/logout', LoginController.logoutApi);
    app.post('/api/save/device-token', passport.authenticate('jwt-bearer', { session: false }), LoginController.saveDeviceToken);
    app.post('/api/check/username', UserController.checkUserName);
    app.post('/api/check/email', UserController.checkEmail);
    app.post('/api/update/profile', passport.authenticate('jwt-bearer', { session: false }), UserController.updateProfile);
    app.post('/api/update/currentquestion', passport.authenticate('jwt-bearer', { session: false }), UserController.updateCurrentQuestion);
    app.post('/api/update/profile/stat', passport.authenticate('jwt-bearer', { session: false }), UserController.updateProfileStat);
    app.post('/api/plinko/startdrop', passport.authenticate('jwt-bearer', { session: false }), UserController.setKlinkoMinRewardValue);
    app.get('/api/me', passport.authenticate('jwt-bearer', { session: false }), UserController.me);
    app.post('/api/updatelogin', passport.authenticate('jwt-bearer', { session: false }), LoginController.updateLoginByToken);
    app.post('/api/update/profile/coins', passport.authenticate('jwt-bearer', { session: false }), UserController.updateProfileCoins);
   
    app.post('/api/update/profile/tutorial', passport.authenticate('jwt-bearer', { session: false }), UserController.updateProfileTutorial);

    app.post('/api/order',passport.authenticate('jwt-bearer', {session: false}), OrderController.order);
    app.post('/api/ticket/buy', passport.authenticate('jwt-bearer', { session: false }), TicketController.buy);
    app.post('/api/game/:id/tickets', passport.authenticate('jwt-bearer', { session: false }), GamesController.getTickets);
    app.post('/api/getsettings',passport.authenticate('jwt-bearer', {session:false}), GamesController.getGameSettings);
    app.post('/api/lottery', passport.authenticate('jwt-bearer', { session: false }), LotteryController.getLotteryInfo);
    //TODO Remove this
    app.post('/api/lottery/:id/addTickets', passport.authenticate('jwt-bearer', { session: false }), TicketController.createTickets);
    //End TODO
    app.get('/admin/', function(req, res) {
        res.redirect('/admin/dashboard');
    });

    app.get('/', function(req, res) {
        res.redirect('/admin/dashboard');
    });

}
