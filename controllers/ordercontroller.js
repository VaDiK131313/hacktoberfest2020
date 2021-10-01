const User              = require('../models/user');
const co                = require('co');
const logger            = require('log4js').getLogger('usercontroller');

module.exports =
    {
        order:co.wrap(function* (req, res, next)
        {
            try
            {
                var coins = req.body.coins!=null ? parseInt(req.body.coins): 200;
                
                var responses =[
                    {message: "Order placed", points: coins, success:true},
                    {error: "Something error", success:false}
                    ];
                var random = Math.floor(Math.random()*responses.length);
                if(random.success){
                    req.user.coins -= coins;
                    yield req.user.save();
                }
                res.json(responses[random]);        
                   
            }
            catch (err)
            {
                next(err);
            }
        }),
    };