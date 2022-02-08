let mongoose = require("mongoose");

let messageSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      required: true,
    },
    uuid: {
      type: String,
      required: true,
    },
    img: {
      data: Buffer,
      contentType: String,
    },
    seen: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = new mongoose.model("Message", messageSchema);
