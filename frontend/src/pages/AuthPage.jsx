import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthPage = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Both fields are mandatory');

    setIsLoading(true);
    try {
      const res = await axios.post(`/api/auth/${mode}`, { email, password });
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created');
      onAuthSuccess({ id: res.data.user_id, email: res.data.email, is_verified: true });
    } catch (error) {
      const msg = error.response?.data?.detail || 'Authentication failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#ffffff' }}>
      <div className="w-100" style={{ maxWidth: '360px' }}>
        <div className="text-center mb-5">
          <div className="mb-4 d-inline-block bg-dark text-white rounded-circle d-flex align-items-center justify-content-center mx-auto" style={{ width: '48px', height: '48px', fontSize: '24px' }}>
            R
          </div>
          <h2 className="fw-bold h4">Welcome back</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input 
              type="email" 
              className="form-control form-control-lg border-secondary border-opacity-25"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              style={{ fontSize: '15px', borderRadius: '8px' }}
            />
          </div>

          <div className="mb-4">
            <input 
              type="password" 
              className="form-control form-control-lg border-secondary border-opacity-25"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              style={{ fontSize: '15px', borderRadius: '8px' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-dark btn-lg w-100 mb-3 py-2"
            disabled={isLoading}
            style={{ fontSize: '15px', borderRadius: '8px', backgroundColor: '#10a37f', border: 'none' }}
          >
            {isLoading ? 'Processing...' : 'Continue'}
          </button>
        </form>

        <div className="text-center mt-3">
          <span className="text-muted small">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            className="btn btn-link btn-sm text-decoration-none p-0 ps-1"
            style={{ color: '#10a37f', fontSize: '14px', fontWeight: '500' }}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? "Sign up" : "Log in"}
          </button>
        </div>
        
        <div className="text-center mt-4">
          <button 
            className="btn btn-outline-secondary btn-sm w-100 border-secondary border-opacity-25"
            style={{ borderRadius: '8px', fontSize: '14px', py: '8px' }}
            onClick={() => onAuthSuccess({ id: 'guest', email: 'Guest User', is_verified: false })}
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
