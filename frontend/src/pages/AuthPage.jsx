import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, UserPlus, LogIn, ChevronRight } from 'lucide-react';

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
      onAuthSuccess({ _id: res.data.user_id, email: res.data.email, is_verified: true });
    } catch (error) {
      const msg = error.response?.data?.detail || 'Authentication failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center p-4 bg-light overflow-hidden position-relative">
      
      {/* Background Decorative Elements */}
      <div className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="position-absolute bg-primary rounded-circle blur-[150px]" style={{ width: '400px', height: '400px', top: '-100px', left: '-100px', opacity: 0.05 }}></div>
        <div className="position-absolute bg-info rounded-circle blur-[150px]" style={{ width: '300px', height: '300px', bottom: '-80px', right: '-80px', opacity: 0.05 }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-5 p-5 shadow-2xl position-relative border-0" 
        style={{ maxWidth: '440px', width: '100%', zIndex: 1 }}
      >
        <div className="text-center mb-5">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="mb-4 d-inline-flex bg-primary bg-opacity-10 text-primary rounded-4 p-3 mx-auto"
          >
            <Shield size={36} />
          </motion.div>
          <h2 className="fw-black text-dark h3 mb-2 tracking-tight">RAG Premium</h2>
          <p className="text-muted small fw-medium">Secure Knowledge retrieval gateway</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form 
            key={mode}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
          >
            <div className="mb-3">
              <label className="text-muted small fw-bold mb-2 ps-1 uppercase letter-spacing-wide" style={{ fontSize: '10px' }}>Email Address</label>
              <input 
                type="email" 
                className="form-control form-control-lg bg-light border-0 text-dark focus-accent"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                style={{ fontSize: '15px', borderRadius: '12px', padding: '14px 18px' }}
              />
            </div>

            <div className="mb-5">
              <label className="text-muted small fw-bold mb-2 ps-1 uppercase letter-spacing-wide" style={{ fontSize: '10px' }}>Password</label>
              <input 
                type="password" 
                className="form-control form-control-lg bg-light border-0 text-dark focus-accent"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ fontSize: '15px', borderRadius: '12px', padding: '14px 18px' }}
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="btn btn-primary btn-lg w-100 py-3 shadow-lg d-flex align-items-center justify-content-center gap-2"
              disabled={isLoading}
              style={{ fontSize: '15px', borderRadius: '12px', fontWeight: '800', border: 'none', backgroundColor: 'var(--primary)' }}
            >
              {isLoading ? (
                <div className="spinner-border spinner-border-sm" role="status"></div>
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                  <span>{mode === 'login' ? 'Continue' : 'Create Account'}</span>
                </>
              )}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        <div className="text-center mt-5 pt-3 border-top" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <button 
            className="btn btn-link btn-sm text-decoration-none text-muted transition-all hover-primary"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ fontSize: '13px', fontWeight: '600' }}
          >
            {mode === 'login' ? "New user? Sign up free" : "Already have access? Log in"}
          </button>
        </div>
        
        <div className="text-center mt-3">
          <button 
            className="btn btn-light btn-sm w-100 d-flex align-items-center justify-content-center gap-2 py-3 border-0 transition-all font-bold"
            style={{ borderRadius: '12px', fontSize: '13px', color: '#64748b', fontWeight: '700', backgroundColor: '#f1f5f9' }}
            onClick={() => onAuthSuccess({ _id: 'guest', email: 'guest@rag.premium', is_verified: false })}
          >
            Continue as Guest
            <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .focus-accent:focus { background-color: #ffffff !important; border: 1px solid var(--primary) !important; box-shadow: 0 0 0 4px rgba(16,163,127,0.08) !important; outline: none; }
        .hover-primary:hover { color: var(--primary) !important; }
        .fw-black { font-weight: 900; }
        .tracking-tight { letter-spacing: -0.02em; }
        .letter-spacing-wide { letter-spacing: 0.1em; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); }
      `}} />
    </div>
  );
};

export default AuthPage;
