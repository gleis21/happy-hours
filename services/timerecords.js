const _ = require('lodash')


module.exports = function (repo, cacheService) {
  function getUserRecords (email) {
    return new Promise((resolve, reject) => {
      return repo.getTimeRecordsByEmail(email)
                 .then(records => resolve(getMonthRecordsSections(records)))
                 .catch(e => reject(e))
    })
  }

  function getFormViewModel () {
    return new Promise((resolve, reject) => {
      const getWorkingGroups = cacheService.getWorkingGroups()
      const getCategories = cacheService.getCategories()
      const getDurations = cacheService.getDurations()
      Promise.all([getWorkingGroups, getCategories, getDurations]).then(values => {
        const model = {
          workingGroups: values[0],
          categories: values[1],
          durations: values[2],
          currentDay: new Date().getDate(),
          currentMonth: new Date().getMonth() + 1,
          currentYear: new Date().getFullYear()
        }
        resolve(model)
      }).catch(e => reject(e))
    })
  }

  function getAuthorizedUsers () {
    return new Promise((resolve, reject) => {
      cacheService.getAuthorizedUsers()
                  .then(users => resolve(_.orderBy(users, u => u.name)))
                  .catch(e => reject(e))
    })
  }

  function getCurrentYearUserRecords (email) {
    return new Promise((resolve, reject) => {
      repo.getTimeRecordsByEmail(email)
          .then(records => resolve(_.flow([filterCurrentYearRecords, getMonthRecordsSections])(records)))
          .catch(e => reject(e))
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
      records: _.orderBy(monthsRecords, getDateFromRecord, 'desc'),
      durationSum: _.reduce(monthsRecords, (sum, r) => { return sum + parseFloat(r.duration) }, 0)
    }
  }

  function getDateFromRecord (record) {
    const y = record.year
    const m = record.month - 1
    const d = record.day

    return new Date(y, m, d)
  }

  function orderMonthSectionsByMonth (sections) {
    return _.orderBy(sections, x => { return new Date(x.monthDate) }, 'desc')
  }

  function getMonthRecordsSections (records) {
    return _.flow([groupByMonth, (groups) => _.map(groups, getMonthRecordsSection), orderMonthSectionsByMonth])(records)
  }

  return {
    getFormViewModel: getFormViewModel,
    getAuthorizedUsers: getAuthorizedUsers,
    getUserRecords: getUserRecords,
    getCurrentYearUserRecords: getCurrentYearUserRecords,
    getMonthRecordsSections: getMonthRecordsSections
  }
}
