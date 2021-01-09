const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("passport");
const Strategy = require("passport-google-oauth20").Strategy;
const TimeRecord = require("./models/time-record").TimeRecord;
const session = require("express-session");
const ensureAuth = require("connect-ensure-login");
const uuid = require("uuid/v4");
const helmet = require("helmet");
const fs = require("fs");
const repo = require("./repositories/repository")(
  process.env.SERVICE_ACCOUNT_KEY,
  process.env.SPREADSHEET_ID
);
const cacheService = require("./services/cache")(repo, new Map());
const timerecordService = require("./services/timerecords")(repo, cacheService);
// include and initialize the rollbar library with your access token
var Rollbar = require('rollbar');
var rollbar = new Rollbar(process.env.ROLLBAR_ACCESS_TOKEN);

configureAuth();
const app = configureApp();


// Define routes.
app.get("/", function (req, res, next) {
  res.redirect("/hours/auth/google");
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureMessage: "leider konntest du nicht authentifiziert werden"
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/hours/timerecords");
  }
);

app.get(
  "/timerecords",
  ensureAuth.ensureLoggedIn("/hours/auth/google"),
  function (req, res, next) {
    const email = req.user.emails[0].value;
    Promise.all([
      timerecordService.getFormViewModel(email),
      timerecordService.getUserRecords(email)
    ])
      .then(values => {
        const model = {
          formModel: values[0],
          timeRecords: values[1]
        };
        res.render("index", model);
      })
      .catch(e => next(e));
  }
);

app.get(
  "/alltimerecords/:email?",
  ensureAuth.ensureLoggedIn("/hours/auth/google"),
  function (req, res, next) {
    let email = req.params.email;
    if (!email) {
      email = req.user.emails[0].value;
    }
    Promise.all([
      timerecordService.getAuthorizedUsers(),
      timerecordService.getCurrentYearUserRecords(email)
    ])
      .then(values => {
        const model = {
          authorisedUsers: values[0],
          timerecords: values[1]
        };
        res.render("timerecords", model);
      })
      .catch(e => next(e));
  }
);

app.post(
  "/timerecords/:id/delete",
  ensureAuth.ensureLoggedIn("/hours/auth/google"),
  function (req, res, next) {
    const id = req.body.id;
    repo
      .deleteRowById(req.user.emails[0].value, id)
      .then(() => res.redirect("/hours/timerecords"))
      .catch(e => next(e));
  }
);

app.post(
  "/timerecords/add",
  ensureAuth.ensureLoggedIn("/hours/auth/google"),
  function (req, res, next) {
    const id = uuid().toString();
    const email = req.user.emails[0].value;
    const username = req.user.displayName;
    const duration = req.body.timerecord.duration;
    const category = req.body.timerecord.category;
    const workinggroup = req.body.timerecord.workinggroup;
    const description = req.body.timerecord.description;
    const year = req.body.timerecord.year;
    const month = req.body.timerecord.month;
    const day = req.body.timerecord.day;

    const newRecord = new TimeRecord(
      id,
      email,
      username,
      duration,
      category,
      workinggroup,
      description,
      year,
      month,
      day
    );
    repo
      .addNewTimeRecord(newRecord)
      .then(() => res.redirect("/hours/timerecords"))
      .catch(e => next(e));
  }
);

app.get("/healthz", (req, res, next) => {
  res.status(200).end();
  // timerecordService
  //   .getUserRecords("test@test.com")
  //   .then(model => {
  //     res.status(200).end();
  //   })
  //   .catch(e => res.status(500).end());
});

app.use(rollbar.errorHandler());

function configureAuth() {
  passport.use(
    new Strategy(
      {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL
      },
      function (accessToken, refreshToken, profile, cb) {
        repo.getAuthorizedUsers().then(authenticatedUsers => {
          const foundEmail = authenticatedUsers.find(
            e => {
              for (let index = 0; index < profile.emails.length; index++) {
                const em = profile.emails[index];
                if (value === e.email) {
                  return true
                }
              }
              return false;
            }
          );
          if (foundEmail) {
            return cb(null, profile);
          } else {
            return cb(new Error("User not found!"), null);
          }
        });
      }
    )
  );

  passport.serializeUser(function (user, cb) {
    cb(null, user);
  });

  passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
  });
}

function configureApp() {
  // Create a new Express application.
  var app = express();
  app.set("views", path.join(__dirname, "/views"));
  app.set("view engine", "hbs");

  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, "./logs/access.log"),
    {
      flags: "a"
    }
  );

  app.use(
    helmet({
      frameguard: false
    })
  );
  app.use(
    morgan("combined", {
      stream: accessLogStream
    })
  );
  app.use(cookieParser());
  app.use(
    bodyParser.urlencoded({
      extended: true
    })
  );
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {}
    })
  );

  // Initialize Passport and restore authentication state, if any, from the
  // session.
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(path.join(__dirname, "public")));
  return app;
}

module.exports = app;
