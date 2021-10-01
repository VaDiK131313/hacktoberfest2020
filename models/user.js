const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    first_name: {type: String, default: ''},
    last_name: {type: String, default: ''},
    zip: {type: Number, default: 0},
    date_of_birth: {type: Date, default: new Date()},
    user_name: {type: String, default: ''},
    user_name_show: {type: String, default: ''},
    email: {type: String, default: ''},
    hashed_password: {type: String, default: ''},
    role: {type: String, default: 'player'},
    phone: {type: String, default: 0},
    sex: {type: Number, default: 0},
    race: {type: Number, default: 0},
    country: {type: Number, default: 0},
    city: {type: String, default: ''},
    address: {type: String, default: ''},
    state: {type: String, default: ''},
    salt: {type:String,default:''},
    tokens: {type: Number, default: 200},
    coins: {type: Number, default: 0},
    tickets: {type: Number, default: 0},
    question_ids: [{type: mongoose.Schema.Types.ObjectId, ref: 'Question'}],
    questionNotCorrect_ids: [{type: mongoose.Schema.Types.ObjectId, ref: 'Question'}],
    lastLoginAt: {type: Date, default: new Date()},
    createdAt:{type:Date, default: new Date()},
    limitQuestionAt:{type:Date, default: null},
    countQuestion:{type:Number,default:0},
    countCorrectQuestion:{type:Number,default:0},
    showMainTutorial:{type: Boolean, default: true},
    showGameTutorial:{type: Boolean, default: true},
    deviceToken:[{type:String}],
    deviceTokenSilent:[{type:String}],
    deviceType:{type:String, default:""},
    hoursDiff:{type: Number,default:0},
    addToAdminId:{type: mongoose.Schema.Types.ObjectId, ref: 'User'}
});

UserSchema
    .virtual('password')
    .set(function (password) {
        this._password = password;
        this.salt = this.makeSalt();
        this.hashed_password = this.encryptPassword(password);
    })
    .get(function () {
        return this._password;
    });

UserSchema.path('user_name').validate(function (name) {
    if (this.skipValidation()) return true;
    return name.length;
}, 'Name cannot be blank');

UserSchema.path('email').validate(function (email) {
    if (this.skipValidation()) return true;
    return email.length;
}, 'Email cannot be blank');

UserSchema.path('email').validate(function (email, fn) {
    const User = mongoose.model('User');
    if (this.skipValidation()) fn(true);

    if (this.isNew || this.isModified('email')) {
        User.find({email: email}).exec(function (err, users) {
            fn(!err && users.length === 0);
        });
    } else fn(true);
}, 'Email already exists');

UserSchema.path('hashed_password').validate(function (hashed_password) {
    if (this.skipValidation()) return true;
    return hashed_password.length && this._password.length;
}, 'Password cannot be blank');


UserSchema.pre('save', function (next) {
    if (!this.isNew) return next();

    if (!this.displayName)
        this.displayName = "Player" + Math.floor((Math.random() * 100000) + 1);
        var showUserName = this.user_name;
        if(this.user_name_show !=null && this.user_name_show != ""){
            showUserName = this.user_name_show;
        }
        else
        {
            this.user_name_show = showUserName;
        }
    next();
});

UserSchema.method({
    authenticate: function (plainText) {
        return this.encryptPassword(plainText) === this.hashed_password;
    },

    makeSalt: function () {
        return Math.round((new Date().valueOf() * Math.random())) + '';
    },

    encryptPassword: function (password) {
        if (!password) return '';
        try {
            return crypto
                .createHmac('sha1', this.salt)
                .update(password)
                .digest('hex');
        } catch (err) {
            return '';
        }
    },

    skipValidation: function () {
        return this.customId != '';
    },

    getVO: function () {

        
            return {
                    id: this.id, 
                    user_name: this.user_name,
                    user_name_show: this.user_name_show,
                    first_name: this.first_name,
                    last_name: this.last_name,
                    tickets: this.tickets,
                    coins: this.coins,
                    tokens: this.tokens,
                    email: this.email,
                    phone: this.phone,
                    date_of_birth: this.date_of_birth.getTime(),
                    sex: this.sex,
                    race: this.race,
                    address: this.address,
                    city: this.city,
                    state: this.state,
                    zip: this.zip,
                    country: this.country,
                    question_ids: this.question_ids,
                    question__notcorrect_ids: this.questionNotCorrect_ids,
                    success: true,
                    showMainTutorial: this.showMainTutorial,
                    showGameTutorial: this.showGameTutorial,
                    countQuestion:  this.countQuestion,
                    countCorrectQuestion: this.countCorrectQuestion,
                    limitQuestionAt: this.limitQuestionAt!=null ? this.limitQuestionAt.addHours(24).toISOString().replace(/[A-Z]/g," ").trim():"",
                };


        //return {id: this.id, displayName: this.displayName, balance: this.balance};
    }
});

UserSchema.static({});

module.exports = mongoose.model('User', UserSchema);
