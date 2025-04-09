
require("dotenv").config(); //must be include all file
const express = require("express");
const cors = require("cors");
const { jobCollection, userCollection, pendingCollection, saveJobCollection, applyJobCollection } = require("./mongodb/connect");
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

//Verified job post in jobCollection
app.post('/verifyJob', async (req, res) => {
   const data = req.body
   const result = await jobCollection.insertOne(data)
   res.send(result)
})
//get all verified job
app.get('/verifyJob', async (req, res) => {
   const division = req.query.division
   const jobType = req.query.jobType
   const search = req.query.search || ''
   let query = {
      title: {
         $regex: search, $options: 'i'
      }
   }
   if (division) query.division = division
   if (jobType) query.jobType = jobType
   const result = await jobCollection.find(query).toArray()
   res.send(result)
})

//Verified job get a single id
app.get('/verifyJob/:id', async (req, res) => {
   const id = req.params.id
   const query = { _id: id }
   const result = await jobCollection.findOne(query)
   res.send(result)
})
//Verified job get a Employer email
app.get('/all/verifyJob/:email', async (req, res) => {
   const email = req.params.email
   const query = { email }
   const result = await jobCollection.find(query).toArray()
   res.send(result)
})
// get Specific category ways jobs
app.get('/verifiedCategoryJob/:category', async (req, res) => {
   const category = req.params.category
   const id = req.query.id
   const query = { category, _id: { $ne: id } }
   const result = await jobCollection.find(query).toArray()
   res.send(result)
})
//delete job api
app.delete('/deleteJob/:id', async (req, res) => {
   const id = req.params.id
   const query = { _id: id }
   const result = await jobCollection.deleteOne(query)
   res.send(result)
})
//Update job ApI
app.put('/updateJob/:id', async (req, res) => {
   const id = req.params.id
   const data = req.body
   const filter = { _id: id }
   const UpdateInfo = {
      $set: {
         applyCandidate: data.applyCandidate,
         category: data.category,
         deadline: data.deadline,
         description: data.description,
         email: data.email,
         experience: data.experience,
         image: data.image,
         jobPostTime: data.jobPostTime,
         jobTime: data.jobTime,
         jobType: data.jobType,
         location: data.location,
         maxSalary: data.maxSalary,
         minSalary: data.minSalary,
         name: data.name,
         requirement: data.requirement,
         skill: data.skill,
         status: data.status,
         title: data.title,
         educationLevel: data.educationLevel


      }
   }
   const result = await jobCollection.updateOne(filter, UpdateInfo)
   res.send(result)
})
// save Job post api
app.post('/saveJob/:email', async (req, res) => {
   const data = req.body
   const email = req.params.email
   const jobId = req.query.jobId
   const query = { jobSeekerEmail: email, jobId: jobId }
   const isExist = await saveJobCollection.findOne(query)
   if (isExist) {
      return res.send('This Job All Ready Save Your Wishlist')
   }
   const result = await saveJobCollection.insertOne(data)
   res.send(result)
})
// Save job data get user email
app.get('/saveJob/:email', async (req, res) => {
   const email = req.params.email
   const query = { jobSeekerEmail: email }
   const result = await saveJobCollection.find(query).toArray()
   res.send(result)
})

//Apply Job Post API
app.post('/applyJob/:email', async (req, res) => {
   const data = req.body
   const email = req.params.email
   const jobId = req.query.jobId
   const query = { jobSeekerEmail: email, jobId: jobId }
   const isExist = await applyJobCollection.findOne(query)
   if (isExist) {
      return res.send('This Job All Ready Save Your Wishlist')
   }
   const result = await applyJobCollection.insertOne(data)
   res.send(result)
})
// Get All Apply Job A Specific Job Seeker email
app.get('/applyJob/:email', async (req, res) => {
   const email = req.params.email
   const query = { jobSeekerEmail: email }
   const result = await applyJobCollection.find(query).toArray()
   res.send(result)
})
//Job Seeker Apply any job and applyCount update 
app.patch('/updateApplyCount/:id', async (req, res) => {
   const id = req.params.id
   console.log(id)
   const filter = { _id: id }
   const update = {
      $inc: {
         applyCandidate: 1
      }
   }
   const result = await jobCollection.updateOne(filter, update)
   res.send(result)
})
app.get('/', (req, res) => {
   res.send('server is running on jobportal ai')
})










module.exports = app // system of export for server