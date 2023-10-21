const serverless = require("serverless-http");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const app = express();

const routes = require("./routes");

// Set up a rate limit of 100 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 requests per windowMs
});

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// Apply the rate limit to all requests
app.use(limiter);

const port = process.env.PORT || 8000;

// mongodb
mongoose.connect(process.env.MONGODB_URL, {
  // useNewUrlParser: true,
  useUnifiedTopology: true,
  // useCreateIndex: true,
  // useFindAndModify: false,
});

// API v1.0
app.use("/api/v1", routes);

app.use("/", (_, res) => res.status(200).send("alive"));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error("Page Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  res
    .status(err.status || 500)
    .json({ message: `${err.code} - ${err.message}` });
});

if (process.env.NODE_ENV === "development") {
  app.listen(port, () => console.log("App is running on port " + port));
}

module.exports.handler = serverless(app);
