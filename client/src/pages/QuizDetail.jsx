"use client"

import { useEffect, useState, useContext } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import axios from "axios"
import moment from "moment"
import { AppContext } from "../context/AppContext"
import { getAuth } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {UserProfileModal} from "../components/user-profile-modal"
import { Play, Edit, Trash2, Clock, Users, FileText, Trophy, Calendar, User, Target, Timer } from "lucide-react"

export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { backendUrl } = useContext(AppContext)
  const auth = getAuth()

  const [detail, setDetail] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0")
    const s = (sec % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const getUserInitials = (userName) => {
    if (!userName) return "U"
    return userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId)
      setProfileModalOpen(true)
    }
  }

  const handleCreatorClick = () => {
    if (detail?.creatorId) {
      setSelectedUserId(detail.creatorId)
      setProfileModalOpen(true)
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        const detailRes = await axios.get(`${backendUrl}/api/quizzes/${id}/detail`)
        if (!detailRes.data.success) {
          throw new Error(detailRes.data.message || "Failed to load quiz")
        }

        const apiDetail = detailRes.data.detail
        setDetail(apiDetail)

        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken()
          const lbRes = await axios.get(`${backendUrl}/api/quizzes/${id}/leaderboard`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (lbRes.data.success) {
            setLeaderboard(lbRes.data.leaderboard)
          }
        }
      } catch (err) {
        console.error("QuizDetail error:", err)
        navigate("/quizzes", { replace: true })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [backendUrl, id, navigate, auth.currentUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading quiz…</div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Quiz not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const {
    title,
    description,
    creatorName,
    creatorId,
    createdAt,
    questionsCount,
    totalPoints,
    category,
    timeLimit,
    attempts,
  } = detail

  const isOwner = auth.currentUser?.uid === creatorId

  const onDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return
    try {
      const token = await auth.currentUser.getIdToken()
      await axios.delete(`${backendUrl}/api/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      navigate("/quizzes")
    } catch (err) {
      console.error("Delete quiz error:", err)
      alert("Failed to delete quiz.")
    }
  }

  const handleStart = () => setShowModal(true)
  const confirmStart = () => {
    setShowModal(false)
    navigate(`/quiz/${id}/play`)
  }

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-3xl">{title}</CardTitle>
                  {category && <Badge variant="secondary">{category}</Badge>}
                </div>
                <p className="text-muted-foreground text-lg">{description}</p>
              </div>

              {isOwner && (
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link to={`/quiz/${id}/edit`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                  <Button onClick={onDelete} variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Quiz Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Questions</p>
                  <p className="text-2xl font-bold">{questionsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Score</p>
                  <p className="text-2xl font-bold">{totalPoints}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Attempts</p>
                  <p className="text-2xl font-bold">{attempts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  {timeLimit > 0 ? (
                    <Timer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  ) : (
                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Limit</p>
                  <p className="text-xl font-semibold">{timeLimit > 0 ? `${timeLimit} min` : "No limit"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quiz Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Quiz Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created by</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-lg font-normal hover:text-primary"
                    onClick={handleCreatorClick}
                  >
                    {creatorName}
                  </Button>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created on</p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {moment(createdAt).format("MMMM D, YYYY")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Leaderboard with Clickable Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry, idx) => (
                  <div
                    key={entry.userId || idx}
                    className={`flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors ${
                      entry.userId && entry.userId !== "unknown" && entry.userId !== "anonymous" ? "cursor-pointer" : ""
                    }`}
                    onClick={() => entry.userId && entry.userId !== "unknown" && entry.userId !== "anonymous" && handleUserClick(entry.userId)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          idx === 0
                            ? "bg-yellow-500 text-white"
                            : idx === 1
                              ? "bg-gray-400 text-white"
                              : idx === 2
                                ? "bg-amber-600 text-white"
                                : "bg-muted-foreground/20 text-muted-foreground"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.userPhotoURL || "/placeholder.svg"} alt={entry.user} />
                          <AvatarFallback className="text-xs">{getUserInitials(entry.user)}</AvatarFallback>
                        </Avatar>
                        <span className={`font-medium ${
                          entry.userId && entry.userId !== "unknown" && entry.userId !== "anonymous" 
                            ? "hover:text-primary transition-colors" 
                            : "text-muted-foreground"
                        }`}>
                          {entry.user}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{entry.score} pts</p>
                      <p className="text-sm text-muted-foreground">{formatTime(entry.timeTaken)}</p>
                    </div>
                  </div>
                ))}
                {leaderboard.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground pt-2">Showing top 10 results</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No attempts yet.</p>
                <p className="text-sm text-muted-foreground">Be the first to take this quiz!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Start Quiz */}
        <div className="text-center">
          <Button onClick={handleStart} size="lg" className="px-8">
            <Play className="h-5 w-5 mr-2" />
            {timeLimit > 0 ? "Start Timed Quiz" : "Start Quiz"}
          </Button>
        </div>

        {/* Confirmation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md mx-4">
              <CardHeader>
                <CardTitle>Ready to begin?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {timeLimit > 0
                    ? `You will have ${timeLimit} minutes to complete this quiz. The timer will start as soon as you begin.`
                    : "This quiz has no time limit. Take your time to answer each question carefully."}
                </p>
                <div className="flex justify-end gap-3">
                  <Button onClick={() => setShowModal(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={confirmStart}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <UserProfileModal userId={selectedUserId} isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  )
}
