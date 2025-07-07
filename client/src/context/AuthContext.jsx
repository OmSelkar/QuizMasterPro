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

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    try {
      const token = await currentUser.getIdToken();

      const response = await fetch(`http://localhost:5000${url}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Fetched user profile:", data);

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

  // Sync user with backend
  const syncUserWithBackend = async (firebaseUser) => {
    try {
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName:
          firebaseUser.displayName || firebaseUser.email?.split("@")[0],
        photoURL: firebaseUser.photoURL || "",
        provider: firebaseUser.providerData[0]?.providerId || "email",
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

  // Register with email
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
        setUserProfile(data.profile);
        return userCredential;
      } else {
        await firebaseUser.delete();
        throw new Error(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  // Sign in with email
  const signInWithEmail = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential;
    } catch (error) {
      console.error("Email sign-in error:", error);
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

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  // Update user profile
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

      const data = await makeAuthenticatedRequest("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify(cleanData),
      });

      if (data.success) {
        setUserProfile(data.profile);
        return data.profile;
      } else {
        throw new Error(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      throw new Error(error.message || "Failed to update profile");
    }
  };

  // Get user profile
  const getUserProfile = async (firebaseUser = null) => {
    try {
      const currentUser = firebaseUser || auth.currentUser;
      if (!currentUser) {
        return null;
      }

      const token = await currentUser.getIdToken();
      const response = await fetch("http://localhost:5000/api/auth/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

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

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Try to get existing profile first
        const profile = await getUserProfile(firebaseUser);

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

    return unsubscribe;
  }, []);

  const value = {
    user,
    currentUser: user,
    profile: userProfile,
    userProfile,
    loading,
    registerWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOutUser: logout,
    logout,
    updateUserProfile,
    getUserProfile,
    makeAuthenticatedRequest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
