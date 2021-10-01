require('dotenv').config();

const express           = require('express');
var fileUpload          = require('express-fileupload');
const app               = express();
const path              = require('path');
const bodyParser        = require('body-parser');
const cookieParser      = require('cookie-parser');
const cookieSession     = require('cookie-session');
const mongoose          = require('mongoose');
const server            = require('http').Server(app);
const redis             = require("redis"), redisClient = redis.createClient();
const cors              = require('cors');
const pkg               = require('./package.json');
const timeago           = require('timeago.js');
const passport          = require('passport');
const flash             = require('express-flash');
const LobbyApp          = require('./app/lobby/lobbyapp');
const NotificationApp   = require('./app/notification/notificationapp');
const log4js            = require('log4js');
const logger            = log4js.getLogger('server');
const bluebird          = require('bluebird');
const connection        = connect();

logger.info(pkg.description + " v" + pkg.version + " starting ...");

mongoose.Promise = bluebird;

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const KachingApp = {
    app,
    connection,
    redis:redisClient,
    lobby:new LobbyApp(server,redisClient),
    notifications:new NotificationApp()
};

Date.prototype.getUTCTime = function()
{
    return this.getTime() - (this.getTimezoneOffset()*60000);
};

Date.prototype.addSeconds = function(s)
{
    this.setSeconds(this.getSeconds()+s);
    
    return this;
};

Date.prototype.addHours = function(h)
{
    this.setHours(this.getHours()+h);

    return this;
};

Date.prototype.addDays = function(d)
{
    this.setDate(this.getDate() + d);

    return this;
};

Date.prototype.addWeeks = function(w)
{
    this.addDays(7 * w);

    return this;
};

Date.prototype.addMonths = function(m)
{
    this.setMonth(this.getMonth() + m)

    return this;
};

Date.prototype.addYears = function(y)
{
    this.setFullYear(this.getFullYear() + y);

    return this;
};

Date.prototype.addMinutes = function(m)
{
    this.setMinutes(this.getMinutes() + m);

    return this;
};

log4js.configure('./log4js.json');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(fileUpload());
app.use(cors());
app.options('*', cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cookieSession({ secret: 'secret' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bower_components',  express.static( path.join(__dirname, '/bower_components')));
app.use(express.static(__dirname + '/paublic'));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));


app.use(function (req, res, next) {
    res.locals.pkg = pkg;
    res.locals.env = process.env.NAME;
    res.locals.timeago = timeago();
    next();
});

app.use(function (req, res, next) {
    res.locals.isActive = function (link) {
        if (link === '/' ) {
            return req.url === '/' ? 'active' : '';
        } else {
            return req.url.indexOf(link) !== -1 ? 'active' : '';
        }};

    next();
});

redisClient.set("users-online",0);

require('./config/passport')(passport);
require('./config/routes')(app,passport);
require('./config/middlewares/errors')(app);

connection
    .on('error', console.log)
    .on('disconnected', connect)
    .once('open', listen);

function listen ()
{
    logger.info("Connection with database established");

    if (app.get('env') === 'test') return;

    const port = process.env.PORT;
    const ip = process.env.IP;

    server.listen(port);

    logger.info(pkg.name + ' started on port:' + port);

    KachingApp.lobby.start();
    KachingApp.notifications.start();
}

function connect ()
{
    logger.info("Connecting to mongodb server:" + process.env.DB_URL);

    var options = { keepAlive: 1, promiseLibrary: require('bluebird'), useMongoClient: true };

    return mongoose.connect(process.env.DB_URL, options);
}

module.exports = KachingApp;
