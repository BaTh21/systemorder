// src/components/chat/ChatSupport.jsx - Customer Chat (WebSocket connects on page load)
import { useState, useEffect, useRef } from 'react';
import {
  Box, Fab, Drawer, Typography, TextField, Stack, IconButton,
  Avatar, Paper, Chip, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Chat as ChatIcon, Close, Send, Telegram,
  SupportAgent, Phone, Image, AttachFile, Mic, Stop,
  PlayArrow, Pause,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

const getWsUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  return apiUrl.replace('http', 'ws').replace('/api', '');
};

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

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('access_token');

  // Connect WebSocket on mount - ALWAYS CONNECTED
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
        sender_name: user?.full_name || 'Customer'
      }));
    };

    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'admin_reply') {
          setMessages(prev => [...prev, {
            from: 'admin', text: d.message, type: d.message_type || 'text',
            imageUrl: d.image_url || null, fileData: d.file_data || null,
            voiceUrl: d.voice_url || null, voiceDuration: d.voice_duration || 0,
            time: d.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            adminName: d.admin_name
          }]);
        }
      } catch (err) { }
    };

    ws.onclose = () => {
      console.log('🔌 Customer WS closed');
      setConnected(false);
    };

    ws.onerror = (e) => console.error('WS error:', e);

    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, [token, sessionId]);

  // Load history when chat opens
  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await api.get(`/chat/messages/${sessionId}`);
      if (res.data?.length) {
        setMessages(res.data.map(m => {
          // Determine message type
          const msgType = m.message_type || 'text';

          let imageUrl = null;
          let fileData = null;
          let voiceUrl = null;
          let voiceDuration = 0;

          if (msgType === 'image') {
            imageUrl = m.message; // The URL is stored directly in message field
          } else if (msgType === 'file') {
            try { fileData = JSON.parse(m.message); } catch { fileData = { url: m.message, name: 'File', size: 0 }; }
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
            from: m.is_admin_reply ? 'admin' : 'user',
            text: m.message,
            type: msgType,
            imageUrl: imageUrl,
            fileData: fileData,
            voiceUrl: voiceUrl,
            voiceDuration: voiceDuration,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            adminName: m.is_admin_reply ? m.sender_name : null
          };
        }));
      } else {
        setMessages([{ from: 'support', text: '👋 Welcome! How can we help you?', type: 'text', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      }
    } catch {
      setMessages([{ from: 'support', text: '👋 Welcome! How can we help you?', type: 'text', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const txt = input; setInput('');
    const senderName = user?.full_name || 'Customer';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { from: 'user', text: txt, type: 'text', time }]);

    // Save to DB
    try { await api.post('/chat/send', { message: txt, sender_name: senderName, sender_email: user?.email || '', session_id: sessionId }); } catch (e) { }

    // Notify via WS
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message: txt, sender_name: senderName, session_id: sessionId, type: 'text', timestamp: time }));
    }
  };

