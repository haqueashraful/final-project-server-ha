const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://restaurant-managemnet.netlify.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: "Content-Type,Authorization",
};

// middleware
app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// const uri = process.env.MONGO_URI;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w7vihmt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const menuCollection = client.db("bistro").collection("menu");
const reviewCollection = client.db("bistro").collection("reviews");
const cartCollection = client.db("bistro").collection("carts");
const usersCollection = client.db("bistro").collection("users");
const paymentCollection = client.db("bistro").collection("payments");
const bookingCollection = client.db("bistro").collection("bookings");

async function run() {
  try {
    // Connect the client to the server

    // await client.connect();
    // console.log("Successfully connected to MongoDB!");

    // Middleware to verify token
    const verifyToken = (req, res, next) => {
      const token = req?.cookies.token;
      console.log(token);
      if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
        req.decoded = decoded; // Set decoded token email in request object
        console.log(req.decoded);
        next();
      });
    };

    // Middleware to verify admin
    const verifyAdmin = async (req, res, next) => {
      if (!req.decoded || !req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount?.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    };

    //creating Token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    app.post("/jwt", async (req, res) => {
      try {
        const { email } = req.body; // Destructure email from request body
        const payload = { email }; // Define payload as an object containing only the email
        const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
          expiresIn: "1h", // Set expiration time
        }); // Sign token with payload

        res
          .cookie("token", token, cookieOptions)
          .status(200)
          .send({ token, message: "successfully" });
      } catch (error) {
        console.error("Error creating JWT:", error);
        res.status(500).json({ message: "Error creating JWT" });
      }
    });

    //clearing Token
    app.post("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", cookieOptions)
          .status(200)
          .send({ success: true });
      } catch (error) {
        console.error("Error clearing JWT:", error);
        res.status(500).json({ message: "Error clearing JWT" });
      }
    });

    // Menu
    app.get("/menu", async (req, res) => {
      try {
        const result = await menuCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to fetch menu");
      }
    });

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await menuCollection.findOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to fetch menu item");
      }
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const newItem = req.body;
      try {
        const result = await menuCollection.insertOne(newItem);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to add item to menu");
      }
    });

    app.patch("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedItem = req.body;
      try {
        const result = await menuCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedItem }
        );
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to update item");
      }
    });

    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      try {
        const result = await menuCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to delete item");
      }
    });

    // Reviews
    app.get("/reviews", async (req, res) => {
      try {
        const result = await reviewCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to fetch reviews");
      }
    });

    // Cart

    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send("Email query parameter is required");
      }
      try {
        const query = { email: email };
        const result = await cartCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to fetch carts");
      }
    });

    app.post("/carts", async (req, res) => {
      const item = req.body;
      try {
        const result = await cartCollection.insertOne(item);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to add item to cart");
      }
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const query = { _id: new ObjectId(id) };
        const result = await cartCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to delete item from cart");
      }
    });

    // Users

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // Users endpoint to get admin status
    app.get("/users/admin/:email", async (req, res) => {
      try {
        // Extract email from request parameters
        const email = req.params.email;

        // Find the user with the specified email
        const user = await usersCollection.findOne({ email });

        // Check if the user exists and if their role is "admin"
        const isAdmin = user?.role === "admin" ? true : false;

        // Send the isAdmin status as response
        res.send({ isAdmin });
      } catch (error) {
        // Handle errors
        console.error("Error fetching admin status:", error);
        res.status(500).json({ message: "Error fetching admin status" });
      }
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const exsistingUser = await usersCollection.findOne({
        email: user.email,
      });
      if (exsistingUser) {
        return res.send();
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // booking
    app.get("/bookings", verifyToken, async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });

    app.get("/bookings/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await bookingCollection.find({ email }).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      // Ensure the booking object includes isPending
      booking.isPending = true;

      try {
        const result = await bookingCollection.insertOne(booking);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding booking:", error);
        res.status(500).send("Failed to add booking");
      }
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          isPending: false,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // save payments
    app.post("/payments", async (req, res) => {
      try {
        const payment = req.body;

        const result = await paymentCollection.insertOne(payment);
        const query = {
          _id: {
            $in: payment.cartIds.map((id) => new ObjectId(id)),
          },
        };

        // Remove items from the cart collection based on the query
        const deleteResult = await cartCollection.deleteMany(query);

        res.send({ result, deleteResult });
      } catch (error) {
        console.error("Error processing payment:", error);
        res
          .status(500)
          .send({ error: "An error occurred while processing the payment" });
      }
    });

    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // payment intent
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      try {
        const { price } = req.body;
        const amount = parseFloat(price * 100);

        if (isNaN(amount)) {
          return res.status(400).send("Price is required");
        }

        // Create a payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        // Send the client secret to the client
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).send({
          error: "An error occurred while creating the payment intent",
        });
      }
    });

    // admin stats

    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const users = await usersCollection.estimatedDocumentCount();
      const products = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();
      const totalRevenue = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: "$price" },
            },
          },
        ])
        .toArray();
      const revenue = totalRevenue ? totalRevenue[0].total : 0;
      res.send({ users, products, orders, revenue });
    });

    // user stats
    app.get("/user-stats/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };

      try {
        const payments = await paymentCollection.countDocuments(query);
        const orders = await paymentCollection.countDocuments(query);
        const bookings = await bookingCollection.countDocuments(query);
        const reviews = await reviewCollection.countDocuments(query);
        const menu = await menuCollection.countDocuments();
        const shop = await cartCollection.countDocuments(query);

        res.send({ payments, orders, bookings, reviews });
      } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).send("Failed to fetch user stats");
      }
    });

    // Root endpoint
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
