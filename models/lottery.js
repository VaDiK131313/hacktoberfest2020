var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var LotterySchema = new Schema({
    name:{type:String,default:''},
    repeat:{type:String,default:'none'},
    jackpotLimit:{type:Number,default:0},
    cost:{type:Number,default:0},
    createdAt:{type:Date, default:new Date()},
    updatedAt:{type:Date, default:new Date()},
    availableAt:{type:Date, default:new Date()},
    nextBeginAt:{type:Date,default: new Date().toISOString()},
    winner:{type:String, default:''},
    lastDay:{type:Boolean,default:false},
    actions_ids:[{type:mongoose.Schema.Types.ObjectId, ref:'LotteryActions'}],
    needSend:{type:Boolean,default:true}
});


LotterySchema.virtual('tickets',
        {
            ref: 'Ticket', // The model to use
            localField: '_id', // Find people where `localField`
            foreignField: 'lottery', // is equal to `foreignField`
            // If `justOne` is true, 'members' will be a single doc as opposed to
            // an array. `justOne` is false by default.
            justOne: true
          });

LotterySchema.method({

    isExpired:function (  )
    {
        if(this.repeat == 'none' && this.availableAt)
        {
            return new Date().getTime() > this.availableAt.getTime();
        }

        return false;
    },

    getVO:function ()
    {
        return {
            //beginAt:this.nextDraw,
            winner:this.winner,
            id:this.id,
            cost:this.cost,
            coins:this.jackpotLimit,
            name:this.name,
            repeat:this.repeat,
            availableAt:this.availableAt,
        };
    }
});

LotterySchema.static({

    findAvailable:function()
    {
        return this.find({"availableAt" :{ $lt: new Date() }} );
    }

});

module.exports = mongoose.model('Lottery', LotterySchema);
