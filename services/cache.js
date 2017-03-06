
module.exports = function (repo, redisClient) {
  function getWorkingGroups () {
    return getStaticData('working_groups', repo.getWorkingGroups())
  }

  function getDurations () {
    return getStaticData('durations', repo.getDurations())
  }

  function getCategories () {
    return getStaticData('categories', repo.getCategories())
  }

  function getAuthorizedUsers () {
    return getStaticData('authorized_users', repo.getAuthorizedUsers())
  }

  function getStaticData (key, promise) {
    return new Promise((resolve, reject) => {
      redisClient.exists(key, (err, exists) => {
        if (!err && exists) {
          redisClient.get(key, (err, data) => {
            if (!err) {
              const res = JSON.parse(data)
              resolve(res)
            } else {
              reject(err)
            }
          })
        } else {
          promise.then(res => {
            redisClient.setex(key, 24 * 60 * 60, JSON.stringify(res))
            resolve(res)
          })
        }
      })
    })
  }

  return {
    getWorkingGroups: getWorkingGroups,
    getDurations: getDurations,
    getCategories: getCategories,
    getAuthorizedUsers: getAuthorizedUsers
  }
}
