import mongoose from "mongoose"

const AnswerSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  questionText: {
    type: String,
    required: true,
  },
  selectedAnswer: mongoose.Schema.Types.Mixed,
  selectedText: {
    type: String,
    default: "",
  },
  correctText: {
    type: String,
    default: "",
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
  points: {
    type: Number,
    default: 0,
  },
  explanation: {
    type: String,
    default: "",
  },
  timeTaken: {
    type: Number,
    default: 0,
  },
})

const QuizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userSource: {
      type: String,
      enum: ["firebase", "mongo"],
      default: "firebase",
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      default: "",
    },
    userPhotoURL: {
      type: String,
      default: "",
    },
    answers: [AnswerSchema],
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    maxPossibleScore: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    timeTaken: {
      type: Number,
      required: true,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "completed",
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      deviceType: String,
      browserInfo: String,
    },
    flags: {
      suspicious: {
        type: Boolean,
        default: false,
      },
      tooFast: {
        type: Boolean,
        default: false,
      },
      perfectScore: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better performance
QuizAttemptSchema.index({ quizId: 1, createdAt: -1 })
QuizAttemptSchema.index({ userId: 1, createdAt: -1 })
QuizAttemptSchema.index({ quizId: 1, score: -1, timeTaken: 1 })
QuizAttemptSchema.index({ quizId: 1, userId: 1, createdAt: -1 })

// Pre-save middleware to calculate percentage and flags
QuizAttemptSchema.pre("save", function (next) {
  if (this.maxPossibleScore > 0) {
    this.percentage = Math.round((this.score / this.maxPossibleScore) * 100)
  }

  if (this.score === this.maxPossibleScore && this.maxPossibleScore > 0) {
    this.flags.perfectScore = true
  }

  const questionsCount = this.answers.length
  if (questionsCount > 0 && this.timeTaken < questionsCount * 10) {
    this.flags.tooFast = true
  }

  next()
})

// Method to get attempt summary
QuizAttemptSchema.methods.getSummary = function () {
  return {
    id: this._id,
    score: this.score,
    maxPossibleScore: this.maxPossibleScore,
    percentage: this.percentage,
    timeTaken: this.timeTaken,
    completedAt: this.completedAt,
    correctAnswers: this.answers.filter((a) => a.isCorrect).length,
    totalQuestions: this.answers.length,
  }
}

// Static method to get leaderboard for a quiz
QuizAttemptSchema.statics.getLeaderboard = async function (quizId, limit = 50) {
  return this.find({ quizId })
    .sort({ score: -1, timeTaken: 1 })
    .limit(limit)
    .select("userId userName userPhotoURL score timeTaken createdAt")
    .lean()
}

// Static method to get user's best attempt for a quiz
QuizAttemptSchema.statics.getBestAttempt = async function (quizId, userId) {
  return this.findOne({ quizId, userId }).sort({ score: -1, timeTaken: 1 }).lean()
}

// Static method to get quiz statistics
QuizAttemptSchema.statics.getQuizStats = async function (quizId) {
  const stats = await this.aggregate([
    { $match: { quizId: new mongoose.Types.ObjectId(quizId) } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        averageScore: { $avg: "$score" },
        averageTime: { $avg: "$timeTaken" },
        averagePercentage: { $avg: "$percentage" },
        maxScore: { $max: "$score" },
        minScore: { $min: "$score" },
        uniqueUsers: { $addToSet: "$userId" },
      },
    },
    {
      $project: {
        _id: 0,
        totalAttempts: 1,
        averageScore: { $round: ["$averageScore", 2] },
        averageTime: { $round: ["$averageTime", 0] },
        averagePercentage: { $round: ["$averagePercentage", 1] },
        maxScore: 1,
        minScore: 1,
        uniqueUsers: { $size: "$uniqueUsers" },
      },
    },
  ])

  return (
    stats[0] || {
      totalAttempts: 0,
      averageScore: 0,
      averageTime: 0,
      averagePercentage: 0,
      maxScore: 0,
      minScore: 0,
      uniqueUsers: 0,
    }
  )
}

export default mongoose.model("QuizAttempt", QuizAttemptSchema)
