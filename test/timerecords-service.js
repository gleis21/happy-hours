const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect
const repoMock = {}
const cacheMock = {}
const timerecordsService = require('../services/timerecords')(repoMock, cacheMock)
const TimeRecord = require('../models/time-record').TimeRecord

chai.use(chaiAsPromised)

describe('Timerecords Service', function () {
  describe('grouping timerecords by date', function () {
    it('groups and sorts the rows by month', function () {
      const r1 = new TimeRecord(null, null, null, 4, null, null, null, 2016, 6, 1)
      const r2 = new TimeRecord(null, null, null, 5, null, null, null, 2016, 6, 6)
      const r3 = new TimeRecord(null, null, null, 1, null, null, null, 2016, 6, 23)
      const r4 = new TimeRecord(null, null, null, 6, null, null, null, 2016, 7, 5)
      const r5 = new TimeRecord(null, null, null, 2.5, null, null, null, 2016, 7, 9)
      const timerecords = [r1, r2, r3, r4, r5]

      const res = timerecordsService.getMonthRecordsSections(timerecords)

      expect(new Date(res[0].monthDate).getMonth()).to.equal(6)
      expect(new Date(res[1].monthDate).getMonth()).to.equal(5)
    })

    it('sums the durations by month', function () {
      const r1 = new TimeRecord(null, null, null, 4, null, null, null, 2016, 6, 1)
      const r2 = new TimeRecord(null, null, null, 5, null, null, null, 2016, 6, 6)
      const r3 = new TimeRecord(null, null, null, 1, null, null, null, 2016, 6, 23)
      const r4 = new TimeRecord(null, null, null, 6, null, null, null, 2016, 7, 5)
      const r5 = new TimeRecord(null, null, null, 2.5, null, null, null, 2016, 7, 9)
      const timerecords = [r1, r2, r3, r4, r5]

      const res = timerecordsService.getMonthRecordsSections(timerecords)

      expect(res[0].durationSum).to.equal(8.5)
      expect(res[1].durationSum).to.equal(10)
    })
  })

  describe('getting the user time records view model', function () {
    it('combines all the data into a single object', function () {
      const r1 = new TimeRecord('guid1', 'mail1@ds.dsf', 'firstname1 lastname1', 4, 'category1', 'working group 1', 'bla1', 2016, 6, 1)
      const r2 = new TimeRecord('guid2', 'mail1@ds.dsf', 'firstname2 lastname2', 5, 'category2', 'working group 2', 'bla2', 2016, 8, 1)
      const timerecords = [r1, r2]

      repoMock.getTimeRecordsByEmail = (email) => { return new Promise((resolve, reject) => { resolve(timerecords) }) }

      const timeRecordsPromise = timerecordsService.getUserRecordsViewModel('mail1@ds.dsf')

      return expect(timeRecordsPromise).to.eventually.eql(timerecordsService.getMonthRecordsSections(timerecords))
    })
  })

  describe('getting form view model', function () {
    it('combines all the data into a single object', function () {
      const wgs = [{wg: 'working group 1'}, {wg: 'working group 2'}]
      const cas = [{ca: 'category1'}, {ca: 'category2'}]
      const durs = [{duration: 1}, {duration: 2}]

      cacheMock.getWorkingGroups = () => { return new Promise((resolve, reject) => { resolve(wgs) }) }
      cacheMock.getCategories = () => { return new Promise((resolve, reject) => { resolve(cas) }) }
      cacheMock.getDurations = () => { return new Promise((resolve, reject) => { resolve(durs) }) }

      const formModelPromise = timerecordsService.getFormViewModel()

      return expect(formModelPromise).to.eventually.eql({
        workingGroups: wgs,
        categories: cas,
        durations: durs,
        currentDay: new Date().getDate(),
        currentMonth: new Date().getMonth() + 1,
        currentYear: new Date().getFullYear()
      })
    })
  })
})
