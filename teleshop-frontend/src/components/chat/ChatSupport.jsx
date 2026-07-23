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
  return apiUrl.replace('http', 'ws').replace('/api', '');
};

const getCustomerDisplayName = (user) => {
  if (user?.full_name && user.full_name !== 'Guest') return user.full_name;
  const storedName = localStorage.getItem('customer_name');
  if (storedName && storedName !== 'Guest' && storedName !== 'Customer') return storedName;
  return 'Customer';
};

const getCustomerEmail = (user) => {
  if (user?.email) return user.email;
  const storedEmail = localStorage.getItem('customer_email');
  if (storedEmail) return storedEmail;
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
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('chat_session_id');
    if (!id) { id = 'sess_' + Date.now(); localStorage.setItem('chat_session_id', id); }
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

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');

  // Message menu state
  const [messageMenu, setMessageMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Emoji picker state
  const [emojiPickerId, setEmojiPickerId] = useState(null);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('access_token');

  const customerName = getCustomerDisplayName(user);
  const customerEmail = getCustomerEmail(user);

  useEffect(() => {
    if (customerName && customerName !== 'Customer') {
      localStorage.setItem('customer_name', customerName);
    }
    if (customerEmail) {
      localStorage.setItem('customer_email', customerEmail);
    }
  }, [customerName, customerEmail]);

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

      const connectMsg = {
        type: "connect",
        session_id: sessionId,
        sender_name: user?.full_name || customerName,
        sender_email: user?.email || customerEmail,
      };

      if (user?.id) {
        connectMsg.user_id = user.id;
      }

      ws.send(JSON.stringify(connectMsg));
    };

    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        console.log('📨 Customer received:', d.type, d);

        // Handle admin reply
        if (d.type === 'admin_reply') {
          setMessages(prev => {
            // Check for duplicates
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

        // Handle confirmation of OWN sent message
        else if (d.type === 'message_sent') {
          setMessages(prev => {
            // Check for duplicates
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

        // Handle message edits
        else if (d.type === 'message_edited') {
          setMessages(prev => prev.map(m =>
            m.id === d.message_id ? { ...m, text: d.new_message, isEdited: true } : m
          ));
        }

        // Handle message deletions
        else if (d.type === 'message_deleted') {
          setMessages(prev => prev.filter(m => m.id !== d.message_id));
        }

        // Handle reactions
        else if (d.type === 'message_reaction') {
          setMessages(prev => prev.map(m =>
            m.id === d.message_id ? { ...m, reaction: d.reaction } : m
          ));
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onclose = () => {
      console.log('🔌 Customer WS closed');
      setConnected(false);
    };
    ws.onerror = (e) => console.error('WS error:', e);

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [token, sessionId, customerName, customerEmail, user]);

  // Load history when chat opens
  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await api.get(`/chat/messages/${sessionId}`);
      if (res.data?.length) {
        setMessages(res.data.map(m => {
          const msgType = m.message_type || 'text';
          let imageUrl = null;
          let fileData = null;
          let voiceUrl = null;
          let voiceDuration = 0;

          if (msgType === 'image') {
            imageUrl = m.message;
          } else if (msgType === 'file') {
            try { fileData = JSON.parse(m.message); }
            catch { fileData = { url: m.message, name: 'File', size: 0 }; }
          } else if (msgType === 'voice') {
            try {
              const voiceData = JSON.parse(m.message);
              voiceUrl = voiceData.url;
              voiceDuration = voiceData.duration || 0;
            } catch {
              voiceUrl = m.message;
              voiceDuration = 0;
            }
          }

          return {
            id: m.id, // Real database ID
            from: m.is_admin_reply ? 'admin' : 'user',
            text: m.message,
            type: msgType,
            imageUrl, fileData, voiceUrl, voiceDuration,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            adminName: m.is_admin_reply ? m.sender_name : null,
            isEdited: m.is_edited || false,
            reaction: m.reaction || null,
          };
        }));
      } else {
        setMessages([{
          id: 'welcome',
          from: 'support',
          text: '👋 Welcome! How can we help you?',
          type: 'text',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch {
      setMessages([{
        id: 'welcome',
        from: 'support',
        text: '👋 Welcome! How can we help you?',
        type: 'text',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const txt = input;
    setInput('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Send via WebSocket only - backend will save to DB and return real ID
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        message: txt,
        sender_name: customerName,
        sender_email: customerEmail,
        session_id: sessionId,
        type: 'text',
        timestamp: time
      }));
    }
  };

  // ===== EDIT MESSAGE =====
  const handleEditMessage = async (messageId, newText) => {
    if (!newText.trim()) return;

    try {
      await api.put(`/chat/messages/${messageId}`, { message: newText });

      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, text: newText, isEdited: true } : m
      ));

      setEditingMessageId(null);
      setEditText('');

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message_edited',
          message_id: messageId,
          session_id: sessionId,
          new_message: newText
        }));
      }
    } catch (e) {
      console.error('Edit failed:', e);
    }
  };

  // ===== DELETE MESSAGE =====
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
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // ===== REACTION =====
  const handleReaction = async (messageId, emoji) => {
    try {
      await api.post(`/chat/messages/${messageId}/reaction`, { reaction: emoji });

      setMessages(prev => prev.map(m =>
        m.id === messageId ? {
          ...m,
          reaction: m.reaction === emoji ? null : emoji
        } : m
      ));

      setEmojiPickerId(null);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message_reaction',
          message_id: messageId,
          session_id: sessionId,
          reaction: emoji
        }));
      }
    } catch (e) {
      console.error('Reaction failed:', e);
    }
  };

  const handleCopyText = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setMessageMenu(null);
    }
  };

  // ===== UPLOAD HANDLERS =====
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    formData.append('is_admin', 'false');

    const tempId = 'temp_' + Date.now();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { id: tempId, from: 'user', type: 'image', imageUrl: URL.createObjectURL(file), time }]);

    try {
      const res = await api.post('/chat/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, id: res.data.id, imageUrl: res.data.url } : m
      ));

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'image', image_url: res.data.url, sender_name: customerName, sender_email: customerEmail, session_id: sessionId, timestamp: time
        }));
      }
    } catch (e) {
      console.error('Image upload failed:', e);
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    formData.append('is_admin', 'false');

    const tempId = 'temp_' + Date.now();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { id: tempId, from: 'user', type: 'file', fileData: { name: file.name, size: file.size, url: '' }, time }]);

    try {
      const res = await api.post('/chat/upload/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const fi = { name: res.data.name || file.name, size: res.data.size || file.size, url: res.data.url };

      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: res.data.id, fileData: fi } : m));

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'file', file_data: fi, sender_name: customerName, sender_email: customerEmail, session_id: sessionId, timestamp: time }));
      }
    } catch (e) {
      console.error('File upload failed:', e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size === 0) return;
        const fd = new FormData();
        fd.append('file', blob, `voice_${Date.now()}.webm`);
        fd.append('session_id', sessionId);
        fd.append('duration', String(recordingTime));
        fd.append('is_admin', 'false');

        const tempId = 'temp_' + Date.now();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: tempId, from: 'user', type: 'voice', voiceUrl: '', voiceDuration: recordingTime, time }]);

        try {
          const res = await api.post('/chat/upload/voice', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: res.data.id, voiceUrl: res.data.url } : m));

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'voice', voice_url: res.data.url, voice_duration: recordingTime, sender_name: customerName, sender_email: customerEmail, session_id: sessionId, timestamp: time }));
          }
        } catch (e) { console.error('Voice upload failed:', e); }
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mediaRecorderRef.current = mr; setIsRecording(true);
      let s = 0; recordingTimerRef.current = setInterval(() => { s++; setRecordingTime(s); }, 1000);
    } catch (e) { console.error('Recording failed:', e); alert('Please allow microphone access'); }
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
    <Fab color="primary" onClick={() => setOpen(true)} sx={{ position: 'fixed', bottom: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 }, bgcolor: '#1877f2', zIndex: 1000, boxShadow: '0 4px 20px rgba(24,119,242,0.4)', width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 }, '&:hover': { bgcolor: '#166fe5' } }}><ChatIcon sx={{ fontSize: { xs: 22, sm: 26 } }} /></Fab>

    <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, borderTopLeftRadius: { xs: 0, sm: 16 }, borderBottomLeftRadius: { xs: 0, sm: 16 } } }}>
      <Box sx={{ bgcolor: '#1877f2', color: 'white', p: { xs: 1.5, sm: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'white', color: '#1877f2', width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}><SupportAgent sx={{ fontSize: { xs: 20, sm: 24 } }} /></Avatar>
            <Box><Typography variant="subtitle1" fontWeight={700} fontSize={{ xs: '0.9rem', sm: '1rem' }}>TeleShop Support</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center"><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: connected ? '#22c55e' : '#ef4444' }} /><Typography variant="caption">{connected ? 'Online' : 'Offline'}</Typography></Stack></Box>
          </Stack>
          <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}><Close /></IconButton>
        </Stack>
      </Box>

      <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Chip icon={<Telegram />} label="@TeleShopBot" size="small" variant="outlined" color="primary" />
          <Chip icon={<Phone />} label="+855 12 345 678" size="small" variant="outlined" />
        </Stack>
      </Paper>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f0f2f5' }}>
        <Stack spacing={1.5}>
          {messages.map((m, i) => (
            <Box key={m.id || i} className="message-group" sx={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', position: 'relative' }}>
              {(m.from === 'support' || m.from === 'admin') && (
                <Avatar sx={{ width: 28, height: 28, mr: 0.5, bgcolor: m.from === 'admin' ? '#42b72a' : '#1877f2', flexShrink: 0 }}><SupportAgent sx={{ fontSize: 16 }} /></Avatar>
              )}
              <Box sx={{ maxWidth: '85%', position: 'relative' }}>

                {/* Message actions for user's own text messages */}
                {m.from === 'user' && m.type === 'text' && editingMessageId !== m.id && typeof m.id === 'number' && (
                  <Box className="msg-actions" sx={{ position: 'absolute', top: -32, right: 0, opacity: 0, transition: 'opacity 0.2s', bgcolor: 'white', borderRadius: 50, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', px: 0.3, display: 'flex', alignItems: 'center', zIndex: 2, '.message-group:hover &': { opacity: 1 } }}>
                    {QUICK_REACTIONS.map(r => (
                      <IconButton key={r} size="small" onClick={() => handleReaction(m.id, r)} sx={{ p: 0.3, '&:hover': { transform: 'scale(1.3)' } }}><Typography sx={{ fontSize: '0.9rem' }}>{r}</Typography></IconButton>
                    ))}
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === m.id ? null : m.id); }}><InsertEmoticon sx={{ fontSize: 14, color: '#65676b' }} /></IconButton>
                    <IconButton size="small" onClick={(e) => { setSelectedMessage(m); setMessageMenu(e.currentTarget); }}><MoreHoriz sx={{ fontSize: 14 }} /></IconButton>
                  </Box>
                )}

                {emojiPickerId === m.id && (
                  <Box sx={{ position: 'absolute', bottom: 40, right: 0, zIndex: 1000 }}>
                    <Box sx={{ position: 'relative' }}>
                      <EmojiPicker onEmojiClick={(emojiData) => { handleReaction(m.id, emojiData.emoji); }} emojiStyle={EmojiStyle.NATIVE} theme={Theme.LIGHT} width={isMobile ? 280 : 320} height={350} lazyLoadEmojis={true} previewConfig={{ showPreview: false }} skinTonesDisabled={true} />
                      <IconButton size="small" onClick={() => setEmojiPickerId(null)} sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'white' }}><Close sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                  </Box>
                )}

                <Box sx={{ px: m.type === 'text' ? 1.5 : 0, py: m.type === 'text' ? 1 : 0, borderRadius: m.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', bgcolor: m.type === 'text' ? (m.from === 'user' ? '#1877f2' : m.from === 'admin' ? '#e4e6eb' : 'white') : 'transparent', color: m.type === 'text' ? (m.from === 'user' ? 'white' : '#050505') : 'inherit', display: 'inline-block', maxWidth: '100%', overflow: 'hidden' }}>
                  {editingMessageId === m.id ? (
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', p: 0.5 }}>
                      <TextField size="small" value={editText} onChange={e => setEditText(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') { handleEditMessage(m.id, editText); } }} autoFocus variant="standard" InputProps={{ disableUnderline: true, sx: { fontSize: '0.8rem', color: 'white', '& .MuiInputBase-input': { color: 'white' } } }} />
                      <IconButton size="small" onClick={() => handleEditMessage(m.id, editText)} sx={{ color: 'white' }}><Send sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" onClick={() => setEditingMessageId(null)} sx={{ color: 'white' }}><Close sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                  ) : (
                    <>
                      {m.type === 'text' && <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{m.text}{m.isEdited && <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.7, ml: 0.5 }}>(edited)</Typography>}</Typography>}
                      {m.type === 'image' && <Box sx={{ maxWidth: 200, borderRadius: 2, overflow: 'hidden', cursor: 'pointer' }} onClick={() => window.open(m.imageUrl, '_blank')}><img src={m.imageUrl} alt="Shared" style={{ width: '100%', display: 'block' }} /></Box>}
                      {m.type === 'file' && m.fileData && <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', bgcolor: 'white' }} onClick={() => window.open(m.fileData.url, '_blank')}><AttachFile sx={{ color: '#1877f2' }} /><Box><Typography variant="body2" fontWeight={600} fontSize="0.8rem">{m.fileData.name}</Typography><Typography variant="caption" color="#65676b">{Math.round(m.fileData.size / 1024)} KB</Typography></Box></Paper>}
                      {m.type === 'voice' && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}><IconButton size="small" onClick={() => playVoice(m.voiceUrl, i)}>{playingAudio === i ? <Pause sx={{ color: '#1877f2', fontSize: 20 }} /> : <PlayArrow sx={{ color: '#1877f2', fontSize: 20 }} />}</IconButton><Box sx={{ width: 80, height: 4, bgcolor: '#e4e6eb', borderRadius: 2 }}><Box sx={{ width: `${Math.min((m.voiceDuration || 1) * 5, 100)}%`, height: '100%', bgcolor: '#1877f2', borderRadius: 2 }} /></Box><Typography variant="caption" color="#65676b">{m.voiceDuration || 0}s</Typography></Box>}
                    </>
                  )}
                </Box>

                {m.reaction && <Chip label={m.reaction} size="small" sx={{ position: 'absolute', bottom: -10, right: 0, height: 20, fontSize: '0.75rem', bgcolor: 'white', boxShadow: 1, borderRadius: 50 }} />}

                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.6rem', mt: 0.2, mx: 0.5, display: 'block', textAlign: m.from === 'user' ? 'right' : 'left' }}>
                  {m.from === 'admin' && m.adminName && `${m.adminName} • `}{m.time}
                </Typography>
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
          {input.trim() ? <IconButton onClick={send} sx={{ bgcolor: '#1877f2', color: 'white', width: 40, height: 40, '&:hover': { bgcolor: '#166fe5' } }}><Send fontSize="small" /></IconButton> :
            <IconButton onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} sx={{ color: '#1877f2' }}>{isRecording ? <Stop sx={{ color: '#ef4444' }} /> : <Mic />}</IconButton>}
        </Stack>
      </Box>
    </Drawer>

    <Menu anchorEl={messageMenu} open={Boolean(messageMenu)} onClose={() => setMessageMenu(null)}>
      <MenuItem onClick={() => { setEditingMessageId(selectedMessage?.id); setEditText(selectedMessage?.text || ''); setMessageMenu(null); }}><Edit sx={{ mr: 1, fontSize: 18 }} /> Edit</MenuItem>
      <MenuItem onClick={() => handleDeleteMessage(selectedMessage?.id)} sx={{ color: '#ef4444' }}><Delete sx={{ mr: 1, fontSize: 18 }} /> Delete</MenuItem>
      <MenuItem onClick={() => handleCopyText(selectedMessage?.text)}><ContentCopy sx={{ mr: 1, fontSize: 18 }} /> Copy</MenuItem>
    </Menu>
  </>);
};

export default ChatSupport;