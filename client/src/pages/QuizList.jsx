"use client";

import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Play,
  Eye,
  Clock,
  FileText,
  Target,
  Users,
  User,
} from "lucide-react";
import { UserProfileModal } from "../components/user-profile-modal";
export default function QuizList() {
  const { backendUrl } = useContext(AppContext);
  const [quizzes, setQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
      setProfileModalOpen(true);
    }
  };
  useEffect(() => {
    axios
      .get(`${backendUrl}/api/quizzes`)
      .then(({ data }) => {
        if (data.success) {
          setQuizzes(data.quizzes);
          const cats = Array.from(
            new Set(data.quizzes.map((q) => q.category).filter(Boolean))
          );
          setCategories(cats);
        } else {
          alert(data.message);
        }
      })
      .catch((err) => {
        console.error("Failed to load quizzes:", err);
        alert("Could not load quizzes. Check console.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [backendUrl]);

  const visible = quizzes.filter((q) => {
    const matchesTitle = q.title
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesCat = filterCat ? q.category === filterCat : true;
    return matchesTitle && matchesCat;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-pulse text-muted-foreground">
            Loading quizzes...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Browse Quizzes</h1>
        <p className="text-muted-foreground">
          Discover and take quizzes created by the community
        </p>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quizzes by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(search || filterCat) && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {visible.length} of {quizzes.length} quizzes
              </span>
              {(search || filterCat) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setFilterCat("");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz Grid */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quizzes found</h3>
            <p className="text-muted-foreground mb-4">
              {search || filterCat
                ? "Try adjusting your search or filter criteria"
                : "No quizzes are available at the moment"}
            </p>
            {(search || filterCat) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setFilterCat("");
                }}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((quiz) => {
            const totalPoints = quiz.questions.reduce(
              (sum, q) => sum + q.points,
              0
            );
            return (
              <Card
                key={quiz._id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="space-y-2">
                    <CardTitle className="text-xl line-clamp-2">
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
                  {/* Quiz Stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">by</span>
                      <span
                        className="font-medium truncate cursor-pointer hover:text-primary"
                        onClick={() => handleUserClick(quiz.creatorId)}
                      >
                        {quiz.creatorName || "Anonymous"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {quiz.timeLimit ? `${quiz.timeLimit} min` : "No limit"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{quiz.questions.length} questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>{totalPoints} points</span>
                    </div>
                  </div>

                  {/* Attempts */}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {quiz.attempts || 0}{" "}
                      {quiz.attempts === 1 ? "attempt" : "attempts"}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button asChild className="flex-1">
                      <Link to={`/quiz/${quiz._id}/detail`}>
                        <Play className="h-4 w-4 mr-2" />
                        Take Quiz
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 bg-transparent"
                    >
                      <Link to={`/quiz/${quiz._id}/detail`}>
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => handleUserClick(entry.userId)}
      >
        <Avatar>
          <AvatarImage
            src={entry.userPhotoURL || "/placeholder.svg"}
            alt={entry.user}
          />
          <AvatarFallback>{getUserInitials(entry.user)}</AvatarFallback>
        </Avatar>
        <span className="font-medium hover:text-primary">{entry.user}</span>
      </div> */}
      <UserProfileModal
        userId={selectedUserId}
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}
