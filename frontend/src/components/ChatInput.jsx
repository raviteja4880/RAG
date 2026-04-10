import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, SendHorizontal, Loader2, Sparkles, Ban } from 'lucide-react';

const ChatInput = ({ onSend, onUpload, isAsking, isUploading, uploadProgress }) => {
  const [input, setInput] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isAsking || isUploading) return;
    onSend(input);
    setInput('');
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (isAsking || isUploading) return;
      onUpload(file);
      e.target.value = ''; // Reset input
    }
  };

  const isBlocked = isAsking || isUploading;

  return (
    <div className="bg-white border-top px-4 pb-5 pt-3 position-relative shadow-sm" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
      <div className="container-md" style={{ maxWidth: '850px' }}>
        
        <AnimatePresence>
          {isUploading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="px-4 mb-3"
            >
              <div className="progress mx-auto bg-light shadow-sm" style={{ height: '4px', borderRadius: '10px' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="progress-bar bg-accent" 
                  style={{ height: '100%', borderRadius: '10px' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          layout
          className="rounded-4 py-1 px-2 border shadow-sm bg-light bg-opacity-50"
          style={{ borderColor: 'rgba(0,0,0,0.08)' }}
        >
          <form onSubmit={handleSubmit} className="d-flex align-items-center gap-2">
            
            <button 
              type="button" 
              className={`btn btn-sm p-2 rounded-3 transition-all shadow-none border-0 ${isBlocked ? 'cursor-blocked opacity-40' : 'hover-bg-white text-muted'}`} 
              onClick={() => !isBlocked && fileInputRef.current?.click()}
              title={isBlocked ? "Upload locked during processing" : "Upload Document"}
              style={{ cursor: isBlocked ? 'not-allowed' : 'pointer' }}
            >
              {isBlocked ? <Ban size={20} /> : <Paperclip size={20} />}
            </button>

            <input 
              type="text" 
              className="flex-grow-1 bg-transparent border-0 text-dark px-2 py-3 focus-none" 
              placeholder={isAsking ? "Processing your last query..." : isUploading ? "Ingesting data..." : "Ask your knowledge base..."} 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              // ALLOWING USER TO TYPE EVEN WHILE ASKING
              style={{ fontSize: '15px', fontWeight: '500', outline: 'none' }}
            />

            <motion.button 
              whileHover={!isBlocked && input.trim() ? { scale: 1.05 } : {}}
              whileTap={!isBlocked && input.trim() ? { scale: 0.95 } : {}}
              type="submit" 
              className={`rounded-3 d-flex align-items-center justify-content-center transition-all shadow-sm ${!input.trim() || isBlocked ? 'opacity-30 cursor-blocked' : 'bg-primary'}`}
              disabled={!input.trim() || isBlocked}
              style={{ 
                height: '42px', width: '42px', 
                border: 'none', 
                backgroundColor: !input.trim() || isBlocked ? '#e2e8f0' : 'var(--primary)',
                color: 'white',
                cursor: !input.trim() || isBlocked ? 'not-allowed' : 'pointer'
              }}
            >
              {isAsking || isUploading ? (
                <Ban size={18} />
              ) : (
                <SendHorizontal size={18} />
              )}
            </motion.button>
          </form>
        </motion.div>
        
        <div className="d-flex align-items-center justify-content-center gap-2 mt-3 opacity-40 text-dark fw-bold" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>
          <Sparkles size={10} className="text-accent" />
          <span>RAG PREMIUM v3.1 • ENTERPRISE INTELLIGENCE</span>
        </div>
        
        <input type="file" ref={fileInputRef} onChange={handleFile} className="d-none" accept=".pdf,.png,.jpg,.jpeg" />
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .hover-bg-white:hover { background-color: white !important; color: var(--primary) !important; box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important; }
        .focus-none:focus { outline: none; }
        .cursor-blocked { cursor: not-allowed !important; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default ChatInput;
