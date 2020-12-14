const fs = require('fs');
const GoogleSpreadsheet = require('google-spreadsheet');
const TimeRecord = require('../models/time-record').TimeRecord;

module.exports = function(serviceAccountKey, spreadsheetId) {
  const serviceAccountCredentials = JSON.parse(
    fs.readFileSync(serviceAccountKey, 'utf8')
  );
  const doc = new GoogleSpreadsheet.GoogleSpreadsheet(spreadsheetId);

  function authenticate(gDocument) {
    return new Promise((resolve, reject) => {
      gDocument.useServiceAccountAuth(serviceAccountCredentials).then(() => {
        resolve(gDocument);
      });
    });
  }

  function getSheet(gDocument, title) {
    return new Promise((resolve, reject) => {
      gDocument.loadInfo().then(() => {
        if (gDocument.sheetsByTitle[title]) {
          resolve(gDocument.sheetsByTitle[title])
        } else {
          gDocument.addSheet({ title: title, headerValues: ['guid', 'email', 'userName', 'duration', 'category', 'workingGroup', 'description', 'year', 'month', 'day'] }).then(resolve);
        }
      }, (err)=> {
        console.log(err)
        reject(err);
      })
    });
  }

  function addRow(sheet, row) {
    return new Promise((resolve, reject) => {
      sheet.addRow(row).then(resolve, (err) => reject(err))
    });
  }

  function deleteRow(row) {
    return new Promise((resolve, reject) => {
      row.delete(resolve, reject);
    });
  }

  function getAuthorizedUsers() {
    return authenticate(doc)
      .then(d => getSheet(d, 'users'))
      .then(sheet => sheet.getRows())
      .then(rows =>
        rows.map(r => {
          return {
            email: r.email.trim(),
            name: r.name.trim(),
            leaveFrom: r.leaveFrom.trim(),
            leaveUntil: r.leaveUntil.trim()
          };
        })
      );
  }

  function getTimeRecordsByEmail(email) {
    return authenticate(doc)
      .then(d => getSheet(d, email))
      .then(sheet => sheet.getRows())
      .then(rows =>
        rows.map(
          r =>
            new TimeRecord(
              r.guid,
              r.email,
              r.userName,
              r.duration,
              r.category,
              r.workingGroup,
              r.description,
              r.year,
              r.month,
              r.day
            )
        )
      );
  }

  function getWorkingGroups() {
    return authenticate(doc)
      .then(d => getSheet(d, "wg"))
      .then(sheet => sheet.getRows())
      .then(rows => rows.map(r => {
        return r.wg;
      }));
  }

  function getCategories() {
    return authenticate(doc)
      .then(d => getSheet(d, "cat"))
      .then(sheet => sheet.getRows())
      .then(rows => rows.map(r => r.ca));
  }

  function getDurations() {
    return authenticate(doc)
      .then(d => getSheet(d, "dur"))
      .then(sheet => sheet.getRows())
      .then(rows => rows.map(r => r.duration));
  }

  function deleteRowById(email, id) {
    return authenticate(doc)
      .then(d => getSheet(d, email))
      .then(sheet => sheet.getRows())
      .then(rows => {
        for (let index = 0; index < rows.length; index++) {
          const r = rows[index];
          if (r.guid.trim() === id) {
            deleteRow(r)
          }
        }
      });
  }

  function addNewTimeRecord(record) {
    return authenticate(doc)
      .then(d => getSheet(d, record.email))
      .then(sheet => addRow(sheet, record));
  }

  return {
    spreadsheetId: spreadsheetId,
    getAuthorizedUsers: getAuthorizedUsers,
    getTimeRecordsByEmail: getTimeRecordsByEmail,
    deleteRowById: deleteRowById,
    getCategories: getCategories,
    getDurations: getDurations,
    getWorkingGroups: getWorkingGroups,
    addNewTimeRecord: addNewTimeRecord
  };
};
