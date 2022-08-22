const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const mongoose = require("mongoose");

const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(bodyParser.json()); // parse json data from incoming request
app.use("/images", express.static(path.join(__dirname, "images")));

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");

app.use((req, res, next) => {
  // Here we allowed a specific origin to access our content, our data,
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Allowed these origins to use specific http methods
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  // Clients can send requests that hold extra information in the header
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use("/feed", feedRoutes);
app.use("/auth", authRoutes);

app.use((error, req, res, next) => {
  const { statusCode, message, data } = error;

  res.status(statusCode || 500).json({
    message,
    data,
  });
});

mongoose
  .connect(
    "mongodb+srv://nodejscourse:tLUZcLfbE01uJY1M@cluster0.9srxm.mongodb.net/post?retryWrites=true&w=majority"
  )
  .then((result) => {
    const server = app.listen(8080);
    const io = require("./socket").init(server);

    io.on("connection", (socket) => {
      console.log("Client connected!");
    });
  })
  .catch((err) => console.log(err));
