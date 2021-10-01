module.exports = function (app)
{
    app.use(function (err, req, res, next)
    {
        if (err.message
            && (~err.message.indexOf('not found')))
        {
            return next();
        }

        console.error(err.stack);

        if (err.stack.includes('ValidationError'))
        {
            res.status(422).render('422', { error: err.stack });
            return;
        }

        res.status(500).render('500', { error: err.stack, title:'500 - Oops! Internal server error occured'});
    });

    // assume 404 since no middleware responded
    app.use(function (req, res)
    {
        console.log('404:' + req.originalUrl);

        const payload = {
            url: req.originalUrl,
            error: 'Not found'
        };

        if (req.accepts('json'))
            return res.status(404).json(payload);

        res.status(404).render('404', payload);
    });

};