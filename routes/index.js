const express = require("express");
const router = express.Router();

const pulze = require("./pulze");

router.use("/llm", pulze);

module.exports = router;
