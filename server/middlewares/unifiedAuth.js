// middlewares/unifiedAuth.js
import { verifyJwt } from "./authMiddleware.js";
import { verifyFirebaseToken } from "./verifyFirebaseToken.js";

export const unifiedAuth = async (req, res, next) => {
  // Try Firebase first
  try {
    await verifyFirebaseToken(req, res, () => {});
    if (req.uid) return next(); // Firebase user authenticated
  } catch {}

  // Try JWT-based auth
  try {
    await verifyJwt(req, res, next);
  } catch (err) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
