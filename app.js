const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const mongoose = require("mongoose");
const auth = require("./middleware/auth");

const { clearImage } = require("./util/file");

const { graphqlHTTP } = require("express-graphql");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");

const app = express();

app.use(bodyParser.json());
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

app.use((req, res, next) => {
  // Here we allowed a specific origin to access our content, our data,
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  // Allowed these origins to use specific http methods
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  // Clients can send requests that hold extra information in the header
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use(auth);

app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    throw new Error("Not authenticated");
  }

  if (!req.file) {
    return res.status(200).json({ message: "No files provided" });
  }

  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }

  return res.status(201).json({
    message: "File stored",
    filePath: req.file.path.replace(/\\/g, "/"),
  });
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }

      const { data, code } = err;
      const message = err.message || "An error occurred";
      return { message, data, status: code || 500 };
    },
  })
);

app.use((error, req, res, next) => {
  const { statusCode, data, message } = error;
  res.status(statusCode || 500).json({ message, data });
});

mongoose
  .connect(
    "mongodb+srv://nodejscourse:tLUZcLfbE01uJY1M@cluster0.9srxm.mongodb.net/post?retryWrites=true&w=majority"
  )
  .then((result) => {
    app.listen(8080);
  })
  .catch((err) => console.log(err));
