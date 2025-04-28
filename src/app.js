require("dotenv").config(); //must be include all file
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs")
const { jobCollection, userCollection, pendingCollection, saveJobCollection, applyJobCollection, pendingReviewCollection, contactCollection, verifiedReviewCollection } = require("./mongodb/connect");
const { ObjectId } = require("mongodb");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Aggregation for Job Post Growth by Month
app.get("/statistics/jobPostGrowth", async (req, res) => {
  try {
    const result = await jobCollection.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          jobCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch job post growth data", error });
  }
});

// Aggregation for Application Count by Month
app.get("/statistics/applicationCount", async (req, res) => {
  try {
    const result = await applicationCollection.aggregate([
      {
        $group: {
          _id: { $month: "$appliedAt" },
          applicationCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch application count data", error });
  }
});

// Aggregation for Job Category Distribution
app.get("/statistics/jobCategoryDistribution", async (req, res) => {
  try {
    const result = await jobCollection.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch job category distribution data", error });
  }
});

// Aggregation for User Signups by Month
app.get("/statistics/userSignups", async (req, res) => {
  try {
    const result = await userCollection.aggregate([
      {
        $group: {
          _id: { $month: "$signupDate" },
          signupCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user signup data", error });
  }
});

// Get user role info by email
app.get("/user-info/role/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const result = await userCollection.findOne(query);
  res.send(result);
});

// Register user
app.post("/register", async (req, res) => {
  const userData = req.body;
  const existingUser = await userCollection.findOne({ email: userData?.email });

  if (existingUser) {
    return res.status(400).json({ message: "Email already exists" });
  }

  if (userData.password) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const result = await userCollection.insertOne({
      ...userData,
      password: hashedPassword,
      loginAttempts: 0,
      lockUntil: null,
    });
    return res.send(result);
  } else {
    const result = await userCollection.insertOne(userData);
    res.send(result);
  }
});

// Change user role
app.patch("/users/:id/role", async (req, res) => {
   const id = req.params.id;
   const { role } = req.body;
   try {
      const result = await userCollection.updateOne(
         { _id: new ObjectId(id) },
         { $set: { role } }
      );
      res.send(result);
   } catch (error) {
      res.status(500).json({ message: "Failed to update role", error });
   }
 });
 
 // Delete user
 app.delete("/users/:id", async (req, res) => {
   const id = req.params.id;
   try {
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
   } catch (error) {
      res.status(500).json({ message: "Failed to delete user", error });
   }
 });
 

// Handle wrong password and lock account
app.post("/wrong-password", async (req, res) => {
  const { email, password } = req.body;
  const user = await userCollection.findOne({ email });

  if (!user) {
    return res.status(403).json({ message: "User not found" });
  }

  if (user.lockUntil && user.lockUntil > Date.now()) {
    return res.status(403).json({
      message: `Your account is locked. Try again after ${new Date(
        user.lockUntil
      ).toLocaleString()}`,
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (isMatch) {
    await userCollection.updateOne(
      { email },
      {
        $set: {
          loginAttempts: 0,
          lockUntil: null,
        },
      }
    );
    return res.status(200).send({ message: "login successful" });
  } else {
    let updateQuery = { $inc: { loginAttempts: 1 } };

    if (user.loginAttempts >= 2) {
      updateQuery.$set = { lockUntil: Date.now() + 60 * 60 * 1000 };
    }
    
    await userCollection.updateOne({ email }, updateQuery);

    if (user.loginAttempts >= 2) {
      return res.status(403).json({
        message: "Too many failed attempts. Account is locked for 1 hour.",
      });
    } else {
      return res.status(401).json({ message: "Wrong password" });
    }
  }
});
// category job
app.get('/category-job/:title', async (req, res) => {
   const { title } = req.params;
   const query = { category: title };
   const result = await jobCollection.find(query).toArray()
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
// Get All Apply Job A Specific Job Seeker email
app.get('/applyJob/:email', async (req, res) => {
   const email = req.params.email
   const query = { jobSeekerEmail: email }
   const result = await applyJobCollection.find(query).toArray()
   res.send(result)
})
// Get data A Specific Job Seeker apply id
app.get('/single/Candidate/data/:id', async (req, res) => {
   const id = req.params.id
   const query = { _id: new ObjectId(id) }
   const result = await applyJobCollection.findOne(query)
   res.send(result)
})
//Job Seeker Apply any job and applyCount update 
app.patch('/updateApplyCount/:id', async (req, res) => {
   const id = req.params.id
   const filter = { _id: id }
   const update = {
      $inc: {
         applyCandidate: 1
      }
   }
   const result = await jobCollection.updateOne(filter, update)
   res.send(result)
})

//Specific job all candidates data get api
app.get('/singleJob/all/Candidates/:id', async (req, res) => {
   const id = req.params.id
   const query = { jobId: id }
   const result = await applyJobCollection.find(query).toArray()
   res.send(result)
})
//get all hired candidates  A Specific employer
app.get('/hired/all/Candidates/:email', async (req, res) => {
   const email = req.params.email
   const query = { companyEmail: email }
   const result = await applyJobCollection.find(query).toArray()
   res.send(result)
})
// Candidate Listed API
app.patch('/listed/candidate/:id', async (req, res) => {
   const id = req.params.id
   const filter = { _id: new ObjectId(id) }
   const update = {
      $set: {
         status: 'listed'
      }
   }
   const result = await applyJobCollection.updateOne(filter, update)
   res.send(result)
})
// Candidate Reject API
app.patch('/reject/candidate/:id', async (req, res) => {
   const id = req.params.id
   const filter = { _id: new ObjectId(id) }
   const update = {
      $set: {
         status: 'reject'
      }
   }
   const result = await applyJobCollection.updateOne(filter, update)
   res.send(result)
})
// Candidate Hired API
app.patch('/hired/candidate/:id', async (req, res) => {
   const id = req.params.id
   const filter = { _id: new ObjectId(id) }
   const update = {
      $set: {
         status: 'hired'
      }
   }
   const result = await applyJobCollection.updateOne(filter, update)
   res.send(result)
})
// Post pending contact API
app.post('/contact/request', async (req, res) => {
   const data = req.body
   const result = await contactCollection.insertOne(data)
   res.send(result)
})
// Get All Pending contact
app.get('/contact/request', async (req, res) => {
   const result = await contactCollection.find().toArray()
   res.send(result)
})
// After Contact And delete this data
app.delete('/delete/contact/request/:id', async (req, res) => {
   const id = req.params.id
   const query = { _id: new ObjectId(id) }
   const result = await contactCollection.deleteOne(query)
   res.send(result)
})
// Post pending Review API
app.post('/pendingReview', async (req, res) => {
   const data = req.body
   const result = await pendingReviewCollection.insertOne(data)
   res.send(result)
})
// Get All Pending Review 
app.get('/pendingReview', async (req, res) => {
   const result = await pendingReviewCollection.find().toArray()
   res.send(result)
})
// Post verified Review API
app.post('/verifiedReview', async (req, res) => {
   const data = req.body
   const result = await verifiedReviewCollection.insertOne(data)
   res.send(result)
})
// Get All verified Review 
app.get('/verifiedReview', async (req, res) => {
   const result = await verifiedReviewCollection.find().toArray()
   res.send(result)
})
// Update Review Status
app.patch('/verified/review/status/:id', async (req, res) => {
   const id = req.params.id
   const filter = { _id: new ObjectId(id) }
   const update = {
      $set: {
         status: 'verified'
      }
   }
   const result = await verifiedReviewCollection.updateOne(filter, update)
   res.send(result)
})
// Delete verified Review (email)
app.delete('/review/delete/:email', async (req, res) => {
   const email = req.params.email
   const reviews = await verifiedReviewCollection.find({ email: email }).sort({ reviewTime: -1 }).toArray();
   if (reviews.length > 1) {
      const idsToDelete = reviews.slice(1).map(review => review._id);
      const query = { _id: { $in: idsToDelete } }
      const result = await verifiedReviewCollection.deleteMany(query)
      res.send(result)
   }
})
// Delete verified Review (id)
app.delete('/single/review/delete/:id', async (req, res) => {
   const id = req.params.id
   const query = { _id: new ObjectId(id) }
   const result = await pendingReviewCollection.deleteOne(query)
   res.send(result)
})
// get all Users
app.get("/users", async (req, res) => {
   try {
      const users = await userCollection.find().toArray();
      res.send(users);
   } catch (error) {
      res.status(500).json({ message: "Failed to fetch users", error });
   }
});
// get all employers
app.get('/employers', async (req, res) => {
   const users = await userCollection.aggregate([
      {
         $match: { role: 'Employer' }
      },
      {
         $lookup: {
            from: 'allJob',
            localField: 'email',
            foreignField: 'email',
            as: 'companyJobs'
         }
      },
      {
         $addFields: {
            jobCount: { $size: '$companyJobs' }
         }
      },
      {
         $sort: { jobCount: -1 }
      },
      {
         $project: {
            password: 0,
            companyJobs: 0
         }
      }
   ]).toArray()
   res.send(users);
})



// New job post to pending collection
app.post("/pendingJob", async (req, res) => {
  const data = req.body;
  const result = await pendingCollection.insertOne(data);
  res.send(result);
});

// Get all pending jobs
app.get("/pendingJob", async (req, res) => {
  const result = await pendingCollection.find().toArray();
  res.send(result);
});

// Get single pending job by ID
app.get("/pendingJob/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await pendingCollection.findOne(query);
  res.send(result);
});

// Reject a pending job
app.patch("/rejectJob/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const updateData = { $set: { status: "rejected" } };
  const result = await pendingCollection.updateOne(query, updateData);
  res.send(result);
});

// Accept a pending job
app.patch("/acceptJob/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateData = { $set: { status: "verified" } };
  const result = await pendingCollection.updateOne(filter, updateData);
  res.send(result);
});

// Move verified job to job collection
app.post("/verifyJob", async (req, res) => {
  const data = req.body;
  const result = await jobCollection.insertOne(data);
  res.send(result);
});

// Get all verified jobs with optional filters
app.get("/verifyJob", async (req, res) => {
  const division = req.query.division;
  const jobType = req.query.jobType;
  const search = req.query.search || "";
  let query = {
    title: {
      $regex: search,
      $options: "i",
    },
  };
  if (division) query.division = division;
  if (jobType) query.jobType = jobType;

  const result = await jobCollection.find(query).toArray();
  res.send(result);
});

// Get single verified job
app.get("/verifyJob/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: id };
  const result = await jobCollection.findOne(query);
  res.send(result);
});

// Get all jobs posted by a specific employer
app.get("/all/verifyJob/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const result = await jobCollection.find(query).toArray();
  res.send(result);
});

// Get jobs by category (except current ID)
app.get("/verifiedCategoryJob/:category", async (req, res) => {
  const category = req.params.category;
  const id = req.query.id;
  const query = { category, _id: { $ne: id } };
  const result = await jobCollection.find(query).toArray();
  res.send(result);
});

// Delete a job
app.delete("/deleteJob/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: id };
  const result = await jobCollection.deleteOne(query);
  res.send(result);
});

// Update a job
app.put("/updateJob/:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const filter = { _id: id };
  const updateInfo = {
    $set: {
      ...data,
    },
  };
  const result = await jobCollection.updateOne(filter, updateInfo);
  res.send(result);
});

// Save a job to wishlist
app.post("/saveJob/:email", async (req, res) => {
  const data = req.body;
  const email = req.params.email;
  const jobId = req.query.jobId;
  const query = { jobSeekerEmail: email, jobId: jobId };
  const isExist = await saveJobCollection.findOne(query);
  if (isExist) {
    return res.send("This Job Already Saved to Your Wishlist");
  }
  const result = await saveJobCollection.insertOne(data);
  res.send(result);
});

// Get saved jobs by user email
app.get("/saveJob/:email", async (req, res) => {
  const email = req.params.email;
  const query = { jobSeekerEmail: email };
  const result = await saveJobCollection.find(query).toArray();
  res.send(result);
});

// Get jobs by category title
app.get("/category-job/:title", async (req, res) => {
  const { title } = req.params;
  const query = { category: title };
  const result = await jobCollection.find(query).toArray();
  res.send(result);
});

// Apply to a job
app.post("/applyJob/:email", async (req, res) => {
  const data = req.body;
  const email = req.params.email;
  const jobId = req.query.jobId;
  const query = { jobSeekerEmail: email, jobId: jobId };
  const isExist = await applyJobCollection.findOne(query);
  if (isExist) {
    return res.send("This Job Already Applied");
  }
  const result = await applyJobCollection.insertOne(data);
  res.send(result);
});

// Get all applied jobs by a specific user
app.get("/applyJob/:email", async (req, res) => {
  const email = req.params.email;
  const query = { jobSeekerEmail: email };
  const result = await applyJobCollection.find(query).toArray();
  res.send(result);
});

// Update apply count for a job
app.patch("/updateApplyCount/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: id };
  const update = {
    $inc: {
      applyCandidate: 1,
    },
  };
  const result = await jobCollection.updateOne(filter, update);
  res.send(result);
});

// ✅ Get all users (for manage user feature)
app.get("/users", async (req, res) => {
  try {
    const users = await userCollection.find().toArray();
    res.send(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error });
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("Server is running on jobportal ai");
});

module.exports = app;
