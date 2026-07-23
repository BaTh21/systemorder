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
  PlayArrow, Pause, Email, PhoneAndroid,
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
  const [customerProfile, setCustomerProfile] = useState(null);
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState(null);

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

  useEffect(() => {
    loadSessions();
    connectWs();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
      loadCustomerProfile(activeChat);
    }
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    ws.onopen = () => {
      console.log('✅ Admin WS connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Admin received:', data.type, data);

        if (data.type === 'customer_message') {
          const sid = data.session_id || data.from_user_id;

          if (activeChatRef.current === sid && data.message_id) {
            setMessages(prev => {
              if (prev.find(m => m.id === data.message_id)) return prev;

              // Parse message based on type
              let messageData = {
                id: data.message_id,
                from: 'customer',
                text: data.message,
                type: data.message_type || 'text',
                imageUrl: data.image_url || null,
                fileData: data.file_data || null,
                voiceUrl: data.voice_url || null,
                voiceDuration: data.voice_duration || 0,
                senderName: data.sender_name || 'Customer',
                time: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isEdited: false,
                reaction: null
              };

              return [...prev, messageData];
            });

            if (data.customer_profile) {
              setCustomerProfile({
                name: data.customer_profile.full_name || data.sender_name,
                email: data.customer_profile.email || data.sender_email,
                phone: data.customer_profile.phone || '',
                is_registered: true,
                user_id: data.customer_profile.id
              });
            }

            api.put(`/chat/read/${sid}`).catch(e => { });
          } else if (activeChatRef.current !== sid) {
            // Show notification with proper label
            let notificationText = data.message?.substring(0, 60) || '';
            if (data.message_type === 'image') notificationText = '📷 Sent a photo';
            else if (data.message_type === 'file') notificationText = '📎 Sent a file';
            else if (data.message_type === 'voice') notificationText = '🎤 Sent a voice message';

            setNotification({
              open: true,
              message: notificationText,
              customerName: data.sender_name || 'Customer',
              sessionId: sid
            });
          }
          loadSessions();
        }
        else if (data.type === 'message_sent') {
          if (activeChatRef.current === data.session_id) {
            setMessages(prev => {
              if (prev.find(m => m.id === data.message_id)) return prev;
              return [...prev, {
                id: data.message_id,
                from: 'admin',
                text: data.message,
                type: data.message_type || 'text',
                senderName: 'You',
                time: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isEdited: false,
                reaction: null
              }];
            });
          }
        }
        else if (data.type === 'message_edited') {
          if (activeChatRef.current === data.session_id) {
            setMessages(prev => prev.map(m =>
              m.id === data.message_id ? { ...m, text: data.new_message, isEdited: true } : m
            ));
          }
        }
        else if (data.type === 'message_deleted') {
          if (activeChatRef.current === data.session_id) {
            setMessages(prev => prev.filter(m => m.id !== data.message_id));
          }
        }
        else if (data.type === 'message_reaction') {
          console.log('📨 Reaction received:', data);
          if (activeChatRef.current === data.session_id) {
            setMessages(prev => prev.map(m =>
              m.id === data.message_id ? { ...m, reaction: data.reaction } : m
            ));
          }
        }
      } catch (e) {
        console.error('WebSocket error:', e);
      }
    };

    ws.onclose = () => {
      console.log('🔌 Admin WS closed');
      setConnected(false);
    };

    ws.onerror = (e) => console.error('WS error:', e);
  };

  const loadSessions = async () => {
    try {
      const res = await api.get('/chat/admin/sessions');
      setCustomers((res.data || []).map(c => {
        let lastMsg = c.last_message || 'No messages';

        return {
          ...c,
          displayName: c.sender_name && c.sender_name !== 'Customer' ? c.sender_name : 'Customer',
          unread: c.session_id === activeChatRef.current ? 0 : (c.unread || 0)
        };
      }));
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  };

  const loadCustomerProfile = async (sessionId) => {
    try {
      const res = await api.get(`/chat/customer-profile/${sessionId}`);
      setCustomerProfile(res.data);
    } catch (e) {
      console.error('Failed to load customer profile:', e);
      setCustomerProfile(null);
    }
  };

  const loadMessages = async (sid) => {
    setLoading(true);
    try {
      const res = await api.get(`/chat/messages/${sid}`);
      setMessages((res.data || []).map(m => {
        const msgType = m.message_type || 'text';
        let imageUrl = null, fileData = null, voiceUrl = null, voiceDuration = 0;

        if (msgType === 'image') {
          imageUrl = m.message; // The URL is stored in message field
        } else if (msgType === 'file') {
          try {
            fileData = JSON.parse(m.message);
          } catch {
            fileData = { url: m.message, name: 'File', size: 0 };
          }
        } else if (msgType === 'voice') {
          try {
            const vd = JSON.parse(m.message);
            voiceUrl = vd.url;
            voiceDuration = vd.duration || 0;
          } catch {
            voiceUrl = m.message;
            voiceDuration = 0;
          }
        }

        return {
          id: m.id,
          from: m.is_admin_reply ? 'admin' : 'customer',
          text: m.message,
          type: msgType,
          imageUrl, fileData, voiceUrl, voiceDuration,
          senderName: m.is_admin_reply ? 'You' : (m.sender_name || 'Customer'),
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isEdited: m.is_edited || false,
          reaction: m.reaction || null,
        };
      }));
    } catch (e) {
      console.error('Failed to load messages:', e);
      setMessages([]);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeChat) return;
    const txt = input;
    setInput('');
    setInputEmojiPicker(false);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        session_id: activeChat,
        message: txt,
        type: 'text',
        admin_name: user?.full_name || 'Admin',
        timestamp: time
      }));
    } else {
      // Fallback to REST API
      try {
        const res = await api.post('/chat/admin/reply', {
          message: txt,
          session_id: activeChat,
          admin_name: user?.full_name || 'Admin'
        });
        setMessages(prev => [...prev, {
          id: res.data.id,
          from: 'admin',
          text: txt,
          type: 'text',
          senderName: 'You',
          time
        }]);
      } catch (e) {
        console.error('Failed to send reply:', e);
      }
    }

    loadSessions();
  };

  const handleSelectCustomer = (sessionId) => {
    setActiveChat(sessionId);
    api.put(`/chat/read/${sessionId}`).catch(e => { });
    setCustomers(prev => prev.map(c => c.session_id === sessionId ? { ...c, unread: 0 } : c));
  };

  const handleReaction = async (msgId, emoji) => {
    console.log('🎯 Admin reacting - Message:', msgId, 'Emoji:', emoji);

    const currentMsg = messages.find(m => m.id === msgId);
    const newReaction = currentMsg?.reaction === emoji ? null : emoji;

    // Update local state immediately
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, reaction: newReaction } : m
    ));

    setEmojiPickerId(null);

    // Send via WebSocket with activeChat
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message_reaction',
        message_id: msgId,
        session_id: activeChat,  // This is the customer's session ID
        reaction: newReaction
      }));
      console.log('📤 Admin sent reaction via WS:', { msgId, session_id: activeChat, reaction: newReaction });
    } else {
      // Fallback to REST API
      try {
        await api.post(`/chat/messages/${msgId}/reaction`, { reaction: emoji });
      } catch (e) {
        console.error('Reaction failed:', e);
      }
    }
  };

  const handleEditClick = () => {
    setMessageMenu(null);
    setEditDialog({ open: true, message: selectedMessage });
    setEditText(selectedMessage?.text || '');
  };

  const handleEditSave = async () => {
    if (!editDialog.message) return;
    try {
      await api.put(`/chat/messages/${editDialog.message.id}`, { message: editText });
      setMessages(prev => prev.map(m =>
        m.id === editDialog.message.id ? { ...m, text: editText, isEdited: true } : m
      ));
      setEditDialog({ open: false, message: null });

      // Notify via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message_edited',
          message_id: editDialog.message.id,
          session_id: activeChat,
          new_message: editText
        }));
      }
    } catch (e) {
      console.error('Failed to edit message:', e);
    }
  };

  const handleDeleteClick = () => {
    setMessageMenu(null);
    setDeleteConfirm(selectedMessage);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/chat/messages/${deleteConfirm.id}`);
      setMessages(prev => prev.filter(m => m.id !== deleteConfirm.id));
      setDeleteConfirm(null);

      // Notify via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message_deleted',
          message_id: deleteConfirm.id,
          session_id: activeChat
        }));
      }
    } catch (e) {
      console.error('Failed to delete message:', e);
    }
  };

  const handleCopyText = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setMessageMenu(null);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', activeChat);
    formData.append('is_admin', 'true');
    try {
      const res = await api.post('/chat/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, {
        id: res.data.id,
        from: 'admin',
        type: 'image',
        imageUrl: res.data.url,
        senderName: 'You',
        time
      }]);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          session_id: activeChat,
          type: 'image',
          image_url: res.data.url,
          admin_name: user?.full_name || 'Admin',
          timestamp: time
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
    if (!file || !activeChat) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', activeChat);
    formData.append('is_admin', 'true');
    try {
      const res = await api.post('/chat/upload/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fileInfo = {
        name: res.data.name || file.name,
        size: res.data.size || file.size,
        url: res.data.url
      };
      setMessages(prev => [...prev, {
        id: res.data.id,
        from: 'admin',
        type: 'file',
        fileData: fileInfo,
        senderName: 'You',
        time
      }]);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          session_id: activeChat,
          type: 'file',
          file_data: fileInfo,
          admin_name: user?.full_name || 'Admin',
          timestamp: time
        }));
      }
    } catch (e) {
      console.error('File upload failed:', e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSession = (sessionId, customerName) => {
    setDeleteSessionConfirm({ sessionId, customerName });
  };

  const confirmDeleteSession = async () => {
    if (!deleteSessionConfirm) return;

    try {
      await api.delete(`/chat/admin/session/${deleteSessionConfirm.sessionId}`);

      // Remove from customers list
      setCustomers(prev => prev.filter(c => c.session_id !== deleteSessionConfirm.sessionId));

      // If the deleted session was active, clear it
      if (activeChat === deleteSessionConfirm.sessionId) {
        setActiveChat(null);
        setMessages([]);
      }

      setDeleteSessionConfirm(null);
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        clearInterval(recordingTimerRef.current);
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
        formData.append('duration', String(finalDuration));
        formData.append('is_admin', 'true');

        try {
          const res = await api.post('/chat/upload/voice', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          // ONLY add message from API response - don't send via WebSocket
          // The backend will notify customer via WebSocket automatically
          setMessages(prev => [...prev, {
            id: res.data.id,
            from: 'admin',
            type: 'voice',
            voiceUrl: res.data.url,
            voiceDuration: res.data.duration || finalDuration,
            senderName: 'You',
            time
          }]);

        } catch (e) {
          console.error('Voice upload error:', e);
        }

        setIsRecording(false);
        setRecordingTime(0);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      let seconds = 0;
      recordingTimerRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
    } catch (e) {
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

  const filteredCustomers = customers.filter(c =>
    (c.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.sender_email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCustomer = customers.find(c => c.session_id === activeChat);
  const displayName = customerProfile?.name || activeCustomer?.displayName || 'Customer';
  const displayEmail = customerProfile?.email || activeCustomer?.sender_email || '';
  const isRegistered = customerProfile?.is_registered || (activeCustomer?.user_id ? true : false);

  return (
    <Box sx={{ bgcolor: '#f0f2f5', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <Box sx={{
        width: { xs: '100%', sm: 340, md: 380 },
        minWidth: { xs: '100%', sm: 340, md: 380 },
        bgcolor: 'white',
        borderRight: '1px solid #e4e6eb',
        display: { xs: activeChat ? 'none' : 'flex', sm: 'flex' },
        flexDirection: 'column'
      }}>
        <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid #e4e6eb', bgcolor: '#0f172a', color: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin')} sx={{ color: 'white', textTransform: 'none', fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
              Dashboard
            </Button>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Chip
                icon={<Circle sx={{ fontSize: 6, color: connected ? '#22c55e' : '#ef4444' }} />}
                label={connected ? 'Online' : 'Offline'}
                size="small"
                sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 20, sm: 24 }, bgcolor: connected ? '#dcfce7' : '#fee2e2', color: connected ? '#15803d' : '#dc2626', fontWeight: 600 }}
              />
              <IconButton size="small" onClick={loadSessions} sx={{ color: 'white' }}>
                <Refresh sx={{ fontSize: { xs: 16, sm: 18 } }} />
              </IconButton>
            </Stack>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700} fontSize={{ xs: '1rem', sm: '1.1rem', md: '1.25rem' }}>
              Messages
            </Typography>
            {totalUnread > 0 && <Badge badgeContent={totalUnread} color="error" max={99}><ChatIcon sx={{ color: 'white', fontSize: { xs: 20, sm: 24 } }} /></Badge>}
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.3, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            {customers.length} conversation{totalUnread > 0 ? ` • ${totalUnread} unread` : ''}
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 1, sm: 1.5 }, borderBottom: '1px solid #e4e6eb' }}>
          <TextField
            fullWidth size="small" placeholder="Search conversations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#65676b', fontSize: { xs: 16, sm: 20 } }} /></InputAdornment>, sx: { borderRadius: 50, bgcolor: '#f0f2f5', fontSize: { xs: '0.75rem', sm: '0.85rem' }, '& fieldset': { border: 'none' } } }}
          />
        </Box>

        <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
          {filteredCustomers.length === 0 ? (
            <Box textAlign="center" py={6} px={2}>
              <ChatIcon sx={{ fontSize: { xs: 36, sm: 48 }, color: '#cbd5e1', mb: 1 }} />
              <Typography color="#94a3b8" fontSize={{ xs: '0.8rem', sm: '0.9rem' }}>
                {searchTerm ? 'No matching conversations' : 'No conversations yet'}
              </Typography>
            </Box>
          ) : (
            filteredCustomers.map(c => (
              <ListItem
                key={c.session_id}
                button
                selected={activeChat === c.session_id}
                onClick={() => handleSelectCustomer(c.session_id)}
                sx={{
                  py: { xs: 1, sm: 1.2 },
                  px: { xs: 1.5, sm: 2 },
                  bgcolor: activeChat === c.session_id ? '#e7f3ff' : 'transparent',
                  '&:hover': { bgcolor: '#f0f2f5' },
                  '&:hover .delete-session-btn': { opacity: 1, visibility: 'visible' }
                }}
              >
                <ListItemAvatar sx={{ minWidth: { xs: 44, sm: 56 } }}>
                  <Badge badgeContent={c.unread} color="error" overlap="circular" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>
                    <Avatar sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, bgcolor: '#1877f2' }}>
                      <Person sx={{ fontSize: { xs: 20, sm: 24 } }} />
                    </Avatar>
                  </Badge>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography fontWeight={activeChat === c.session_id ? 700 : 500} fontSize={{ xs: '0.8rem', sm: '0.9rem' }} color="#050505" noWrap sx={{ maxWidth: 150 }}>
                        {c.displayName}
                      </Typography>
                      
                    </Stack>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="#65676b" noWrap sx={{ display: 'block', fontSize: '0.7rem' }}>
                        {c.last_message?.substring(0, 40) || 'No messages'}
                      </Typography>
                    </Box>
                  }
                />

                {/* Delete session button */}
                <IconButton
                  className="delete-session-btn"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(c.session_id, c.displayName);
                  }}
                  sx={{
                    opacity: 0,
                    visibility: 'hidden',
                    transition: 'opacity 0.2s ease, visibility 0.2s ease',
                    color: '#ef4444',
                    '&:hover': { bgcolor: '#fee2e2' }
                  }}
                >
                  <Delete sx={{ fontSize: 18 }} />
                </IconButton>
              </ListItem>
            ))
          )}
        </List>
      </Box>

      {/* CHAT AREA */}
      <Box sx={{ flex: 1, display: { xs: activeChat ? 'flex' : 'none', sm: 'flex' }, flexDirection: 'column', bgcolor: '#f0f2f5' }}>
        {activeChat ? (<>
          {/* HEADER */}
          <Box sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 0.8, sm: 1 }, bgcolor: 'white', borderBottom: '1px solid #e4e6eb', flexShrink: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton onClick={() => setActiveChat(null)} size="small">
                  <ArrowBack sx={{ fontSize: { xs: 20, sm: 22 } }} />
                </IconButton>

                <Avatar sx={{ width: { xs: 34, sm: 40 }, height: { xs: 34, sm: 40 }, bgcolor: '#1877f2' }}>
                  <Person sx={{ fontSize: { xs: 18, sm: 20 } }} />
                </Avatar>

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="#050505" fontSize={{ xs: '0.85rem', sm: '0.95rem' }} noWrap sx={{ maxWidth: { xs: 150, sm: 250 } }}>
                    {displayName}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={0.5}>
              </Stack>
            </Stack>
          </Box>

          {/* MESSAGES */}
          <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 2 }}>
            {loading ? (
              <Box textAlign="center" py={6}><CircularProgress size={28} sx={{ color: '#1877f2' }} /></Box>
            ) : messages.length === 0 ? (
              <Box textAlign="center" pt={8}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: '#1877f2', mx: 'auto', mb: 2 }}><Person sx={{ fontSize: 32 }} /></Avatar>
                <Typography fontWeight={600} color="#050505">{displayName}</Typography>
                {displayEmail && <Typography variant="body2" color="#65676b">{displayEmail}</Typography>}
                <Typography variant="body2" color="#94a3b8" mt={1}>No messages yet. Start the conversation!</Typography>
              </Box>
            ) : (
              <Stack spacing={0.5}>
                {messages.map((m, i) => (
                  <Box
                    key={m.id || i}
                    className="message-group"
                    sx={{
                      display: 'flex',
                      justifyContent: m.from === 'admin' ? 'flex-end' : 'flex-start',
                      mb: 0.3,
                      position: 'relative',
                      '&:hover .msg-actions': {
                        opacity: 1,
                        visibility: 'visible'
                      }
                    }}
                  >
                    {/* Customer avatar */}
                    {m.from === 'customer' && (
                      <Avatar sx={{ width: 28, height: 28, mr: 0.5, bgcolor: '#1877f2', flexShrink: 0, mt: 0.5, display: { xs: 'none', sm: 'flex' } }}>
                        <Person sx={{ fontSize: 14 }} />
                      </Avatar>
                    )}

                    <Box sx={{ maxWidth: { xs: '90%', sm: '70%', md: '60%' }, position: 'relative' }}>

                      {/* MESSAGE ACTIONS */}
                      <Box className="msg-actions" sx={{ position: 'absolute', top: -36, right: m.from === 'admin' ? 0 : 'auto', left: m.from === 'customer' ? 0 : 'auto', opacity: 0, visibility: 'hidden', transition: 'opacity 0.2s ease, visibility 0.2s ease', bgcolor: 'white', borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', px: 0.5, py: 0.3, display: 'flex', zIndex: 10, alignItems: 'center', border: '1px solid #e4e6eb' }}>

                        {QUICK_REACTIONS.map(r => (
                          <IconButton key={r} size="small" onClick={(e) => { e.stopPropagation(); handleReaction(m.id, r); }} sx={{ p: 0.3, '&:hover': { transform: 'scale(1.4)', bgcolor: '#f0f2f5' }, transition: 'transform 0.15s ease' }}>
                            <Typography sx={{ fontSize: '1rem' }}>{r}</Typography>
                          </IconButton>
                        ))}

                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === m.id ? null : m.id); }} sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}>
                          <InsertEmoticon sx={{ fontSize: 16, color: '#65676b' }} />
                        </IconButton>

                        {/* Show edit/delete for ALL admin's own messages (text, image, file, voice) */}
                        {m.from === 'admin' && (
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedMessage(m); setMessageMenu(e.currentTarget); }} sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}>
                            <MoreHoriz sx={{ fontSize: 16, color: '#65676b' }} />
                          </IconButton>
                        )}

                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); if (m.type === 'text') handleCopyText(m.text); else if (m.type === 'image') handleCopyText(m.imageUrl); else if (m.type === 'file' && m.fileData) handleCopyText(m.fileData.url); else if (m.type === 'voice' && m.voiceUrl) handleCopyText(m.voiceUrl); }} sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}>
                          <ContentCopy sx={{ fontSize: 14, color: '#65676b' }} />
                        </IconButton>
                      </Box>

                      {/* Emoji picker popup */}
                      {emojiPickerId === m.id && (
                        <Box sx={{ position: 'absolute', bottom: m.reaction ? 50 : 30, right: m.from === 'admin' ? 0 : 'auto', left: m.from === 'customer' ? 0 : 'auto', zIndex: 1000 }}>
                          <Box sx={{ position: 'relative' }}>
                            <EmojiPicker
                              onEmojiClick={(emojiData) => { handleReaction(m.id, emojiData.emoji); }}
                              emojiStyle={EmojiStyle.NATIVE} theme={Theme.LIGHT}
                              width={isMobile ? 280 : 320} height={380}
                              lazyLoadEmojis={true} previewConfig={{ showPreview: false }} skinTonesDisabled={true}
                            />
                            <IconButton size="small" onClick={() => setEmojiPickerId(null)}
                              sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'white', '&:hover': { bgcolor: '#f0f2f5' } }}>
                              <Close sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        </Box>
                      )}

                      {/* Message bubble */}
                      <Box sx={{
                        px: m.type === 'text' ? 1.5 : 0,
                        py: m.type === 'text' ? 1 : 0,
                        borderRadius: m.type === 'text' ? '18px 18px 4px 18px' : '12px',
                        bgcolor: m.type === 'text'
                          ? ((m.from === 'admin' || m.from === 'user') ? '#0084ff' : '#e4e6eb')
                          : 'transparent',
                        color: m.type === 'text'
                          ? ((m.from === 'admin' || m.from === 'user') ? 'white' : '#050505')
                          : 'inherit',
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'visible',
                        position: 'relative'
                      }}>
                        {/* Text message */}
                        {m.type === 'text' && (
                          <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.4, wordBreak: 'break-word' }}>
                            {m.text}
                            {m.isEdited && (
                              <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.7, ml: 0.5 }}>
                                (edited)
                              </Typography>
                            )}
                          </Typography>
                        )}

                        {/* Image message */}
                        {m.type === 'image' && (
                          <Box sx={{ position: 'relative' }}>
                            <Box
                              sx={{
                                maxWidth: 250,
                                borderRadius: '12px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                '&:hover': { opacity: 0.95 }
                              }}
                              onClick={() => window.open(m.imageUrl, '_blank')}
                            >
                              <img
                                src={m.imageUrl}
                                alt="Shared"
                                style={{ width: '100%', display: 'block', maxHeight: 250, objectFit: 'cover' }}
                              />
                            </Box>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                color: (m.from === 'admin' || m.from === 'user') ? 'white' : '#65676b',
                                opacity: 0.8,
                                fontSize: '0.7rem'
                              }}
                            >
                              📷 Photo
                            </Typography>
                          </Box>
                        )}

                        {/* File message */}
                        {m.type === 'file' && m.fileData && (
                          <Paper
                            sx={{
                              p: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              cursor: 'pointer',
                              bgcolor: 'white',
                              borderRadius: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              border: '1px solid #e4e6eb',
                              '&:hover': { bgcolor: '#f8fafc', borderColor: '#0084ff' },
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => window.open(m.fileData.url, '_blank')}
                          >
                            <Box sx={{
                              width: 44,
                              height: 44,
                              borderRadius: '10px',
                              bgcolor: '#e8f0fe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <AttachFile sx={{ color: '#0084ff', fontSize: 22 }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                fontSize="0.85rem"
                                noWrap
                                sx={{ color: '#1a1a1a' }}
                              >
                                {m.fileData.name || 'File'}
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.3 }}>
                                <Typography variant="caption" color="#65676b" fontSize="0.7rem">
                                  {m.fileData.size ? `${Math.round(m.fileData.size / 1024)} KB` : 'File'}
                                </Typography>
                                <Typography variant="caption" color="#65676b" fontSize="0.7rem">•</Typography>
                                <Typography variant="caption" color="#0084ff" fontSize="0.7rem" fontWeight={500}>
                                  📎 Download
                                </Typography>
                              </Stack>
                            </Box>
                          </Paper>
                        )}

                        {/* Voice message - Messenger Style */}
                        {m.type === 'voice' && (
                          <Stack
                            direction="row"
                            spacing={1.2}
                            alignItems="center"
                            sx={{
                              px: 1.5,
                              py: 1.2,
                              borderRadius: '18px',
                              bgcolor: (m.from === 'admin' || m.from === 'user') ? 'rgba(255,255,255,0.15)' : '#f0f2f5',
                              backdropFilter: (m.from === 'admin' || m.from === 'user') ? 'blur(10px)' : 'none',
                              border: (m.from === 'admin' || m.from === 'user') ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e4e6eb',
                              minWidth: 200,
                              maxWidth: 280,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                          >
                            {/* Play/Pause Button */}
                            <Box
                              onClick={() => playVoice(m.voiceUrl, m.id)}
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                bgcolor: '#0084ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(0,132,255,0.3)',
                                '&:hover': { bgcolor: '#0066cc', transform: 'scale(1.05)' },
                                '&:active': { transform: 'scale(0.95)' },
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {playingAudio === m.id ? (
                                <Pause sx={{ fontSize: 16, color: 'white' }} />
                              ) : (
                                <PlayArrow sx={{ fontSize: 18, color: 'white', ml: 0.3 }} />
                              )}
                            </Box>

                            {/* Waveform Bars */}
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25, height: 32 }}>
                              {[12, 16, 10, 20, 14, 18, 24, 12, 16, 22, 14, 18, 20, 12, 16, 10, 22, 14, 18, 12].map((h, i) => (
                                <Box
                                  key={i}
                                  sx={{
                                    width: 2.5,
                                    height: `${h}px`,
                                    borderRadius: '3px',
                                    bgcolor: playingAudio === m.id ? '#0084ff' : '#94a3b8',
                                    opacity: playingAudio === m.id ? 1 : 0.5,
                                    transition: 'all 0.2s ease'
                                  }}
                                />
                              ))}
                            </Box>

                            {/* Duration */}
                            {m.voiceDuration > 0 && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#65676b',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  minWidth: 30,
                                  textAlign: 'right',
                                  letterSpacing: '0.3px'
                                }}
                              >
                                0:{String(m.voiceDuration).padStart(2, '0')}
                              </Typography>
                            )}
                          </Stack>
                        )}

                      </Box>
                      {/* Reaction badge */}
                      {m.reaction && (
                        <Box sx={{ position: 'absolute', bottom: -14, right: m.from === 'admin' ? 4 : 'auto', left: m.from === 'customer' ? 4 : 'auto', zIndex: 5 }}>
                          <Chip
                            label={m.reaction}
                            size="small"
                            onClick={() => handleReaction(m.id, m.reaction)}
                            sx={{
                              height: 22, fontSize: '0.8rem', bgcolor: 'white',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.15)', borderRadius: '12px',
                              border: '1px solid #e4e6eb', cursor: 'pointer',
                              '&:hover': { bgcolor: '#f0f2f5' }
                            }}
                          />
                        </Box>
                      )}

                      {/* Timestamp */}
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.2, mx: 0.5 }}>
                        {m.from === 'customer' && m.senderName && m.senderName !== 'Customer' && (
                          <Typography variant="caption" fontWeight={600} color="#1877f2" fontSize="0.6rem">{m.senderName}</Typography>
                        )}
                        {m.isEdited && <Typography variant="caption" color="#94a3b8" fontSize="0.55rem">Edited</Typography>}
                        <Typography variant="caption" sx={{ color: '#65676b', fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>{m.time}</Typography>
                      </Stack>
                    </Box>

                    {/* Admin avatar */}
                    {m.from === 'admin' && (
                      <Avatar sx={{ width: 28, height: 28, ml: 0.5, bgcolor: '#42b72a', flexShrink: 0, mt: 0.5, display: { xs: 'none', sm: 'flex' } }}>
                        <SupportAgent sx={{ fontSize: 14 }} />
                      </Avatar>
                    )}
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Stack>
            )}
            {uploading && <LinearProgress sx={{ mt: 1, borderRadius: 2 }} />}
          </Box>

          {/* INPUT AREA */}
          <Box sx={{ px: { xs: 1, sm: 2 }, pb: { xs: 1, sm: 1.5 }, pt: 1, bgcolor: 'white', flexShrink: 0, borderTop: '1px solid #e4e6eb', position: 'relative' }}>
            {isRecording && <Box sx={{ textAlign: 'center', mb: 1 }}><Chip icon={<Circle sx={{ fontSize: 8, color: '#ef4444' }} />} label={`Recording ${recordingTime}s`} color="error" size="small" onDelete={stopRecording} /></Box>}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} />
              <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
              <IconButton size="small" onClick={() => imageInputRef.current?.click()} sx={{ color: '#65676b' }}><Image sx={{ fontSize: { xs: 20, sm: 22 } }} /></IconButton>
              <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: '#65676b' }}><AttachFile sx={{ fontSize: { xs: 20, sm: 22 } }} /></IconButton>
              <Box sx={{ flex: 1, bgcolor: '#f0f2f5', borderRadius: 50, px: 1.5 }}>
                <TextField fullWidth multiline maxRows={4} size="small" placeholder="Aa" value={input} onChange={e => setInput(e.target.value)}
                  onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  variant="standard" InputProps={{ disableUnderline: true, sx: { fontSize: { xs: '0.8rem', sm: '0.9rem' } } }} />
              </Box>
              {input.trim() ? (
                <IconButton onClick={handleSend} sx={{ color: '#1877f2' }}><Send sx={{ fontSize: { xs: 20, sm: 22 } }} /></IconButton>
              ) : (
                <IconButton onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} sx={{ color: '#1877f2' }}>
                  {isRecording ? <Stop sx={{ fontSize: { xs: 20, sm: 22 }, color: '#ef4444' }} /> : <Mic sx={{ fontSize: { xs: 20, sm: 22 } }} />}
                </IconButton>
              )}
            </Stack>
            {inputEmojiPicker && (
              <Box sx={{ position: 'absolute', bottom: 60, left: 0, zIndex: 1000 }}>
                <EmojiPicker onEmojiClick={(emojiData) => { setInput(prev => prev + emojiData.emoji); }} emojiStyle={EmojiStyle.NATIVE} theme={Theme.LIGHT} width={isMobile ? window.innerWidth - 32 : 350} height={350} />
              </Box>
            )}
          </Box>
        </>) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', p: 3 }}>
            <Box sx={{ width: { xs: 72, sm: 96 }, height: { xs: 72, sm: 96 }, borderRadius: '50%', bgcolor: '#e4e6eb', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <ChatIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: '#65676b' }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color="#050505" textAlign="center" fontSize={{ xs: '1rem', sm: '1.25rem' }}>
              Select a conversation
            </Typography>
            <Typography variant="body2" color="#65676b" textAlign="center" mt={1}>
              Choose a customer from the list to view their messages
            </Typography>
          </Box>
        )}
      </Box>

      {/* DIALOGS */}
      <Menu anchorEl={messageMenu} open={Boolean(messageMenu)} onClose={() => setMessageMenu(null)}>
        {/* Edit only for text messages */}
        {selectedMessage?.type === 'text' && (
          <MenuItem onClick={handleEditClick}>
            <Edit sx={{ mr: 1, fontSize: 18 }} /> Edit
          </MenuItem>
        )}
        {/* Delete for ALL message types */}
        <MenuItem onClick={handleDeleteClick} sx={{ color: '#ef4444' }}>
          <Delete sx={{ mr: 1, fontSize: 18 }} /> Delete
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedMessage?.type === 'text') handleCopyText(selectedMessage?.text);
          else if (selectedMessage?.type === 'image') handleCopyText(selectedMessage?.imageUrl);
          else if (selectedMessage?.type === 'file' && selectedMessage?.fileData) handleCopyText(selectedMessage?.fileData.url);
          else if (selectedMessage?.type === 'voice' && selectedMessage?.voiceUrl) handleCopyText(selectedMessage?.voiceUrl);
        }}>
          <ContentCopy sx={{ mr: 1, fontSize: 18 }} /> Copy
        </MenuItem>
      </Menu>
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, message: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Message</DialogTitle><DialogContent><TextField fullWidth multiline rows={3} value={editText} onChange={e => setEditText(e.target.value)} autoFocus sx={{ mt: 1 }} /></DialogContent>
        <DialogActions><Button onClick={() => setEditDialog({ open: false, message: null })}>Cancel</Button><Button variant="contained" onClick={handleEditSave}>Save</Button></DialogActions>
      </Dialog>
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Message?</DialogTitle><DialogContent><Typography>This will be permanently deleted.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="contained" color="error" onClick={handleDeleteConfirm}>Delete</Button></DialogActions>
      </Dialog>
      <Dialog open={!!deleteSessionConfirm} onClose={() => setDeleteSessionConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Delete sx={{ color: '#ef4444' }} />
          Delete Conversation?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Are you sure you want to delete the entire conversation with <strong>{deleteSessionConfirm?.customerName}</strong>?
          </Typography>
          <Typography variant="body2" color="#ef4444" sx={{ bgcolor: '#fef2f2', p: 1.5, borderRadius: 1 }}>
            ⚠️ This will permanently delete all messages in this conversation. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteSessionConfirm(null)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteSession}
            variant="contained"
            color="error"
            startIcon={<Delete />}
          >
            Delete Conversation
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={notification.open} autoHideDuration={5000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} sx={{ mt: { xs: 0, sm: 8 } }}>
        <Alert severity="info" variant="filled" onClose={() => setNotification({ ...notification, open: false })} sx={{ borderRadius: 2, cursor: 'pointer' }} onClick={() => { if (notification.sessionId) handleSelectCustomer(notification.sessionId); setNotification({ ...notification, open: false }); }}>
          <Stack spacing={0.3}><Typography variant="subtitle2" fontWeight={700}>📩 {notification.customerName}</Typography><Typography variant="body2" sx={{ opacity: 0.9 }}>{notification.message}</Typography></Stack>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminChat;