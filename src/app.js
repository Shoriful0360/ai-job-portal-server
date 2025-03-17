
require("dotenv").config(); //must be include all file
const express=require("express");
const cors=require("cors");
const { jobCollection } = require("./mongodb/connect");
 const app=express()

//  middleware
app.use(cors())
app.use(express.json())

// get mehtod

app.get('/',async(req,res)=>{

   const result=await jobCollection.find().toArray()
   res.send(result)
})

app.get('/',(req,res)=>{
   res.send('server is running on jobportal ai')
})











module.exports=app // system of export for server