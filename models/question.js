var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var QuestionSchema = new Schema({
    //game:{type: mongoose.Schema.Types.ObjectId, ref: 'Game'},
    owner:{type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    title:{type:String,default:"Question {0}"},
    question:{type:String,default:""},
    labels:{type:String,default:""},
    active:{type:Boolean, default:false},
    is_new:{type:Boolean, default:true},
    reward:{type:Number, default:1},
    answers:{type:Array, default:[]},
    createdAt:{type:Date, default:new Date()},
    updatedAt:{type:Date, default:new Date()}
});


QuestionSchema.method({

    getVO:function ()
    {
        return {
            id:this.id,
            title:this.title,
            question:this.question,
            answers:this.answers,
        };
    }

});


QuestionSchema.static({


});

module.exports = mongoose.model('Question', QuestionSchema);
