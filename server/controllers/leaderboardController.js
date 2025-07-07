import QuizAttempt from "../models/QuizAttempt.js";
import User from "../models/User.js";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const db = getFirestore();

export async function getLeaderboard(req, res) {
  // fetch top attempts
  const top = await QuizAttempt.find({ quizId:req.params.id })
    .sort({ score: -1, timeTaken: 1 })
    .limit(10)
    .lean();

  // resolve display names
  const enriched = await Promise.all(
    top.map(async (att) => {
      let displayName = att.userId;

      if (att.userSource === "mongo") {
        const u = await User.findById(att.userId).select("displayName username email");
        displayName = u ? u.displayName || u.username : att.userId;
      } else {
        // firebase
        const snap = await getDoc(doc(db, "users", att.userId));
        const data = snap.exists() ? snap.data() : null;
        displayName = data?.name || data?.email || att.userId;
      }

      return {
        _id:       att._id,
        score:     att.score,
        timeTaken: att.timeTaken,
        userName:  displayName,
      };
    })
  );

  res.json({ success:true, leaderboard: enriched });
}
