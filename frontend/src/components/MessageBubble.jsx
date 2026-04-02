import React from 'react';
import { Paperclip, Loader2, XCircle, FileText, CheckCircle2 } from 'lucide-react';

const MessageBubble = ({ role, content, isStreaming, isThinking, isUploading, uploadProgress, onCancel, type }) => {
  const isUser = role === 'user';
  const isDoc = type === 'file';

  const formatContent = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => (
      <p key={i} className="mb-2">{line}</p>
    ));
  };

  return (
    <div className={`py-4 w-100 ${isUser ? '' : 'bg-light bg-opacity-10'}`} 
         style={{ borderTop: isUser ? 'none' : '1px solid rgba(0,0,0,0.03)', borderBottom: isUser ? 'none' : '1px solid rgba(0,0,0,0.03)' }}>
      <div className="container-md d-flex align-items-start gap-3" style={{ maxWidth: '800px' }}>
        
        {/* Avatar Placeholder */}
        <div 
          className={`rounded-1 d-flex align-items-center justify-content-center text-white fw-bold shrink-0 transition-all`}
          style={{ 
            width: '32px', height: '32px', 
            backgroundColor: isUser ? '#10a37f' : '#2c3e50', 
            fontSize: '13px', flexShrink: 0,
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}
        >
          {isUser ? 'U' : 'AI'}
        </div>

        <div className="flex-grow-1" style={{ fontSize: '15px', color: '#1a1a1a' }}>
          <div className="fw-bold mb-1 small text-uppercase d-flex align-items-center justify-content-between" style={{ fontSize: '10px', color: '#888', letterSpacing: '0.08em' }}>
            <span>{isUser ? 'Core User' : 'RAG Intelligence'}</span>
          </div>
          
          {isThinking && !content && (
            <div className="text-muted d-flex align-items-center gap-2 py-2" style={{ fontSize: '14px' }}>
              <Loader2 size={12} className="animate-spin text-primary" />
              <span className="fw-medium italic" style={{ opacity: 0.7 }}>Scanning relevant vectors...</span>
            </div>
          )}

          {isUploading && (
            <div className="border rounded-4 p-3 bg-white shadow-sm mt-2 position-relative border-primary-subtle" style={{ maxWidth: '350px' }}>
              <button 
                onClick={onCancel}
                className="btn btn-sm btn-link text-danger p-0 position-absolute top-0 end-0 m-2 hover-scale"
                title="Abort Upload"
              >
                <XCircle size={16} />
              </button>
              
              <div className="d-flex align-items-center gap-3 mb-2 pe-4">
                <div className="bg-primary bg-opacity-10 p-2 rounded-3 text-primary">
                   <FileText size={20} />
                </div>
                <div className="flex-grow-1 overflow-hidden">
                  <div className="text-truncate small fw-bold mb-0">{content}</div>
                  <div className="text-muted" style={{ fontSize: '10px' }}>Waiting for ingestion...</div>
                </div>
              </div>
              <div className="progress overflow-visible" style={{ height: '3px', background: '#f0f0f0' }}>
                <div 
                  className="progress-bar bg-primary shadow-sm" 
                  role="progressbar" 
                  style={{ width: `${uploadProgress}%`, transition: 'all 0.3s ease-out' }}
                ></div>
              </div>
              <div className="text-end mt-1 fw-bold text-primary" style={{ fontSize: '9px' }}>{uploadProgress}%</div>
            </div>
          )}

          {!isUploading && (
            <div className={`message-content ${isDoc ? 'bg-light bg-opacity-50 p-2 px-3 rounded-pill d-inline-flex align-items-center gap-2 border shadow-sm' : ''}`} style={{ lineHeight: '1.67' }}>
              {isDoc && (
                <div className="d-flex align-items-center gap-2 text-success">
                  <CheckCircle2 size={14} />
                  <span className="fw-bold small text-dark opacity-75">Indexed:</span>
                </div>
              )}
              <div className={isDoc ? 'text-primary-emphasis fw-medium italic' : ''}>
                {formatContent(content)}
                {isStreaming && <span className="ms-1 cursor-blink"></span>}
              </div>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .cursor-blink { display: inline-block; width: 2px; height: 1.25em; background-color: #333; vertical-align: middle; animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1.2s linear infinite; }
        .hover-scale:hover { transform: scale(1.1); }
        .message-content p { margin-bottom: 0.5rem; }
        .message-content p:last-child { margin-bottom: 0; }
      `}} />
    </div>
  );
};

export default MessageBubble;
