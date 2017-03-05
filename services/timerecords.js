const _ = require('lodash')


module.exports = function (repo, cacheService) {
  function getMainPageViewModel (email, workingGroups, categories, durations) {
    return new Promise((resolve, reject) => {
      const getTimeRecords = repo.getTimeRecordsByEmail(email)
      const getWorkingGroups = cacheService.getWorkingGroups()
      const getCategories = cacheService.getCategories()
      const getDurations = cacheService.getDurations()
      Promise.all([getWorkingGroups, getCategories, getDurations, getTimeRecords]).then(values => {
        const model = {
          workingGroups: values[0],
          categories: values[1],
          durations: values[2],
          currentDay: new Date().getDate(),
          currentMonth: new Date().getMonth() + 1,
          currentYear: new Date().getFullYear(),
          timeRecords: getMonthRecordsSections(values[3])
        }
        resolve(model)
      }).catch(e => reject(e))
    })
  }
  function getAllUsersRecordsPageViewModel (email) {
    return new Promise((resolve, reject) => {
      const getAuthUsers = cacheService.getAuthorizedUsers()
      const getTimeRecords = repo.getTimeRecordsByEmail(email)
      Promise.all([getAuthUsers, getTimeRecords]).then(values => {
        resolve({
          authorisedUsers: _.orderBy(values[0], u => u.name),
          timerecords: _.flow([filterCurrentYearRecords, getMonthRecordsSections])(values[1])
        })
      }).catch(e => reject(e))
    })
  }

  function filterCurrentYearRecords (records) {
    const currentYear = new Date().getFullYear()
    return _.filter(records, r => parseInt(r.year) === currentYear)
  }

  function groupByMonth (timerecords) {
    return _.groupBy(timerecords, record => {
      const y = record.year
      const m = record.month - 1

      return new Date(y, m, 1)
    })
  }

  function getMonthRecordsSection (monthsRecords, month) {
    return {
      monthDate: month,
      records: _.orderBy(monthsRecords, r => {
        const y = r.year
        const m = r.month - 1
        const d = r.day

        return new Date(y, m, d)
      }, 'desc'),
      durationSum: _.reduce(monthsRecords, (sum, r) => { return sum + parseFloat(r.duration) }, 0)
    }
  }

  function orderMonthSectionsByMonth (sections) {
    return _.orderBy(sections, x => { return new Date(x.monthDate) }, 'desc')
  }

  function getMonthRecordsSections (records) {
    return _.flow([groupByMonth, (groups) => _.map(groups, getMonthRecordsSection), orderMonthSectionsByMonth])(records)
  }

  return {
    getMainPageViewModel: getMainPageViewModel,
    getAllUsersRecordsPageViewModel: getAllUsersRecordsPageViewModel,
    getMonthRecordsSections: getMonthRecordsSections
  }
}
