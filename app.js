const express = require('express')
const path = require('path')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const passport = require('passport')
const Strategy = require('passport-google-oauth20').Strategy
const TimeRecord = require('./models/time-record').TimeRecord
const session = require('express-session')
const ensureAuth = require('connect-ensure-login')
const uuid = require('node-uuid')

const helmet = require('helmet')
const fs = require('fs')
const redis = require('redis')
const redisClient = redis.createClient({
  host: 'redis'
})
const repo = require('./repositories/repository')(process.env.SERVICE_ACCOUNT_KEY, process.env.SPREADSHEET_ID)
const cacheService = require('./services/cacheService')(repo, redisClient)
const timerecordService = require('./services/timerecords')(repo, cacheService)
const RedisStore = require('connect-redis')(session)
// include and initialize the rollbar library with your access token
const rollbar = require('rollbar')

rollbar.init(process.env.ROLLBAR_ACCESS_TOKEN)

passport.use(new Strategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL
},
  function (accessToken, refreshToken, profile, cb) {
    repo.getAuthorizedUsers().then(authenticatedUsers => {
      const foundEmail = authenticatedUsers.find(e => profile.emails[0].value === e.email)
      if (foundEmail) {
        return cb(null, profile)
      } else {
        return cb(new Error('User not found!'), null)
      }
    })
  }))

passport.serializeUser(function (user, cb) {
  cb(null, user)
})

passport.deserializeUser(function (obj, cb) {
  cb(null, obj)
})

// Create a new Express application.
var app = express()

app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'hbs')

const accessLogStream = fs.createWriteStream(path.join(__dirname, './logs/access.log'), {
  flags: 'a'
})

app.use(helmet({
  frameguard: false
}))
app.use(morgan('combined', {
  stream: accessLogStream
}))
app.use(cookieParser())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(session({
  store: new RedisStore({
    client: redisClient
  }),
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
  passport.authenticate('google', {
    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
  }))

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/'
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/timerecords')
  })

app.get('/timerecords',
  ensureAuth.ensureLoggedIn('/'),
  function (req, res, next) {
    const email = req.user.emails[0].value
    timerecordService.getMainPageViewModel(email).then((model) => {
      res.render('index', model)
    }).catch(e => next(e))
  })

app.get('/alltimerecords/:email?',
  ensureAuth.ensureLoggedIn('/'),
  function (req, res, next) {
    let email = req.params.email
    if (!email) {
      email = req.user.emails[0].value
    }
    timerecordService.getAllUsersRecordsPageViewModel(email).then(model => {
      res.render('timerecords', model)
    }).catch(e => next(e))
  })

app.post('/timerecords/:id/delete',
  ensureAuth.ensureLoggedIn('/'),
  function (req, res, next) {
    const id = req.body.id
    repo.deleteRowById(id).then(() => res.redirect('/timerecords')).catch(e => next(e))
  })

app.post('/timerecords/add',
  ensureAuth.ensureLoggedIn('/'),
  function (req, res, next) {
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
    repo.addNewTimeRecord(newRecord).then(() => res.redirect('/timerecords')).catch(e => next(e))
  })

app.get('/status', (req, res, next) => {
  timerecordService.getMainModel('test@test.com').then((model) => {
    res.status(200).end()
  }).catch(e => res.status(500).end())
})

app.use(rollbar.errorHandler(process.env.ROLLBAR_ACCESS_TOKEN))

module.exports = app
