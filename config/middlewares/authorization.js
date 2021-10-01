'use strict';

exports.requiresLogin = function (req, res, next)
{
    console.log(req.isAuthenticated());
    
    if (req.isAuthenticated()){
        if(req.user.role=="admin" || req.user.role=="main_admin")
            return next();
        res.redirect('/logout');    
    }
    if (req.method == 'GET')
        req.session.returnTo = req.originalUrl;

    res.redirect('/login');
};

exports.apiRequiresLogin = function (req, res, next)
{
    if (req.isAuthenticated()) return next();

    res.send(401);
};


exports.user = {
    hasAuthorization: function (req, res, next)
    {
        next();
    }
};

exports.api = {
    hasAuthorization: function (req, res, next)
    {
        next();
    }
};
