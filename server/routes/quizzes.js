// routes/quizzes.js
import { unifiedAuth } from "../middlewares/unifiedAuth.js"
import * as ctrl from "../controllers/quizController.js"
import express from "express"
import * as attemptController from "../controllers/quizAttemptController.js"
const router = express.Router()

// IMPORTANT: Put specific routes BEFORE parameterized routes
// Dashboard endpoints (protected) - MUST come first
router.get("/my-created", unifiedAuth, ctrl.getMyQuizzes)
router.get("/my-attempts", unifiedAuth, ctrl.listMyAttempts)
router.get("/my-performance", unifiedAuth, ctrl.getMyPerformance)

// Public quiz routes
router.get("/", ctrl.getAllQuizzes)
router.get("/:id/detail", ctrl.getQuizDetail)

// Protected quiz creation, updates, deletes
router.post("/", unifiedAuth, ctrl.createQuiz)
router.put("/:id", unifiedAuth, ctrl.updateQuiz)
router.delete("/:id", unifiedAuth, ctrl.deleteQuiz)

// Quiz attempts and results
router.post("/:id/attempt", unifiedAuth, attemptController.createAttempt)
router.get("/:id/result/:attemptId", unifiedAuth, attemptController.getAttemptResult)

// Protected leaderboard & attempts for specific quiz (THESE ARE THE ONES WE WANT)
router.get("/:id/leaderboard", unifiedAuth, ctrl.getQuizLeaderboard)
router.get("/:id/attempts", unifiedAuth, attemptController.getQuizAttempts)

// Export quiz result
router.get("/:id/result/:attemptId/export", unifiedAuth, attemptController.exportAttemptResult)

// Generic quiz by ID route - MUST come last
router.get("/:id", ctrl.getQuizById)

export default router
