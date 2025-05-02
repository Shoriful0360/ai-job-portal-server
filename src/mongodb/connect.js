require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.onkli.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi:   {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



// create collection list and then export
const userCollection = client.db('ai-Job').collection('allUser')
const pendingCollection = client.db('ai-Job').collection('allPendingJob')
const jobCollection = client.db('ai-Job').collection('allJob')
const saveJobCollection = client.db('ai-Job').collection('saveJob')
const applyJobCollection = client.db('ai-Job').collection('applyJob')
const pendingReviewCollection = client.db('ai-Job').collection('allPendingReview')
const verifiedReviewCollection = client.db('ai-Job').collection('allVerifiedReview')
const contactCollection = client.db('ai-Job').collection('contactRequest')
const messageCollection = client.db('ai-Job').collection('message')
const resumeCollection = client.db('ai-Job').collection("resumes");
async function connectDB() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
// run().catch(console.dir);

module.exports = { connectDB, resumeCollection, jobCollection, userCollection,messageCollection, pendingCollection,saveJobCollection,applyJobCollection,pendingReviewCollection,verifiedReviewCollection,contactCollection }