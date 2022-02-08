const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      minlength: 6,
      maxlength: 255,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 500,
    },
    author: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = new mongoose.model("User", userSchema);
