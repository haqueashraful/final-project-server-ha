const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: ["http://localhost:5173", "*"],
  credentials: true,
};

// middleware
app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = process.env.MONGO_URI;

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

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Successfully connected to MongoDB!");

    // verifyJWT
    // const verifyToken = (req, res, next) => {
    //   const authHeader = req.headers.authorization;
    //   if (!authHeader) {
    //     return res.status(401).send("Unauthorized access");
    //   }
    //   const token = authHeader.split(" ")[1];
    //   jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    //     if (err) {
    //       return res.status(403).send({ message: "Forbidden access" });
    //     }
    //     req.decoded = decoded;
    //     next();
    //   });
    // };

    // verify admin
    // const verifyAdmin = async (req, res, next) => {
    //   const requester = req.decoded.email;
    //   const requesterAccount = await usersCollection.findOne({
    //     email: requester,
    //   });
    //   if (requesterAccount?.role === "admin") {
    //     next();
    //   } else {
    //     res.status(403).send({ message: "forbidden" });
    //   }
    // };
    // Middleware to verify token
    const verifyToken = (req, res, next) => {
      const token = req?.cookies.token;
      if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
        req.decoded = {}; // Initialize req.decoded as an empty object
        req.decoded = decoded; // Set decoded token email in request object
        console.log("req.user", req.decoded.email); // Access decoded email
        next();
      });
    };
    
    

    // Middleware to verify admin
    const verifyAdmin = async (req, res, next) => {
      console.log("email on admin", req.decoded?.email);
      if (!req.decoded || !req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const requester = req.decoded.email;
      console.log("reqq",requester)
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

// JWT
app.post("/jwt", async (req, res) => {
  try {
    const email = req.body.email; // Destructure email from request body
    const payload = { email }; // Define payload as an object containing only the email
    console.log("email:", email);
    const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
      expiresIn: "1h", // Set expiration time
    }); // Sign token with payload
    res
      .cookie("token", token, cookieOptions)
      .send({ token, message: "successfully" });
  } catch (error) {
    console.error("Error creating JWT:", error);
    res.status(500).json({ message: "Error creating JWT" });
  }
});


    //clearing Token
    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
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


    // Users endpoint to get admin status
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });
        const isAdmin = user?.role === "admin" ? true : false;
        res.send({ isAdmin });
      } catch (error) {
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

    // app.patch('/users/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   try {
    //     // Fetch the current user's role
    //     const user = await usersCollection.findOne(filter);
    //     // Determine the new role based on the current role
    //     const newRole = user.role === 'admin' ? 'user' : 'admin';
    //     // Construct the update document
    //     const updateDoc = {
    //       $set: {
    //         role: newRole
    //       }
    //     };
    //     // Perform the update operation
    //     const result = await usersCollection.updateOne(filter, updateDoc);

    //     res.send(result);
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).send("Failed to update user role");
    //   }
    // });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Root endpoint
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
