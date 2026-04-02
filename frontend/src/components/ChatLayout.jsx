import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  LogOut, 
  Menu, 
  User, 
  History,
  X,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

const ChatLayout = ({ children, sessions, currentSessionId, onSessionSelect, onCreateNew, onDeleteSession, user, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const confirmDelete = (e, id) => {
    e.stopPropagation();
    setSessionToDelete(id);
    setShowDeleteModal(true);
  };

  const handleFinalDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete);
    }
    setShowDeleteModal(false);
    setSessionToDelete(null);
  };

  return (
    <div className="d-flex w-100 overflow-hidden vh-100" style={{ backgroundColor: '#ffffff' }}>
      
      {/* Delete Confirmation Modal (Centered) */}
      {showDeleteModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white p-4 rounded-4 shadow-lg text-center" style={{ maxWidth: '340px', width: '90%' }}>
            <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '50px', height: '50px' }}>
              <AlertTriangle size={24} />
            </div>
            <h5 className="fw-bold mb-2">Delete Conversation?</h5>
            <p className="text-muted small mb-4">This action is permanent and cannot be undone. All data in this session will be lost.</p>
            <div className="d-flex gap-2">
              <button className="btn btn-light flex-grow-1 py-2 fw-semibold" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger flex-grow-1 py-2 fw-semibold" onClick={handleFinalDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay (Mobile Only) */}
      {isSidebarOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-50 d-md-none" 
          style={{ zIndex: 1040 }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`bg-dark text-white d-flex flex-column transition-all position-relative ${isSidebarOpen ? 'translate-x-0' : 'translate-x-n100 d-none d-md-flex'}`} 
        style={{ 
          width: '260px', 
          minWidth: '260px',
          transition: 'all 0.3s ease',
          zIndex: 1050,
          marginLeft: isSidebarOpen ? '0' : '-260px',
          borderRight: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        <div className="p-3 d-flex flex-column h-100 w-100 overflow-hidden">
          
          <button 
            className="btn btn-outline-light border-secondary text-start mb-4 d-flex align-items-center gap-2 custom-glow w-100"
            onClick={onCreateNew}
            style={{ borderRadius: '8px', fontSize: '14px', padding: '10px 12px', fontWeight: '600' }}
          >
            <Plus size={18} /> New Chat
          </button>

          <div className="flex-grow-1 overflow-auto custom-scrollbar pe-1">
            <div className="text-muted small mb-3 ps-1 d-flex align-items-center gap-2" style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>
               <History size={12} /> Recent Activity
            </div>
            {sessions.map(s => (
              <div 
                key={s._id}
                onClick={() => onSessionSelect(s._id)}
                className={`p-2 mb-1 rounded cursor-pointer d-flex justify-content-between align-items-center session-item group ${currentSessionId === s._id ? 'bg-secondary bg-opacity-25' : ''}`}
                style={{ cursor: 'pointer', fontSize: '13.5px', transition: 'all 0.2s' }}
              >
                <div className="text-truncate me-2 d-flex align-items-center gap-2" style={{ maxWidth: '180px' }}>
                  <MessageSquare size={14} className="opacity-40" />
                  {s.title || 'New Conversation'}
                </div>
                
                <button 
                  className="btn btn-sm text-light p-1 border-0 delete-btn opacity-0" 
                  onClick={(e) => confirmDelete(e, s._id)}
                >
                  <Trash2 size={13} className="opacity-40 hover-text-danger" />
                </button>
              </div>
            ))}
          </div>

          {/* Profile Section */}
          <div className="mt-auto border-top border-secondary pt-3">
            <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded hover-bg-secondary w-100" style={{ cursor: 'pointer' }}>
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                style={{ width: '40px', height: '40px', backgroundColor: '#2c3e50', flexShrink: 0 }}
              >
                {user?.email?.[0].toUpperCase() || <User size={18} />}
              </div>
              <div className="overflow-hidden flex-grow-1">
                <div className="text-truncate d-flex align-items-center" style={{ fontSize: '14px', fontWeight: '700' }}>
                   {user?.email?.split('@')[0]}
                   {user?.is_verified && <div className="ms-1 bg-info rounded-circle" style={{ width: '6px', height: '6px' }}></div>}
                </div>
                <div className="text-truncate text-muted small" style={{ fontSize: '11px', opacity: 0.6 }}>{user?.email}</div>
              </div>
            </div>
            
            <button 
              className="btn btn-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2 mb-2 premium-logout" 
              onClick={onLogout}
              style={{ fontSize: '13px', borderRadius: '10px', fontWeight: '700', backgroundColor: '#c0392b', border: 'none' }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow-1 d-flex flex-column position-relative overflow-hidden w-100">
        <header className="d-flex align-items-center px-3 py-2 border-bottom bg-white" style={{ minHeight: '52px' }}>
          <button className="btn btn-sm border-0 p-2 d-md-none" onClick={() => setIsSidebarOpen(true)}>
             <Menu size={20} />
          </button>
          <button className="btn btn-sm border-0 p-2 d-none d-md-block text-muted" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
             {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-grow-1 text-center fw-bold small d-md-none pe-4">History</div>
          <div className="d-none d-md-block ms-2 small text-muted fw-bold uppercase" style={{ letterSpacing: '0.1em', fontSize: '10px' }}>RAG PREMIUM 3.0</div>
        </header>

        <div className="flex-grow-1 d-flex flex-column overflow-hidden">
          {children}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .session-item:hover { background-color: rgba(255,255,255,0.08); }
        .session-item:hover .delete-btn { opacity: 0.6 !important; }
        .delete-btn:hover { opacity: 1 !important; color: #ff4757 !important; }
        .hover-bg-secondary:hover { background-color: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 10px; }
        .translate-x-n100 { transform: translateX(-100%); }
        .translate-x-0 { transform: translateX(0); }
        .premium-logout:hover { background-color: #e74c3c !important; transform: translateY(-1px); }
      `}} />
    </div>
  );
};

export default ChatLayout;
