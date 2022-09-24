
require('dotenv').config(); // for .env file
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const favicon = require('serve-favicon'); // for icon
const chalk = require("chalk") // for console colors
const md5 = require("md5"); // for hashing
const bcrypt = require("bcrypt"); // for hashing and salting
const SALT_ROUNDS = 10; // salting rounds

const app = express();

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(favicon(__dirname + '/public/images/favicon.ico')); // favicon

app.use(session({
    secret: "secrettest",
    resave: false,
    saveUninitialized: false,

}))

app.use(passport.initialize());
app.use(passport.session());
// ---------------------------------------------< Database section >--------------------------------------------------------

const mongoose = require("mongoose");
const DB_NAME = "usersDB";
const DB = "mongodb://localhost:27017/" + DB_NAME;
mongoose.connect(DB) // connect to the databbase named userDB

const taskTypeSchema = new mongoose.Schema({
    name: String,
})

const taskSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    done: {
        type: Boolean,
        required: true,
    },
    dueDate: String,
    createdDate: {
        type: String,
        required: true,
    },
    type: [taskTypeSchema],
})

const userSchema = new mongoose.Schema({
    fname: {
        type: String,
        required: true,
    },
    lname: {
        type: String,
        required: true,
    },
    username: { // email
        type: String,
        required: true,
    },
    tasksList: [taskSchema],
});

// userSchema.plugin(encrypt, { secret: process.env.ENC_Key, encryptedFields:['password','tasksList']});
userSchema.plugin(passportLocalMongoose);


const Users = mongoose.model("User", userSchema);
const Tasks = mongoose.model("Task", taskSchema);
const Types = mongoose.model("Type", taskTypeSchema);

passport.use(Users.createStrategy());
passport.serializeUser(Users.serializeUser());
passport.deserializeUser(Users.deserializeUser());
// -------------------------------------------< End of Database Section >-------------------------------------------------------


// ---------------------------------------------< Root route section >--------------------------------------------------------
app.route("/")
    .get(function (req, res) {
        res.render("index")
    })
    .post(function (req, res) {
        let btnType = req.body.btn;
        if (btnType == "signin") {
            res.redirect("/signin")
        }
        else if (btnType == "signup") {
            res.redirect("/signup")
        }
        else {
            res.redirect("/")
        }
    });
// ---------------------------------------------< End of root route section >---------------------------------------------------



// ---------------------------------------------< Sign in route section >-------------------------------------------------------
app.route("/signin")
    .get(function (req, res) {
        res.render("signIn", {
            signinFailedClass: typeof req.session['class'] !== "undefined" ? req.session['class'] : "",
            message: typeof req.session['mess'] !== "undefined" ? req.session['mess'] : "",
        })
    })
    .post(function (req, res) {
        const user = new Users({
            fname: " ",
            lname: " ",
            username: req.body.username,
            password: req.body.password,
        })
        console.log(chalk.blue((new Date() + "Login try ::" + user)))
        req.login(user, function (err) {
            if (err) {
                console.log(err);
                res.redirect('/list');
            } else {
                console.log(chalk.blue.bgWhite(new Date() + ":: Login succeeded!"));
                Users.findOne({ username: user.username }, function (err, foundUser) {
                    if (err) {
                        console.log("Failed to llocate tthe username: " + user.username);
                        console.log(err)
                    } else {
                        if (foundUser) {
                            res.redirect('/' + foundUser.fname + ' ' + foundUser.lname + '/list');
                        } else {
                            req.session['class'] = 'signinFailedClass';
                            req.session['mess'] = 'Wrong email or password!!';
                            res.redirect("/signin")
                        }
                    }
                });

            }
        });
    });
// -------------------------------------------< End of sign in route section >-------------------------------------------------



// ---------------------------------------------< Sign out route section >-------------------------------------------------------
app.route("/signout")
    .post(function (req, res) {
        req.logout(function (err) {
            if (err) {
                console.log(err);
            }
            res.redirect('/');
        });

    })
// ---------------------------------------------< End of Sign out route section >-------------------------------------------------------



// ---------------------------------------------< Sign up route section >-------------------------------------------------------
app.route("/signup")
    .get(function (req, res) {
        res.render("signUp")
    })
    .post(function (req, res) {
        const user = new Users({
            fname: req.body.fname,
            lname: req.body.lname,
            username: req.body.username,
        })
        console.log(chalk.blue.bgWhite((new Date() + "Sign up try :: data: " + req.body)))
        Users.register(user, req.body.password, function (err, regUser) {
            if (err) {
                console.log(chalk.red.bgWhite("Sign up failed!"));
                console.log(err);
                res.sendFile(__dirname + "/failure.html")
            } else {
                console.log(chalk.green.bgWhite("Sign up succeeded!"));
                passport.authenticate("local")(req, res, function () {
                    res.sendFile(__dirname + "/success.html")
                });
            }
        })
    });
// -------------------------------------------< End of sign up route section >-------------------------------------------------


// ---------------------------------------------------< Lists section >--------------------------------------------------------
app.route("/:userName/list")
    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.render("list", {
                user: req.user.fname,
                tasks: req.user.tasksList,
            })
        }
        else {
            res.redirect("/signin")
        }
    })
// ------------------------------------------------< End of lists section >---------------------------------------------------



// ------------------------------------------------< Submit section >---------------------------------------------------
app.route("/submit")
    .post(function (req, res) {
        if (req.isAuthenticated()) {
            if (req.body.btn == 'add') {
                if (req.body.newTask.trim() != "") {
                    // ---< getting the date and formatting it >---
                    let date = new Date();
                    const dateOpttions = {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                    }
                    let taskCreatedTime = + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ' ' + date.toLocaleString("en-US", dateOpttions)
                    // ----------------------------------
                    let newTask = new Tasks({
                        name: req.body.newTask,
                        done: false,
                        dueDate: taskCreatedTime,
                        createdDate: req.body.newTaskDate,
                    })
                    Users.findOneAndUpdate({ username: req.user.username }, { $push: { tasksList: newTask } }, function (err) {
                        if (err) {
                            console.log("Failed to add the new task!");
                            console.log(err)
                        } else {
                            console.log("New task added successfully");
                        }
                    });
                }
            }
            else {
                let targetedTask = req.body.btn;
                Users.findOneAndUpdate({ username: req.user.username }, { $pull: { tasksList: { name: targetedTask } } }, function (err) {
                    if (err) {
                        console.log("Failed to remove the task!");
                        console.log(err)
                    } else {
                        console.log("Task removed successfully");
                    }
                });
            }
            res.redirect('/' + req.user.fname + ' ' + req.user.lname + '/list')
        }
        else {
            res.redirect("/signin")
        }
    });
// ------------------------------------------------< End of submit section >---------------------------------------------------



app.listen(3000, function () {
    console.log(new Date() + ":: Server is running..")
})