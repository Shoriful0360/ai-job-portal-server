const app=require("./src/app");
const { connectDB } = require("./src/mongodb/connect");


const PORT=process.env.PORT || 5000

connectDB()

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


