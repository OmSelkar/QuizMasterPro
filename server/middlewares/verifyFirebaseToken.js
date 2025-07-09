import admin from "firebase-admin"
import { readFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

// __dirname replacement in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// build the correct path to your service account key
const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json")

// synchronously load & parse your JSON key
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"))

// initialize the SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    console.log(
      "🔐 verifyFirebaseToken - Auth header:",
      authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : "None",
    )

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No valid authorization header")
      return res.status(401).json({
        success: false,
        message: "No valid authorization header found",
      })
    }

    const idToken = authHeader.split("Bearer ")[1]

    if (!idToken) {
      console.log("❌ No token extracted")
      return res.status(401).json({
        success: false,
        message: "No token provided",
      })
    }

    // Verify the Firebase ID token
    console.log("🔄 Verifying Firebase token...")
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    console.log("✅ Token verified for user:", decodedToken.uid)

    // Attach the Firebase UID to the request
    req.uid = decodedToken.uid
    req.firebaseUser = decodedToken // Optional: attach full decoded token
    req.user = {
      uid: decodedToken.uid,
      name: decodedToken.name || decodedToken.email || "Firebase User",
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
    }

    // Set unified auth object
    req.auth = { 
      id: decodedToken.uid, 
      type: "firebase" 
    }

    next()
  } catch (error) {
    console.error("❌ Firebase token verification failed:", error.message)
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message,
    })
  }
}