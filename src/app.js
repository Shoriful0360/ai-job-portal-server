
require("dotenv").config(); //must be include all file
const express = require("express");
const cors = require("cors");
const { jobCollection, userCollection,pendingCollection } = require("./mongodb/connect");
const { ObjectId } = require("mongodb");
const app = express()

//  middleware
app.use(cors())
app.use(express.json())

//create User
app.post('/user/:email', async (req, res) => {
   const user = req.body
   const email = req.params.email
   const query = { email }
   const isExist = await userCollection.findOne(query)
   if (isExist) {
      return res.send(isExist)
   }
   const result = await userCollection.insertOne(user)
   res.send(result)
})

//New job post in Pending job Collection
app.post('/pendingJob', async (req, res) => {
   const data = req.body
   const result = await pendingCollection.insertOne(data)
   res.send(result)
})
 //get pending job
 app.get('/pendingJob', async (req, res) => {
   const result = await pendingCollection.find().toArray()
   res.send(result)
})
//pending job get a single id
app.get('/pendingJob/:id', async (req, res) => {
   const id = req.params.id
   const query = { _id: new ObjectId(id) }
   const result = await pendingCollection.findOne(query)
   res.send(result)
})
//rejected pending job 
app.patch('/rejectJob/:id', async (req, res) => {
   const id = req.params.id
   const query = { _id: new ObjectId(id) }
   const updateData = {
       $set: {
           status: 'rejected'
       }
   }
   const result = await pendingCollection.updateOne(query, updateData)
   res.send(result)
})
 //Accept pending job
 app.patch('/acceptJob/:id', async (req, res) => {
   const id = req.params.id
   const filter = { _id: new ObjectId(id) }
   const updateData = {
       $set: {
           status: 'verified'
       }
   }
   const result = await pendingCollection.updateOne(filter, updateData)
   res.send(result)
})

//Verified job post in job Collection
app.post('/verifyJob', async (req, res) => {
   const data = req.body
   const result = await jobCollection.insertOne(data)
   res.send(result)
})
//get verify job
app.get('/verifyJob', async (req, res) => {
   const result = await jobCollection.find().toArray()
   res.send(result)
})




app.get('/', (req, res) => {
   res.send('server is running on jobportal ai')
})











module.exports = app // system of export for server