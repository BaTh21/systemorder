// src/components/chat/ChatSupport.jsx
import { useState, useEffect, useRef } from 'react';
import {
  Box, Fab, Drawer, Typography, TextField, Stack, IconButton,
  Avatar, Paper, Chip, useMediaQuery, useTheme, Menu, MenuItem, Badge,
  Button, Tooltip, Dialog, DialogContent
} from '@mui/material';
import {
  Chat as ChatIcon, Close, Send,
  SupportAgent, Image, AttachFile, Mic, Stop,
  PlayArrow, Pause, Circle, Edit, Delete, MoreHoriz,
  InsertEmoticon, ContentCopy, SaveAlt, RemoveRedEye,
  InsertDriveFile, DoneAll, Done,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import FileViewer from './FileViewer';

const getWsUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  if (apiUrl.includes('onrender.com')) {
    return apiUrl.replace('https://', 'wss://').replace('/api', '');
  } else {
    return apiUrl.replace('http://', 'ws://').replace('/api', '');
  }
};

const getCustomerDisplayName = (user) => {
  if (user?.full_name && user.full_name !== 'Guest') return user.full_name;
  return 'Customer';
};

const getCustomerEmail = (user) => {
  if (user?.email) return user.email;
  return '';
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const ChatSupport = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [viewer, setViewer] = useState({ open: false, imageUrl: '', fileData: null, messageId: null });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [imagePreview, setImagePreview] = useState({ open: false, url: '' });

  const [sessionId, setSessionId] = useState(() => {
    if (user?.id) return `user_${user.id}`;
    let id = localStorage.getItem('chat_guest_session');
    if (!id) {
      id = 'guest_' + Date.now();
      localStorage.setItem('chat_guest_session', id);
    }
    return id;
  });

  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioRef = useRef(new Audio());
  const [playingAudio, setPlayingAudio] = useState(null);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [messageMenu, setMessageMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [emojiPickerId, setEmojiPickerId] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const token = localStorage.getItem('access_token');

  const customerName = getCustomerDisplayName(user);
  const customerEmail = getCustomerEmail(user);

  // Update session ID when user logs in
  useEffect(() => {
    if (user?.id) {
      setSessionId(`user_${user.id}`);
      localStorage.removeItem('chat_guest_session');
    }
  }, [user?.id]);

  // Connect WebSocket
  useEffect(() => {
    if (!token) {
      console.log('⚠️ No token, WebSocket connection skipped');
      return;
    }
    
    const wsUrl = `${getWsUrl()}/ws/customer/${token}`;
    console.log('🔗 Connecting WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('✅ WebSocket connected');
      ws.send(JSON.stringify({
        type: "connect",
        session_id: sessionId,
        sender_name: user?.full_name || customerName,
        sender_email: user?.email || customerEmail,
        user_id: user?.id || null
      }));
    };

    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        console.log('📩 WebSocket message:', d);

        // Handle typing indicators
        if (d.type === 'typing') {
          if (d.sender === 'admin') {
            setIsAdminTyping(d.is_typing);
            if (d.is_typing) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => {
                setIsAdminTyping(false);
              }, 3000);
            }
          }
          return;
        }

        // ADMIN REPLY - Real time
        if (d.type === 'admin_reply') {
          setMessages(prev => {
            if (d.message_id && prev.find(m => m.id === d.message_id)) return prev;
            
            const msgType = d.message_type || 'text';
            let messageData = {
              id: d.message_id || ('admin_' + Date.now()),
              from: 'admin',
              type: msgType,
              time: d.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              adminName: d.admin_name,
              isEdited: false,
              reaction: null,
              reactions: [],
              is_read: true,
              created_at: d.timestamp || new Date().toISOString()
            };
            
            if (msgType === 'text') {
              messageData.text = d.message || '';
              messageData.content = d.message || '';
            } else if (msgType === 'image') {
              messageData.imageUrl = d.image_url || d.message || '';
              messageData.content = d.image_url || d.message || '';
              messageData.text = '';
            } else if (msgType === 'file') {
              if (typeof d.file_data === 'string') {
                try { messageData.fileData = JSON.parse(d.file_data); } catch { messageData.fileData = { url: d.file_data, name: 'File', size: 0 }; }
              } else {
                messageData.fileData = d.file_data || { url: '', name: 'File', size: 0 };
              }
              messageData.content = messageData.fileData.url || '';
              messageData.text = '';
            } else if (msgType === 'voice') {
              messageData.voiceUrl = d.voice_url || '';
              messageData.voiceDuration = d.voice_duration || 0;
              messageData.content = d.voice_url || '';
              messageData.text = '';
            }
            
            return [...prev, messageData];
          });
          
          // Update unread count when drawer is closed
          if (!isDrawerOpen) {
            setUnreadCount(prev => prev + 1);
          }
          
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
        // MESSAGE SENT confirmation
        else if (d.type === 'message_sent') {
          setMessages(prev => {
            if (d.message_id && prev.find(m => m.id === d.message_id)) return prev;
            return [...prev, { 
              id: d.message_id, 
              from: 'user', 
              text: d.message || '', 
              content: d.message || '',
              type: d.message_type || 'text', 
              time: d.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
              isEdited: false, 
              reaction: null,
              reactions: [],
              is_read: false,
              created_at: d.timestamp || new Date().toISOString()
            }];
          });
        }
        // MESSAGE EDITED
        else if (d.type === 'message_edited') {
          setMessages(prev => prev.map(m => 
            m.id === d.message_id ? { ...m, text: d.new_message, content: d.new_message, isEdited: true } : m
          ));
        }
        // MESSAGE DELETED
        else if (d.type === 'message_deleted') {
          setMessages(prev => prev.filter(m => m.id !== d.message_id));
        }
        // REACTION
        else if (d.type === 'message_reaction') {
          setMessages(prev => prev.map(m => {
            if (m.id === d.message_id) {
              const existingReactions = m.reactions || [];
              const existingReactionIndex = existingReactions.findIndex(r => r.emoji === d.reaction);
              
              let updatedReactions;
              if (d.reaction === null) {
                // Remove reaction
                updatedReactions = existingReactions.filter(r => r.emoji !== m.reaction);
              } else if (existingReactionIndex >= 0) {
                // Update existing reaction count
                updatedReactions = [...existingReactions];
                updatedReactions[existingReactionIndex] = {
                  ...updatedReactions[existingReactionIndex],
                  count: (updatedReactions[existingReactionIndex].count || 1) + 1
                };
              } else {
                // Add new reaction
                updatedReactions = [...existingReactions, { emoji: d.reaction, count: 1 }];
              }
              
              return { 
                ...m, 
                reaction: d.reaction || null,
                reactions: updatedReactions,
                my_reaction: d.reaction || null
              };
            }
            return m;
          }));
        }
        // SESSION DELETED
        else if (d.type === 'session_deleted') {
          setMessages(prev => [...prev, {
            id: 'system_' + Date.now(),
            from: 'support',
            text: '🔒 This chat session has been ended by the admin.',
            content: '🔒 This chat session has been ended by the admin.',
            type: 'text',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          localStorage.removeItem('chat_guest_session');
          const newSessionId = user?.id ? `user_${user.id}` : 'guest_' + Date.now();
          setSessionId(newSessionId);
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('❌ WebSocket disconnected');
    };
    
    ws.onerror = (e) => {
      console.error('WS error:', e);
    };
    
    return () => { 
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(); 
      }
    };
  }, [token, sessionId]);

  // Load history when drawer opens
  useEffect(() => {
    if (open) loadHistory();
  }, [open, sessionId]);

  // Scroll to bottom on new messages
  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await api.get(`/chat/messages/${sessionId}`);
      if (res.data?.length) {
        setMessages(res.data.map(m => {
          const msgType = m.message_type || 'text';
          let imageUrl = null, fileData = null, voiceUrl = null, voiceDuration = 0;
          let text = m.message || '';
          let content = m.message || '';
          
          if (msgType === 'image') { 
            imageUrl = m.message; 
            content = m.message;
            text = ''; 
          }
          else if (msgType === 'file') { 
            try { 
              fileData = JSON.parse(m.message); 
              content = fileData.url || m.message;
              text = ''; 
            } catch { 
              fileData = { url: m.message, name: 'File', size: 0 }; 
              content = m.message;
              text = ''; 
            } 
          }
          else if (msgType === 'voice') { 
            try { 
              const vd = JSON.parse(m.message); 
              voiceUrl = vd.url; 
              voiceDuration = vd.duration || 0; 
              content = vd.url;
              text = ''; 
            } catch { 
              voiceUrl = m.message; 
              content = m.message;
              text = ''; 
            } 
          }
          
          return { 
            id: m.id, 
            from: m.is_admin_reply ? 'admin' : 'user', 
            text, 
            content,
            type: msgType, 
            imageUrl, 
            fileData, 
            voiceUrl, 
            voiceDuration, 
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
            adminName: m.is_admin_reply ? m.sender_name : null, 
            isEdited: m.is_edited || false, 
            reaction: m.reaction || null,
            reactions: m.reactions || [],
            my_reaction: m.my_reaction || null,
            is_read: m.is_read || true,
            created_at: m.created_at,
            edited_at: m.edited_at
          };
        }));
      } else {
        setMessages([{ 
          id: 'welcome', 
          from: 'support', 
          text: '👋 Welcome! How can we help you?', 
          content: '👋 Welcome! How can we help you?',
          type: 'text', 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }]);
      }
    } catch {
      setMessages([{ 
        id: 'welcome', 
        from: 'support', 
        text: '👋 Welcome! How can we help you?', 
        content: '👋 Welcome! How can we help you?',
        type: 'text', 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const txt = input; setInput('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Stop typing indicator
    handleTyping(false);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        message: txt, 
        sender_name: customerName, 
        sender_email: customerEmail, 
        session_id: sessionId, 
        type: 'text', 
        timestamp: time 
      }));
    } else {
      try {
        const res = await api.post('/chat/send', { 
          message: txt, 
          sender_name: customerName, 
          sender_email: customerEmail, 
          session_id: sessionId 
        });
        setMessages(prev => [...prev, { 
          id: res.data.id, 
          from: 'user', 
          text: txt, 
          content: txt,
          type: 'text', 
          time, 
          isEdited: false, 
          reaction: null,
          reactions: [],
          is_read: false,
          created_at: new Date().toISOString()
        }]);
      } catch (e) { console.error('Send failed:', e); }
    }
  };

  const handleTyping = (isTyping) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping,
        session_id: sessionId,
        sender_name: customerName
      }));
    }
  };

  const handleReaction = async (msgId, emoji) => {
    const currentMsg = messages.find(m => m.id === msgId);
    const newReaction = currentMsg?.reaction === emoji ? null : emoji;
    
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        const existingReactions = m.reactions || [];
        let updatedReactions;
        
        if (newReaction === null) {
          // Remove reaction
          updatedReactions = existingReactions
            .map(r => r.emoji === emoji ? { ...r, count: Math.max(0, (r.count || 1) - 1) } : r)
            .filter(r => r.count > 0);
        } else {
          const existingIndex = existingReactions.findIndex(r => r.emoji === emoji);
          if (existingIndex >= 0) {
            updatedReactions = [...existingReactions];
            updatedReactions[existingIndex] = {
              ...updatedReactions[existingIndex],
              count: (updatedReactions[existingIndex].count || 1) + 1
            };
          } else {
            updatedReactions = [...existingReactions, { emoji, count: 1 }];
          }
        }
        
        return { 
          ...m, 
          reaction: newReaction,
          reactions: updatedReactions,
          my_reaction: newReaction
        };
      }
      return m;
    }));
    
    setEmojiPickerId(null);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'message_reaction', 
        message_id: msgId, 
        session_id: sessionId, 
        reaction: newReaction, 
        sender_name: customerName 
      }));
    } else {
      try { await api.post(`/chat/messages/${msgId}/reaction`, { reaction: emoji }); } catch (e) { }
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!newText.trim()) return;
    try {
      await api.put(`/chat/messages/${messageId}`, { message: newText });
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { 
          ...m, 
          text: newText, 
          content: newText, 
          isEdited: true,
          edited_at: new Date().toISOString()
        } : m
      ));
      setEditingMessageId(null); setEditText('');
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          type: 'message_edited', 
          message_id: messageId, 
          session_id: sessionId, 
          new_message: newText 
        }));
      }
    } catch (e) { console.error('Edit failed:', e); }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/chat/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setMessageMenu(null);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          type: 'message_deleted', 
          message_id: messageId, 
          session_id: sessionId 
        }));
      }
    } catch (e) { console.error('Delete failed:', e); }
  };

  const handleCopyMessage = async (message) => {
    const textToCopy = message?.content || message?.text || message?.imageUrl || message?.fileData?.url || message?.voiceUrl || '';
    if (!textToCopy) return;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (fallbackErr) {
        console.error('Copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
    setMessageMenu(null);
  };

  const handleOpenViewer = (imageUrl = null, fileData = null, messageId = null) => {
    if (imageUrl) {
      setImagePreview({ open: true, url: imageUrl });
    } else {
      setViewer({ open: true, imageUrl: imageUrl || '', fileData, messageId });
    }
  };

  const handleCloseViewer = () => {
    setViewer({ open: false, imageUrl: '', fileData: null, messageId: null });
  };

  const handleDownloadMedia = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = downloadUrl;
      let fileName = url.split("/").pop()?.split("?")[0] || `chat-file-${Date.now()}`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleImageError = (messageId) => {
    setImageErrors(prev => ({ ...prev, [messageId]: true }));
  };

  const retryImageLoad = (messageId) => {
    setImageErrors(prev => ({ ...prev, [messageId]: false }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); 
    const formData = new FormData(); 
    formData.append('file', file); 
    formData.append('session_id', sessionId); 
    formData.append('is_admin', 'false');
    try {
      const res = await api.post('/chat/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { 
        id: res.data.id, 
        from: 'user', 
        type: 'image', 
        imageUrl: res.data.url, 
        content: res.data.url,
        text: '', 
        time,
        reactions: [],
        is_read: false,
        created_at: new Date().toISOString()
      }]);
    } catch (e) { } finally { setUploading(false); if (imageInputRef.current) imageInputRef.current.value = ''; }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); 
    const formData = new FormData(); 
    formData.append('file', file); 
    formData.append('session_id', sessionId); 
    formData.append('is_admin', 'false');
    try {
      const res = await api.post('/chat/upload/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fi = { name: res.data.name || file.name, size: res.data.size || file.size, url: res.data.url };
      setMessages(prev => [...prev, { 
        id: res.data.id, 
        from: 'user', 
        type: 'file', 
        fileData: fi, 
        content: fi.url,
        text: '', 
        time,
        reactions: [],
        is_read: false,
        created_at: new Date().toISOString()
      }]);
    } catch (e) { } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream); const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        clearInterval(recordingTimerRef.current);
        const finalDuration = recordingTime;
        const blob = new Blob(chunks, { type: 'audio/webm' }); if (blob.size === 0) { setIsRecording(false); setRecordingTime(0); return; }
        const fd = new FormData(); 
        fd.append('file', blob, `voice_${Date.now()}.webm`); 
        fd.append('session_id', sessionId); 
        fd.append('duration', String(finalDuration)); 
        fd.append('is_admin', 'false');
        try {
          const res = await api.post('/chat/upload/voice', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setMessages(prev => [...prev, { 
            id: res.data.id, 
            from: 'user', 
            type: 'voice', 
            voiceUrl: res.data.url, 
            content: res.data.url,
            voiceDuration: res.data.duration || finalDuration, 
            text: '', 
            time,
            reactions: [],
            is_read: false,
            created_at: new Date().toISOString()
          }]);
        } catch (e) { }
        setIsRecording(false); setRecordingTime(0);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mediaRecorderRef.current = mr; setIsRecording(true); setRecordingTime(0);
      let s = 0;
      recordingTimerRef.current = setInterval(() => {
        s++;
        setRecordingTime(s);
      }, 1000);
    } catch (e) { alert('Please allow microphone access'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); clearInterval(recordingTimerRef.current); setIsRecording(false); setRecordingTime(0); }
  };

  const playVoice = (url, id) => {
    if (playingAudio === id) { audioRef.current.pause(); setPlayingAudio(null); return; }
    audioRef.current.src = url; audioRef.current.play(); setPlayingAudio(id);
    audioRef.current.onended = () => setPlayingAudio(null);
  };

  const quick = ['📦 Track order', '💰 Payment help', '🔄 Returns', '📱 Product question'];

  const handleDrawerOpen = () => {
    setIsDrawerOpen(true);
    setUnreadCount(0);
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setOpen(false);
    setIsAdminTyping(false);
  };

  // Render message content based on type
  const renderMessageContent = (m) => {
    const isMine = m.from === 'user';
    
    switch (m.type) {
      case 'image':
        return renderImageContent(m, isMine);
      case 'voice':
        return renderVoiceContent(m, isMine);
      case 'file':
        return renderFileContent(m, isMine);
      case 'text':
      default:
        return renderTextContent(m, isMine);
    }
  };

  const renderTextContent = (m, isMine) => (
    <Box
      sx={{
        bgcolor: isMine ? 'primary.main' : 'white',
        p: 2,
        borderRadius: 3,
        boxShadow: 1,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: isMine ? 'white' : 'text.primary',
          wordBreak: 'break-word',
          transition: 'all 0.2s',
          textAlign: isMine ? 'right' : 'left',
          fontSize: { xs: '0.8rem', sm: '0.9rem' }
        }}
      >
        {m.text}
      </Typography>
      {m.isEdited && (
        <Typography
          component="span"
          variant="caption"
          sx={{
            opacity: 0.7,
            fontSize: '0.55rem',
            ml: 0.5,
            color: isMine ? 'white' : 'text.secondary'
          }}
        >
          (edited)
        </Typography>
      )}
    </Box>
  );

  const renderImageContent = (m, isMine) => (
    <Box sx={{ mb: 1, position: 'relative' }}>
      {imageErrors[m.id] ? (
        <Box
          sx={{
            width: '100%',
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'primary.main',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <ImageIcon sx={{ color: 'grey.400', fontSize: 40 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            Failed to load image
          </Typography>
          <Button size="small" variant="outlined" onClick={() => retryImageLoad(m.id)}>
            Retry
          </Button>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              maxWidth: { xs: 180, sm: 200 },
              borderRadius: '12px',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              position: 'relative',
              '&:hover .image-actions': { opacity: 1 },
              '&:hover': { opacity: 0.9 }
            }}
            onClick={() => handleOpenViewer(m.imageUrl, null, m.id)}
          >
            <img
              src={m.imageUrl}
              alt="📷 Photo"
              onError={() => handleImageError(m.id)}
              style={{
                width: '100%',
                display: 'block',
                maxHeight: 200,
                objectFit: 'cover',
              }}
            />
            
            <Box
              className="image-actions"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 0.5,
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenViewer(m.imageUrl, null, m.id);
                }}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
                }}
              >
                <RemoveRedEye fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadMedia(m.imageUrl);
                }}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
                }}
              >
                <SaveAlt fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#65676b', opacity: 0.8, fontSize: '0.65rem' }}>
            📷 Photo
          </Typography>
        </>
      )}
    </Box>
  );

  const renderVoiceContent = (m, isMine) => (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        px: { xs: 1, sm: 1.5 },
        py: { xs: 0.5, sm: 0.8 },
        borderRadius: '18px',
        bgcolor: isMine ? 'primary.main' : '#ffffff',
        minWidth: { xs: 160, sm: 180 },
        maxWidth: { xs: 220, sm: 260 }
      }}
    >
      <IconButton
        size="small"
        onClick={() => playVoice(m.voiceUrl, m.id)}
        sx={{
          width: { xs: 28, sm: 32 },
          height: { xs: 28, sm: 32 },
          bgcolor: 'white',
          color: 'primary.main',
          '&:hover': { bgcolor: 'grey.100' },
          flexShrink: 0
        }}
      >
        {playingAudio === m.id ?
          <Pause sx={{ fontSize: { xs: 12, sm: 14 } }} /> :
          <PlayArrow sx={{ fontSize: { xs: 14, sm: 16 } }} />
        }
      </IconButton>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.2 }}>
        {[0.8, 1, 0.6, 1.2, 0.7, 0.9, 1.1, 0.5, 0.9, 0.7, 1, 0.6, 0.8, 1, 0.5].map((h, i) => (
          <Box key={i} sx={{
            width: { xs: 1.5, sm: 2 },
            height: `${h * 16}px`,
            borderRadius: 1,
            bgcolor: isMine ? 'white' : 'primary.main',
            opacity: playingAudio === m.id ? 1 : 0.6
          }} />
        ))}
      </Box>
      {m.voiceDuration > 0 && (
        <Typography variant="caption" sx={{
          color: isMine ? 'white' : '#65676b',
          fontSize: { xs: '0.6rem', sm: '0.65rem' },
          fontWeight: 500,
          minWidth: 28,
          textAlign: 'right'
        }}>
          0:{String(m.voiceDuration).padStart(2, '0')}
        </Typography>
      )}
    </Stack>
  );

  const renderFileContent = (m, isMine) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1,
        bgcolor: isMine ? 'primary.main' : 'grey.300',
        color: isMine ? 'white' : 'black',
        borderRadius: 2,
        cursor: 'pointer',
        maxWidth: { xs: 200, sm: 400 },
      }}
      onClick={() => {
        if (m.fileData?.url) {
          window.open(m.fileData.url, '_blank');
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'white',
          padding: 1,
          borderRadius: '50%',
          width: 40,
          height: 40,
          mr: 0.5
        }}
      >
        <InsertDriveFile sx={{ color: isMine ? 'primary.main' : 'grey' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          fontSize={{ xs: '0.7rem', sm: '0.8rem' }}
          noWrap
          sx={{
            color: isMine ? 'white' : '#1a1a1a',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          {m.fileData?.name || '📎 File'}
        </Typography>
        <Typography
          variant="caption"
          fontSize={{ xs: '0.55rem', sm: '0.65rem' }}
          sx={{ color: isMine ? 'white' : '#65676b', opacity: isMine ? 0.8 : 1 }}
        >
          {m.fileData?.size ? `${Math.round(m.fileData.size / 1024)} KB` : 'File'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <Fab 
        color="primary" 
        onClick={handleDrawerOpen} 
        sx={{ 
          position: 'fixed', 
          bottom: { xs: 16, sm: 24 }, 
          right: { xs: 16, sm: 24 }, 
          bgcolor: '#0084ff', 
          zIndex: 1000, 
          boxShadow: '0 4px 20px rgba(0,132,255,0.4)', 
          width: { xs: 48, sm: 56 }, 
          height: { xs: 48, sm: 56 }, 
          '&:hover': { bgcolor: '#0066cc' } 
        }}
      >
        <Badge 
          badgeContent={unreadCount} 
          color="error" 
          max={99}
          sx={{ 
            '& .MuiBadge-badge': { 
              fontSize: { xs: '0.6rem', sm: '0.7rem' },
              height: { xs: 18, sm: 20 },
              minWidth: { xs: 18, sm: 20 },
              right: -4,
              top: -4,
              backgroundColor: '#ef4444',
              color: 'white',
              fontWeight: 'bold'
            } 
          }}
        >
          <ChatIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
        </Badge>
      </Fab>

      <Drawer 
        anchor="right" 
        open={open} 
        onClose={handleDrawerClose} 
        PaperProps={{ 
          sx: { 
            width: { xs: '100%', sm: 420 }, 
            borderTopLeftRadius: { xs: 0, sm: 16 }, 
            borderBottomLeftRadius: { xs: 0, sm: 16 } 
          } 
        }}
      >
        {/* Header */}
        <Box sx={{ bgcolor: '#0084ff', color: 'white', p: { xs: 1.5, sm: 2 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: 'white', color: '#0084ff', width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}>
                <SupportAgent sx={{ fontSize: { xs: 20, sm: 24 } }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} fontSize={{ xs: '0.9rem', sm: '1rem' }}>
                  TeleShop Support
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: connected ? '#22c55e' : '#ef4444' }} />
                  <Typography variant="caption">
                    {connected ? 'Online' : 'Offline'}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
            <IconButton onClick={handleDrawerClose} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Stack>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f0f2f5' }}>
          <Stack spacing={1}>
            {messages.map((m, i) => {
              const isMine = m.from === 'user';
              
              return (
                <Box
                  key={m.id || i}
                  sx={{
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-end',
                    mb: 1,
                    position: 'relative',
                    '&:hover .msg-actions': { opacity: 1, visibility: 'visible' }
                  }}
                >
                  {(m.from === 'support' || m.from === 'admin') && (
                    <Avatar sx={{
                      width: 32,
                      height: 32,
                      mr: 1,
                      mt: 'auto',
                      bgcolor: m.from === 'admin' ? '#42b72a' : '#0084ff',
                      flexShrink: 0,
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                    }}>
                      {m.adminName ? m.adminName.charAt(0).toUpperCase() : <SupportAgent sx={{ fontSize: 16 }} />}
                    </Avatar>
                  )}
                  
                  <Box sx={{ maxWidth: '70%', position: 'relative' }}>
                    {!isMine && m.adminName && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 'bold',
                          mr: 1,
                          ml: 1,
                          mb: 0.5,
                          display: 'block'
                        }}
                      >
                        {m.adminName}
                      </Typography>
                    )}

                    {/* Message Actions */}
                    <Box className="msg-actions" sx={{
                      position: 'absolute',
                      top: -36,
                      right: isMine ? 0 : 'auto',
                      left: !isMine ? 0 : 'auto',
                      opacity: 0,
                      visibility: 'hidden',
                      transition: 'opacity 0.2s ease, visibility 0.2s ease',
                      bgcolor: 'white',
                      borderRadius: '20px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                      px: 0.5,
                      py: 0.3,
                      display: 'flex',
                      zIndex: 10,
                      alignItems: 'center',
                      border: '1px solid #e4e6eb',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                    }}>
                      {QUICK_REACTIONS.map(r => (
                        <IconButton
                          key={r}
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleReaction(m.id, r); }}
                          sx={{
                            p: 0.3,
                            '&:hover': { transform: 'scale(1.4)', bgcolor: '#f0f2f5' },
                            bgcolor: m.my_reaction === r ? 'primary.main' : 'transparent',
                          }}
                        >
                          <Typography sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }}>{r}</Typography>
                        </IconButton>
                      ))}
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === m.id ? null : m.id); }}
                        sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}
                      >
                        <InsertEmoticon sx={{ fontSize: { xs: 14, sm: 16 }, color: '#65676b' }} />
                      </IconButton>
                      {isMine && (
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); setSelectedMessage(m); setMessageMenu(e.currentTarget); }}
                          sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}
                        >
                          <MoreHoriz sx={{ fontSize: { xs: 14, sm: 16 }, color: '#65676b' }} />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleCopyMessage(m); }}
                        sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}
                      >
                        <ContentCopy sx={{ fontSize: { xs: 12, sm: 14 }, color: '#65676b' }} />
                      </IconButton>
                    </Box>

                    {/* Emoji Picker */}
                    {emojiPickerId === m.id && (
                      <Box sx={{ position: 'absolute', bottom: 40, right: 0, zIndex: 1000 }}>
                        <Box sx={{ position: 'relative' }}>
                          <EmojiPicker
                            onEmojiClick={(emojiData) => { handleReaction(m.id, emojiData.emoji); }}
                            emojiStyle={EmojiStyle.NATIVE}
                            theme={Theme.LIGHT}
                            width={isMobile ? 280 : 320}
                            height={350}
                            lazyLoadEmojis={true}
                            previewConfig={{ showPreview: false }}
                            skinTonesDisabled={true}
                          />
                          <IconButton
                            size="small"
                            onClick={() => setEmojiPickerId(null)}
                            sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'white' }}
                          >
                            <Close sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    )}

                    {/* Message Content */}
                    {editingMessageId === m.id ? (
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                      }}>
                        <TextField
                          size="small"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          multiline
                          maxRows={4}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              handleEditMessage(m.id, editText);
                            } else if (e.key === 'Escape') {
                              setEditingMessageId(null);
                              setEditText('');
                            }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.95rem',
                              borderRadius: 2,
                              bgcolor: 'grey.50',
                            },
                          }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button
                            size="small"
                            onClick={() => { setEditingMessageId(null); setEditText(''); }}
                            color="inherit"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleEditMessage(m.id, editText)}
                          >
                            Save
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <Box>
                        {renderMessageContent(m)}
                      </Box>
                    )}

                    {/* Reactions Display */}
                    {m.reactions?.length > 0 && (
                      <Box sx={{
                        display: 'flex',
                        gap: 0.5,
                        mt: 0.5,
                        flexWrap: 'wrap',
                        justifyContent: isMine ? 'flex-end' : 'flex-start'
                      }}>
                        {m.reactions.map((reaction, idx) => {
                          const reactedByMe = m.my_reaction === reaction.emoji;
                          return (
                            <Tooltip
                              key={`${reaction.emoji}-${idx}`}
                              title={
                                reactedByMe
                                  ? reaction.count > 1
                                    ? `You and ${reaction.count - 1} others`
                                    : `You reacted`
                                  : `${reaction.count} reactions`
                              }
                            >
                              <Chip
                                label={`${reaction.emoji} ${reaction.count}`}
                                size="small"
                                color={reactedByMe ? "primary" : "default"}
                                variant={reactedByMe ? "filled" : "outlined"}
                                onClick={() => handleReaction(m.id, reaction.emoji)}
                                sx={{
                                  height: 22,
                                  fontSize: '0.7rem',
                                  fontWeight: reactedByMe ? 600 : 400,
                                  cursor: 'pointer',
                                }}
                              />
                            </Tooltip>
                          );
                        })}
                      </Box>
                    )}

                    {/* Time and Status */}
                    <Box sx={{
                      display: 'flex',
                      justifyContent: isMine ? 'flex-end' : 'flex-start',
                      alignItems: 'center',
                      mt: 0.5,
                      gap: 0.5,
                    }}>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          fontSize: '0.7rem',
                          lineHeight: 1,
                          color: 'text.secondary',
                        }}
                      >
                        {m.isEdited && m.edited_at !== m.created_at && 'edited '}
                        {m.time}
                      </Typography>
                      {isMine && (
                        m.is_read ? (
                          <DoneAll sx={{ color: 'primary.main', fontSize: 16 }} />
                        ) : (
                          <Done sx={{ color: 'text.secondary', fontSize: 16 }} />
                        )
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}

            {/* Typing Indicator */}
            {isAdminTyping && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1, mt: 1 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: '#42b72a' }}>
                  <SupportAgent sx={{ fontSize: 14 }} />
                </Avatar>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: '#e4e6eb',
                  px: 2,
                  py: 1,
                  borderRadius: 2
                }}>
                  <Typography variant="caption" color="text.secondary">Admin is typing</Typography>
                  <Box sx={{ display: 'flex', gap: 0.3 }}>
                    <Box sx={{
                      width: 4,
                      height: 4,
                      bgcolor: '#65676b',
                      borderRadius: '50%',
                      animation: 'typingBounce 1.4s infinite',
                      animationDelay: '0s'
                    }} />
                    <Box sx={{
                      width: 4,
                      height: 4,
                      bgcolor: '#65676b',
                      borderRadius: '50%',
                      animation: 'typingBounce 1.4s infinite',
                      animationDelay: '0.2s'
                    }} />
                    <Box sx={{
                      width: 4,
                      height: 4,
                      bgcolor: '#65676b',
                      borderRadius: '50%',
                      animation: 'typingBounce 1.4s infinite',
                      animationDelay: '0.4s'
                    }} />
                  </Box>
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Stack>

          {/* Quick Replies */}
          <Stack direction="row" flexWrap="wrap" gap={0.5} mt={2}>
            {quick.map(q => (
              <Chip
                key={q}
                label={q}
                size="small"
                onClick={() => { setInput(q); setTimeout(send, 100); }}
                sx={{
                  cursor: 'pointer',
                  bgcolor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': { bgcolor: '#e7f3ff' },
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  height: { xs: 28, sm: 32 }
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Input Area */}
        <Box sx={{ p: { xs: 1.5, sm: 2 }, borderTop: '1px solid #e2e8f0', bgcolor: 'white' }}>
          {isRecording && (
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Chip
                icon={<Circle sx={{ fontSize: 8, color: '#ef4444' }} />}
                label={`Recording ${recordingTime}s`}
                color="error"
                size="small"
                onDelete={stopRecording}
              />
            </Box>
          )}
          <Stack direction="row" spacing={0.5} alignItems="flex-end">
            <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} />
            <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
            <IconButton
              size="small"
              onClick={() => imageInputRef.current?.click()}
              sx={{ color: '#65676b', p: { xs: 0.5, sm: 1 } }}
            >
              <Image fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              sx={{ color: '#65676b', p: { xs: 0.5, sm: 1 } }}
            >
              <AttachFile fontSize="small" />
            </IconButton>
            <Box sx={{ flex: 1, bgcolor: '#f0f2f5', borderRadius: 50, px: { xs: 1.5, sm: 2 }, py: 0.3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Aa..."
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (e.target.value.length > 0) {
                    handleTyping(true);
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      handleTyping(false);
                    }, 2000);
                  } else {
                    handleTyping(false);
                  }
                }}
                onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
                variant="standard"
                multiline
                maxRows={4}
                InputProps={{
                  disableUnderline: true,
                  sx: { fontSize: { xs: '0.8rem', sm: '0.85rem' } }
                }}
              />
            </Box>
            {input.trim() ? (
              <IconButton
                onClick={send}
                sx={{
                  bgcolor: '#0084ff',
                  color: 'white',
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  '&:hover': { bgcolor: '#0066cc' }
                }}
              >
                <Send fontSize="small" />
              </IconButton>
            ) : (
              <IconButton
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                sx={{ color: '#0084ff', p: { xs: 0.5, sm: 1 } }}
              >
                {isRecording ? <Stop sx={{ color: '#ef4444' }} /> : <Mic />}
              </IconButton>
            )}
          </Stack>
        </Box>
      </Drawer>

      {/* Message Menu */}
      <Menu
        anchorEl={messageMenu}
        open={Boolean(messageMenu)}
        onClose={() => setMessageMenu(null)}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            overflow: "visible",
            mt: -10,
            position: "relative",
            width: 200
          },
        }}
      >
        {selectedMessage?.type === 'text' && (
          <MenuItem onClick={() => {
            setEditingMessageId(selectedMessage?.id);
            setEditText(selectedMessage?.text || '');
            setMessageMenu(null);
          }}>
            <Edit sx={{ mr: 1.5, fontSize: 18 }} /> Edit
          </MenuItem>
        )}
        <MenuItem onClick={() => handleCopyMessage(selectedMessage)}>
          <ContentCopy sx={{ mr: 1.5, fontSize: 18 }} /> Copy
        </MenuItem>
        {['image', 'file'].includes(selectedMessage?.type) && (
          <MenuItem onClick={() => {
            const url = selectedMessage?.imageUrl || selectedMessage?.fileData?.url;
            if (url) handleDownloadMedia(url);
            setMessageMenu(null);
          }}>
            <SaveAlt sx={{ mr: 1.5, fontSize: 18 }} /> Download
          </MenuItem>
        )}
        <MenuItem
          onClick={() => handleDeleteMessage(selectedMessage?.id)}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1.5, fontSize: 18 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Image Preview Dialog */}
      <Dialog
        open={imagePreview.open}
        onClose={() => setImagePreview({ open: false, url: '' })}
        maxWidth="lg"
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.9)',
            maxHeight: '90vh',
            maxWidth: '90vw',
          }
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setImagePreview({ open: false, url: '' })}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              zIndex: 1
            }}
          >
            <Close />
          </IconButton>
          <img
            src={imagePreview.url}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '85vh',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto'
            }}
          />
        </DialogContent>
      </Dialog>

      {/* File Viewer */}
      <FileViewer
        open={viewer.open}
        imageUrl={viewer.imageUrl}
        fileData={viewer.fileData}
        messageId={viewer.messageId}
        onClose={handleCloseViewer}
      />

      {/* CSS Animation */}
      <style>
        {`
          @keyframes typingBounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-6px); }
          }
          .image-actions {
            opacity: 0;
            transition: opacity 0.2s;
          }
        `}
      </style>
    </>
  );
};

export default ChatSupport;