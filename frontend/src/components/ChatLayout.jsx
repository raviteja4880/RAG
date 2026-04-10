import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  LogOut, 
  LogIn,
  MessageSquare,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Pin,
  Edit2,
  PinOff,
  Calendar,
  ShieldAlert
} from 'lucide-react';

const ChatLayout = ({ 
  children, 
  sessions, 
  currentSessionId, 
  onSessionSelect, 
  onCreateNew, 
  onDeleteSession, 
  onTogglePin,
  onRenameSession,
  user, 
  onLogout 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false);

  const isGuest = user?._id === 'guest';

  const groupedSessions = useMemo(() => {
    const filtered = sessions.filter(s => 
      (s.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups = {
      Pinned: [],
      Today: [],
      Yesterday: [],
      'Last 7 Days': [],
      Older: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    filtered.forEach(s => {
      if (s.is_pinned) {
        groups.Pinned.push(s);
        return;
      }
      const date = new Date(s.updated_at);
      if (date >= today) groups.Today.push(s);
      else if (date >= yesterday) groups.Yesterday.push(s);
      else if (date >= lastWeek) groups['Last 7 Days'].push(s);
      else groups.Older.push(s);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [sessions, searchQuery]);

  const handleCreateNew = () => {
    if (isGuest && sessions.length >= 1) {
      setShowGuestLimitModal(true);
      return;
    }
    onCreateNew();
  };

  const handleRenameSubmit = (e, id) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onRenameSession(id, newTitle);
      setRenamingId(null);
      setNewTitle('');
    }
  };

  return (
    <div className="d-flex w-100 overflow-hidden vh-100 bg-light">
      
      {/* Guest Limit Modal */}
      <AnimatePresence>
        {showGuestLimitModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
            style={{ zIndex: 2005, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-5 rounded-5 shadow-22 text-center border-0" 
              style={{ maxWidth: '440px', width: '90%' }}
            >
              <div className="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '70px', height: '70px' }}>
                <ShieldAlert size={36} />
              </div>
              <h3 className="fw-black mb-3">One Chat Limit</h3>
              <p className="text-muted mb-5 fw-medium">Please Login To explore More</p>
              <div className="d-flex flex-column gap-3">
                <button className="btn btn-primary py-3 fw-bold rounded-3 shadow-sm" onClick={onLogout}>Sign In</button>
                <button className="btn btn-light py-3 fw-bold rounded-3" onClick={() => setShowGuestLimitModal(false)}>Stay as Guest</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
            style={{ zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-5 rounded-4 shadow-2xl text-center border-0" 
              style={{ maxWidth: '400px', width: '90%' }}
            >
              <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '64px', height: '64px' }}>
                <AlertTriangle size={32} />
              </div>
              <h4 className="fw-bold mb-3">Delete Conversation</h4>
              <p className="text-muted mb-5">This action cannot be undone. All messages and vectors in this session will be lost.</p>
              <div className="d-flex gap-3">
                <button className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn btn-danger flex-grow-1 py-3 fw-bold rounded-3" onClick={() => { onDeleteSession(sessionToDelete); setShowDeleteModal(false); }}>Delete Forever</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        animate={{ width: isSidebarOpen ? 280 : 0 }}
        className="bg-sidebar d-flex flex-column h-100 overflow-hidden border-end border-light"
        style={{ minWidth: isSidebarOpen ? 280 : 0, borderRight: '1px solid rgba(0,0,0,0.05)' }}
      >
        <div className="p-3 d-flex flex-column h-100 w-100 overflow-hidden">
          
          <button 
            className="btn btn-white shadow-sm border text-start mb-3 d-flex align-items-center gap-3 w-100 fw-bold"
            onClick={handleCreateNew}
            style={{ borderRadius: '10px', padding: '12px' }}
          >
            <Plus size={18} className="text-accent" /> New Chat
          </button>

          <div className="position-relative mb-4">
            <Search size={14} className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
            <input 
              type="text" 
              placeholder="Search conversations..."
              className="form-control form-control-sm ps-5 py-2 border-0 shadow-sm bg-light"
              style={{ borderRadius: '10px', fontSize: '13px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-grow-1 overflow-auto custom-scrollbar-thin pe-1">
            {groupedSessions.map(([group, items]) => (
              <div key={group} className="mb-4">
                <div className="text-muted small mb-2 ps-2 d-flex align-items-center gap-2 group-header">
                   {group === 'Pinned' ? <Pin size={10} className="text-accent" /> : <Calendar size={10} />}
                   {group}
                </div>
                {items.map(s => (
                  <motion.div 
                    layout
                    key={s._id}
                    onClick={() => onSessionSelect(s._id)}
                    className={`p-2 mb-1 rounded-3 cursor-pointer d-flex justify-content-between align-items-center transition-all session-card ${currentSessionId === s._id ? 'active-session' : 'hover-session'}`}
                  >
                    <div className="text-truncate flex-grow-1 d-flex align-items-center gap-2 overflow-hidden">
                      <MessageSquare size={14} className={currentSessionId === s._id ? 'text-accent' : 'opacity-30'} />
                      
                      {renamingId === s._id ? (
                        <form onSubmit={(e) => handleRenameSubmit(e, s._id)} className="w-100">
                          <input 
                            autoFocus
                            className="bg-transparent border-0 w-100 focus-none p-0"
                            style={{ fontSize: '13px', fontWeight: '500' }}
                            value={newTitle}
                            onBlur={() => setRenamingId(null)}
                            onChange={(e) => setNewTitle(e.target.value)}
                          />
                        </form>
                      ) : (
                        <span className="text-truncate" style={{ fontSize: '13px', fontWeight: '500', color: currentSessionId === s._id ? 'var(--primary)' : 'inherit' }}>
                          {s.title || 'Untitled Chat'}
                        </span>
                      )}
                    </div>
                    
                    <div className="d-flex gap-1 action-toolbar">
                      <button className="btn btn-link text-muted p-1 border-0 hover-accent" onClick={(e) => { e.stopPropagation(); onTogglePin(s._id); }}>
                        {s.is_pinned ? <PinOff size={11} /> : <Pin size={11} />}
                      </button>
                      <button className="btn btn-link text-muted p-1 border-0 hover-accent" onClick={(e) => { e.stopPropagation(); setRenamingId(s._id); setNewTitle(s.title || ''); }}>
                        <Edit2 size={11} />
                      </button>
                      <button className="btn btn-link text-muted p-1 border-0 hover-danger" onClick={(e) => { e.stopPropagation(); setSessionToDelete(s._id); setShowDeleteModal(true); }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>

          {/* User Profile Area */}
          <div className="mt-auto pt-3 border-top">
            <div className="d-flex align-items-center gap-3 p-2 rounded-3 hover-bg-light transition-all mb-2">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                style={{ width: '36px', height: '36px', background: isGuest ? 'linear-gradient(135deg, #64748b, #94a3b8)' : 'linear-gradient(135deg, #10a37f, #4fd1c5)', flexShrink: 0 }}
              >
                {user?.email?.[0].toUpperCase() || 'G'}
              </div>
              <div className="overflow-hidden flex-grow-1">
                <div className="text-truncate fw-bold small text-dark">{isGuest ? 'Guest Explorer' : user?.email?.split('@')[0]}</div>
                <div className="text-truncate text-muted tiny fw-medium">{isGuest ? 'Sandbox Mode' : user?.email}</div>
              </div>
            </div>
            
            {isGuest ? (
              <button className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-3 py-2 rounded-3 transition-all fw-bold shadow-sm text-white" onClick={onLogout} style={{ fontSize: '12px' }}>
                <LogIn size={14} /> Sign In
              </button>
            ) : (
              <button className="btn btn-link text-muted text-decoration-none w-100 d-flex align-items-center gap-3 p-2 rounded-3 hover-bg-danger transition-all small" onClick={onLogout}>
                <LogOut size={14} /> Sign Out
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Chat Interface */}
      <div className="flex-grow-1 d-flex flex-column position-relative overflow-hidden w-100">
        <header className="d-flex align-items-center px-4 py-2 border-bottom bg-white" style={{ minHeight: '56px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <button 
             className="btn btn-link text-muted p-2 d-flex align-items-center justify-content-center border me-3 rounded-2 hover-bg-light" 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
             {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          
          <div className="flex-grow-1">
             <div className="fw-bold small text-dark d-flex align-items-center gap-2">
                {sessions.find(s => s._id === currentSessionId)?.title || 'Knowledge Console'}
                <div className="px-2 py-0.5 bg-success bg-opacity-10 text-success rounded-pill" style={{ fontSize: '9px', fontWeight: '800' }}>ONLINE</div>
                {isGuest && <div className="px-2 py-0.5 bg-warning bg-opacity-10 text-warning rounded-pill" style={{ fontSize: '9px', fontWeight: '800' }}>GUEST LIMIT ACTIVE</div>}
             </div>
          </div>
        </header>

        <main className="flex-grow-1 d-flex flex-column overflow-hidden bg-chat">
          {children}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .session-card .action-toolbar { opacity: 0; transition: opacity 0.2s; }
        .session-card:hover .action-toolbar { opacity: 1; }
        .hover-accent:hover { color: var(--primary) !important; }
        .hover-danger:hover { color: #ef4444 !important; }
        .hover-bg-light:hover { background-color: rgba(0,0,0,0.03); }
        .hover-bg-danger:hover { background-color: rgba(239, 68, 68, 0.05); color: #ef4444 !important; }
        .tiny { font-size: 10px; }
        .group-header { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.5; color: #1e293b; }
        .custom-scrollbar-thin::-webkit-scrollbar { width: 2px; }
        .shadow-22 { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2); }
      `}} />
    </div>
  );
};

export default ChatLayout;
