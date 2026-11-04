const express = require("express");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
const client = new MongoClient("mongodb://127.0.0.1:27017");

app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-local-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60
  }
}));

async function startServer() {
  await client.connect();
  console.log("MongoDB connected successfully!");

  const db = client.db("myWebsite");
  const users = db.collection("cafeUsers");

  // Register a new customer
  app.post("/api/register", async (req, res) => {
    console.log("REGISTER REQUEST RECEIVED");
    try {
      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "")
        .trim().toLowerCase();
      const password = String(req.body.password || "");

      if (!name || !email || password.length < 8) {
        return res.status(400).json({
          message: "Enter your name, a valid email, and a password of at least 8 characters."
        });
      }

      const existingUser = await users.findOne({ email });

      if (existingUser) {
        return res.status(409).json({
          message: "This email is already registered. Please log in."
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await users.insertOne({
        name,
        email,
        password: hashedPassword,
        createdAt: new Date()
      });

      res.status(201).json({
        message: "Registration successful! Please log in."
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Registration failed. Please try again."
      });
    }
  });

  // Log in an existing customer
  app.post("/api/login", async (req, res) => {
    try {
      const email = String(req.body.email || "")
        .trim().toLowerCase();
      const password = String(req.body.password || "");

      const user = await users.findOne({ email });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({
          message: "Incorrect email or password."
        });
      }

      req.session.regenerate((error) => {
        if (error) {
          return res.status(500).json({
            message: "Could not start your session."
          });
        }

        req.session.userId = user._id.toString();
        req.session.save((saveError) => {
          if (saveError) {
            return res.status(500).json({
              message: "Could not start your session."
            });
          }

          res.json({ message: "Login successful!" });
        });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Login failed. Please try again."
      });
    }
  });

  // Get the logged-in customer's details
  app.get("/api/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please log in first."
      });
    }

    const { ObjectId } = require("mongodb");

    try {
      const user = await users.findOne(
        { _id: new ObjectId(req.session.userId) },
        { projection: { name: 1, email: 1 } }
      );

      if (!user) {
        return res.status(401).json({
          message: "Account not found."
        });
      }

      res.json({ name: user.name, email: user.email });
    } catch (error) {
      res.status(401).json({
        message: "Please log in again."
      });
    }
  });

  // Log out
  app.post("/api/logout", (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json({
          message: "Could not log out."
        });
      }

      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully." });
    });
  });
console.log("REGISTER ROUTE LOADED");
  app.listen(3000, () => {
    console.log("Brew Haven Cafe: http://localhost:3000");
  });
}

startServer().catch(console.error);