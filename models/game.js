var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var GameSchema = new Schema({
    lottery:{type:mongoose.Schema.Types.ObjectId, ref:'Lottery'},
    won:{type: mongoose.Schema.Types.ObjectId, ref: 'Ticket'},
    name:{type:String,default:''},
    rewardQuestion:{type:Number,default:1},
    costPlinko:{type:Number,default:1},
    rewardsPlinko:[{type: Number, default: 100}],
    minRewardPlinko:{type:Number,default:50},
    createdAt: {type:Date, default:new Date()},
    updatedAt: {type:Date, default:new Date()},
    beginAt: {type:Date, default:null},
    questionLimit: {type:Number , default:20},
    questionLimitText: {type:String , default:""},
    questionCorrectLimit: {type:Number , default:15},
    questionCorrectLimitText: {type:String , default:""},
    regRewardCoins:{type:Number,default:200},
    regRewardTokens:{type:Number,default:0},
    regRewardTickets:{type:Number,default:0}
});

GameSchema.method({

    getVO:function ()
    {
        return {
            name:this.name,
            reward_question: this.rewardQuestion,
            cost_plinko:this.costPlinko,
            rewards_plinko:this.rewardsPlinko,
            reg_coins: this.regRewardCoins,
            reg_tokens: this.regRewardTokens,
            reg_tickets: this.regRewardTickets,
            question_limit: this.questionLimit,
            question_limit_text: this.questionLimitText,
            question_correct_limit: this.questionCorrectLimit,
            question_correct_limit_text: this.questionCorrectLimitText
        };
    },

    applyLottery( lottery, date )
    {
        this.lottery = lottery;
        this.name = lottery.name;
        this.numbers = lottery.numbers;
        this.limit = lottery.limit;
        this.jackpotLimit = lottery.jackpotLimit;
        this.playerLimit = lottery.playerLimit;
        this.household = lottery.household;
        this.cost = lottery.cost;

        this.beginAt = date;
    }

});

GameSchema.static({

    findOpen:function()
    {
        return this.find({"beginAt" :{ $gt: new Date() }} ).sort({ beginAt: -1 });
    },

    findByLottery:function ( lottery, date )
    {
        return this.findOne({lottery:lottery.id, beginAt:date});
    }
});

module.exports = mongoose.model('Game', GameSchema);
