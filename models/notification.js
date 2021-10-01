var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//const timeZone = require('mongoose-timezone');

var NotificationSchema = new Schema({
    owner:{type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    receivers:[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    receiversNotRead:[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    //lottery:{type: mongoose.Schema.Types.ObjectId, ref: 'Lottery'},
    type:{type:String,default:'custom'},
    title:{type:String, default:''},
    message:{type:String, defualt:''},
    tickets:{type:Number, default:0},
    tokens:{type:Number, default:0},
    coins:{type:Number, default:0},
    body:{type:Object},
    active:{type:Boolean,default:false},
    createdAt:{type:Date, default:new Date()},
    updatedAt:{type:Date, default:new Date()},
    beginAt:{type:Date, default:new Date().toISOString()},
    actions_ids:[{type:mongoose.Schema.Types.ObjectId, ref:'LotteryActions'}],
    needSend:{type:Boolean,default:true},
    pushSend:[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    pushTitle:{type:String, default:""},
    pushBody:{type:String, default:""},
});
NotificationSchema
	.virtual('beginAtStr')
	.get(function () {
        var options = {year: 'numeric', month: '2-digit', day: '2-digit',hour:'2-digit', minute:'2-digit',hour12:'true' };
		return this.beginAt.toLocaleString("en-US",options);
	});
NotificationSchema.method({
  
    getVO:function ()
    {
        return {
            id:this.id,
            title:this.title.replace(/i/g,'I'),
            message:this.message,
            tickets:this.tickets,
            tokens:this.tokens,
            coins:this.coins,
            body:this.body,
            active:this.active,
            type:this.type,
            createdAt:this.createdAt.getTime()
        };
    }

});


NotificationSchema.static({


});
//NotificationSchema.plugin(timeZone, { paths: ['beginAt'] });
module.exports = mongoose.model('Notification', NotificationSchema);
