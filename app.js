
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const favicon = require('serve-favicon'); // for icon
const encrypt = require("mongoose-encryption");
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
        require: true,
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
    lnamme: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    DOB: {
        type: String,
        required: true,
    },
    tasksList: [taskSchema],
});

userSchema.plugin(encrypt, { secret: process.env.ENC_Key, encryptedFields:['password','tasksList']});



const Users = mongoose.model("User", userSchema);
const Task = mongoose.model("Task", taskSchema);
const Type = mongoose.model("Type", taskTypeSchema);

// -------------------------------------------< End of Database Section >-------------------------------------------------------
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(favicon(__dirname + '/public/images/favicon.ico')); // favicon

var totalTasks = [];

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



app.route("/signin")
    // TODO: if user enter email or password wrong or not in the data base should add these values:
    // TODO: signinFailedClass: "signinFailedClass",
    // TODO: message: "Wrong email or password!!"
    .get(function (req, res) {
        res.render("signIn", {
            signinFailedClass: "",
            message: ""
        })
    })
    .post(function (req, res) {
        let enterdEmail = req.body.email;
        let enteredPassword = req.body.pass;
        console.log(new Date() + "sign in try with:: email: " + enterdEmail + ":: password: " + enteredPassword)
        Users.findOne({ email: enterdEmail }, function (err, foundUser) {
            if (err) {
                console.log("Failed to sign in !!")
                console.log(err)
            } else {
                if (foundUser) {
                    if (foundUser.password === enteredPassword) {
                        res.redirect("/list")
                    }
                }
            }
        })
        //TODO: add route if the user enter email not in the database
    });



app.route("/signup")
    .get(function (req, res) {
        res.render("signUp")
    })
    .post(function (req, res) {
        const user = new Users({
            fname: req.body.fname,
            lnamme: req.body.lname,
            email: req.body.email,
            password: req.body.pass,
            DOB: req.body.dop
        });

        console.log("New user data: " + user)
        Users.create(user, function (err) {
            if (err) {
                res.sendFile(__dirname + "/failure.html")
            } else {
                res.sendFile(__dirname + "/success.html")
                console.log(new Date() + ":: New user added to the database!")
            }
        })
    });



app.route("/list")
    .get(function (req, res) {
        let date = new Date();
        const dateOpttions = {
            weekday: 'long',
            day: 'numeric',
            year: 'numeric',
            month: 'long'
        }
        let today = date.toLocaleDateString("en-US", dateOpttions) // making a custome date
        res.render("list", {
            today: today,
            tasks: totalTasks
        })
    })
    .post(function (req, res) {
        if (req.body.btn == 'add') {
            if (req.body.newTask.trim() != "") {
                let date = new Date();
                const dateOpttions = {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                }
                let taskCreatedTime = + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ' ' + date.toLocaleString("en-US", dateOpttions)
                let newTask = {
                    task: req.body.newTask,
                    createdTime: taskCreatedTime,
                    dueDate: req.body.newTaskDate,
                }
                totalTasks.push(newTask);
                console.log(date + "::New task added: " + newTask.task);
            }
        }
        else {
            let index = Number(req.body.btn);
            console.log("Task " + totalTasks[index].task + " removed");
            totalTasks.splice(index, 1)
            console.log("all left tasks: " + totalTasks)
        }
        res.redirect("/list")
    });



app.listen(3000, function () {
    console.log(new Date() + ":: Server is running..")
})