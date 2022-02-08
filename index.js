let express = require("express");
let mongoose = require("mongoose");
let multer = require("multer");
require("dotenv/config");
const crypto = require("crypto");
//node js file system module
let fs = require("fs");
let path = require("path");
let Message = require("./model");

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

app.get("/", (req, res) => {
  res.render("createMessage", { url: null });
});

app.post("/", upload.single("image"), (req, res, next) => {
  const uuid = crypto.randomBytes(6).toString("hex");

  let obj = {
    caption: req.body.caption,
    uuid: uuid,
    seen: false,
    img: {
      data: fs.readFileSync(
        path.join(__dirname + "/uploads/" + req.file.filename)
      ),
      contentType: "image/png",
    },
  };

  Message.create(obj, (err, item) => {
    if (err) {
      console.log(err);
      return res.render("error", { error: err });
    } else {
      let base_url = req.headers.host;
      res.render("createMessage", { url: "http://" + base_url + "/" + uuid });
    }
  });
});

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
        Message.findOne({ uuid: uuid }, (err, data) => {
          if (err) res.render("error", { error: "message expired" });
          data.seen = true;
          data.save((err, data) => {
            if (err) return res.render("error", { error: err });
            res.render("viewMessage", { data: data });
            return;
          });
        });
      }
    }
  });
});

let port = process.env.PORT || "3000";
app.listen(port, (err) => {
  if (err) throw err;

  //deletes messages that are more than 30 mins old(either clicked or not)
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