const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); const formData = new FormData(); formData.append('file', file); formData.append('session_id', sessionId); formData.append('is_admin', 'false');
    try { const res = await api.post('/chat/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); setMessages(prev => [...prev, { from: 'user', type: 'image', imageUrl: res.data.url, time }]); if (wsRef.current?.readyState === WebSocket.OPEN) { wsRef.current.send(JSON.stringify({ type: 'image', image_url: res.data.url, sender_name: user?.full_name||'Customer', session_id: sessionId, timestamp: time })); } } catch(e) {} finally { setUploading(false); if(imageInputRef.current) imageInputRef.current.value = ''; }
  };


   const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); const formData = new FormData(); formData.append('file', file); formData.append('session_id', sessionId); formData.append('is_admin', 'false');
    try { const res = await api.post('/chat/upload/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); const fi = { name: res.data.name||file.name, size: res.data.size||file.size, url: res.data.url }; setMessages(prev => [...prev, { from: 'user', type: 'file', fileData: fi, time }]); if (wsRef.current?.readyState === WebSocket.OPEN) { wsRef.current.send(JSON.stringify({ type: 'file', file_data: fi, sender_name: user?.full_name||'Customer', session_id: sessionId, timestamp: time })); } } catch(e) {} finally { setUploading(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const startRecording = async () => {
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mr = new MediaRecorder(stream); const chunks = []; mr.ondataavailable = (e) => { if(e.data.size>0) chunks.push(e.data); }; mr.onstop = async () => { const blob = new Blob(chunks, { type: 'audio/webm' }); if(blob.size===0) return; const fd = new FormData(); fd.append('file', blob, `voice_${Date.now()}.webm`); fd.append('session_id', sessionId); fd.append('duration', String(recordingTime)); fd.append('is_admin', 'false'); try { const res = await api.post('/chat/upload/voice', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); setMessages(prev => [...prev, { from: 'user', type: 'voice', voiceUrl: res.data.url, voiceDuration: recordingTime, time }]); if (wsRef.current?.readyState === WebSocket.OPEN) { wsRef.current.send(JSON.stringify({ type: 'voice', voice_url: res.data.url, voice_duration: recordingTime, sender_name: user?.full_name||'Customer', session_id: sessionId, timestamp: time })); } } catch(e) {} stream.getTracks().forEach(t=>t.stop()); }; mr.start(); mediaRecorderRef.current = mr; setIsRecording(true); let s = 0; recordingTimerRef.current = setInterval(() => { s++; setRecordingTime(s); }, 1000); } catch(e) {}
  };

  const stopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); clearInterval(recordingTimerRef.current); setIsRecording(false); setRecordingTime(0); } };
  const playVoice = (url, id) => { if (playingAudio === id) { audioRef.current.pause(); setPlayingAudio(null); return; } audioRef.current.src = url; audioRef.current.play(); setPlayingAudio(id); audioRef.current.onended = () => setPlayingAudio(null); };

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
            <Box key={i} sx={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
              {(m.from === 'support' || m.from === 'admin') && <Avatar sx={{ width: 28, height: 28, mr: 0.5, bgcolor: m.from === 'admin' ? '#42b72a' : '#1877f2', flexShrink: 0 }}><SupportAgent sx={{ fontSize: 16 }} /></Avatar>}
              <Box sx={{ maxWidth: '85%' }}>
                <Box sx={{ px: m.type === 'text' ? 1.5 : 0, py: m.type === 'text' ? 1 : 0, borderRadius: m.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', bgcolor: m.type === 'text' ? (m.from === 'user' ? '#1877f2' : m.from === 'admin' ? '#e4e6eb' : 'white') : 'transparent', color: m.type === 'text' ? (m.from === 'user' ? 'white' : '#050505') : 'inherit', display: 'inline-block', maxWidth: '100%', overflow: 'hidden' }}>
                  {m.type === 'text' && <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{m.text}</Typography>}
                  {m.type === 'image' && <Box sx={{ maxWidth: 200, borderRadius: 2, overflow: 'hidden', cursor: 'pointer' }} onClick={() => window.open(m.imageUrl, '_blank')}><img src={m.imageUrl} alt="Shared" style={{ width: '100%', display: 'block' }} /></Box>}
                  {m.type === 'file' && m.fileData && <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', bgcolor: 'white' }} onClick={() => window.open(m.fileData.url, '_blank')}><AttachFile sx={{ color: '#1877f2' }} /><Box><Typography variant="body2" fontWeight={600} fontSize="0.8rem">{m.fileData.name}</Typography><Typography variant="caption" color="#65676b">{Math.round(m.fileData.size / 1024)} KB</Typography></Box></Paper>}
                  {m.type === 'voice' && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}><IconButton size="small" onClick={() => playVoice(m.voiceUrl, i)}>{playingAudio === i ? <Pause sx={{ color: '#1877f2', fontSize: 20 }} /> : <PlayArrow sx={{ color: '#1877f2', fontSize: 20 }} />}</IconButton><Box sx={{ width: 80, height: 4, bgcolor: '#e4e6eb', borderRadius: 2 }}><Box sx={{ width: `${Math.min((m.voiceDuration || 1) * 5, 100)}%`, height: '100%', bgcolor: '#1877f2', borderRadius: 2 }} /></Box><Typography variant="caption" color="#65676b">{m.voiceDuration || 0}s</Typography></Box>}
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.6rem', mt: 0.2, mx: 0.5, display: 'block', textAlign: m.from === 'user' ? 'right' : 'left' }}>{m.time}</Typography>
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
  </>);
};

export default ChatSupport;