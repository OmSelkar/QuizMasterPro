"use client"

import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./context/AuthContext"
import { useTheme } from "./context/ThemeContext"
import {Navbar} from "./components/Navbar"
import Home from "./pages/Home"
import QuizList from "./pages/QuizList"
import QuizDetail from "./pages/QuizDetail"
import QuizPlay from "./pages/QuizPlay"
import QuizResult from "./pages/QuizResult"
import CreateQuiz from "./pages/CreateQuiz"
import EditQuiz from "./pages/EditQuiz"
import MyQuizzes from "./pages/MyQuizzes"
import Profile from "./pages/Profile"
import Settings from "./pages/Settings"
import QuizLeaderboard from "./pages/QuizLeaderboard"
import QuizAttempts from "./pages/QuizAttempts"
import QuizAnalytics from "./pages/QuizAnalytics"
import UserLogin from "./components/UserLogin"
import UserRegistration from "./components/UserRegistration"
import NotFound from "./pages/NotFound"
import ErrorPage from "./pages/ErrorPage"
import Loading from "./components/Loading"

function App() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()

  if (loading) {
    return <Loading />
  }

  return (
    <div className={`min-h-screen bg-background text-foreground ${theme}`}>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/quiz-list" element={<QuizList />} />
          <Route path="/quiz/:id/detail" element={<QuizDetail />} />
          <Route path="/quiz/:id/play" element={<QuizPlay />} />
          <Route path="/quiz/:id/result/:attemptId" element={<QuizResult />} />
          <Route path="/quiz/:id/leaderboard" element={<QuizLeaderboard />} />

          {/* Authentication Routes */}
          <Route path="/login" element={!user ? <UserLogin /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!user ? <UserRegistration /> : <Navigate to="/" replace />} />

          {/* Protected Routes */}
          <Route path="/create-quiz" element={user ? <CreateQuiz /> : <Navigate to="/login" replace />} />
          <Route path="/quiz/:id/edit" element={user ? <EditQuiz /> : <Navigate to="/login" replace />} />
          <Route path="/my-quizzes" element={user ? <MyQuizzes /> : <Navigate to="/login" replace />} />
          <Route path="/my-quizzes/:userId" element={user ? <MyQuizzes /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />
          <Route path="/profile/:userId" element={user ? <Profile /> : <Navigate to="/login" replace />} />
          <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" replace />} />
          <Route path="/quiz/:id/attempts" element={user ? <QuizAttempts /> : <Navigate to="/login" replace />} />
          <Route path="/quiz/:id/analytics" element={user ? <QuizAnalytics /> : <Navigate to="/login" replace />} />

          {/* Error Routes */}
          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
