// src/pages/admin/AdminChat.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, TextField, IconButton, Avatar, Chip,
  List, ListItem, ListItemAvatar, ListItemText, Badge, Button,
  CircularProgress, Paper, InputAdornment, useMediaQuery, useTheme,
  Snackbar, Alert, Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, LinearProgress,
} from '@mui/material';
import {
  Send, ArrowBack, Chat as ChatIcon, Person, SupportAgent,
  Circle, Refresh, Search, Edit, Delete, MoreHoriz, Close,
  InsertEmoticon, ContentCopy, Image, AttachFile, Mic, Stop,
  PlayArrow, Pause,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';

const getWsUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  return apiUrl.replace('http', 'ws').replace('/api', '');
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const AdminChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', customerName: '', sessionId: '' });
  const [totalUnread, setTotalUnread] = useState(0);

  const [messageMenu, setMessageMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editDialog, setEditDialog] = useState({ open: false, message: null });
  const [editText, setEditText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [emojiPickerId, setEmojiPickerId] = useState(null);
  const [inputEmojiPicker, setInputEmojiPicker] = useState(false);

  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioRef = useRef(new Audio());
  const [playingAudio, setPlayingAudio] = useState(null);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(null);
  const token = localStorage.getItem('access_token');

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { loadSessions(); connectWs(); return () => { if (wsRef.current) wsRef.current.close(); }; }, []);
  useEffect(() => { if (activeChat) loadMessages(activeChat); }, [activeChat]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const unread = customers.reduce((sum, c) => sum + (c.unread || 0), 0);
    setTotalUnread(unread);
    document.title = unread > 0 ? `(${unread}) Chat Support` : 'Chat Support';
    return () => { document.title = 'TeleShop Admin'; };
  }, [customers]);

  const connectWs = () => {
    if (!token) return;
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`${getWsUrl()}/ws/admin/${token}`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'customer_message') {
          const sid = data.session_id || data.from_user_id;
          if (activeChatRef.current === sid) {
            setMessages(prev => [...prev, {
              id: Date.now(), from: 'customer', text: data.message, type: data.message_type || 'text',
              imageUrl: data.image_url || null, fileData: data.file_data || null,
              voiceUrl: data.voice_url || null, voiceDuration: data.voice_duration || 0,
              senderName: data.sender_name || 'Customer',
              time: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }]);
            api.put(`/chat/read/${sid}`).catch(e => { });
          } else {
            setNotification({ open: true, message: data.message?.substring(0, 60), customerName: data.sender_name || 'Customer', sessionId: sid });
          }
          loadSessions();
        }
      } catch (e) { }
    };
    ws.onclose = () => setConnected(false);
  };

  const loadSessions = async () => {
    try { const res = await api.get('/chat/admin/sessions'); setCustomers((res.data || []).map(c => ({ ...c, unread: c.session_id === activeChatRef.current ? 0 : c.unread }))); } catch (e) { }
  };

  const loadMessages = async (sid) => {
    setLoading(true);
    try {
      const res = await api.get(`/chat/messages/${sid}`);
      setMessages((res.data || []).map(m => {
        const msgType = m.message_type || 'text';
        return {
          id: m.id, from: m.is_admin_reply ? 'admin' : 'customer',
          text: m.message, type: msgType,
          imageUrl: msgType === 'image' ? m.message : null,
          fileData: msgType === 'file' ? (() => { try { return JSON.parse(m.message) } catch { return { url: m.message, name: 'File', size: 0 } } })() : null,
          voiceUrl: msgType === 'voice' ? (() => { try { return JSON.parse(m.message).url } catch { return m.message } })() : null,
          voiceDuration: msgType === 'voice' ? (() => { try { return JSON.parse(m.message).duration } catch { return 0 } })() : 0,
          senderName: m.is_admin_reply ? 'You' : (m.sender_name || 'Customer'),
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isEdited: m.is_edited || false, reaction: m.reaction || null,
        };
      }));
    } catch (e) { setMessages([]); }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeChat) return;
    const txt = input; setInput(''); setInputEmojiPicker(false);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now(), from: 'admin', text: txt, type: 'text', senderName: 'You', time }]);
    try { await api.post('/chat/admin/reply', { message: txt, session_id: activeChat, admin_name: user?.full_name || 'Admin' }); } catch (e) { }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ session_id: activeChat, message: txt, type: 'text', admin_name: user?.full_name || 'Admin', timestamp: time }));
    }
    loadSessions();
  };

  const handleSelectCustomer = (sessionId) => {
    setActiveChat(sessionId); api.put(`/chat/read/${sessionId}`).catch(e => { });
    setCustomers(prev => prev.map(c => c.session_id === sessionId ? { ...c, unread: 0 } : c));
  };

  const handleEditClick = () => { setMessageMenu(null); setEditDialog({ open: true, message: selectedMessage }); setEditText(selectedMessage?.text || ''); };
  const handleEditSave = async () => {
    if (!editDialog.message) return;
    try { await api.put(`/chat/messages/${editDialog.message.id}`, { message: editText }); setMessages(prev => prev.map(m => m.id === editDialog.message.id ? { ...m, text: editText, isEdited: true } : m)); setEditDialog({ open: false, message: null }); } catch (e) { }
  };
  const handleDeleteClick = () => { setMessageMenu(null); setDeleteConfirm(selectedMessage); };
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try { await api.delete(`/chat/messages/${deleteConfirm.id}`); setMessages(prev => prev.filter(m => m.id !== deleteConfirm.id)); setDeleteConfirm(null); } catch (e) { }
  };
  const handleReaction = async (msgId, emoji) => {
    try { await api.post(`/chat/messages/${msgId}/reaction`, { reaction: emoji }); setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reaction: m.reaction === emoji ? null : emoji } : m)); setEmojiPickerId(null); } catch (e) { }
  };
  const handleCopyText = (text) => { if (text) { navigator.clipboard.writeText(text); setMessageMenu(null); } };

  // ===== UPLOADS (with is_admin=true) =====
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file || !activeChat) return;
    setUploading(true);
    const formData = new FormData(); formData.append('file', file); formData.append('session_id', activeChat);
    formData.append('is_admin', 'true');
    try {
      const res = await api.post('/chat/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { id: res.data.id, from: 'admin', type: 'image', imageUrl: res.data.url, senderName: 'You', time }]);
      if (wsRef.current?.readyState === WebSocket.OPEN) { wsRef.current.send(JSON.stringify({ session_id: activeChat, type: 'image', image_url: res.data.url, admin_name: user?.full_name || 'Admin', timestamp: time })); }
    } catch (e) { } finally { setUploading(false); if (imageInputRef.current) imageInputRef.current.value = ''; }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file || !activeChat) return;
    setUploading(true);
    const formData = new FormData(); formData.append('file', file); formData.append('session_id', activeChat);
    formData.append('is_admin', 'true');
    try {
      const res = await api.post('/chat/upload/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fileInfo = { name: res.data.name || file.name, size: res.data.size || file.size, url: res.data.url };
      setMessages(prev => [...prev, { id: res.data.id, from: 'admin', type: 'file', fileData: fileInfo, senderName: 'You', time }]);
      if (wsRef.current?.readyState === WebSocket.OPEN) { wsRef.current.send(JSON.stringify({ session_id: activeChat, type: 'file', file_data: fileInfo, admin_name: user?.full_name || 'Admin', timestamp: time })); }
    } catch (e) { } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];
    
    mediaRecorder.ondataavailable = (e) => { 
      if (e.data.size > 0) chunks.push(e.data); 
    };
    
    mediaRecorder.onstop = async () => {
      clearInterval(recordingTimerRef.current);
      
      // 🔴 SAVE the duration BEFORE resetting
      const finalDuration = recordingTime;
      
      const blob = new Blob(chunks, { type: 'audio/webm' });
      if (blob.size === 0) { 
        setIsRecording(false); 
        setRecordingTime(0); 
        return; 
      }
      
      const formData = new FormData();
      formData.append('file', blob, `voice_${Date.now()}.webm`);
      formData.append('session_id', activeChat);
      formData.append('duration', String(finalDuration)); // 🔴 Use saved duration
      formData.append('is_admin', 'true');
      
      try {
        const res = await api.post('/chat/upload/voice', formData, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
        
        console.log('🎤 Voice uploaded:', res.data); // Debug
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        setMessages(prev => [...prev, { 
          id: res.data.id, 
          from: 'admin', 
          type: 'voice', 
          voiceUrl: res.data.url, 
          voiceDuration: finalDuration, // 🔴 Use saved duration
          senderName: 'You', 
          time 
        }]);
        
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            session_id: activeChat, 
            type: 'voice', 
            voice_url: res.data.url, 
            voice_duration: finalDuration, // 🔴 Use saved duration
            admin_name: user?.full_name || 'Admin', 
            timestamp: time 
          }));
        }
      } catch(e) { 
        console.error('Voice upload error:', e); 
      }
      
      // Reset AFTER upload
      setIsRecording(false);
      setRecordingTime(0);
      stream.getTracks().forEach(track => track.stop());
    };
    
    // Start recording
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    
    // Start timer
    setIsRecording(true);
    setRecordingTime(0);
    
    let seconds = 0;
    recordingTimerRef.current = setInterval(() => {
      seconds++;
      console.log('⏱️ Recording:', seconds, 's'); // Debug
      setRecordingTime(seconds);
    }, 1000);
    
  } catch(e) { 
    console.error('Mic error:', e); 
    alert('Please allow microphone access'); 
  }
};

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };


  const playVoice = (url, id) => {
    if (playingAudio === id) { audioRef.current.pause(); setPlayingAudio(null); return; }
    audioRef.current.src = url; audioRef.current.play(); setPlayingAudio(id);
    audioRef.current.onended = () => setPlayingAudio(null);
  };

  const filteredCustomers = customers.filter(c => (c.sender_name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const activeCustomer = customers.find(c => c.session_id === activeChat);

  return (
    <Box sx={{ bgcolor: '#f0f2f5', height: '100vh', display: 'flex', overflow: 'hidden' }}>

      {/* SIDEBAR */}
      <Box sx={{ width: { xs: '100%', sm: 340, md: 360 }, minWidth: { xs: '100%', sm: 340, md: 360 }, bgcolor: 'white', borderRight: '1px solid #e4e6eb', display: { xs: activeChat ? 'none' : 'flex', sm: 'flex' }, flexDirection: 'column' }}>
        <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid #e4e6eb', bgcolor: '#0f172a', color: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin')} sx={{ color: 'white', textTransform: 'none', fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>Dashboard</Button>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Chip icon={<Circle sx={{ fontSize: 6, color: connected ? '#22c55e' : '#ef4444' }} />} label={connected ? 'Online' : 'Offline'} size="small" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 20, sm: 24 }, bgcolor: connected ? '#dcfce7' : '#fee2e2', color: connected ? '#15803d' : '#dc2626', fontWeight: 600 }} />
              <IconButton size="small" onClick={loadSessions} sx={{ color: 'white' }}><Refresh sx={{ fontSize: { xs: 16, sm: 18 } }} /></IconButton>
            </Stack>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700} fontSize={{ xs: '1rem', sm: '1.1rem', md: '1.25rem' }}>Messages</Typography>
            {totalUnread > 0 && <Badge badgeContent={totalUnread} color="error" max={99}><ChatIcon sx={{ color: 'white', fontSize: { xs: 20, sm: 24 } }} /></Badge>}
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.3, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>{customers.length} conversation{totalUnread > 0 ? ` • ${totalUnread} unread` : ''}</Typography>
        </Box>
        <Box sx={{ p: { xs: 1, sm: 1.5 }, borderBottom: '1px solid #e4e6eb' }}>
          <TextField fullWidth size="small" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#65676b', fontSize: { xs: 16, sm: 20 } }} /></InputAdornment>, sx: { borderRadius: 50, bgcolor: '#f0f2f5', fontSize: { xs: '0.75rem', sm: '0.85rem' }, '& fieldset': { border: 'none' } } }} />
        </Box>
        <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
          {filteredCustomers.length === 0 ? <Box textAlign="center" py={6} px={2}><ChatIcon sx={{ fontSize: { xs: 36, sm: 48 }, color: '#cbd5e1', mb: 1 }} /><Typography color="#94a3b8" fontSize={{ xs: '0.8rem', sm: '0.9rem' }}>No conversations</Typography></Box>
            : filteredCustomers.map(c => (<ListItem key={c.session_id} button selected={activeChat === c.session_id} onClick={() => handleSelectCustomer(c.session_id)} sx={{ py: { xs: 1, sm: 1.2 }, px: { xs: 1.5, sm: 2 }, bgcolor: activeChat === c.session_id ? '#e7f3ff' : 'transparent', '&:hover': { bgcolor: '#f0f2f5' } }}><ListItemAvatar sx={{ minWidth: { xs: 44, sm: 56 } }}><Badge badgeContent={c.unread} color="error" overlap="circular" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}><Avatar sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, bgcolor: '#1877f2' }}><Person sx={{ fontSize: { xs: 20, sm: 24 } }} /></Avatar></Badge></ListItemAvatar><ListItemText primary={c.sender_name || 'Customer'} secondary={c.last_message?.substring(0, 30) || 'No messages'} primaryTypographyProps={{ fontWeight: activeChat === c.session_id ? 700 : 500, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: '#050505' }} secondaryTypographyProps={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: '#65676b', noWrap: true }} /></ListItem>))}
        </List>
      </Box>

      {/* CHAT AREA */}
      <Box sx={{ flex: 1, display: { xs: activeChat ? 'flex' : 'none', sm: 'flex' }, flexDirection: 'column', bgcolor: '#f0f2f5' }}>
        {activeChat ? (<>
          <Box sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 0.8, sm: 1 }, bgcolor: 'white', borderBottom: '1px solid #e4e6eb', flexShrink: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton onClick={() => setActiveChat(null)} size="small"><ArrowBack sx={{ fontSize: { xs: 20, sm: 22 } }} /></IconButton>
                <Avatar sx={{ width: { xs: 34, sm: 40 }, height: { xs: 34, sm: 40 }, bgcolor: '#1877f2' }}><Person sx={{ fontSize: { xs: 18, sm: 20 } }} /></Avatar>
                <Box><Typography variant="subtitle2" fontWeight={600} color="#050505" fontSize={{ xs: '0.85rem', sm: '0.95rem' }} noWrap sx={{ maxWidth: { xs: 150, sm: 250 } }}>{activeCustomer?.sender_name || 'Customer'}</Typography><Typography variant="caption" color="#22c55e" fontWeight={500}>● Online</Typography></Box>
              </Stack>
              <IconButton size="small" onClick={loadSessions}><Refresh sx={{ fontSize: { xs: 16, sm: 18 }, color: '#65676b' }} /></IconButton>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 2 }}>
            {loading ? <Box textAlign="center" py={6}><CircularProgress size={28} sx={{ color: '#1877f2' }} /></Box> :
              messages.length === 0 ? <Box textAlign="center" pt={8}><Avatar sx={{ width: 64, height: 64, bgcolor: '#1877f2', mx: 'auto', mb: 2 }}><Person sx={{ fontSize: 32 }} /></Avatar><Typography fontWeight={600} color="#050505">{activeCustomer?.sender_name || 'Customer'}</Typography></Box> :
                <Stack spacing={0.3}>
                  {messages.map((m, i) => (
                    <Box key={m.id || i} className="message-group" sx={{ display: 'flex', justifyContent: m.from === 'admin' ? 'flex-end' : 'flex-start', mb: 0.3, position: 'relative', '&:hover .msg-actions': { opacity: 1 } }}>
                      {m.from === 'customer' && <Avatar sx={{ width: 24, height: 24, mr: 0.5, bgcolor: '#1877f2', flexShrink: 0, mt: 0.5, display: { xs: 'none', sm: 'flex' } }}><Person sx={{ fontSize: 14 }} /></Avatar>}
                      <Box sx={{ maxWidth: { xs: '90%', sm: '70%', md: '60%' }, position: 'relative' }}>
                        {m.type === 'text' && <Box className="msg-actions" sx={{ position: 'absolute', top: -32, right: m.from === 'admin' ? 0 : 'auto', left: m.from === 'customer' ? 0 : 'auto', opacity: 0, transition: 'opacity 0.2s', bgcolor: 'white', borderRadius: 50, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', px: 0.3, display: 'flex', zIndex: 2, alignItems: 'center' }}>
                          {QUICK_REACTIONS.map(r => (<IconButton key={r} size="small" onClick={() => handleReaction(m.id, r)} sx={{ p: 0.3, '&:hover': { transform: 'scale(1.3)' } }}><Typography sx={{ fontSize: '0.9rem' }}>{r}</Typography></IconButton>))}
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === m.id ? null : m.id); }}><InsertEmoticon sx={{ fontSize: 14, color: '#65676b' }} /></IconButton>
                          {m.from === 'admin' && <IconButton size="small" onClick={(e) => { setSelectedMessage(m); setMessageMenu(e.currentTarget); }}><MoreHoriz sx={{ fontSize: 14 }} /></IconButton>}
                        </Box>}
                        {emojiPickerId === m.id && (<Box sx={{ position: 'absolute', bottom: 40, right: 0, zIndex: 1000 }}><Box sx={{ position: 'relative' }}><EmojiPicker onEmojiClick={(emojiData) => { handleReaction(m.id, emojiData.emoji); }} emojiStyle={EmojiStyle.NATIVE} theme={Theme.LIGHT} width={isMobile ? 280 : 320} height={380} lazyLoadEmojis={true} previewConfig={{ showPreview: false }} skinTonesDisabled={true} /><IconButton size="small" onClick={() => setEmojiPickerId(null)} sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'white' }}><Close sx={{ fontSize: 16 }} /></IconButton></Box></Box>)}
                        <Box sx={{ px: m.type === 'text' ? 1.5 : 0, py: m.type === 'text' ? 1 : 0, borderRadius: m.from === 'admin' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', bgcolor: m.type === 'text' ? (m.from === 'admin' ? '#1877f2' : '#e4e6eb') : 'transparent', color: m.type === 'text' ? (m.from === 'admin' ? 'white' : '#050505') : 'inherit', display: 'inline-block', maxWidth: '100%', overflow: 'hidden' }}>
                          {m.type === 'text' && <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, lineHeight: 1.4, wordBreak: 'break-word' }}>{m.text}</Typography>}
                          {m.type === 'image' && <Box sx={{ maxWidth: 250, borderRadius: 2, overflow: 'hidden', cursor: 'pointer' }} onClick={() => window.open(m.imageUrl, '_blank')}><img src={m.imageUrl} alt="Shared" style={{ width: '100%', display: 'block' }} /></Box>}
                          {m.type === 'file' && m.fileData && <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', bgcolor: 'white' }} onClick={() => window.open(m.fileData.url, '_blank')}><AttachFile sx={{ color: '#1877f2' }} /><Box><Typography variant="body2" fontWeight={600}>{m.fileData.name}</Typography><Typography variant="caption" color="#65676b">{Math.round(m.fileData.size / 1024)} KB</Typography></Box></Paper>}
                          {m.type === 'voice' && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, bgcolor: 'white', borderRadius: 2 }}><IconButton size="small" onClick={() => playVoice(m.voiceUrl, m.id)}>{playingAudio === m.id ? <Pause sx={{ color: '#1877f2' }} /> : <PlayArrow sx={{ color: '#1877f2' }} />}</IconButton><Box sx={{ flex: 1, height: 4, bgcolor: '#e4e6eb', borderRadius: 2, overflow: 'hidden' }}><Box sx={{ width: `${Math.min((m.voiceDuration || 1) * 2, 100)}%`, height: '100%', bgcolor: '#1877f2', borderRadius: 2 }} /></Box><Typography variant="caption" color="#65676b">{m.voiceDuration || 0}s</Typography></Box>}
                        </Box>
                        {m.reaction && <Chip label={m.reaction} size="small" sx={{ position: 'absolute', bottom: -10, right: 0, height: 20, fontSize: '0.75rem', bgcolor: 'white', boxShadow: 1, borderRadius: 50 }} />}
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.2, mx: 0.5 }}>
                          {m.isEdited && <Typography variant="caption" color="#94a3b8" fontSize="0.55rem">Edited</Typography>}
                          <Typography variant="caption" sx={{ color: '#65676b', fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>{m.time}</Typography>
                        </Stack>
                      </Box>
                      {m.from === 'admin' && <Avatar sx={{ width: 24, height: 24, ml: 0.5, bgcolor: '#42b72a', flexShrink: 0, mt: 0.5, display: { xs: 'none', sm: 'flex' } }}><SupportAgent sx={{ fontSize: 14 }} /></Avatar>}
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Stack>}
            {uploading && <LinearProgress sx={{ mt: 1, borderRadius: 2 }} />}
          </Box>

          <Box sx={{ px: { xs: 1, sm: 2 }, pb: { xs: 1, sm: 1.5 }, pt: 1, bgcolor: 'white', flexShrink: 0, borderTop: '1px solid #e4e6eb', position: 'relative' }}>
            {isRecording && <Box sx={{ textAlign: 'center', mb: 1 }}><Chip icon={<Circle sx={{ fontSize: 8, color: '#ef4444' }} />} label={`Recording ${recordingTime}s`} color="error" size="small" onDelete={stopRecording} /></Box>}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} />
              <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
              <IconButton size="small" onClick={() => imageInputRef.current?.click()} sx={{ color: '#65676b' }}><Image sx={{ fontSize: { xs: 20, sm: 22 } }} /></IconButton>
              <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: '#65676b' }}><AttachFile sx={{ fontSize: { xs: 20, sm: 22 } }} /></IconButton>
              <Box sx={{ flex: 1, bgcolor: '#f0f2f5', borderRadius: 50, px: 1.5 }}>
                <TextField fullWidth multiline maxRows={4} size="small" placeholder="Aa" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} variant="standard" InputProps={{ disableUnderline: true, sx: { fontSize: { xs: '0.8rem', sm: '0.9rem' } } }} />
              </Box>
              {input.trim() ? <IconButton onClick={handleSend} sx={{ color: '#1877f2' }}><Send sx={{ fontSize: { xs: 20, sm: 22 } }} /></IconButton> :
                <IconButton onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} sx={{ color: '#1877f2' }}>{isRecording ? <Stop sx={{ fontSize: { xs: 20, sm: 22 }, color: '#ef4444' }} /> : <Mic sx={{ fontSize: { xs: 20, sm: 22 } }} />}</IconButton>}
            </Stack>
            {inputEmojiPicker && (<Box sx={{ position: 'absolute', bottom: 60, left: 0, zIndex: 1000 }}><EmojiPicker onEmojiClick={(emojiData) => { setInput(prev => prev + emojiData.emoji); }} emojiStyle={EmojiStyle.NATIVE} theme={Theme.LIGHT} width={isMobile ? window.innerWidth - 32 : 350} height={350} /></Box>)}
          </Box>
        </>) : (<Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', p: 3 }}><Box sx={{ width: { xs: 72, sm: 96 }, height: { xs: 72, sm: 96 }, borderRadius: '50%', bgcolor: '#e4e6eb', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}><ChatIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: '#65676b' }} /></Box><Typography variant="h6" fontWeight={700} color="#050505" textAlign="center" fontSize={{ xs: '1rem', sm: '1.25rem' }}>Select a conversation</Typography></Box>)}
      </Box>

      <Menu anchorEl={messageMenu} open={Boolean(messageMenu)} onClose={() => setMessageMenu(null)}>
        {selectedMessage?.from === 'admin' && <MenuItem onClick={handleEditClick}><Edit sx={{ mr: 1, fontSize: 18 }} /> Edit</MenuItem>}
        {selectedMessage?.from === 'admin' && <MenuItem onClick={handleDeleteClick} sx={{ color: '#ef4444' }}><Delete sx={{ mr: 1, fontSize: 18 }} /> Delete</MenuItem>}
        <MenuItem onClick={() => handleCopyText(selectedMessage?.text)}><ContentCopy sx={{ mr: 1, fontSize: 18 }} /> Copy</MenuItem>
      </Menu>
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, message: null })} maxWidth="sm" fullWidth><DialogTitle>Edit Message</DialogTitle><DialogContent><TextField fullWidth multiline rows={3} value={editText} onChange={e => setEditText(e.target.value)} autoFocus sx={{ mt: 1 }} /></DialogContent><DialogActions><Button onClick={() => setEditDialog({ open: false, message: null })}>Cancel</Button><Button variant="contained" onClick={handleEditSave}>Save</Button></DialogActions></Dialog>
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth><DialogTitle>Delete Message?</DialogTitle><DialogContent><Typography>This will be permanently deleted.</Typography></DialogContent><DialogActions><Button onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="contained" color="error" onClick={handleDeleteConfirm}>Delete</Button></DialogActions></Dialog>
      <Snackbar open={notification.open} autoHideDuration={5000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} sx={{ mt: { xs: 0, sm: 8 } }}><Alert severity="info" variant="filled" onClose={() => setNotification({ ...notification, open: false })} sx={{ borderRadius: 2, cursor: 'pointer' }} onClick={() => { if (notification.sessionId) handleSelectCustomer(notification.sessionId); setNotification({ ...notification, open: false }); }}><Stack spacing={0.3}><Typography variant="subtitle2" fontWeight={700}>📩 {notification.customerName}</Typography><Typography variant="body2" sx={{ opacity: 0.9 }}>{notification.message}</Typography></Stack></Alert></Snackbar>
    </Box>
  );
};

export default AdminChat;