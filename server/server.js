import authRoutes from "./routes/authRoutes.js"
import quizRoutes from "./routes/quizzes.js"
import attemptRoutes from "./routes/attempts.js"
import userRoutes from "./routes/userRoutes.js"

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/quizzes", quizRoutes)
app.use("/api/attempts", attemptRoutes)
app.use("/api/users", userRoutes)

// Error handling middleware

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📍 API Base URL: http://localhost:${PORT}`)
  console.log(`🔗 Available routes:`)
  console.log(`   - GET  /api/auth/profile`)
  console.log(`   - GET  /api/users/:userId/public-profile`)
  console.log(`   - GET  /api/users/profile/performance`)
  console.log(`   - GET  /api/users/profile`)
})