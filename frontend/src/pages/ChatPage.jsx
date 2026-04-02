import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

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
  
  // Ref to store AbortController for upload cancellation
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
      const res = await axios.get(`/api/history/sessions?user_id=${user.id}`);
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
      const res = await axios.post(`/api/history/create?user_id=${user.id}`);
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

  const handleUpload = async (file) => {
    let sid = currentSessionId;
    if (!sid) sid = await createNewChat();
    if (!sid) return;

    setIsUploading(true);
    setUploadingFileName(file.name);
    setUploadProgress(0);
    
    // Create new abort controller for this upload
    const controller = new AbortController();
    uploadAbortControllerRef.current = controller;

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // PERSISTENT UPLOAD: Added session_id to enable document history persistence in DB
      await axios.post(`/api/upload?user_id=${user.id}&session_id=${sid}`, formData, {
        signal: controller.signal,
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total))
      });
      
      toast.success(`"${file.name}" indexed successfully.`);
      
      // Fetch full history from DB to ensure local state has the persisted document marker
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
    if (isAsking) return;
    let sid = currentSessionId;
    if (!sid) sid = await createNewChat();
    if (!sid) return;

    const history = currentSession.messages || [];
    
    setIsAsking(true);
    setIsThinking(true);
    setStreamingContent('');

    try {
      const response = await fetch(`/api/ask?user_id=${user.id}`, {
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
    >
      <div className="d-flex flex-column h-100 bg-white">
        
        {/* Messages Area */}
        <div className="flex-grow-1 overflow-auto">
          
          {(!currentSessionId || currentSession.messages.length === 0) && !isAsking && !isUploading && (
             <div className="text-center py-5 mt-5">
                <div className="mb-4 d-inline-block bg-dark text-white rounded-circle d-flex align-items-center justify-content-center mx-auto" style={{ width: '64px', height: '64px', fontSize: '32px' }}>
                  R
                </div>
                <h1 className="fw-bold mb-3" style={{ fontSize: '2rem' }}>RAG Assistant</h1>
                <p className="text-muted" style={{ fontSize: '1.25rem' }}>Upload documents and ask questions.</p>
             </div>
          )}

          {currentSession.messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} type={msg.content?.includes('[Document Uploaded:') ? 'file' : 'text'} />
          ))}

          {/* Upload Progress Bubble */}
          {isUploading && (
            <MessageBubble 
              role="user" 
              content={`Uploading ${uploadingFileName}...`} 
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

          <div ref={messagesEndRef} style={{ height: '8rem' }} />
        </div>

        {/* Input Area */}
        <ChatInput 
          onSend={handleAsk}
          onUpload={handleUpload}
          isAsking={isAsking}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />

      </div>
    </ChatLayout>
  );
};

export default ChatPage;
