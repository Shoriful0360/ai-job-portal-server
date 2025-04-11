require("dotenv").config(); // Ensure dotenv is loaded at the top
const express = require("express");
const cors = require("cors");
const { jobCollection, userCollection, pendingCollection } = require("./mongodb/connect");
const { ObjectId } = require("mongodb");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create User handle both Job Seeker and Employer roles
app.post('/user/:email', async (req, res) => {
    const user = req.body;
    const email = req.params.email;
    const query = { email };

    // Check if user already exists
    const isExist = await userCollection.findOne(query);
    if (isExist) {
        return res.send(isExist); // If user exists, return existing user
    }

    // Prepare the user data based on role
    const newUser = {
        name: user.name,
        email: user.email,
        role: user.role,
        photoURL: user.photoURL || "",
    };

    // If Employer, include company information
    if (user.role === "Employer") {
        newUser.companyName = user.companyName || "";
        newUser.companyDetails = user.companyDetails || "";
    }

    try {
        // Insert new user into collection
        const result = await userCollection.insertOne(newUser);
        res.send(result);
    } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).send({ error: true, message: "Server error while creating user" });
    }
});

// New job post in Pending job Collection
app.post('/pendingJob', async (req, res) => {
    const data = req.body;
    try {
        const result = await pendingCollection.insertOne(data);
        res.send(result);
    } catch (error) {
        console.error("Error posting pending job:", error);
        res.status(500).send({ error: true, message: "Failed to post pending job" });
    }
});

// Get all pending jobs
app.get('/pendingJob', async (req, res) => {
    try {
        const result = await pendingCollection.find().toArray();
        res.send(result);
    } catch (error) {
        console.error("Error fetching pending jobs:", error);
        res.status(500).send({ error: true, message: "Failed to fetch pending jobs" });
    }
});

// Get a single pending job by ID
app.get('/pendingJob/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    try {
        const result = await pendingCollection.findOne(query);
        res.send(result);
    } catch (error) {
        console.error("Error fetching job by ID:", error);
        res.status(500).send({ error: true, message: "Failed to fetch job by ID" });
    }
});

// Reject a pending job
app.patch('/rejectJob/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const updateData = {
        $set: { status: 'rejected' }
    };
    try {
        const result = await pendingCollection.updateOne(query, updateData);
        res.send(result);
    } catch (error) {
        console.error("Error rejecting job:", error);
        res.status(500).send({ error: true, message: "Failed to reject job" });
    }
});

// Accept a pending job
app.patch('/acceptJob/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateData = {
        $set: { status: 'verified' }
    };
    try {
        const result = await pendingCollection.updateOne(filter, updateData);
        res.send(result);
    } catch (error) {
        console.error("Error accepting job:", error);
        res.status(500).send({ error: true, message: "Failed to accept job" });
    }
});

// Verified job post in Job Collection
app.post('/verifyJob', async (req, res) => {
    const data = req.body;
    try {
        const result = await jobCollection.insertOne(data);
        res.send(result);
    } catch (error) {
        console.error("Error posting verified job:", error);
        res.status(500).send({ error: true, message: "Failed to post verified job" });
    }
});

// Get all verified jobs
app.get('/verifyJob', async (req, res) => {
    try {
        const result = await jobCollection.find().toArray();
        res.send(result);
    } catch (error) {
        console.error("Error fetching verified jobs:", error);
        res.status(500).send({ error: true, message: "Failed to fetch verified jobs" });
    }
});

// Get a single verified job by ID
app.get('/verifyJob/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    try {
        const result = await jobCollection.findOne(query);
        res.send(result);
    } catch (error) {
        console.error("Error fetching verified job by ID:", error);
        res.status(500).send({ error: true, message: "Failed to fetch job by ID" });
    }
});

// Root route
app.get('/', (req, res) => {
    res.send('Server is running on JobPortal AI');
});

// Export the app
module.exports = app;
