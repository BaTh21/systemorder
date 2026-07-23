// src/components/chat/ChatSupport.jsx
import { useState, useEffect, useRef } from 'react';
import {
  Box, Fab, Drawer, Typography, TextField, Stack, IconButton,
  Avatar, Paper, Chip, useMediaQuery, useTheme, Menu, MenuItem,
} from '@mui/material';
import {
  Chat as ChatIcon, Close, Send, Telegram,
  SupportAgent, Phone, Image, AttachFile, Mic, Stop,
  PlayArrow, Pause, Circle, Edit, Delete, MoreHoriz,
  InsertEmoticon, ContentCopy,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';

const getWsUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  
  // Check if we're in production (Render) or local development
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

  // Session ID based on user
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

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('access_token');

  const customerName = getCustomerDisplayName(user);
  const customerEmail = getCustomerEmail(user);

  // Update session when user changes
  useEffect(() => {
    if (user?.id) {
      setSessionId(`user_${user.id}`);
      localStorage.removeItem('chat_guest_session');
    }
  }, [user?.id]);

  // Connect WebSocket
  useEffect(() => {
    if (!token) return;

    const wsUrl = `${getWsUrl()}/ws/customer/${token}`;
    console.log('🔗 Customer connecting:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Customer WS connected');
      setConnected(true);

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
        console.log('📨 Customer received:', d.type);

        if (d.type === 'session_deleted') {
          setMessages(prev => [...prev, {
            id: 'system_' + Date.now(),
            from: 'support',
            text: '🔒 This chat session has been ended by the admin. You can start a new conversation if you need further assistance.',
            type: 'text',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);

          // Clear the session ID so a new one will be created
          localStorage.removeItem('chat_guest_session');

          // Generate new session ID
          const newSessionId = user?.id ? `user_${user.id}` : 'guest_' + Date.now();
          setSessionId(newSessionId);
        }
        if (d.type === 'admin_reply') {
          setMessages(prev => {
            if (d.message_id && prev.find(m => m.id === d.message_id)) return prev;
            return [...prev, {
              id: d.message_id || ('admin_' + Date.now()),
              from: 'admin',
              text: d.message,
              type: d.message_type || 'text',
              imageUrl: d.image_url || null,
              fileData: d.file_data || null,
              voiceUrl: d.voice_url || null,
              voiceDuration: d.voice_duration || 0,
              time: d.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              adminName: d.admin_name,
              isEdited: false,
              reaction: null
            }];
          });
        }
        else if (d.type === 'message_sent') {
          setMessages(prev => {
            if (d.message_id && prev.find(m => m.id === d.message_id)) return prev;
            return [...prev, {
              id: d.message_id,
              from: 'user',
              text: d.message,
              type: d.message_type || 'text',
              time: d.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isEdited: false,
              reaction: null
            }];
          });
        }
        else if (d.type === 'message_edited') {
          setMessages(prev => prev.map(m =>
            m.id === d.message_id ? { ...m, text: d.new_message, isEdited: true } : m
          ));
        }
        else if (d.type === 'message_deleted') {
          setMessages(prev => prev.filter(m => m.id !== d.message_id));
        }
        else if (d.type === 'message_reaction') {
          setMessages(prev => prev.map(m =>
            m.id === d.message_id ? { ...m, reaction: d.reaction || null } : m
          ));
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onclose = () => { console.log('🔌 Customer WS closed'); setConnected(false); };
    ws.onerror = (e) => console.error('WS error:', e);

    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, [token, sessionId]);

  useEffect(() => {
    if (open) loadHistory();
  }, [open, sessionId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await api.get(`/chat/messages/${sessionId}`);
      if (res.data?.length) {
        setMessages(res.data.map(m => {
          const msgType = m.message_type || 'text';
          let imageUrl = null, fileData = null, voiceUrl = null, voiceDuration = 0;
          if (msgType === 'image') imageUrl = m.message;
          else if (msgType === 'file') { try { fileData = JSON.parse(m.message); } catch { fileData = { url: m.message, name: 'File', size: 0 }; } }
          else if (msgType === 'voice') { try { const vd = JSON.parse(m.message); voiceUrl = vd.url; voiceDuration = vd.duration || 0; } catch { voiceUrl = m.message; } }
          return {
            id: m.id, from: m.is_admin_reply ? 'admin' : 'user', text: m.message, type: msgType,
            imageUrl, fileData, voiceUrl, voiceDuration,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            adminName: m.is_admin_reply ? m.sender_name : null,
            isEdited: m.is_edited || false, reaction: m.reaction || null,
          };
        }));
      } else {
        setMessages([{ id: 'welcome', from: 'support', text: '👋 Welcome! How can we help you?', type: 'text', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      }
    } catch {
      setMessages([{ id: 'welcome', from: 'support', text: '👋 Welcome! How can we help you?', type: 'text', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const txt = input; setInput('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        message: txt, sender_name: customerName, sender_email: customerEmail,
        session_id: sessionId, type: 'text', timestamp: time
      }));
    } else {
      try {
        const res = await api.post('/chat/send', { message: txt, sender_name: customerName, sender_email: customerEmail, session_id: sessionId });
        setMessages(prev => [...prev, { id: res.data.id, from: 'user', text: txt, type: 'text', time, isEdited: false, reaction: null }]);
      } catch (e) { console.error('Send failed:', e); }
    }
  };

  const handleReaction = async (msgId, emoji) => {
    const currentMsg = messages.find(m => m.id === msgId);
    const newReaction = currentMsg?.reaction === emoji ? null : emoji;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reaction: newReaction } : m));
    setEmojiPickerId(null);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message_reaction', message_id: msgId, session_id: sessionId, reaction: newReaction, sender_name: customerName }));
    } else {
      try { await api.post(`/chat/messages/${msgId}/reaction`, { reaction: emoji }); } catch (e) { }
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!newText.trim()) return;
    try {
      await api.put(`/chat/messages/${messageId}`, { message: newText });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: newText, isEdited: true } : m));
      setEditingMessageId(null); setEditText('');
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'message_edited', message_id: messageId, session_id: sessionId, new_message: newText }));
      }
    } catch (e) { console.error('Edit failed:', e); }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/chat/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setMessageMenu(null);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'message_deleted', message_id: messageId, session_id: sessionId }));
      }
    } catch (e) { console.error('Delete failed:', e); }
  };

  const handleCopyText = (text) => { if (text) { navigator.clipboard.writeText(text); setMessageMenu(null); } };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); const formData = new FormData(); formData.append('file', file); formData.append('session_id', sessionId); formData.append('is_admin', 'false');
    try {
      const res = await api.post('/chat/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { id: res.data.id, from: 'user', type: 'image', imageUrl: res.data.url, time }]);
    } catch (e) { } finally { setUploading(false); if (imageInputRef.current) imageInputRef.current.value = ''; }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); const formData = new FormData(); formData.append('file', file); formData.append('session_id', sessionId); formData.append('is_admin', 'false');
    try {
      const res = await api.post('/chat/upload/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fi = { name: res.data.name || file.name, size: res.data.size || file.size, url: res.data.url };
      setMessages(prev => [...prev, { id: res.data.id, from: 'user', type: 'file', fileData: fi, time }]);
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
        const fd = new FormData(); fd.append('file', blob, `voice_${Date.now()}.webm`); fd.append('session_id', sessionId); fd.append('duration', String(finalDuration)); fd.append('is_admin', 'false');
        try {
          const res = await api.post('/chat/upload/voice', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setMessages(prev => [...prev, { id: res.data.id, from: 'user', type: 'voice', voiceUrl: res.data.url, voiceDuration: res.data.duration || finalDuration, time }]);
        } catch (e) { }
        setIsRecording(false); setRecordingTime(0);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mediaRecorderRef.current = mr; setIsRecording(true); setRecordingTime(0);
      let s = 0; recordingTimerRef.current = setInterval(() => { s++; setRecordingTime(s); }, 1000);
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

  return (<>
    <Fab color="primary" onClick={() => setOpen(true)} sx={{ position: 'fixed', bottom: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 }, bgcolor: '#0084ff', zIndex: 1000, boxShadow: '0 4px 20px rgba(0,132,255,0.4)', width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 }, '&:hover': { bgcolor: '#0066cc' } }}><ChatIcon sx={{ fontSize: { xs: 22, sm: 26 } }} /></Fab>

    <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, borderTopLeftRadius: { xs: 0, sm: 16 }, borderBottomLeftRadius: { xs: 0, sm: 16 } } }}>
      <Box sx={{ bgcolor: '#0084ff', color: 'white', p: { xs: 1.5, sm: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'white', color: '#0084ff', width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}><SupportAgent sx={{ fontSize: { xs: 20, sm: 24 } }} /></Avatar>
            <Box><Typography variant="subtitle1" fontWeight={700} fontSize={{ xs: '0.9rem', sm: '1rem' }}>TeleShop Support</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center"><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: connected ? '#22c55e' : '#ef4444' }} /><Typography variant="caption">{connected ? 'Online' : 'Offline'}</Typography></Stack></Box>
          </Stack>
          <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}><Close /></IconButton>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f0f2f5' }}>
        <Stack spacing={1}>
          {messages.map((m, i) => (
            <Box key={m.id || i} className="message-group" sx={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', position: 'relative', '&:hover .msg-actions': { opacity: 1, visibility: 'visible' } }}>
              {(m.from === 'support' || m.from === 'admin') && <Avatar sx={{ width: 28, height: 28, mr: 0.5, bgcolor: m.from === 'admin' ? '#42b72a' : '#0084ff', flexShrink: 0 }}><SupportAgent sx={{ fontSize: 16 }} /></Avatar>}
              <Box sx={{ maxWidth: '85%', position: 'relative' }}>

                {/* Message Actions */}
                <Box className="msg-actions" sx={{ position: 'absolute', top: -36, right: m.from === 'user' ? 0 : 'auto', left: m.from !== 'user' ? 0 : 'auto', opacity: 0, visibility: 'hidden', transition: 'opacity 0.2s ease, visibility 0.2s ease', bgcolor: 'white', borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', px: 0.5, py: 0.3, display: 'flex', zIndex: 10, alignItems: 'center', border: '1px solid #e4e6eb' }}>
                  {QUICK_REACTIONS.map(r => (<IconButton key={r} size="small" onClick={(e) => { e.stopPropagation(); handleReaction(m.id, r); }} sx={{ p: 0.3, '&:hover': { transform: 'scale(1.4)', bgcolor: '#f0f2f5' } }}><Typography sx={{ fontSize: '1rem' }}>{r}</Typography></IconButton>))}
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === m.id ? null : m.id); }} sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}><InsertEmoticon sx={{ fontSize: 16, color: '#65676b' }} /></IconButton>
                  {m.from === 'user' && <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedMessage(m); setMessageMenu(e.currentTarget); }} sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}><MoreHoriz sx={{ fontSize: 16, color: '#65676b' }} /></IconButton>}
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); if (m.type === 'text') handleCopyText(m.text); else if (m.type === 'image') handleCopyText(m.imageUrl); else if (m.type === 'file' && m.fileData) handleCopyText(m.fileData.url); else if (m.type === 'voice' && m.voiceUrl) handleCopyText(m.voiceUrl); }} sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}><ContentCopy sx={{ fontSize: 14, color: '#65676b' }} /></IconButton>
                </Box>

                {emojiPickerId === m.id && (
                  <Box sx={{ position: 'absolute', bottom: 40, right: 0, zIndex: 1000 }}>
                    <Box sx={{ position: 'relative' }}>
                      <EmojiPicker onEmojiClick={(emojiData) => { handleReaction(m.id, emojiData.emoji); }} emojiStyle={EmojiStyle.NATIVE} theme={Theme.LIGHT} width={isMobile ? 280 : 320} height={350} lazyLoadEmojis={true} previewConfig={{ showPreview: false }} skinTonesDisabled={true} />
                      <IconButton size="small" onClick={() => setEmojiPickerId(null)} sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'white' }}><Close sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                  </Box>
                )}

                {/* Message Bubble */}
                <Box sx={{ px: m.type === 'text' ? 1.5 : 0, py: m.type === 'text' ? 1 : 0, borderRadius: m.type === 'text' ? '18px 18px 4px 18px' : '12px', bgcolor: m.type === 'text' ? ((m.from === 'admin' || m.from === 'user') ? '#0084ff' : '#e4e6eb') : 'transparent', color: m.type === 'text' ? ((m.from === 'admin' || m.from === 'user') ? 'white' : '#050505') : 'inherit', display: 'inline-block', maxWidth: '100%', overflow: 'visible', position: 'relative' }}>
                  {editingMessageId === m.id ? (
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', p: 0.5 }}>
                      <TextField size="small" value={editText} onChange={e => setEditText(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') { handleEditMessage(m.id, editText); } }} autoFocus variant="standard" InputProps={{ disableUnderline: true, sx: { fontSize: '0.8rem', color: 'white', '& .MuiInputBase-input': { color: 'white' } } }} />
                      <IconButton size="small" onClick={() => handleEditMessage(m.id, editText)} sx={{ color: 'white' }}><Send sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" onClick={() => setEditingMessageId(null)} sx={{ color: 'white' }}><Close sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                  ) : (
                    <>
                      {m.type === 'text' && <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{m.text}{m.isEdited && <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.7, ml: 0.5 }}>(edited)</Typography>}</Typography>}
                      {m.type === 'image' && <Box sx={{ position: 'relative' }}><Box sx={{ maxWidth: 200, borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', '&:hover': { opacity: 0.95 } }} onClick={() => window.open(m.imageUrl, '_blank')}><img src={m.imageUrl} alt="📷 Photo" style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} /></Box><Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#65676b', opacity: 0.8, fontSize: '0.7rem' }}>📷 Photo</Typography></Box>}
                      {m.type === 'file' && m.fileData && <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', bgcolor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e4e6eb', '&:hover': { bgcolor: '#f8fafc', borderColor: '#0084ff' } }} onClick={() => window.open(m.fileData.url, '_blank')}><Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AttachFile sx={{ color: '#0084ff', fontSize: 22 }} /></Box><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={600} fontSize="0.8rem" noWrap sx={{ color: '#1a1a1a' }}>{m.fileData.name || '📎 File'}</Typography><Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.3 }}><Typography variant="caption" color="#65676b" fontSize="0.7rem">{m.fileData.size ? `${Math.round(m.fileData.size / 1024)} KB` : 'File'}</Typography><Typography variant="caption" color="#65676b" fontSize="0.7rem">•</Typography><Typography variant="caption" color="#0084ff" fontSize="0.7rem" fontWeight={500}>📥 Download</Typography></Stack></Box></Paper>}
                      {m.type === 'voice' && <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 0.8, borderRadius: '18px', bgcolor: (m.from === 'admin' || m.from === 'user') ? 'transparent' : '#ffffff', minWidth: 180, maxWidth: 260 }}><IconButton size="small" onClick={() => playVoice(m.voiceUrl, m.id)} sx={{ width: 32, height: 32, bgcolor: '#0084ff', color: 'white', '&:hover': { bgcolor: '#0066cc' }, flexShrink: 0 }}>{playingAudio === m.id ? <Pause sx={{ fontSize: 14 }} /> : <PlayArrow sx={{ fontSize: 16 }} />}</IconButton><Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.2 }}>{[0.8, 1, 0.6, 1.2, 0.7, 0.9, 1.1, 0.5, 0.9, 0.7, 1, 0.6, 0.8, 1, 0.5].map((h, i) => (<Box key={i} sx={{ width: 2, height: `${h * 16}px`, borderRadius: 1, bgcolor: '#0084ff', opacity: playingAudio === m.id ? 1 : 0.6 }} />))}</Box>{m.voiceDuration > 0 && <Typography variant="caption" sx={{ color: '#65676b', fontSize: '0.65rem', fontWeight: 500, minWidth: 28, textAlign: 'right' }}>0:{String(m.voiceDuration).padStart(2, '0')}</Typography>}</Stack>}
                    </>
                  )}
                </Box>

                {m.reaction && <Box sx={{ position: 'absolute', bottom: -14, right: m.from === 'user' ? 4 : 'auto', left: m.from !== 'user' ? 4 : 'auto', zIndex: 5 }}><Chip label={m.reaction} size="small" onClick={() => handleReaction(m.id, m.reaction)} sx={{ height: 22, fontSize: '0.8rem', bgcolor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid #e4e6eb', cursor: 'pointer', '&:hover': { bgcolor: '#f0f2f5' } }} /></Box>}

                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.6rem', mt: 0.2, mx: 0.5, display: 'block', textAlign: m.from === 'user' ? 'right' : 'left' }}>{m.from === 'admin' && m.adminName && `${m.adminName} • `}{m.time}</Typography>
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={0.5} mt={2}>
          {quick.map(q => <Chip key={q} label={q} size="small" onClick={() => { setInput(q); setTimeout(send, 100); }} sx={{ cursor: 'pointer', bgcolor: 'white', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#e7f3ff' } }} />)}
        </Stack>
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', bgcolor: 'white' }}>
        {isRecording && <Box sx={{ textAlign: 'center', mb: 1 }}><Chip icon={<Circle sx={{ fontSize: 8, color: '#ef4444' }} />} label={`Recording ${recordingTime}s`} color="error" size="small" onDelete={stopRecording} /></Box>}
        <Stack direction="row" spacing={0.5} alignItems="flex-end">
          <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} />
          <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
          <IconButton size="small" onClick={() => imageInputRef.current?.click()} sx={{ color: '#65676b' }}><Image fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: '#65676b' }}><AttachFile fontSize="small" /></IconButton>
          <Box sx={{ flex: 1, bgcolor: '#f0f2f5', borderRadius: 50, px: 2, py: 0.3 }}>
            <TextField fullWidth size="small" placeholder="Aa..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} variant="standard" multiline maxRows={4} InputProps={{ disableUnderline: true, sx: { fontSize: '0.85rem' } }} />
          </Box>
          {input.trim() ? <IconButton onClick={send} sx={{ bgcolor: '#0084ff', color: 'white', width: 40, height: 40, '&:hover': { bgcolor: '#0066cc' } }}><Send fontSize="small" /></IconButton> :
            <IconButton onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} sx={{ color: '#0084ff' }}>{isRecording ? <Stop sx={{ color: '#ef4444' }} /> : <Mic />}</IconButton>}
        </Stack>
      </Box>
    </Drawer>

    <Menu anchorEl={messageMenu} open={Boolean(messageMenu)} onClose={() => setMessageMenu(null)}>
      {selectedMessage?.type === 'text' && <MenuItem onClick={() => { setEditingMessageId(selectedMessage?.id); setEditText(selectedMessage?.text || ''); setMessageMenu(null); }}><Edit sx={{ mr: 1, fontSize: 18 }} /> Edit</MenuItem>}
      <MenuItem onClick={() => handleDeleteMessage(selectedMessage?.id)} sx={{ color: '#ef4444' }}><Delete sx={{ mr: 1, fontSize: 18 }} /> Delete</MenuItem>
      <MenuItem onClick={() => { if (selectedMessage?.type === 'text') handleCopyText(selectedMessage?.text); else if (selectedMessage?.type === 'image') handleCopyText(selectedMessage?.imageUrl); else if (selectedMessage?.type === 'file' && selectedMessage?.fileData) handleCopyText(selectedMessage?.fileData.url); else if (selectedMessage?.type === 'voice' && selectedMessage?.voiceUrl) handleCopyText(selectedMessage?.voiceUrl); }}><ContentCopy sx={{ mr: 1, fontSize: 18 }} /> Copy</MenuItem>
    </Menu>
  </>);
};

export default ChatSupport;