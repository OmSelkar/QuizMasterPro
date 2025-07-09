import { verifyJwt } from "./authMiddleware.js"
import { verifyFirebaseToken } from "./verifyFirebaseToken.js"

export const unifiedAuth = async (req, res, next) => {
  console.log("🔄 [UNIFIED_AUTH] Starting unified authentication")
  
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ [UNIFIED_AUTH] No valid authorization header")
    return res.status(401).json({ 
      success: false, 
      message: "Authorization header missing or malformed" 
    })
  }

  const token = authHeader.split(" ")[1]
  
  // Try Firebase authentication first
  try {
    console.log("🔄 [UNIFIED_AUTH] Trying Firebase authentication")
    
    // Create a mock response object to capture Firebase auth result
    let firebaseAuthSuccess = false
    const mockRes = {
      status: () => ({ json: () => {} }),
      json: () => {}
    }
    
    await verifyFirebaseToken(req, mockRes, () => {
      firebaseAuthSuccess = true
    })
    
    if (firebaseAuthSuccess && req.uid) {
      console.log("✅ [UNIFIED_AUTH] Firebase authentication successful")
      req.auth = { 
        id: req.uid, 
        type: "firebase" 
      }
      return next()
    }
  } catch (firebaseError) {
    console.log("⚠️ [UNIFIED_AUTH] Firebase authentication failed:", firebaseError.message)
  }

  // Try JWT authentication
  try {
    console.log("🔄 [UNIFIED_AUTH] Trying JWT authentication")
    
    let jwtAuthSuccess = false
    const mockRes = {
      status: () => ({ json: () => {} }),
      json: () => {}
    }
    
    await verifyJwt(req, mockRes, () => {
      jwtAuthSuccess = true
    })
    
    if (jwtAuthSuccess && req.user) {
      console.log("✅ [UNIFIED_AUTH] JWT authentication successful")
      req.auth = { 
        id: req.user._id.toString(), 
        type: "jwt" 
      }
      return next()
    }
  } catch (jwtError) {
    console.log("⚠️ [UNIFIED_AUTH] JWT authentication failed:", jwtError.message)
  }

  console.log("❌ [UNIFIED_AUTH] All authentication methods failed")
  return res.status(401).json({ 
    success: false, 
    message: "Authentication failed" 
  })
}