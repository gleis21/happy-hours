const _ = require("lodash");
const moment = require("moment");

module.exports = function(repo, cacheService) {
  function getUserRecords(email) {
    return new Promise((resolve, reject) => {
      return repo
        .getTimeRecordsByEmail(email)
        .then(records => resolve(getMonthRecordsSections(records)))
        .catch(e => reject(e));
    });
  }

  function getFormViewModel(email) {
    return new Promise((resolve, reject) => {
      const getWorkingGroups = cacheService.getWorkingGroups();
      const getCategories = getCategoriesByEmail(email);
      const getDurations = cacheService.getDurations();
      Promise.all([getWorkingGroups, getCategories, getDurations])
        .then(values => {
          const model = {
            workingGroups: values[0],
            categories: values[1],
            durations: values[2],
            currentDay: new Date().getDate(),
            currentMonth: new Date().getMonth() + 1,
            currentYear: new Date().getFullYear()
          };
          resolve(model);
        })
        .catch(e => reject(e));
    });
  }

  function getAuthorizedUsers() {
    return new Promise((resolve, reject) => {
      cacheService
        .getAuthorizedUsers()
        .then(users => resolve(_.orderBy(users, u => u.name)))
        .catch(e => reject(e));
    });
  }

  function getCurrentYearUserRecords(email) {
    return new Promise((resolve, reject) => {
      const currentYear = new Date().getFullYear();
      repo
        .getTimeRecordsByEmail(email)
        .then(records =>
          resolve(
            _.flow([
              records => filterCurrentYearRecordsByYear(records, currentYear),
              getMonthRecordsSections
            ])(records)
          ))
        .catch(e => reject(e));
    });
  }

  function getCategoriesByEmail(email) {
    return new Promise((resolve, reject) => {
      const getAuthorizedUsers = cacheService.getAuthorizedUsers();
      const getCategories = cacheService.getCategories();
      Promise.all([getAuthorizedUsers, getCategories])
        .then(values => {
          const users = values[0]
          const allCategories = values[1]

          const user = _.find(users, u => u.email === email)
          const leaveApproved = moment().isSameOrAfter(moment(user.leaveFrom)) && moment().isSameOrBefore(moment(user.leaveUntil));
          const categories = _.filter(allCategories, c => (c !== "Karenzierung vom Gleis 21") || leaveApproved)
          resolve(categories);
        })
        .catch(e => reject(e));
    });
  }

  function filterCurrentYearRecordsByYear(records, year) {
    return _.filter(records, r => parseInt(r.year) === year);
  }

  function groupByMonth(timerecords) {
    return _.groupBy(timerecords, record => {
      const y = record.year;
      const m = record.month - 1;

      return new Date(y, m, 1);
    });
  }

  function getMonthRecordsSection(monthsRecords, month) {
    return {
      monthDate: month,
      records: _.orderBy(monthsRecords, getDateFromRecord, "desc"),
      durationSum: _.reduce(
        monthsRecords,
        (sum, r) => {
          return sum + parseFloat(r.duration);
        },
        0
      )
    };
  }

  function getDateFromRecord(record) {
    const y = record.year;
    const m = record.month - 1;
    const d = record.day;

    return new Date(y, m, d);
  }

  function orderMonthSectionsByMonth(sections) {
    return _.orderBy(
      sections,
      x => {
        return new Date(x.monthDate);
      },
      "desc"
    );
  }

  function getMonthRecordsSections(records) {
    return _.flow([
      groupByMonth,
      groups => _.map(groups, getMonthRecordsSection),
      orderMonthSectionsByMonth
    ])(records);
  }

  return {
    getFormViewModel: getFormViewModel,
    getAuthorizedUsers: getAuthorizedUsers,
    getUserRecords: getUserRecords,
    getCurrentYearUserRecords: getCurrentYearUserRecords,
    getMonthRecordsSections: getMonthRecordsSections,
    getCategoriesByEmail: getCategoriesByEmail
  };
};
