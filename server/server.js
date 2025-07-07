import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import authRoutes from "./routes/authRoutes.js"
import quizRoutes from "./routes/quizzes.js"
import attemptRoutes from "./routes/attempts.js"
import userStatsRoutes from "./routes/userStats.js"
import userRoutes from "./routes/user-routes.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Connect to MongoDB
connectDB()

// Middleware
app.use(cors())
app.use(express.json({ limit: "10mb" })) // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/quizzes", quizRoutes)
app.use("/api/attempts", attemptRoutes)
app.use("/api/users", userStatsRoutes)
app.use("/api/users", userRoutes)

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Quiz App API is running!" })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err)
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
