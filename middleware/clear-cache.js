module.exports = function (redisClient) {
  return function (req, res, next) {
    const email = req.user.emails[0].value
    redisClient.del(email)
    next()
  }
}
