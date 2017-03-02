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
  function getAllUsersTimeRecords (email) {
    return new Promise((resolve, reject) => {
      const getAuthUsers = repo.getAuthorizedUsers()
      const getTimeRecords = repo.getTimeRecordsByEmail(email)
      Promise.all([getAuthUsers, getTimeRecords]).then(values => {
        const authorisedUsers = _.orderBy(values[0], u => u.name)
        const currentYear = new Date().getFullYear()
        const timerecords = getGroupedByMonth(_.filter(values[1], r => parseInt(r.year) === currentYear))
        
        resolve({
          authorisedUsers: authorisedUsers,
          timerecords: timerecords
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
