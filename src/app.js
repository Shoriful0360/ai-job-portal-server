
require("dotenv").config(); //must be include all file
const express = require("express");
const cors = require("cors");
const bcrypt=require("bcryptjs")
const { jobCollection, userCollection, pendingCollection, saveJobCollection, applyJobCollection } = require("./mongodb/connect");
const { ObjectId } = require("mongodb");
const app = express()

//  middleware
app.use(cors())
app.use(express.json())


// // rabbani vai code 
// app.post('/user/:email', async (req, res) => {
//    const user = req.body;
//    const email = req.params.email;
//    const query = { email };

//    // Check if user already exists
//    const isExist = await userCollection.findOne(query);
//    if (isExist) {
//        return res.send(isExist); // If user exists, return existing user
//    }

//    // Prepare the user data based on role
//    const newUser = {
//        name: user.name,
//        email: user.email,
//        role: user.role,
//        photoURL: user.photoURL || "",
//    };

//    // If Employer, include company information
//    if (user.role === "Employer") {
//        newUser.companyName = user.companyName || "";
//        newUser.companyDetails = user.companyDetails || "";
//    }

//    try {
//        // Insert new user into collection
//        const result = await userCollection.insertOne(newUser);
//        res.send(result);
//    } catch (error) {
//        console.error("Error inserting user:", error);
//        res.status(500).send({ error: true, message: "Server error while creating user" });
//    }
// });
//create User
app.post('/register', async (req, res) => {
   const userData = req.body;
   const existingUser=await userCollection.findOne({email:userData?.email});
   if(existingUser){
      return res.status(400).json({message:"Email already exists"})
   }


   if(userData.password){
      const hashedPassword=await bcrypt.hash(userData.password,10)
      const result=await userCollection.insertOne({
         ...userData,
           password:hashedPassword,
           loginAttempts: 0,          // Initial login attempts counter
           lockUntil: null,
        })
       return  res.send(result)
   }else{
      const result=await userCollection.insertOne({
         ...userData,
        })
        res.send(result)
   }
  
 
})



// block user when enter wrong password

app.post('/wrong-password', async (req, res) => {
   const { email, password } = req.body;
   const user = await userCollection.findOne({ email });

   // User না থাকলে
   if (!user) {
       return res.status(403).json({ message: 'User not found' });
   }

   // যদি account lock করা থাকে
   if (user.lockUntil && user.lockUntil > Date.now()) {
       return res.status(403).json({
           message: `Your account is locked. Try again after ${new Date(user.lockUntil).toLocaleString()}`
       });
   }

   // Password মিলছে কি না চেক
   const isMatch = await bcrypt.compare(password, user.password);
  


   if (isMatch) {
       // সফল login হলে loginAttempts reset হবে
       await userCollection.updateOne({ email }, {
           $set: {
               loginAttempts: 0,
               lockUntil: null
           }
       });

       // ✅ এখানেই response success
       return res.status(200).send({ message: 'login successful' });
   } else {
       // ভুল password, loginAttempts বাড়াও
       let updateQuery = { $inc: { loginAttempts: 1 } };

       if (user.loginAttempts >= 2) {
           updateQuery.$set = { lockUntil: Date.now() + 60 * 60 * 1000 }; // 1 ঘণ্টার জন্য block
       }

       await userCollection.updateOne({ email }, updateQuery);

       if (user.loginAttempts >= 2) {
           return res.status(403).json({
               message: "Too many failed attempts. Account is locked for 1 hour."
           });
       } else {
           return res.status(401).json({ message: 'Wrong password' });
       }
   }
});




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
7
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

// category job
app.get('/category-job/:title',async(req,res)=>{
   const {title}=req.params;
   const query={category: title};
   const result=await jobCollection.find(query).toArray()
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