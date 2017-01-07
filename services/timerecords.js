const _ = require('lodash')

module.exports = function (repo) {
  function getMainModel (email) {
    return new Promise((resolve, reject) => {
      const getTimeRecords = repo.getTimeRecordsByEmail(email)
      const getWorkingGroups = repo.getWorkingGroups()
      const getCategories = repo.getCategories()
      const getDurations = repo.getDurations()
      Promise.all([getWorkingGroups, getCategories, getDurations, getTimeRecords]).then(values => {
        const model = {
          workingGroups: values[0],
          categories: values[1],
          durations: values[2],
          currentDay: new Date().getDate(),
          currentMonth: new Date().getMonth() + 1,
          currentYear: new Date().getFullYear(),
          timeRecords: getGroupedByMonth(values[3])
        }
        resolve(model)
      }).catch(e => reject(e))
    })
  }
  function getAllUsersTimeRecords () {
    return new Promise((resolve, reject) => {
      const getAuthUsers = repo.getAuthorizedUsers()
      const getTimeRecords = repo.getAllUsersTimeRecords()
      Promise.all([getAuthUsers, getTimeRecords]).then(values => {
        const authorisedUsers = _.orderBy(values[0], u => u.name)
        const currentYear = new Date().getFullYear()
        const timerecords = _.filter(values[1], r => parseInt(r.year) === currentYear)
        const recordsGroupedByEmail = _.groupBy(timerecords, record => record.email)
        const timerecordsByEmail = _.orderBy(_.map(recordsGroupedByEmail, (userRows, email) => {
          return {
            email: email,
            timeRecords: getGroupedByMonth(userRows)
          }
        }), x => x.email)
        const hash = _.keyBy(timerecordsByEmail, 'email')
        const timerecordsPerUser = _.map(authorisedUsers, u => {
          const temp = hash[u.email]
          if (temp) {
            temp.id = _.camelCase(u.name)
            temp.user = u.name
            return temp
          }
          return {
            id: _.camelCase(u.name),
            user: u.name,
            email: u.email,
            timeRecords: []
          }
        })
        const sum = _.reduce(timerecords, (sum, r) => { return sum + parseFloat(r.duration) }, 0)
        resolve({
          timerecordsPerUser: timerecordsPerUser,
          sum: sum
        })
      }).catch(e => reject(e))
    })
  }
  function getGroupedByMonth (timerecords) {
    const recordsGroupedByMonth = _.groupBy(timerecords, record => {
      const y = record.year
      const m = record.month - 1

      return new Date(y, m, 1)
    })

    const res = _.map(recordsGroupedByMonth, (rowsByMonth, key) => {
      return {
        monthDate: key,
        records: _.orderBy(rowsByMonth, r => {
          const y = r.year
          const m = r.month - 1
          const d = r.day

          return new Date(y, m, d)
        }, 'desc'),
        durationSum: _.reduce(rowsByMonth, (sum, r) => { return sum + parseFloat(r.duration) }, 0)
      }
    })

    return _.orderBy(res, x => { return new Date(x.monthDate) }, 'desc')
  }

  return {
    getMainModel: getMainModel,
    getAllUsersTimeRecords: getAllUsersTimeRecords,
    getGroupedByMonth: getGroupedByMonth
  }
}
