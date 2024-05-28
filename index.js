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
        if (result.deletedCount === 1) {
          res.send({ message: "Successfully deleted item from cart" });
        } else {
          res.status(404).send({ message: "Item not found in cart" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to delete item from cart");
      }
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
