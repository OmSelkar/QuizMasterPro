"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy, Timer, Calendar, Medal, Crown, Award } from "lucide-react";
import {UserProfileModal} from "./user-profile-modal";

export function ImprovedLeaderboard({
  leaderboard,
  quiz,
  stats,
  showTimeColumn = true,
}) {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleUserClick = (userId) => {
    console.log("Clicked user ID:", userId);
    if (userId) {
      setSelectedUserId(userId);
      setProfileModalOpen(true);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScoreVariant = (score, maxScore) => {
    if (!score || !maxScore || maxScore === 0) return "secondary";
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return "default";
    if (percentage >= 70) return "secondary";
    if (percentage >= 50) return "outline";
    return "destructive";
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
            {rank}
          </div>
        );
    }
  };

  const getUserInitial = (userName) => {
    if (!userName || typeof userName !== "string") return "?";
    return userName.charAt(0).toUpperCase();
  };

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Trophy className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No attempts yet</h3>
          <p className="text-muted-foreground">
            Be the first to take this quiz!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
            <Badge variant="outline" className="ml-auto">
              {leaderboard.length}{" "}
              {leaderboard.length === 1 ? "participant" : "participants"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaderboard.map((entry, index) => {
              const rank = entry.rank || index + 1;
              const userName = entry.user || "Anonymous";

              console.log("Entry userId:", entry.userId);
              const userInitial = getUserInitial(userName);
              const score = entry.score || 0;
              const timeTaken = entry.timeTaken || 0;
              const createdAt = entry.createdAt;
              const isCurrentUser = entry.isCurrentUser || false;
              const userId = entry.userId;

              const percentage =
                stats?.maxPossibleScore && stats.maxPossibleScore > 0
                  ? Math.round((score / stats.maxPossibleScore) * 100)
                  : 0;

              return (
                <div
                  key={`${userId || "unknown"}-${index}`}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                    isCurrentUser
                      ? "bg-primary/5 border-primary/20 ring-2 ring-primary/10"
                      : rank <= 3
                      ? "bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    userId && userId !== "unknown" && handleUserClick(userId)
                  }
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex items-center gap-2">
                      {getRankIcon(rank)}
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-background hover:ring-primary/20 transition-all">
                        <AvatarImage
                          src={entry.userPhotoURL || "/placeholder.svg"}
                          alt={userName}
                        />
                        <AvatarFallback className="font-semibold">
                          {userInitial}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <p className="font-medium hover:text-primary transition-colors">
                          {userName}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {showTimeColumn && quiz?.timeLimit > 0 && (
                            <div className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              <span>{formatTime(timeTaken)}</span>
                            </div>
                          )}
                          {createdAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDateTime(createdAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score Section */}
                  <div className="text-right space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getScoreVariant(
                          score,
                          stats?.maxPossibleScore
                        )}
                        className="text-sm"
                      >
                        {score}/{stats?.maxPossibleScore || 0}
                      </Badge>
                      {rank <= 3 && (
                        <div className="text-2xl">
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress
                        value={Math.min(Math.max(percentage, 0), 100)}
                        className="h-2 flex-1"
                      />
                      <span className="text-sm font-medium text-muted-foreground min-w-[35px]">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          {stats && (
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-primary">
                    {stats.totalAttempts || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Attempts
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {stats.averageScore || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Average Score
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">
                    {stats.maxPossibleScore > 0
                      ? Math.round(
                          (stats.averageScore / stats.maxPossibleScore) * 100
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Success Rate
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UserProfileModal
        userId={selectedUserId}
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
}
