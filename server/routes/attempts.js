// routes/attempts.js
import express from "express"
import { unifiedAuth } from "../middlewares/unifiedAuth.js"
import * as ctrl from "../controllers/quizController.js"

const router = express.Router()

// Get user's attempts
router.get("/my-attempts", unifiedAuth, ctrl.listMyAttempts)

export default router
