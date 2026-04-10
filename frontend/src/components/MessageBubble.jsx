import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  XCircle, 
  FileText, 
  CheckCircle2, 
  User, 
  Sparkles, 
  Copy, 
  Check,
  Terminal,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const MessageBubble = ({ role, content, isStreaming, isThinking, isUploading, uploadProgress, onCancel, type }) => {
  const isUser = role === 'user';
  const isDoc = type === 'file';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatContent = (text) => {
    if (!text) return null;
    
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```/g, '').trim();
        return (
          <div key={index} className="my-4 rounded-3 overflow-hidden border border-light shadow-sm code-block-container">
            <div className="bg-light px-3 py-2 d-flex justify-content-between align-items-center border-bottom border-light">
              <div className="d-flex align-items-center gap-2 opacity-50 text-dark">
                <Terminal size={12} />
                <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em' }}>CODE BLOCK</span>
              </div>
              <button onClick={() => navigator.clipboard.writeText(code)} className="btn btn-link p-0 text-muted hover-dark transition-all">
                <Copy size={12} />
              </button>
            </div>
            <pre className="p-4 mb-0 overflow-auto bg-white scrollbar-none" style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#1a1a1b', border: 'none' }}>
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      
      return part.split('\n').map((line, i) => (
        <p key={`${index}-${i}`} className="mb-3">{line}</p>
      ));
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`py-8 w-100 group transition-all ${isUser ? '' : 'bg-light bg-opacity-30'}`} 
    >
      <div className="container-md d-flex align-items-start gap-4" style={{ maxWidth: '850px', padding: '0 2rem' }}>
        
        {/* Avatar */}
        <div 
          className={`rounded-2 d-flex align-items-center justify-content-center text-white shrink-0 shadow-sm`}
          style={{ 
            width: '32px', height: '32px', 
            background: isUser ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'linear-gradient(135deg, #10a37f, #0d8a6b)', 
            flexShrink: 0
          }}
        >
          {isUser ? <User size={16} /> : <Sparkles size={16} />}
        </div>

        <div className="flex-grow-1 overflow-hidden">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="fw-bold small text-uppercase opacity-50 tracking-widest text-dark" style={{ fontSize: '10px' }}>
              {isUser ? 'USER IDENTIFIED' : 'CORE INTELLIGENCE'}
            </div>
            {!isUser && content && (
              <button 
                onClick={handleCopy}
                className="btn btn-link p-1 text-muted opacity-0 group-hover:opacity-100 transition-all hover:text-dark border-0"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            )}
          </div>
          
          <AnimatePresence>
            {isThinking && !content && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="d-flex align-items-center gap-3 py-3" 
                style={{ fontSize: '14px', color: 'var(--text-muted)' }}
              >
                <div className="wave">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
                <span className="opacity-70 tracking-wide fw-medium">Synthesizing relevant documents...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {isUploading && (
            <div className="d-flex align-items-center gap-4 bg-light p-4 rounded-4 border shadow-sm">
               <div className="flex-grow-1">
                  <div className="d-flex justify-content-between mb-2 small fw-bold">
                    <span className="text-dark">Ingesting Document Layer...</span>
                    <span className="text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="progress bg-white shadow-sm" style={{ height: '6px', borderRadius: '10px' }}>
                    <motion.div 
                      className="progress-bar bg-primary" 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      style={{ borderRadius: '10px' }}
                    />
                  </div>
               </div>
               <button 
                 onClick={onCancel}
                 className="btn btn-link p-2 text-muted hover-danger transition-all border-0"
                 title="Cancel Upload"
               >
                 <XCircle size={24} />
               </button>
            </div>
          )}

          {!isUploading && content && (
            <div className={`message-body ${isDoc ? 'doc-bubble p-4 rounded-4 d-inline-flex align-items-center gap-4 shadow-sm' : ''}`} 
                 style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--text-main)', fontWeight: '400' }}>
              {isDoc && (
                <div className="p-2 bg-success bg-opacity-20 text-success rounded-circle shadow-sm" style={{ flexShrink: 0 }}>
                  <FileText size={16} />
                </div>
              )}
              <div className={isDoc ? 'fw-bold text-dark' : ''}>
                {formatContent(content)}
                {isStreaming && <span className="streaming-pulse ms-2"></span>}
              </div>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .group:hover .group-hover\\:opacity-100 { opacity: 1 !important; }
        .hover-danger:hover { color: #ef4444 !important; }
        .streaming-pulse { display: inline-block; width: 6px; height: 16px; background-color: var(--primary); vertical-align: middle; animation: pulse 1s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .wave .dot { background: var(--primary); width: 5px; height: 5px; }
        .doc-bubble { background-color: #f1f5f9; border: 1px solid rgba(0,0,0,0.05); }
        .message-body p { margin-bottom: 1.25rem; }
        .message-body p:last-child { margin-bottom: 0; }
        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
      `}} />
    </motion.div>
  );
};

export default MessageBubble;

