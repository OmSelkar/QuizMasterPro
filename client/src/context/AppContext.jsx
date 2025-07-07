// src/context/AppContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    // Initialize app - you can add any startup logic here
    const initializeApp = async () => {
      try {
        console.log('⚙️ App initializing...');
        
        // You can add any initialization logic here
        // For example, fetching initial data, etc.
        
        // Simulate initialization delay if needed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setReady(true);
        console.log('✅ App ready!');
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        setReady(true); // Set ready even on error to prevent infinite loading
      }
    };

    initializeApp();
  }, []);

  const value = {
    ready,
    quizzes,
    setQuizzes,
    loading,
    setLoading,
    backendUrl
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}