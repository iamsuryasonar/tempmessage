let express = require("express");
let mongoose = require("mongoose");
let multer = require("multer");
require("dotenv/config");
const crypto = require("crypto");
//node js file system module
let fs = require("fs");
let path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
let Message = require("./Message");
let User = require("./User");

let app = express();
app.use(express.json());
app.use("/public", express.static("public"));
app.use("/uploads", express.static("uploads"));

app.set("view engine", "ejs");

dburl =
  "mongodb+srv://test:" +
  process.env.MONGO_PASSWORD +
  "@test.69vd0.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

mongoose.connect(
  dburl,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log("connected to database");
  }
);

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.fieldname);
  },
});
let upload = multer({ storage: storage });

// -------------------middleware-----------------------
const verify = async (req, res, next) => {
  if (!req.headers["cookie"]) {
    return res.redirect("/login");
  }
  const coo = req.headers["cookie"];
  const token = coo.slice(4);

  try {
    const verified = await jwt.verify(token, process.env.TOKEN_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    return res.render("error", { error: error });
  }
};

// -------------------- Home route------------------------------------

app.get("/", (req, res) => {
  if (!req.headers["cookie"]) return res.render("home");
  let coo = req.headers["cookie"];
  let usertoken = coo.slice(4);

  if (usertoken) {
    User.findOne({ author: usertoken }, (err, user) => {
      if (err) {
        return res.render("home");
      } else if (!user) {
        return res.render("home");
      } else {
        return res.redirect("/createMessage");
      }
    });
  }
  
});
// -------------------- authentication routes-------------------------
app.get("/login", (req, res) => {
  if (!req.headers["cookie"]) return res.render("login", { error: null });
  let coo = req.headers["cookie"];
  let usertoken = coo.slice(4);

  if (usertoken) {
    User.findOne({ author: usertoken }, (err, user) => {
      if (err) {
        return res.render("login", { error: null });
      } else if (!user) {
        return res.render("login", { error: null });
      } else {
        return res.redirect("/createMessage");
      }
    });
  }
});
app.get("/register", (req, res) => {
  if (!req.headers["cookie"]) return res.render("register", { error: null });
  let coo = req.headers["cookie"];
  let usertoken = coo.slice(4);

  if (usertoken) {
    User.findOne({ author: usertoken }, (err, user) => {
      if (err) {
        return res.render("register", { error: null });
      } else if (!user) {
        return res.render("register", { error: null });
      } else {
        return res.redirect("/createMessage");
      }
    });
  }
});

app.post("/register", upload.single("image"), async (req, res) => {
  //check if email exists in the databasel
  const email = req.body.email;
  const password = req.body.password;
  const emailExist = await User.findOne({ email: req.body.email });
  if (emailExist)
    return res.render("register", { error: "Email already exist" });

  // hash password using bcrypt
  const hashedPassword = bcrypt.hashSync(password, 10);

  const user = new User({
    email: email,
    password: hashedPassword,
  });
  try {
    const savedUser = await user.save();
    res.render("login", { error: null });
  } catch (error) {
    return res.render("error", { error: error });
  }
});

app.post("/login", upload.single("image"), async (req, res) => {
  const password = req.body.password;
  const email = req.body.email;

  // check if email exists in the database and get the user's password(data) so that we can compare hashes
  const user = await User.findOne({ email: email });
  if (!user) return res.render("login", { error: "Email not found" });

  const matched = await bcrypt.compare(password, user.password);
  if (!matched) return res.render("login", { error: "Invalid password" });

  // create token using jsonwebtoken library
  let newtoken = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET);

  //store token in database for authorization
  user.author = newtoken;
  user.save((err, data) => {
    if (err) return res.render("error", { error: err });
    res.cookie("jwt", newtoken, {
      expires: new Date(Date.now() + 1000 * 60 * 7000),
      httpOnly: true,
    });
    res.redirect("/createmessage");
  });
});

app.get("/auth/signout", (req, res) => {
  if (!req.headers["cookie"]) return res.redirect("/login");
  let coo = req.headers["cookie"];
  let usertoken = coo.slice(4);

  if (usertoken) {
    User.findOne({ author: usertoken }, (err, user) => {
      if (err) {
        return res.render("register", { error: null });
      } else if (!user) {
        return res.render("register", { error: null });
      } else {
        const signedoutauthor = "signedout";
        user.author = signedoutauthor;
        user.save((err, user) => {
          if (!err) {
            return res.redirect("/login");
          }
          if (!data) {
            return res.redirect("/login");
          }
        });
      }
    });
  }
});

// -------------------- message routes-------------------------

app.get("/createmessage", verify, (req, res) => {
  if (req.headers["cookie"]) {
    let coo = req.headers["cookie"];
    let usertoken = coo.slice(4);
    if (usertoken) {
      User.findOne({ author: usertoken }, (err, data) => {
        // token expired
        if (err) return res.redirect("/login");
        if (!data) return res.redirect("/login");
        res.render("createMessage", { url: null });
      });
    }
  }
});

app.post(
  "/createmessage",
  verify,
  upload.single("image"),
  async (req, res, next) => {
    const uuid = crypto.randomBytes(6).toString("hex");
    if (req.headers["cookie"]) {
      let coo = req.headers["cookie"];
      let usertoken = coo.slice(4);
      if (usertoken) {
        User.findOne({ author: usertoken }, (err, data) => {
          // token expired
          if (err) return res.redirect("/login");

          let msg = new Message({
            caption: req.body.caption,
            uuid: uuid,
            seen: false,
            img: {
              data: fs.readFileSync(
                path.join(__dirname + "/uploads/" + req.file.filename)
              ),
              contentType: "image/png",
            },
          });
          msg.author = usertoken;
          msg.save((err, data) => {
            if (err) {
              console.log(err);
              return res.render("error", { error: err });
            } else {
              let base_url = req.headers.host;
              res.render("createMessage", {
                url: "http://" + base_url + "/" + uuid,
              });
            }
          });
        });
      }
    }
  }
);

app.get("/:uuid", (req, res) => {
  const uuid = req.params.uuid;

  Message.findOne({ uuid: uuid }, (err, data) => {
    if (err) {
      res.render("error", { error: "message expired" });
      return;
    }
    if (!data) {
      res.status(200).render("error", { error: "message expired" });
      return;
    } else {
      let currentTime = new Date();
      let createdTime = new Date(data.createdAt);
      let minutes = (currentTime - createdTime) / (1000 * 60);

      // MESSAGE expired-> seen and createdtime - current time > 4mins
      if (data.seen === true && minutes > 4) {
        res.render("error", { error: "message expired" });
        return;
      }
      // MESSAGE expired->  not seen and createdtime - current time > 30mins
      else if (data.seen === false && minutes > 30) {
        res.render("error", { error: "message expired" });
        return;
      } else {
        // MESSAGE is not expired-> update status to seen and then return data
        data.seen = true;
        data.save((err, data) => {
          if (err) return res.render("error", { error: err });
          res.render("viewMessage", { data: data });
          return;
        });
      }
    }
  });
});

let port = process.env.PORT || "3000";
app.listen(port, (err) => {
  if (err) throw err;

  //deletes messages that are more than 30 mins old(either clicked or not) every 5 minutes
  setInterval(timer, 1000 * 60 * 5);

  function timer() {
    Message.deleteMany(
      { createdAt: { $lte: new Date(new Date() - 30 * 60 * 1000) } },
      (err, data) => {
        if (err) {
          console.log(err);
        } else {
          console.log(data.deletedCount + " message deleted");
        }
      }
    );
  }
  console.log("listening on port: " + port);
});
