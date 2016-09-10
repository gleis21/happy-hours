require('dotenv').config({path: './config/.env'})

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect
const TimeRecord = require('../models/time-record').TimeRecord

const repo = require('../repositories/repository')(process.env.TEST_SERVICE_ACCOUNT_KEY, process.env.TEST_SPREADSHEET_ID)

chai.use(chaiAsPromised)

describe('Time records repository', function () {
  describe('getting records', function () {
    this.timeout(5000)
    it('fetches records by email ', function () {
      const res = repo.getTimeRecordsByEmail('test@test.com')

      return expect(res).to.eventually.eql([new TimeRecord('3b034a47-8fb3-4899-b5aa-7881a5825ac1', 'test@test.com', 'John Do', '2', 'Arbeit für AG', 'AG Arch', 'AG ARCH INTERN', '2016', '8', '1')])
    })
  })

  describe('adding and deleting records', function () {
    it('adds and deletes a record', function () {
      this.timeout(8000)
      const id = '3b034a47-8fb3-4899-b5aa-7881a5825ah1'
      return repo.addNewTimeRecord(new TimeRecord(id, 'test@test.com', 'John Do', '2', 'Arbeit für AG', 'AG Arch', 'AG ARCH INTERN', '2016', '8', '1'))
      .then(() => expect(repo.getTimeRecordsByEmail('test@test.com')).to.eventually.have.length(2))
      .then(() => repo.deleteRowById(id))
      .then(() => expect(repo.getTimeRecordsByEmail('test@test.com')).to.have.eventually.length(1))
    })
  })
})
