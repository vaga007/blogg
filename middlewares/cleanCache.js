const { bustCache} = require('../services/cache');

module.exports = async (req,res, next) => {

    console.log('BEFORE : router handler is done', req, res)

    // wait for route handler to finish
    await next();

    console.log('router handler is done', req, res)

    bustCache(req.user.id);

}