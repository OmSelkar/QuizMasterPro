import mongoose from "mongoose"

const QuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["mcq", "checkbox", "true_false", "text_input", "paragraph"],
  },
  text: {
    type: String,
    required: true,
  },
  richText: {
    type: String, // HTML content from rich text editor
    default: "",
  },
  images: [
    {
      type: String, // URLs to images
    },
  ],
  audio: {
    type: String, // URL to audio file
  },
  options: [
    {
      text: String,
      image: String, // URL to option image
    },
  ],
  correct: mongoose.Schema.Types.Mixed, // Can be number, string, array, or boolean
  points: {
    type: Number,
    default: 1,
  },
  explanation: {
    type: String,
    default: "",
  },
  explanationRichText: {
    type: String, // HTML content for rich text explanation
    default: "",
  },
  // Sub-questions for paragraph type
  subQuestions: [
    {
      type: {
        type: String,
        enum: ["mcq", "checkbox", "true_false"],
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      options: [
        {
          text: String,
          image: String,
        },
      ],
      correct: mongoose.Schema.Types.Mixed,
      points: {
        type: Number,
        default: 1,
      },
    },
  ],
  // Advanced question settings
  allowPartialCredit: {
    type: Boolean,
    default: false,
  },
  caseSensitive: {
    type: Boolean,
    default: false,
  },
  randomizeOptions: {
    type: Boolean,
    default: false,
  },
  // Question scheduling
  scheduling: {
    enabled: {
      type: Boolean,
      default: false,
    },
    startDate: Date,
    endDate: Date,
  },
})

const QuizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    descriptionRichText: {
      type: String, // HTML content for rich text description
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    creatorId: {
      type: String,
      required: true,
    },
    creatorName: {
      type: String,
      required: true,
    },
    questions: [QuestionSchema],
    timeLimit: {
      type: Number,
      default: 0, // 0 means no time limit
    },
    attempts: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active",
    },
    // Advanced quiz settings
    settings: {
      allowRetakes: {
        type: Boolean,
        default: true,
      },
      maxAttempts: {
        type: Number,
        default: 0, // 0 means unlimited
      },
      showCorrectAnswers: {
        type: Boolean,
        default: true,
      },
      showScoreImmediately: {
        type: Boolean,
        default: true,
      },
      randomizeQuestions: {
        type: Boolean,
        default: false,
      },
      requireLogin: {
        type: Boolean,
        default: true,
      },
      passingScore: {
        type: Number,
        default: 0, // Percentage required to pass
      },
    },
    // Quiz scheduling
    scheduling: {
      enabled: {
        type: Boolean,
        default: false,
      },
      startDate: Date,
      endDate: Date,
      timezone: {
        type: String,
        default: "UTC",
      },
    },
    // Access control
    access: {
      type: {
        type: String,
        enum: ["public", "private", "password", "invite"],
        default: "public",
      },
      password: String,
      allowedUsers: [String], // User IDs
      allowedEmails: [String],
    },
    // Analytics and tracking
    analytics: {
      enabled: {
        type: Boolean,
        default: true,
      },
      trackTime: {
        type: Boolean,
        default: true,
      },
      trackAttempts: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better performance
QuizSchema.index({ creatorId: 1, createdAt: -1 })
QuizSchema.index({ category: 1 })
QuizSchema.index({ status: 1 })
QuizSchema.index({ "scheduling.startDate": 1, "scheduling.endDate": 1 })

// Virtual for total points
QuizSchema.virtual("totalPoints").get(function () {
  return this.questions.reduce((sum, question) => {
    if (question.type === "paragraph" && question.subQuestions) {
      return sum + question.subQuestions.reduce((subSum, subQ) => subSum + (subQ.points || 0), 0)
    }
    return sum + (question.points || 0)
  }, 0)
})

// Method to check if quiz is available
QuizSchema.methods.isAvailable = function () {
  const now = new Date()

  // Check status
  if (this.status !== "active") {
    return { available: false, reason: "Quiz is not active" }
  }

  // Check scheduling
  if (this.scheduling && this.scheduling.enabled) {
    if (this.scheduling.startDate && now < this.scheduling.startDate) {
      return { available: false, reason: "Quiz has not started yet" }
    }

    if (this.scheduling.endDate && now > this.scheduling.endDate) {
      return { available: false, reason: "Quiz has ended" }
    }
  }

  return { available: true }
}

// Method to get quiz for taking (without answers)
QuizSchema.methods.getForTaking = function () {
  const quiz = this.toObject()

  // Remove correct answers and explanations
  quiz.questions = quiz.questions.map((q) => {
    const question = { ...q }
    delete question.correct
    delete question.explanation
    delete question.explanationRichText

    // Also remove correct answers from sub-questions
    if (question.subQuestions) {
      question.subQuestions = question.subQuestions.map((subQ) => {
        const subQuestion = { ...subQ }
        delete subQuestion.correct
        return subQuestion
      })
    }

    return question
  })

  return quiz
}

// Method to randomize questions
QuizSchema.methods.randomizeQuestions = function () {
  if (this.settings.randomizeQuestions) {
    this.questions = this.questions.sort(() => Math.random() - 0.5)
  }

  // Randomize options for each question if enabled
  this.questions.forEach((question) => {
    if (question.randomizeOptions && question.options && question.options.length > 0) {
      question.options = question.options.sort(() => Math.random() - 0.5)
    }
  })

  return this
}

export default mongoose.model("Quiz", QuizSchema)
