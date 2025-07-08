@@ .. @@
 import quizRoutes from "./routes/quizRoutes.js"
+import userRoutes from "./routes/userRoutes.js"
 
@@ .. @@
 // Routes
 app.use("/api/quizzes", quizRoutes)
+app.use("/api/users", userRoutes)
 
 // Error handling middleware