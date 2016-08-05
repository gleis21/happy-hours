const express = require('express')
const path = require('path')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const passport = require('passport')
const Strategy = require('passport-google-oauth20').Strategy
const repo = require('./repositories/repository')
const TimeRecord = require('./models/time-record').TimeRecord
const session = require('express-session')
const ensureAuth = require('connect-ensure-login')
const uuid = require('node-uuid')
const timerecordService = require('./services/timerecords')
const helmet = require('helmet')
const fs = require('fs')
const redis = require('redis')
const RedisStore = require('connect-redis')(session)
const clearCacheMiddlewareFactory = require('./middleware/clear-cache')

passport.use(new Strategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL
},
  function (accessToken, refreshToken, profile, cb) {
    repo.getAuthorizedEmailAccounts().then(authEmails => {
      const foundEmail = authEmails.find(e => e === profile.emails[0].value)
      if (foundEmail) return cb(null, profile)
      else return cb(new Error('User not found!'), null)
    })
  }))

passport.serializeUser(function (user, cb) {
  cb(null, user)
})

passport.deserializeUser(function (obj, cb) {
  cb(null, obj)
})
const redisClient = redis.createClient({ host: 'redis' })
const clearCacheMiddleware = clearCacheMiddlewareFactory(redisClient)
// Create a new Express application.
var app = express()

app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'hbs')

const accessLogStream = fs.createWriteStream(path.join(__dirname, './logs/access.log'), { flags: 'a' })

app.use(helmet())
app.use(morgan('combined', { stream: accessLogStream }))
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {}
}))

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(path.join(__dirname, 'public')))

// Define routes.
app.get('/', function (req, res, next) {
  res.redirect('/auth/google')
})

app.get('/auth/google',
  passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email' }))

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/timerecords')
  })

app.get('/timerecords',
  ensureAuth.ensureLoggedIn('/'),
  function (req, res) {
    const email = req.user.emails[0].value
    redisClient.exists(email, (err, exists) => {
      if (err || !exists) {
        const getTimeRecords = repo.getTimeRecordsByEmail(req.user.emails[0].value)
        const getWorkingGroups = repo.getWorkingGroups()
        const getCategories = repo.getCategories()
        const getDurations = repo.getDurations()
        Promise.all([getWorkingGroups, getCategories, getDurations, getTimeRecords]).then(values => {
          const model = {
            workingGroups: values[0],
            categories: values[1],
            durations: values[2],
            currentDay: new Date().getDate(),
            currentMonth: new Date().getMonth() + 1,
            currentYear: new Date().getFullYear(),
            timeRecords: timerecordService.getGroupedByMonth(values[3])
          }

          redisClient.setnx(email, JSON.stringify(model))
          res.render('index', model)
        })
      } else {
        redisClient.get(email, (err, data) => {
          if (!err) {
            const model = JSON.parse(data)
            res.render('index', model)
          }
        })
      }
    })
  })

app.post('/timerecords/:id/delete',
  ensureAuth.ensureLoggedIn('/'),
  clearCacheMiddleware,
  function (req, res) {
    const id = req.body.id
    repo.deleteRowById(id).then(() => res.redirect('/timerecords'))
  })

app.post('/timerecords/add',
  ensureAuth.ensureLoggedIn('/'),
  clearCacheMiddleware,
  function (req, res) {
    const id = uuid.v4().toString()
    const email = req.user.emails[0].value
    const username = req.user.displayName
    const duration = req.body.timerecord.duration
    const category = req.body.timerecord.category
    const workinggroup = req.body.timerecord.workinggroup
    const description = req.body.timerecord.description
    const year = req.body.timerecord.year
    const month = req.body.timerecord.month
    const day = req.body.timerecord.day

    const newRecord = new TimeRecord(id, email, username, duration, category, workinggroup, description, year, month, day)
    repo.addNewTimeRecord(newRecord).then(() => res.redirect('/timerecords'))
  })

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.render('error', {
      message: err.message,
      error: err
    })
  })
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {}
  })
})

module.exports = app
