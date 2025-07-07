"use client"

import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, FileText, Target, Users, Eye, Play } from "lucide-react"
import { Link } from "react-router-dom"
import { UserProfileModal } from "./user-profile-modal"

export function ImprovedQuizCard({ quiz, showCreator = true, showAttempts = true }) {
  const { privacy, user } = useAuth()
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  const totalPoints = quiz.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0
  const isOwnQuiz = user?.uid === quiz.creatorId

  // Respect privacy settings
  const shouldShowCreator = showCreator && (isOwnQuiz || privacy.profileVisibility)
  const shouldShowAttempts = showAttempts && (isOwnQuiz || privacy.showQuizHistory)

  const handleAuthorClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (quiz.creatorId) {
      setProfileModalOpen(true)
    }
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group">
        <CardHeader className="pb-3">
          <div className="space-y-2">
            <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors">
              {quiz.title}
            </CardTitle>
            {quiz.category && (
              <Badge variant="secondary" className="w-fit">
                {quiz.category}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Creator Info */}
          {shouldShowCreator && (
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
              onClick={handleAuthorClick}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={quiz.creatorPhotoURL || "/placeholder.svg"} alt={quiz.creatorName} />
                <AvatarFallback className="text-xs">{quiz.creatorName?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium hover:text-primary transition-colors">
                  {quiz.creatorName || "Anonymous"}
                </p>
                <p className="text-xs text-muted-foreground">Quiz Creator</p>
              </div>
            </div>
          )}

          {/* Quiz Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{quiz.timeLimit ? `${quiz.timeLimit} min` : "No limit"}</span>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{quiz.questions?.length || 0} questions</span>
            </div>

            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>{totalPoints} points</span>
            </div>

            {shouldShowAttempts && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{quiz.attempts || 0} attempts</span>
              </div>
            )}
          </div>

          {/* Description */}
          {quiz.description && <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button asChild className="flex-1" onClick={(e) => e.stopPropagation()}>
              <Link to={`/quiz/${quiz._id}/detail`}>
                <Play className="h-4 w-4 mr-2" />
                Take Quiz
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent" onClick={(e) => e.stopPropagation()}>
              <Link to={`/quiz/${quiz._id}/detail`}>
                <Eye className="h-4 w-4 mr-2" />
                Details
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <UserProfileModal userId={quiz.creatorId} isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  )
}
