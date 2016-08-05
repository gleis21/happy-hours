var expect = require('chai').expect
var timerecordsService = require('../services/timerecords')
const TimeRecord = require('../models/time-record').TimeRecord

describe('Timerecords Service', function () {
  describe('grouping timerecords by date', function () {
    it('groups and sorts the rows by month', function () {
      const r1 = new TimeRecord(null, null, null, 4, null, null, null, 2016, 6, 1)
      const r2 = new TimeRecord(null, null, null, 5, null, null, null, 2016, 6, 6)
      const r3 = new TimeRecord(null, null, null, 1, null, null, null, 2016, 6, 23)
      const r4 = new TimeRecord(null, null, null, 6, null, null, null, 2016, 7, 5)
      const r5 = new TimeRecord(null, null, null, 2.5, null, null, null, 2016, 7, 9)
      const timerecords = [r1, r2, r3, r4, r5]

      const res = timerecordsService.getGroupedByMonth(timerecords)

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

      const res = timerecordsService.getGroupedByMonth(timerecords)

      expect(res[0].durationSum).to.equal(8.5)
      expect(res[1].durationSum).to.equal(10)
    })
  })
})
