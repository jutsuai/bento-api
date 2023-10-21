const { Schema, model } = require("mongoose");

const UserInterfaceSchema = new Schema(
  {
    projectId: String,
    prompt: { type: String, required: true },
    sourceCode: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = model("UserInterface", UserInterfaceSchema);
