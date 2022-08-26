const bcrypt = require("bcryptjs");
const { default: validator } = require("validator");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Post = require("../models/post");
const { clearImage } = require("../util/file");

module.exports = {
  createUser: async function (args, req) {
    const { email, password, name } = args.userInput;
    const errors = [];

    if (!validator.isEmail(email)) {
      errors.push({ message: "Email is invalid" });
    }

    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      errors.push({ message: "Password must has at least 5 characters" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // If you use then catch, remember to return Promise
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("User exsits already");
      throw error;
    }

    const hashedPassword = bcrypt.hashSync(password, 12);
    const user = new User({ email, name, password: hashedPassword });
    const createdUser = await user.save();

    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  createPost: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    const { title, imageUrl, content } = args.postInput;
    const errors = [];

    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: "Title must has at least 5 characters" });
    }

    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: "Content must has at least 5 characters" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title,
      imageUrl,
      content,
      creator: user,
    });
    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },

  updatePost: async function ({ id, postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    const { title, imageUrl, content } = postInput;
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No posts found");
      error.code = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized");
      error.code = 403;
      throw error;
    }

    const errors = [];

    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: "Title must has at least 5 characters" });
    }

    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: "Content must has at least 5 characters" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    post.title = title;
    post.content = content;
    if (imageUrl !== "undefined") {
      post.imageUrl = imageUrl;
    }

    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },

  deletePost: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id);
    if (!post) {
      const error = new Error("No posts found");
      error.code = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized");
      error.code = 403;
      throw error;
    }

    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(id);

    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();

    return true;
  },

  login: async function ({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not found");
      error.code = 401;
      throw error;
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      const error = new Error("Password is incorrect");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
      },
      "supersecret",
      { expiresIn: "1h" }
    );
    return { token, userId: user._id.toString() };
  },

  posts: async function ({ page }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    if (!page) {
      page = 1;
    }

    const perPage = 2;
    const posts = await Post.find()
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .populate("creator");
    const totalPosts = await Post.find().countDocuments();

    return {
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
      totalPosts,
    };
  },

  singlePost: async function ({ postId }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("No posts found");
      error.code = 404;
      throw error;
    }

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  user: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No users found");
      error.code = 404;
      throw error;
    }

    return { ...user._doc, _id: user._id.toString() };
  },
  updateStatus: async function ({ status }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No users found");
      error.code = 404;
      throw error;
    }

    if (validator.isEmpty(status)) {
      const error = new Error("Invalid status");
      error.code = 422;
      throw error;
    }

    user.status = status;
    await user.save();

    return { ...user._doc, _id: user._id.toString() };
  },
};
