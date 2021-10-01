var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var LotteryActionsSchema = new Schema({
    owner:{type:mongoose.Schema.Types.ObjectId, ref:'User'},
    //lotteries_ids:[{type:mongoose.Schema.Types.ObjectId, ref:'Lottery'}],
    title:{type:String,default:'Action'},
    tickets:{type:Number, default:0},
    tokens:{type:Number, default:0},
    coins:{type:Number, default:0},
    active:{type:Boolean,default:true},
    createdAt: {type:Date, default:new Date()},
    updatedAt: {type:Date, default:new Date()},
});

LotteryActionsSchema.pre('save', function (next) {
    this.updatedAt = new Date();
	next();
});

LotteryActionsSchema.method({

    getVO:function ()
    {
        return {
            id: this.id,
            title:this.title,
            coins: this.coins,
            tokens: this.tokens,
            tickets: this.tickets,
        };
    },
});

LotteryActionsSchema.static({

    findOpen:function()
    {
        return this.find({"beginAt" :{ $gt: new Date() }} ).sort({ beginAt: -1 });
    },

    findByLottery:function ( lottery, date )
    {
        return this.findOne({lottery:lottery.id, beginAt:date});
    }
});

module.exports = mongoose.model('LotteryActions', LotteryActionsSchema);
