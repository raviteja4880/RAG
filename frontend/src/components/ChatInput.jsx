import React, { useState, useRef } from 'react';
import { Paperclip, SendHorizontal, Loader2 } from 'lucide-react';

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
      onUpload(file);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="bg-white px-3 pb-4 pt-1">
      <div className="container-md" style={{ maxWidth: '800px' }}>
        
        {isUploading && (
          <div className="progress mb-3 mx-auto shadow-sm" style={{ height: '3px', maxWidth: '600px' }}>
            <div 
              className="progress-bar bg-primary progress-bar-animated progress-bar-striped" 
              role="progressbar" 
              style={{ width: `${uploadProgress}%` }} 
              aria-valuenow={uploadProgress} 
              aria-valuemin="0" 
              aria-valuemax="100"
            ></div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="position-relative shadow-sm rounded-4 border p-2 d-flex align-items-center gap-2 bg-white transition-all focus-within-shadow">
          
          <button 
            type="button" 
            className="btn btn-sm btn-link text-decoration-none text-muted p-2 hover-bg-light rounded-circle" 
            onClick={() => fileInputRef.current?.click()}
            title="Upload Document"
            disabled={isUploading || isAsking}
          >
            <Paperclip size={18} />
          </button>

          <input 
            type="text" 
            className="form-control border-0 shadow-none px-2 py-2" 
            placeholder={isAsking ? "Gathering intelligence..." : isUploading ? "Waiting for upload..." : "Message RAG assistant..."} 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            disabled={isAsking}
            style={{ fontSize: '15px', color: '#1a1a1a' }}
          />

          <button 
            type="submit" 
            className={`btn btn-sm rounded-pill px-3 d-flex align-items-center justify-content-center gap-2 transition-all ${!input.trim() || isAsking || isUploading ? 'btn-light opacity-50' : 'btn-dark'}`}
            disabled={!input.trim() || isAsking || isUploading}
            style={{ height: '36px', minWidth: '40px', fontWeight: '500' }}
          >
            {isAsking ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <SendHorizontal size={16} />
            )}
          </button>
        </form>
        
        <div className="text-center mt-2" style={{ fontSize: '10px', color: '#999', opacity: 0.6, letterSpacing: '0.02em' }}>
          RAG Assistant uses advanced context retrieval. Verify critical details.
        </div>
        
        <input type="file" ref={fileInputRef} onChange={handleFile} className="d-none" accept=".pdf,.png,.jpg,.jpeg" />
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .hover-bg-light:hover { background-color: rgba(0,0,0,0.05); }
        .focus-within-shadow:focus-within { border-color: rgba(0,0,0,0.2) !important; box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default ChatInput;
