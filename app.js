const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const Strategy = require('passport-google-oauth20').Strategy;
const repo = require("./repositories/repository");
const TimeRecord = require("./models/time-record").TimeRecord;
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const ensureAuth = require('connect-ensure-login');
const uuid = require("node-uuid");
const _ = require("lodash");
const helmet = require('helmet')
const fs = require("fs");

// Configure the Facebook strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new Strategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL
},
  function (accessToken, refreshToken, profile, cb) {
    repo.getAuthorizedEmailAccounts().then(authEmails => {
      const foundEmail = authEmails.find(e => e === profile.emails[0].value);
      if(foundEmail) return cb(null, profile);
      else return cb(new Error("User not found!"), null);
    });
    
  }));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Twitter profile is serialized
// and deserialized.
passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});


// Create a new Express application.
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, './logs/access.log'), {flags: 'a'})

app.use(helmet())
app.use(morgan('combined', {stream: accessLogStream}));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(session({
  store: new FileStore(),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {secure: process.env.SESSION_COOKIE_SEC ? true : false}
}));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));


// Define routes.
app.get('/', function (req, res, next) {
  res.redirect("/auth/google");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email' }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/timerecords');
  });

app.get('/timerecords',
  ensureAuth.ensureLoggedIn("/"),
  function (req, res) {
    const getTimeRecords = repo.getTimeRecordsByEmail(req.user.emails[0].value);
    const getWorkingGroups = repo.getWorkingGroups();
    const getCategories = repo.getCategories();
    const getDurations = repo.getDurations();
    Promise.all([getWorkingGroups, getCategories, getDurations, getTimeRecords]).then(values => {
      res.render('index', {
        workingGroups: values[0],
        categories: values[1],
        durations: values[2],
        currentDay: new Date().getDate(),
        currentMonth: new Date().getMonth() + 1,
        currentYear: new Date().getFullYear(),
        timeRecords: _.orderBy(values[3], record => {
          const y = record.year;
          const m = record.month - 1;
          const d = record.day;
          
          return new Date(y, m, d)
        }, "desc")
      })
    });
  });

app.post('/timerecords/:id/delete',
  ensureAuth.ensureLoggedIn("/"),
  function (req, res) {
    const id = req.body.id;
    repo.deleteRowById(id).then(() => res.redirect("/timerecords"));
  });

app.post('/timerecords/add',
  ensureAuth.ensureLoggedIn("/"),
  function (req, res) {
    const id = uuid.v4().toString();
    const email = req.user.emails[0].value;
    const username = req.user.displayName;
    const duration = req.body.timerecord.duration;
    const category = req.body.timerecord.category;
    const workinggroup = req.body.timerecord.workinggroup;
    const description = req.body.timerecord.description;
    const year = req.body.timerecord.year;
    const month = req.body.timerecord.month;
    const day = req.body.timerecord.day;

    const newRecord = new TimeRecord(id, email, username, duration, category, workinggroup, description, year, month, day);
    repo.addNewTimeRecord(newRecord).then(() => res.redirect("/timerecords"));
  });

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
