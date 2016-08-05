module.exports = function (redisClient) {
  return {
    getIfExists: function getIfExists (req, res, next) {
      const email = req.user.emails[0].value
      redisClient.exists(email, (err, exists) => {
        if (!err && exists) {
          redisClient.get(email, (err, data) => {
            if (!err) {
              const model = JSON.parse(data)
              req.cachedData = model
            }
            next()
          })
        } else {
          next()
        }
      })
    },
    clear: function clear (req, res, next) {
      const email = req.user.emails[0].value
      redisClient.del(email)
      next()
    }
  }
}
