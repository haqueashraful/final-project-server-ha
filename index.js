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




// collection

const menuCollection = client.db("bistro").collection("menu");
const reviewCollection = client.db("bistro").collection("reviews");
const cartCollection = client.db("bistro").collection("carts");

async function run() {
  try {

        // menu

        app.get('/menu', async (req, res) => {
          const result = await menuCollection.find().toArray();
          res.send(result);
        })






        // reviews

        app.get('/reviews', async (req, res) => {
          const result = await reviewCollection.find().toArray();
          res.send(result);
        })


    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Define your routes here and use the connected client
  

    // Other routes...
    app.get("/", (req, res) => {
      res.send("Hello World!");
    })

  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
