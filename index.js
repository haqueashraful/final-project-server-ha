const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(express.json());

const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
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

    // Define routes here and use the connected client
    
    // Menu
    app.get('/menu', async (req, res) => {
      try {
        const result = await menuCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to fetch menu");
      }
    });

    // Reviews
    app.get('/reviews', async (req, res) => {
      try {
        const result = await reviewCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to fetch reviews");
      }
    });

    // Cart
 
    app.get('/carts', async (req, res) => {
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

    app.post('/carts', async (req, res) => {
      const item = req.body;
      try {
        const result = await cartCollection.insertOne(item);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to add item to cart");
      }
    });

    app.delete('/carts/:id', async (req, res) => {
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

  app.get('/users', async (req, res) => {
    const result = await usersCollection.find().toArray();
    res.send(result);
  })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const exsistingUser = await usersCollection.findOne({ email: user.email });
      if (exsistingUser) {
        return res.send();
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

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
    

    app.delete('/users/:id', async (req, res) => {
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
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
