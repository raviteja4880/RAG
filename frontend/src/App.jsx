import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';

const App = () => {
  // --- Centralized Identity Context ---
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rag_user');
    return saved ? JSON.parse(saved) : null; // null means redirect to Auth
  });

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('rag_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rag_user');
  };

  return (
    <div className="bg-light min-vh-100">
      <Toaster 
        position="top-right" 
        reverseOrder={false}
      />

      {/* Main Page Routing Logic */}
      {!user ? (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      ) : (
        <ChatPage user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
