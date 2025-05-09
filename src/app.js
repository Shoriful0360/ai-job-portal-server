
require("dotenv").config(); //must be include all file
const express = require("express");
const { v4: uuidv4 } = require('uuid');
const cors = require("cors");
const bcrypt=require("bcryptjs")
const { jobCollection, userCollection, pendingCollection, saveJobCollection, applyJobCollection } = require("./mongodb/connect");
const { ObjectId } = require("mongodb");
const app = express()
  
//  middleware
app.use(cors())
app.use(express.json())

// CRUD operation

app.get('/user-info/role/:email',async(req,res)=>{
   const email=req.params.email;
   const query={email}
   const result=await userCollection.findOne(query)
   res.send(result)
})

// update user info
app.post('/update-user/:email',async(req,res)=>{
   const email=req.params.email;
   const {...updateField}=req.body;
   if(!email){
      return res.status(400).json({error:'Email is required'})
   }
  const result=await userCollection.updateOne(
   {email:email},
   {$set:updateField}
  )
res.send(result)
})

// update password
// const bcrypt = require("bcrypt");

app.put("/change-password/:email", async (req, res) => {
  const { email } = req.params;
  const { currentPassword, newPassword } = req.body;



  try {
    const user = await userCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if(!user?.password){

       return res.status(404).json({ error: "You donot register with password" });
    }

    //  Compare current password with hashed one
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user?.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Your current password is incorrect" });
    }

    //  Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    //  Update password in MongoDB
    const result = await userCollection.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    res.send({ message: "Password updated successfully", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// save skill 

// POST /add-skill/:email
app.post("/add-skill/:email", async (req, res) => {
   const email = req.params.email;
   const newSkill = {
      ...req.body,
      id:uuidv4() //add unique id
   }
   if(!email){
      return res.status(400).json({error:'Email is required'})
   }
   try {
     const result = await userCollection.updateOne(
       { email },
       {
         $push: { skills: newSkill }, 
       },
       { upsert: true }
     );
 
     res.status(200).send({ success: true, message: "Skill added", result });
   } catch (err) {
     console.error(err);
     res.status(500).send({ success: false, error: "Failed to add skill" });
   }
 });
 
//  update skill
app.put("/update-skill/:email/:skillId",async(req,res)=>{
   const {email,skillId}=req.params;  
   const updateSkill=req.body;
   console.log(skillId)
  
   if(!email){
      return res.status(400).json({error:'Email is required'})
   }
 
   const result=await userCollection.updateOne(
      {email,"skills.id":skillId},
      {$set: {
         "skills.$.skill_name": updateSkill.skill_name,
         "skills.$.experience": updateSkill.experience,
         "skills.$.Project_link": updateSkill.Project_link,
         "skills.$.github_link_client": updateSkill.github_link_client,
         "skills.$.github_link_server": updateSkill.github_link_server,
       },}
   )
   res.send(result)
})

// delete skill
app.delete("/delete-skill/:email/:skillId",async(req,res)=>{
   const{email,skillId}=req.params;
   if(!email || !skillId){
      return res.status(400).json({error:"Email and skillId are require"})
   }
   try{
      const result=await userCollection.updateOne(
         {email},
         {$pull:{skills:{id:skillId}}}//remove matching skill by id
      )
      res.send(result)
   }catch(error){
      res.status(500).json({suucess:false,error:"Failed to delet skill"})
   }
})

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