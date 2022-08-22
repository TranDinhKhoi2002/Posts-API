const { validationResult } = require("express-validator");
const User = require("../models/user");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }

  const { email, password, name } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 12);
    const user = new User({ email, name, password: hashedPassword });
    const result = await user.save();

    res.status(201).json({ message: "User created!", userId: result._id });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("No users found.");
      error.statusCode = 401;
      return next(error);
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      const error = new Error("Password is incorrect.");
      error.statusCode = 401;
      return next(error);
    }

    const token = jwt.sign(
      { email: user.email, userId: user._id.toString() },
      "secret",
      { expiresIn: "1h" }
    );
    res.status(200).json({ token: token, userId: user._id.toString() });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
