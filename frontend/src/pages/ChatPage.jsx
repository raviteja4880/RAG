import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Simple Components
import ChatLayout from '../components/ChatLayout';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';

const ChatPage = ({ user, onLogout }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  
  const uploadAbortControllerRef = useRef(null);
  const currentSession = sessions.find(s => s._id === currentSessionId) || { messages: [] };
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession.messages, streamingContent, isThinking, isUploading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async (targetId = null) => {
    try {
      const res = await axios.get(`/api/history/sessions?user_id=${user._id || user.id}`);
      setSessions(res.data.sessions);
      if (res.data.sessions.length > 0) {
        if (targetId) {
          setCurrentSessionId(targetId);
        } else if (!currentSessionId) {
          setCurrentSessionId(res.data.sessions[0]._id);
        }
      }
    } catch (e) { toast.error('History sync failed.'); }
  };

  const createNewChat = async () => {
    try {
      const res = await axios.post(`/api/history/create?user_id=${user._id || user.id}`);
      setSessions([res.data, ...sessions]);
      setCurrentSessionId(res.data._id);
      return res.data._id;
    } catch (e) { toast.error('Failed to create session'); return null; }
  };

  const deleteSession = async (id) => {
    try {
      await axios.delete(`/api/history/session/${id}`);
      const filtered = sessions.filter(s => s._id !== id);
      setSessions(filtered);
      if (currentSessionId === id) {
        setCurrentSessionId(filtered[0]?._id || null);
      }
      toast.success('Conversation cleared.');
    } catch (e) { toast.error('Delete failed'); }
  };

  const handleTogglePin = async (id) => {
     try {
       const res = await axios.post(`/api/history/toggle_pin/${id}`);
       setSessions(prev => 
         prev.map(s => s._id === id ? { ...s, is_pinned: res.data.is_pinned } : s)
           .sort((a,b) => (b.is_pinned - a.is_pinned) || (new Date(b.updated_at) - new Date(a.updated_at)))
       );
       toast.success(res.data.is_pinned ? 'Conversation Pinned' : 'Unpinned');
     } catch (e) { toast.error('Action failed'); }
  };

  const handleRenameSession = async (id, title) => {
     try {
       await axios.post(`/api/history/rename/${id}?title=${encodeURIComponent(title)}`);
       setSessions(prev => prev.map(s => s._id === id ? { ...s, title } : s));
       toast.success('Renamed');
     } catch (e) { toast.error('Rename failed'); }
  };

  const handleUpload = async (file) => {
    // --- FILE SIZE RESTRICTION ---
    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum limit is ${MAX_SIZE_MB}MB.`);
      return;
    }

    let sid = currentSessionId;
    if (!sid) sid = await createNewChat();
    if (!sid) return;

    setIsUploading(true);
    setUploadingFileName(file.name);
    setUploadProgress(0);
    
    const controller = new AbortController();
    uploadAbortControllerRef.current = controller;

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await axios.post(`/api/upload?user_id=${user._id || user.id}&session_id=${sid}`, formData, {
        signal: controller.signal,
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total))
      });
      toast.success(`"${file.name}" indexed successfully.`);
      fetchSessions(sid);
    } catch(e) { 
      if (axios.isCancel(e) || e.name === 'CanceledError' || e.name === 'AbortError') {
        toast('Upload canceled', { icon: '🚫' });
      } else {
        toast.error('Upload failed.'); 
      }
    } finally { 
      setIsUploading(false); 
      setUploadingFileName('');
      setUploadProgress(0); 
      uploadAbortControllerRef.current = null;
    }
  };

  const cancelUpload = () => {
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
    }
  };

  const handleAsk = async (query) => {
    if (!query.trim() || isAsking) return;
    let sid = currentSessionId;
    if (!sid) sid = await createNewChat();
    if (!sid) return;

    // --- Optimistic Update ---
    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    setSessions(prev => prev.map(s => s._id === sid ? { ...s, messages: [...s.messages, userMessage], updated_at: new Date() } : s));
    
    const history = currentSession.messages || [];
    
    setIsAsking(true);
    setIsThinking(true);
    setStreamingContent('');

    try {
      const response = await fetch(`/api/ask?user_id=${user._id || user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, history, session_id: sid })
      });

      if (!response.ok) throw new Error('Request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (isFirstChunk) {
          setIsThinking(false);
          isFirstChunk = false;
        }

        const chunk = decoder.decode(value);
        accumulated += chunk;
        setStreamingContent(accumulated);
      }

      setStreamingContent('');
    } catch (e) { 
      toast.error(e.message || 'Error occurred'); 
      setIsThinking(false);
    } finally { 
      setIsAsking(false); 
      fetchSessions(sid); 
    }
  };

  return (
    <ChatLayout 
      user={user} 
      sessions={sessions} 
      currentSessionId={currentSessionId}
      onLogout={onLogout}
      onCreateNew={createNewChat}
      onSessionSelect={setCurrentSessionId}
      onDeleteSession={deleteSession}
      onTogglePin={handleTogglePin}
      onRenameSession={handleRenameSession}
    >
      <div className="d-flex flex-column h-100 bg-chat">
        
        {/* Messages Area */}
        <div className="flex-grow-1 overflow-auto custom-scrollbar">
          <AnimatePresence>
            {(!currentSessionId || currentSession.messages.length === 0) && !isAsking && !isUploading && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="text-center py-5 mt-5 px-4"
               >
                  <div className="mb-4 d-inline-flex bg-white shadow-sm rounded-4 d-flex align-items-center justify-content-center mx-auto border" 
                       style={{ width: '84px', height: '84px', fontSize: '38px', fontWeight: '900', color: 'var(--primary)', borderColor: 'rgba(0,0,0,0.05)' }}>
                    R
                  </div>
                  <h1 className="fw-black mb-3 text-dark tracking-tighter" style={{ fontSize: '3rem' }}>
                    RAG <span className="text-accent">Premium</span>
                  </h1>
                  <p className="text-muted mx-auto" style={{ fontSize: '1.2rem', maxWidth: '480px', fontWeight: '500' }}>
                    The advanced retrieval gateway. Connect your documents and experience conversational intelligence with private data sovereignty.
                  </p>
               </motion.div>
            )}
          </AnimatePresence>

          {currentSession.messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} type={msg.content?.includes('[Document Uploaded:') ? 'file' : 'text'} />
          ))}

          {isUploading && (
            <MessageBubble 
              role="user" 
              content={`Analyzing "${uploadingFileName}" vector space...`} 
              isUploading={true}
              uploadProgress={uploadProgress}
              onCancel={cancelUpload}
            />
          )}

          {(isThinking || streamingContent) && (
            <MessageBubble 
              role="ai" 
              content={streamingContent} 
              isStreaming={!!streamingContent} 
              isThinking={isThinking} 
            />
          )}

          <div ref={messagesEndRef} style={{ height: '12rem' }} />
        </div>

        {/* Input Area */}
        <div className="mt-auto">
          <ChatInput 
            onSend={handleAsk}
            onUpload={handleUpload}
            isAsking={isAsking}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        </div>

      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .fw-black { font-weight: 900; }
        .tracking-tighter { letter-spacing: -0.04em; }
        .shadow-2xl { box-shadow: 0 40px 60px -15px rgba(0, 0, 0, 0.05); }
      `}} />
    </ChatLayout>
  );
};

export default ChatPage;
