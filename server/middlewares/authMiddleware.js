import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import User from "../models/User.js"

/**
 * validateRegistration
 * - Ensures the body has username, email & password
 * - (Optional) Further checks on age, location, displayName
 */
export function validateRegistration(req, res, next) {
  const { username, email, password, age, location, displayName } = req.body

  if (!username?.trim() || !email?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: "username, email and password are required",
    })
  }

  // Email validation
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    })
  }

  // Username validation
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({
      success: false,
      message: "Username must be between 3 and 30 characters",
    })
  }

  // Password validation
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    })
  }

  // Age validation if provided
  if (age != null && (isNaN(age) || age < 13 || age > 120)) {
    return res.status(400).json({
      success: false,
      message: "Age must be a valid number between 13 and 120",
    })
  }

  // Display name validation
  if (displayName && displayName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Display name cannot be empty",
    })
  }

  next()
}

/**
 * validateLogin
 * - Ensures the body has email/username and password
 */
export function validateLogin(req, res, next) {
  const { identifier, password } = req.body // identifier can be email or username

  if (!identifier?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: "Email/username and password are required",
    })
  }

  next()
}

/**
 * verifyJwt
 * - Reads `Authorization: Bearer <token>` header
 * - Verifies against JWT_SECRET
 * - Attaches `req.user` to the full user document (minus password)
 * - Sets `req.auth` for unified authentication
 */
export async function verifyJwt(req, res, next) {
  try {
    const auth = req.headers.authorization
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing or malformed",
      })
    }

    const token = auth.split(" ")[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id).select("-passwordHash")
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      })
    }

    // Ensure this is a JWT user
    if (user.authType !== "jwt") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type",
      })
    }

    req.user = user
    req.auth = { 
      id: user._id.toString(), 
      type: "jwt" 
    }
    
    next()
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" })
    }
    return res.status(401).json({ success: false, message: "Invalid token" })
  }
}

/**
 * generateJWT
 * - Generates a JWT token for a user
 */
export function generateJWT(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  )
}

/**
 * hashPassword
 * - Hashes a password using bcrypt
 */
export async function hashPassword(password) {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

/**
 * comparePassword
 * - Compares a plain password with a hashed password
 */
export async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword)
}