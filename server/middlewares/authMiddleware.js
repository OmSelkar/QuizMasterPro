// middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * validateRegistration
 * - Ensures the body has username, email & password
 * - (Optional) Further checks on age, location, displayName
 */
export function validateRegistration(req, res, next) {
  const { username, email, password, age, location, displayName } = req.body;

  if (!username?.trim() || !email?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: "username, email and password are required",
    });
  }

  // minimum password length
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  // optional: check age if provided
  if (age != null && (isNaN(age) || age < 0 || age > 120)) {
    return res.status(400).json({
      success: false,
      message: "Age must be a valid number between 0 and 120",
    });
  }

  next();
}

/**
 * verifyJwt
 * - Reads `Authorization: Bearer <token>` header
 * - Verifies against JWT_SECRET
 * - Attaches `req.user` to the full user document (minus password)
 */
export async function verifyJwt(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing or malformed",
      });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
