"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../lib/firebase";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Helper function to make authenticated requests (unified)
  const makeAuthenticatedRequest = async (url, options = {}) => {
    try {
      let token = null;
      let headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      if (user) {
        if (user.authType === "firebase") {
          // Firebase user - get ID token
          const currentUser = auth.currentUser;
          if (!currentUser) {
            throw new Error("Firebase user not authenticated");
          }
          token = await currentUser.getIdToken();
        } else if (user.authType === "jwt") {
          // JWT user - get token from localStorage
          token = localStorage.getItem("jwt_token");
          if (!token) {
            throw new Error("JWT token not found");
          }
        }

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      const response = await fetch(`http://localhost:5000${url}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("API Response:", data);

      if (!data.success) {
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.join(", "));
        }
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error("Authenticated request failed:", error);
      throw error;
    }
  };

  // Sync Firebase user with backend
  const syncUserWithBackend = async (firebaseUser) => {
    try {
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName:
          firebaseUser.displayName || firebaseUser.email?.split("@")[0],
        photoURL: firebaseUser.photoURL || "",
        provider: firebaseUser.providerData[0]?.providerId || "firebase",
        authType: "firebase",
      };

      const token = await firebaseUser.getIdToken();
      const response = await fetch("http://localhost:5000/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        const unifiedUser = {
          uid: data.profile.authId,
          authId: data.profile.authId,
          authType: "firebase",
          email: data.profile.email,
          displayName: data.profile.displayName,
          photoURL: data.profile.photoURL,
          provider: data.profile.provider,
        };
        
        setUser(unifiedUser);
        setUserProfile(data.profile);
        return data.profile;
      } else {
        console.error("Failed to sync user:", data.message);
        return null;
      }
    } catch (error) {
      console.error("Error syncing user with backend:", error);
      return null;
    }
  };

  // Register with email (Firebase)
  const registerWithEmail = async (email, password, additionalData = {}) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      const registrationData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName:
          additionalData.displayName || firebaseUser.email?.split("@")[0],
        age: additionalData.age ? Number(additionalData.age) : undefined,
        location: additionalData.location || "",
        photoURL: firebaseUser.photoURL || "",
        authType: "firebase",
      };

      const token = await firebaseUser.getIdToken();
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(registrationData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        const unifiedUser = {
          uid: data.profile.authId,
          authId: data.profile.authId,
          authType: "firebase",
          email: data.profile.email,
          displayName: data.profile.displayName,
          photoURL: data.profile.photoURL,
          provider: data.profile.provider,
        };
        
        setUser(unifiedUser);
        setUserProfile(data.profile);
        return userCredential;
      } else {
        await firebaseUser.delete();
        throw new Error(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Firebase registration error:", error);
      throw error;
    }
  };

  // Register with JWT
  const registerWithJWT = async (userData) => {
    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...userData,
          authType: "jwt",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Store JWT token
        localStorage.setItem("jwt_token", data.token);

        const unifiedUser = {
          uid: data.profile.authId,
          authId: data.profile.authId,
          authType: "jwt",
          email: data.profile.email,
          displayName: data.profile.displayName,
          photoURL: data.profile.photoURL,
          provider: data.profile.provider,
          username: data.profile.username,
        };

        setUser(unifiedUser);
        setUserProfile(data.profile);
        return data;
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("JWT registration error:", error);
      throw error;
    }
  };

  // Sign in with email (Firebase)
  const signInWithEmail = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential;
    } catch (error) {
      console.error("Firebase email sign-in error:", error);
      throw error;
    }
  };

  // Sign in with JWT
  const signInWithJWT = async (identifier, password) => {
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Store JWT token
        localStorage.setItem("jwt_token", data.token);

        const unifiedUser = {
          uid: data.profile.authId,
          authId: data.profile.authId,
          authType: "jwt",
          email: data.profile.email,
          displayName: data.profile.displayName,
          photoURL: data.profile.photoURL,
          provider: data.profile.provider,
          username: data.profile.username,
        };

        setUser(unifiedUser);
        setUserProfile(data.profile);
        return data;
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("JWT login error:", error);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");

      const result = await signInWithPopup(auth, provider);
      return result;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  };

  // Sign out (unified)
  const logout = async () => {
    try {
      if (user?.authType === "firebase") {
        await signOut(auth);
      } else if (user?.authType === "jwt") {
        localStorage.removeItem("jwt_token");
      }
      
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  // Update user profile (unified)
  const updateUserProfile = async (profileData) => {
    try {
      const cleanData = {};

      if (
        profileData.displayName !== undefined &&
        profileData.displayName !== null
      ) {
        cleanData.displayName = String(profileData.displayName).trim();
      }

      if (profileData.photoURL !== undefined && profileData.photoURL !== null) {
        cleanData.photoURL = String(profileData.photoURL).trim();
      }

      if (
        profileData.age !== undefined &&
        profileData.age !== null &&
        profileData.age !== ""
      ) {
        const ageNum = Number(profileData.age);
        if (!isNaN(ageNum)) {
          cleanData.age = ageNum;
        }
      }

      if (profileData.location !== undefined && profileData.location !== null) {
        cleanData.location = String(profileData.location).trim();
      }

      // Handle settings updates
      if (profileData.settings) {
        cleanData.settings = profileData.settings;
      }

      // Handle privacy updates
      if (profileData.privacy) {
        cleanData.privacy = profileData.privacy;
      }

      // Handle other profile fields
      if (profileData.bio !== undefined) {
        cleanData.bio = String(profileData.bio || "").trim();
      }

      if (profileData.website !== undefined) {
        cleanData.website = String(profileData.website || "").trim();
      }

      if (profileData.phone !== undefined) {
        cleanData.phone = String(profileData.phone || "").trim();
      }

      if (profileData.birthDate !== undefined) {
        cleanData.birthDate = String(profileData.birthDate || "").trim();
      }

      const data = await makeAuthenticatedRequest("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify(cleanData),
      });

      if (data.success) {
        setUserProfile(data.profile);
        
        // Update user state with new profile data
        setUser(prevUser => ({
          ...prevUser,
          displayName: data.profile.displayName,
          photoURL: data.profile.photoURL,
        }));
        
        return data.profile;
      } else {
        throw new Error(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      throw new Error(error.message || "Failed to update profile");
    }
  };

  // Get user profile (unified)
  const getUserProfile = async () => {
    try {
      if (!user) {
        return null;
      }

      const data = await makeAuthenticatedRequest("/api/auth/profile", {
        method: "GET",
      });

      if (data.success) {
        setUserProfile(data.profile);
        return data.profile;
      } else {
        console.error("Failed to get profile:", data.message);
        return null;
      }
    } catch (error) {
      console.error("Get profile error:", error);
      return null;
    }
  };

  // Check for existing JWT session on app start
  const checkJWTSession = async () => {
    const token = localStorage.getItem("jwt_token");
    if (!token) return false;

    try {
      const response = await fetch("http://localhost:5000/api/auth/profile", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const unifiedUser = {
            uid: data.profile.authId,
            authId: data.profile.authId,
            authType: "jwt",
            email: data.profile.email,
            displayName: data.profile.displayName,
            photoURL: data.profile.photoURL,
            provider: data.profile.provider,
            username: data.profile.username,
          };

          setUser(unifiedUser);
          setUserProfile(data.profile);
          return true;
        }
      }
    } catch (error) {
      console.error("JWT session check failed:", error);
    }

    // Invalid token, remove it
    localStorage.removeItem("jwt_token");
    return false;
  };

  // Auth state listener (unified)
  useEffect(() => {
    let unsubscribe = null;

    const initAuth = async () => {
      // First check for JWT session
      const hasJWTSession = await checkJWTSession();
      
      if (!hasJWTSession) {
        // Then set up Firebase listener
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const unifiedUser = {
              uid: firebaseUser.uid,
              authId: firebaseUser.uid,
              authType: "firebase",
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              provider: firebaseUser.providerData[0]?.providerId || "firebase",
            };

            setUser(unifiedUser);

            // Try to get existing profile first
            const profile = await getUserProfile();

            // If no profile exists, sync with backend
            if (!profile) {
              await syncUserWithBackend(firebaseUser);
            }
          } else {
            setUser(null);
            setUserProfile(null);
          }

          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    user,
    currentUser: user,
    profile: userProfile,
    userProfile,
    loading,
    registerWithEmail,
    registerWithJWT,
    signInWithEmail,
    signInWithJWT,
    signInWithGoogle,
    signOutUser: logout,
    logout,
    updateUserProfile,
    getUserProfile,
    makeAuthenticatedRequest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};