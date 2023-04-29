// import required libraries and models
const express = require("express");
const mongoose = require("mongoose");
const { User } = require("./models/User.model");
const { Post } = require("./models/Post.model");



const app = express();

// connect to MongoDB database
mongoose.connect("mongodb://localhost/social-media-app", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// middleware to parse request body
app.use(express.json());

// API endpoint to allow users to register
app.post("/api/register", async (req, res) => {
  try {
    // hash the password and create a new user
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      dob: req.body.dob,
      bio: req.body.bio,
    });

    // save the new user to the database
    await user.save();

    // send a success response
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to get a list of all registered users
app.get("/api/users", async (req, res) => {
  try {
    // fetch all users from the database
    const users = await User.find().select("-password");

    // send the users as a response
    res.status(200).json(users);
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to get a list of all friends of a specific user identified by its ID
app.get("/api/users/:id/friends", async (req, res) => {
  try {
    // find the user by ID and populate its friends
    const user = await User.findById(req.params.id).populate(
      "friends",
      "-password"
    );

    // send the user's friends as a response
    res.status(200).json(user.friends);
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to allow the user to send a friend request to another user identified by its ID
app.post("/api/users/:id/friends", async (req, res) => {
  try {
    // find the user by ID and the friend by their ID
    const user = await User.findById(req.params.id);
    const friend = await User.findById(req.body.friendId);

    // add the friend request to both the user and the friend's friendRequests
    user.friendRequests.push(friend._id);
    friend.friendRequests.push(user._id);

    // save the users to the database
    await user.save();
    await friend.save();

    // send a success response
    res.status(201).json({ message: "Friend request send successfully" });
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to allow users to accept or reject friend requests sent to them by another user identified by its ID
app.patch("/api/users/:id/friends/:friendId", async (req, res) => {
  try {
    // find the user by ID and the friend by their ID
    const user = await User.findById(req.params.id);
    const friend = await User.findById(req.params.friendId);

    // remove the friend request from both the user and the friend's friendRequests
    user.friendRequests.pull(friend._id);
    friend.friendRequests.pull(user._id);

    if (req.body.accepted) {
      // add the friend to both the user and the friend's friends
      user.friends.push(friend._id);
      friend.friends.push(user._id);

      // send a success response
      res.status(204).json({ message: "Friend request accepted successfully" });
    } else {
      // send a success response
      res.status(204).json({ message: "Friend request rejected successfully" });
    }

    // save the users to the database
    await user.save();
    await friend.save();
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to get a list of all posts
app.get("/api/posts", async (req, res) => {
  try {
    // fetch all posts from the database and populate the user and comments
    const posts = await Post.find()
      .populate("user", "-password")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          model: "User",
          select: "-password",
        },
      });

    // send the posts as a response
    res.status(200).json(posts);
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to allow the user to create a new post
app.post("/api/posts", async (req, res) => {
  try {
    // create a new post for the user
    const post = new Post({
      user: req.body.userId,
      text: req.body.text,
      image: req.body.image,
      createdAt: Date.now(),
    });

    // save the new post to the database
    await post.save();

    // add the new post to the user's posts
    const user = await User.findById(req.body.userId);
    user.posts.push(post._id);
    await user.save();

    // send a success response
    res.status(201).json({ message: "Post created successfully" });
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to allow users to update the text or image of a specific post identified by its ID
app.patch("/api/posts/:id", async (req, res) => {
  try {
    // find the post by ID and update its text and image
    await Post.findByIdAndUpdate(req.params.id, {
      text: req.body.text,
      image: req.body.image,
    });

    // send a success response
    res.status(204).json({ message: "Post updated successfully" });
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to allow users to delete a specific post identified by its ID
app.delete("/api/posts/:id", async (req, res) => {
  try {
    // find the post by ID and remove the post from the user's posts
    const post = await Post.findByIdAndDelete(req.params.id);
    const user = await User.findById(post.user);
    user.posts.pull(post._id);
    await user.save();

    // send a success response
    res.status(202).json({ message: "Post deleted successfully" });
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to allow users to like a specific post identified by its ID
app.post("/api/posts/:id/like", async (req, res) => {
  try {
    // find the post by ID and update its likes
    const post = await Post.findById(req.params.id);
    post.likes.push(req.body.userId);
    await post.save();

    // send a success response
    res.status(201).json({ message: "Post liked successfully" });
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to allow users to comment on a specific post identified by its ID
app.post("/api/posts/:id/comment", async (req, res) => {
  try {
    // create a new comment for the post
    const comment = {
      user: req.body.userId,
      text: req.body.text,
      createdAt: Date.now(),
    };

    // add the new comment to the post's comments
    const post = await Post.findById(req.params.id);
    post.comments.push(comment);
    await post.save();

    // send a success response
    res.status(201).json({ message: "Comment added successfully" });
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// API endpoint to return the details of a specific post identified by its ID
app.get("/api/posts/:id", async (req, res) => {
  try {
    // find the post by ID and populate the user and comments
    const post = await Post.findById(req.params.id)
      .populate("user", "-password")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          model: "User",
          select: "-password",
        },
      });

    // send the post as a response
    res.status(200).json(post);
  } catch (error) {
    // handle errors
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

// listen for incoming requests on port 3000
app.listen(3000, () => console.log("Server started on port 3000"));
