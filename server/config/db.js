import mongoose from "mongoose";

// Function to Connect MongoDB Database

const connectDB = async () => {
  mongoose.connection.on("connected", () => console.log("Database Connected"));
  await mongoose.connect(`${process.env.MONGODB_URI}`);
};

export default connectDB;