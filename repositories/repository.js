const fs = require('fs')
const GoogleSpreadsheet = require('google-spreadsheet')
const TimeRecord = require('../models/time-record').TimeRecord

module.exports = function (serviceAccountKey, spreadsheetId) {
  const serviceAccountCredentials = JSON.parse(fs.readFileSync(serviceAccountKey, 'utf8'))
  const doc = new GoogleSpreadsheet(spreadsheetId)

  function authenticate (gDocument) {
    return new Promise((resolve, reject) => {
      gDocument.useServiceAccountAuth(serviceAccountCredentials, () => {
        resolve(gDocument)
      })
    })
  }

  function getSheet (gDocument, index) {
    return new Promise((resolve, reject) => {
      gDocument.getInfo((err, data) => {
        if (err) reject(err)

        resolve(data.worksheets[index])
      })
    })
  }

  function getRowsByColumn (sheet, columnName, columnValue, comparisonSign) {
    return new Promise((resolve, reject) => {
      if (columnName && columnValue) {
        const q = columnName + comparisonSign + '"' + columnValue + '"'
        sheet.getRows({
          query: q
        }, (err, rows) => {
          if (err) reject(err)
          resolve(rows)
        })
      } else {
        sheet.getRows({}, (err, rows) => {
          if (err) reject(err)
          resolve(rows)
        })
      }
    })
  }

  function addRow (sheet, row) {
    return new Promise((resolve, reject) => {
      sheet.addRow(row, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  function deleteRow (row) {
    return new Promise((resolve, reject) => {
      row.del(resolve)
    })
  }

  function getAuthorizedEmailAccounts () {
    return authenticate(doc)
      .then((d) => getSheet(d, 4))
      .then(sheet => getRowsByColumn(sheet))
      .then(rows => rows.map(r => r.email))
  }

  function getTimeRecordsByEmail (email) {
    return authenticate(doc)
      .then((d) => getSheet(d, 0))
      .then(sheet => getRowsByColumn(sheet, 'email', email, '='))
      .then(rows => rows.map(r => new TimeRecord(r.guid, r.email, r.username, r.duration, r.category, r.workinggroup, r.description, r.year, r.month, r.day)))
  }

  function getWorkingGroups () {
    return authenticate(doc)
      .then((d) => getSheet(d, 1))
      .then(sheet => getRowsByColumn(sheet))
      .then(rows => rows.map(r => r.wg))
  }

  function getCategories () {
    return authenticate(doc)
      .then((d) => getSheet(d, 2))
      .then(sheet => getRowsByColumn(sheet))
      .then(rows => rows.map(r => r.ca))
  }

  function getDurations () {
    return authenticate(doc)
      .then((d) => getSheet(d, 3))
      .then(sheet => getRowsByColumn(sheet))
      .then(rows => rows.map(r => r.duration))
  }

  function deleteRowById (id) {
    return authenticate(doc)
      .then(d => getSheet(d, 0))
      .then(sheet => getRowsByColumn(sheet, 'guid', id, '='))
      .then(rows => {
        if (rows.length > 1) throw new Error('More then one element with id: ' + id)
        if (rows.length === 0) throw new Error('Could not find element with id: ' + id)
        deleteRow(rows[0])
      })
  }

  function addNewTimeRecord (record) {
    return authenticate(doc)
      .then((d) => getSheet(d, 0))
      .then(sheet => addRow(sheet, record))
  }

  return {
    getAuthorizedEmailAccounts: getAuthorizedEmailAccounts,
    getTimeRecordsByEmail: getTimeRecordsByEmail,
    deleteRowById: deleteRowById,
    getCategories: getCategories,
    getDurations: getDurations,
    getWorkingGroups: getWorkingGroups,
    addNewTimeRecord: addNewTimeRecord
  }
}

