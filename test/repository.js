require('dotenv').config({path: './config/.env'})

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect
const TimeRecord = require('../models/time-record').TimeRecord

const repo = require('../repositories/repository')(process.env.TEST_SERVICE_ACCOUNT_KEY, process.env.TEST_SPREADSHEET_ID)

chai.use(chaiAsPromised)

describe('Time records repository', function () {
  describe('adding, getting and deleting records', function () {
    it('adds and deletes a record', function () {
      this.timeout(8000)
      const id = '3b034a47-8fb3-4899-b5aa-7881a5825ah1'
      const row = new TimeRecord(id, 'test@test.com', 'John Do', '2', 'Arbeit für AG', 'AG Arch', 'AG ARCH INTERN', '2016', '8', '1')
      return repo.addNewTimeRecord(row)
      .then(() => expect(repo.getTimeRecordsByEmail('test@test.com')).to.eventually.eql([row]))
      .then(() => repo.deleteRowById(id))
      .then(() => expect(repo.getTimeRecordsByEmail('test@test.com')).to.have.eventually.length(0))
    })
  })
})
