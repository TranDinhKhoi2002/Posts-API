const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.isAuth = false;
    return next();
  }

  const token = authHeader.split(" ")[1];

  let decodedToken;
  try {
    // We can alternatively use jwt.decode() but it just decodes, it doesn't verify the token whether is valid or not. While verify do both
    decodedToken = jwt.verify(token, "supersecret");
  } catch (err) {
    req.isAuth = false;
    return next();
  }

  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }

  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};
