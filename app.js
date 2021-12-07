var express = require("express");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var morgan = require("morgan");
var User = require("./models/user");

var app = express();


app.set("port", 3000);


app.use(morgan("dev"));

// initialize body-parser
app.use(bodyParser.urlencoded({ extended: true }));

// initialize cookie-parser to allow us access the cookies stored in the browser.
app.use(cookieParser());

// initialize session with 3 days of cookie
app.use(
  session({
    key: "user_sid",
    secret: "somerandonstuffs",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 300000,
    },
  })
);

//unexpected login situation handler which will remove saved cookie if the user doesn't achieve success page,e.g to remove cookie if user stops express during login page
app.use((req, res, next) => {  
if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie("user_sid");
  }
  next();
});

// if user logged in and cookie is not expired yet
var sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
    res.redirect("/success");
  } else {
    next();
  }
};

// login redirect
app.get("/", sessionChecker, (req, res) => {
  res.redirect("/login");
});

// signup route
app
  .route("/signup")
  .get(sessionChecker, (req, res) => {
    res.sendFile(__dirname + "/front/signup.html");
  })
  .post((req, res) => {

    var user = new User({
      username: req.body.username,
      email: req.body.email,
      password:req.body.password,
    });
    user.save((err, docs) => {
      if (err) {
        res.redirect("/signup");
      } else {
          console.log(docs)
        req.session.user = docs;
        res.redirect("/success");
      }
    });
  });

// login route
app
  .route("/login")
  .get(sessionChecker, (req, res) => {
    res.sendFile(__dirname + "/front/login.html");
  })
  .post(async (req, res) => {
    var username = req.body.username,
      password = req.body.password;

      try {
        var user = await User.findOne({ username: username }).exec();
        if(!user) {
            res.redirect("/login");
        }
        user.comparePassword(password, (error, match) => {
            if(!match) {
              res.redirect("/login");
            }
        });
        req.session.user = user;
        res.redirect("/success");
    } catch (error) {
      console.log(error)
    }
  });

// success route
app.get("/success", (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    res.sendFile(__dirname + "/front/success.html");
  } else {
    res.redirect("/login");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    res.clearCookie("user_sid");
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

// 404 request handler, E.G if user directly presses success page
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!");
});


app.listen(app.get("port"), () =>
  console.log(`App started on port ${app.get("port")}`)
);