const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");
const Post = require("../models/post");
const User = require("../models/user");
const io = require("../socket");

const { clearImage } = require("../util/file");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;

  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    if (!posts) {
      const error = new Error("No posts found.");
      error.statusCode = 500;
      throw error;
    }
    res.status(200).json({ posts: posts, totalItems });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Your entered data is invalid");
    error.statusCode = 422;
    return next(error);
  }

  if (!req.file) {
    const error = new Error("No image provided.");
    error.statusCode = 422;
    return next(error);
  }

  try {
    const { title, content } = req.body;

    const imageUrl = req.file.path.replace("\\", "/");
    const post = new Post({
      title,
      content,
      imageUrl,
      creator: req.userId,
    });
    await post.save();

    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();

    // emit inform to all the users. We can alternatively use broadcast but it inform to all the users except the user sending this request
    io.getIO().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });

    res.status(201).json({
      message: "Post created successfully!",
      post: post,
      creattor: { _id: user._id, name: user.name },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("Could not find post.");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      post: post,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Your entered data is invalid");
    error.statusCode = 422;
    return next(error);
  }

  const postId = req.params.postId;
  const { title, content } = req.body;
  let imageUrl = req.body.image;

  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }

  if (!imageUrl) {
    const error = new Error("No file picked.");
    error.statusCode = 422;
    return next(error);
  }

  try {
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("Could not find post.");
      error.statusCode = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }

    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    post.title = title;
    post.content = content;
    post.imageUrl = imageUrl;
    const updatedPost = await post.save();

    io.getIO().emit("posts", { action: "update", post: updatedPost });

    res.status(200).json({ post: updatedPost });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("Could not find post.");
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }

    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);

    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();

    io.getIO().emit("posts", { action: "delete" });

    res.status(200).json({ message: "Deleted post" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No users found.");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({ status: user.status });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Invalid status");
    error.statusCode = 422;
    return next(error);
  }

  const newStatus = req.body.newStatus;
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No users found.");
      error.statusCode = 401;
      return next(error);
    }

    user.status = newStatus;
    await user.save();

    res.status(200).json({ message: "Updating status successfully" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
