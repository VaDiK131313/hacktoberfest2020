var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var TicketSchema = new Schema({
    owner:{type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    game:{type: mongoose.Schema.Types.ObjectId, ref: 'Game'},
    lottery:{type: mongoose.Schema.Types.ObjectId, ref: 'Lottery'},
    cost:{type:Number,default:0},
    won:{type:Boolean, default:false},
    createdAt:{type:Date, default:new Date()},
    updatedAt:{type:Date, default:new Date()},
});


TicketSchema.method({

    getVO:function ()
    {
        return {id:this.id, numbers:this.numbers, won:this.won};
    }

});


TicketSchema.static({


});

module.exports = mongoose.model('Ticket', TicketSchema);
