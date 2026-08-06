// src/pages/admin/AdminChat.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, TextField, IconButton, Avatar, Chip,
  List, ListItem, ListItemAvatar, ListItemText, Badge, Button,
  CircularProgress, Paper, InputAdornment, useMediaQuery, useTheme,
  Snackbar, Alert, Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, LinearProgress, Tooltip, Divider,
} from '@mui/material';
import {
  Send, ArrowBack, Chat as ChatIcon, Person, SupportAgent,
  Circle, Refresh, Search, Edit, Delete, MoreHoriz, Close,
  InsertEmoticon, ContentCopy, Image, AttachFile, Mic, Stop,
  PlayArrow, Pause, Email, Phone, Badge as BadgeIcon,
  CheckCircle, Cancel, AccessTime, Info,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import FileViewer from '../../components/chat/FileViewer';

const getWsUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  if (apiUrl.includes('onrender.com')) {
    return apiUrl.replace('https://', 'wss://').replace('/api', '');
  } else {
    return apiUrl.replace('http://', 'ws://').replace('/api', '');
  }
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const getMessagePreview = (message, messageType) => {
  if (!message) return 'No messages';
  if (messageType === 'image') return '📷 Photo';
  if (messageType === 'file') {
    try { const fileData = JSON.parse(message); return `📎 ${fileData.name || 'File'}`; } catch { return '📎 File'; }
  }
  if (messageType === 'voice') {
    try { const voiceData = JSON.parse(message); return `🎤 Voice message (0:${String(voiceData.duration || 0).padStart(2, '0')})`; } catch { return '🎤 Voice message'; }
  }
  if (message && message.startsWith('http')) {
    if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(message)) return '📷 Photo';
    if (/\.(mp3|wav|ogg|webm|m4a)(\?|$)/i.test(message)) return '🎤 Voice message';
    return '📎 Attachment';
  }
  return message.substring(0, 40);
};

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
  const [viewer, setViewer] = useState({ open: false, imageUrl: '', fileData: null, messageId: null });
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  const [messageMenu, setMessageMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editDialog, setEditDialog] = useState({ open: false, message: null });
  const [editText, setEditText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [emojiPickerId, setEmojiPickerId] = useState(null);

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
  const reconnectTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(null);
  const token = localStorage.getItem('access_token');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  
  useEffect(() => {
    loadSessions(); 
    connectWs(); 
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  useEffect(() => { 
    if (activeChat) { 
      loadMessages(activeChat);
      setShowProfileDetails(false);
    } 
  }, [activeChat]);

  useEffect(() => {
    if (activeChat) {
      const customer = customers.find(c => c.session_id === activeChat);
      console.log('📋 Loading profile for customer:', customer);

      if (customer) {
        const profileData = {
          name: customer.displayName || 'Customer',
          email: customer.sender_email || null,
          phone: customer.phone || null,
          is_registered: !!customer.user_id,
          avatar_url: customer.avatar_url || null,
          user_id: customer.user_id || null,
          is_active: customer.is_active || false,
          created_at: customer.created_at || null,
        };

        if (customer.user_id) {
          loadCustomerProfileByUserId(customer.user_id, profileData);
        } else {
          console.log('👤 Guest user profile:', profileData);
          setCustomerProfile(profileData);
        }
      } else {
        const fallbackProfile = {
          name: 'Customer',
          email: null,
          phone: null,
          is_registered: false,
          avatar_url: null,
          user_id: null,
          is_active: false,
          created_at: null,
        };
        setCustomerProfile(fallbackProfile);
      }
    }
  }, [activeChat, customers]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const unread = customers.reduce((sum, c) => sum + (c.unread || 0), 0);
    setTotalUnread(unread);
    document.title = unread > 0 ? `(${unread}) Chat Support` : 'Chat Support';
    return () => { document.title = 'TeleShop Admin'; };
  }, [customers]);

  const connectWs = () => {
    if (!token) {
      console.log('⚠️ No token, WebSocket connection skipped');
      return;
    }

    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) { }
      wsRef.current = null;
    }

    try {
      const wsUrl = `${getWsUrl()}/ws/admin/${token}`;
      console.log('🔗 Connecting Admin WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Admin WebSocket connected');
        setConnected(true);
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Admin WebSocket message:', data);

          if (data.type === 'customer_message') {
            const sid = data.session_id || data.from_user_id;
            
            // Update total unread count
            if (activeChatRef.current !== sid) {
              setTotalUnread(prev => prev + 1);
            }
            
            // Update session-specific unread count
            if (activeChatRef.current !== sid) {
              setCustomers(prev => prev.map(c => 
                c.session_id === sid ? { ...c, unread: (c.unread || 0) + 1 } : c
              ));
            }
            
            if (activeChatRef.current === sid && data.message_id) {
              setMessages(prev => {
                if (prev.find(m => m.id === data.message_id)) return prev;
                const msgType = data.message_type || 'text';
                let messageData = {
                  id: data.message_id,
                  from: 'customer',
                  type: msgType,
                  senderName: data.sender_name || 'Customer',
                  time: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isEdited: false,
                  reaction: null
                };
                if (msgType === 'text') messageData.text = data.message || '';
                else if (msgType === 'image') { messageData.imageUrl = data.image_url || data.message || ''; messageData.text = ''; }
                else if (msgType === 'file') { messageData.fileData = data.file_data || { url: '', name: 'File', size: 0 }; messageData.text = ''; }
                else if (msgType === 'voice') { messageData.voiceUrl = data.voice_url || ''; messageData.voiceDuration = data.voice_duration || 0; messageData.text = ''; }
                return [...prev, messageData];
              });
              api.put(`/chat/read/${sid}`).catch(e => { });
            } else if (activeChatRef.current !== sid) {
              let n = data.message?.substring(0, 60) || '';
              if (data.message_type === 'image') n = '📷 Sent a photo';
              else if (data.message_type === 'file') n = '📎 Sent a file';
              else if (data.message_type === 'voice') n = '🎤 Sent a voice message';
              setNotification({
                open: true,
                message: n,
                customerName: data.sender_name || 'Customer',
                sessionId: sid
              });
            }
            loadSessions();
          }
          else if (data.type === 'message_sent') {
            if (activeChatRef.current === data.session_id) {
              setMessages(prev => {
                const hasTemp = prev.some(m => 
                  m.id && m.id.toString().startsWith('temp_') && 
                  m.from === 'admin' &&
                  m.type === (data.message_type || 'text') &&
                  m.text === data.message
                );
                
                if (hasTemp) {
                  return prev.map(m => 
                    (m.id && m.id.toString().startsWith('temp_') && 
                     m.from === 'admin' &&
                     m.type === (data.message_type || 'text') &&
                     m.text === data.message)
                      ? {
                          id: data.message_id,
                          from: 'admin',
                          type: data.message_type || 'text',
                          text: data.message || '',
                          senderName: 'You',
                          time: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          isEdited: false,
                          reaction: null
                        }
                      : m
                  );
                }
                
                if (prev.find(m => m.id === data.message_id)) return prev;
                
                const msgType = data.message_type || 'text';
                let messageData = {
                  id: data.message_id,
                  from: 'admin',
                  type: msgType,
                  senderName: 'You',
                  time: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isEdited: false,
                  reaction: null
                };
                if (msgType === 'text') messageData.text = data.message || '';
                else if (msgType === 'image') { messageData.imageUrl = data.image_url || data.message || ''; messageData.text = ''; }
                else if (msgType === 'file') { messageData.fileData = data.file_data || { url: data.message, name: 'File', size: 0 }; messageData.text = ''; }
                else if (msgType === 'voice') { messageData.voiceUrl = data.voice_url || ''; messageData.voiceDuration = data.voice_duration || 0; messageData.text = ''; }
                return [...prev, messageData];
              });
            }
          }
          else if (data.type === 'message_edited') {
            if (activeChatRef.current === data.session_id) {
              setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, text: data.new_message, isEdited: true } : m));
            }
          }
          else if (data.type === 'message_deleted') {
            if (activeChatRef.current === data.session_id) {
              setMessages(prev => prev.filter(m => m.id !== data.message_id));
            }
          }
          else if (data.type === 'message_reaction') {
            if (activeChatRef.current === data.session_id) {
              setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, reaction: data.reaction } : m));
            }
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      };

      ws.onclose = (event) => {
        console.log('❌ Admin WebSocket disconnected', event.code, event.reason);
        setConnected(false);
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          console.log('🔄 Reconnecting WebSocket...');
          connectWs();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('❌ Admin WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      setConnected(false);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        console.log('🔄 Retrying WebSocket connection...');
        connectWs();
      }, 5000);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await api.get('/chat/admin/sessions');
      console.log('📋 Sessions loaded:', res.data);

      setCustomers((res.data || []).map(c => {
        let messageType = 'text';
        const lastMsg = c.last_message || '';
        if (lastMsg.startsWith('http')) {
          if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(lastMsg)) messageType = 'image';
          else if (/\.(mp3|wav|ogg|webm|m4a)(\?|$)/i.test(lastMsg)) messageType = 'voice';
          else messageType = 'file';
        } else if (lastMsg.startsWith('{') && lastMsg.includes('"url"')) {
          try { const p = JSON.parse(lastMsg); if (p.duration !== undefined) messageType = 'voice'; else if (p.name) messageType = 'file'; } catch { }
        }

        return {
          ...c,
          message_type: c.message_type || messageType,
          displayName: c.sender_name || 'Customer',
          unread: c.session_id === activeChatRef.current ? 0 : (c.unread || 0),
          user_id: c.user_id || null,
          is_active: c.is_active || false,
          created_at: c.created_at || null,
          avatar_url: c.avatar_url || null,
          phone: c.phone || null,
          sender_email: c.sender_email || null,
        };
      }));
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  };

  const loadCustomerProfileByUserId = async (userId, fallbackProfile) => {
    if (!userId) {
      setCustomerProfile(fallbackProfile);
      return;
    }

    try {
      const res = await api.get(`/chat/customer-profile-by-user/${userId}`);
      console.log('📋 Customer profile from API:', res.data);

      if (res.data && !res.data.is_admin) {
        const profile = {
          name: res.data.name || fallbackProfile.name,
          email: res.data.email || fallbackProfile.email,
          phone: res.data.phone || fallbackProfile.phone,
          is_registered: res.data.is_registered || false,
          avatar_url: res.data.avatar_url || fallbackProfile.avatar_url || null,
          user_id: userId,
          is_active: res.data.is_active || false,
          created_at: res.data.created_at || null,
          telegram_chat_id: res.data.telegram_chat_id || null,
        };
        console.log('✅ Setting customer profile:', profile);
        setCustomerProfile(profile);
      } else {
        console.log('⚠️ API returned admin data, using fallback');
        setCustomerProfile(fallbackProfile);
      }
    } catch (e) {
      console.error('❌ Failed to load customer profile:', e);
      setCustomerProfile(fallbackProfile);
    }
  };

  const loadMessages = async (sid) => {
    setLoading(true);
    try {
      const res = await api.get(`/chat/messages/${sid}`);
      setMessages((res.data || []).map(m => {
        const msgType = m.message_type || 'text';
        let imageUrl = null, fileData = null, voiceUrl = null, voiceDuration = 0;
        let text = m.message || '';
        if (msgType === 'image') { imageUrl = m.message; text = ''; }
        else if (msgType === 'file') { try { fileData = JSON.parse(m.message); text = ''; } catch { fileData = { url: m.message, name: 'File', size: 0 }; text = ''; } }
        else if (msgType === 'voice') { try { const vd = JSON.parse(m.message); voiceUrl = vd.url; voiceDuration = vd.duration || 0; text = ''; } catch { voiceUrl = m.message; voiceDuration = 0; text = ''; } }
        return {
          id: m.id,
          from: m.is_admin_reply ? 'admin' : 'customer',
          text,
          type: msgType,
          imageUrl,
          fileData,
          voiceUrl,
          voiceDuration,
          senderName: m.is_admin_reply ? 'You' : (m.sender_name || 'Customer'),
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isEdited: m.is_edited || false,
          reaction: m.reaction || null
        };
      }));
    } catch (e) {
      setMessages([]);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeChat) return;
    const txt = input.trim();
    setInput('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        session_id: activeChat,
        message: txt,
        type: 'text',
        admin_name: user?.full_name || 'Admin',
        timestamp: time
      }));

      const tempId = 'temp_' + Date.now();
      setMessages(prev => [...prev, {
        id: tempId,
        from: 'admin',
        text: txt,
        type: 'text',
        senderName: 'You',
        time: time,
        isEdited: false,
        reaction: null
      }]);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
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
        console.error('Send failed:', e);
        setSnackbar({ open: true, message: 'Failed to send message', severity: 'error' });
        setInput(txt);
      }
    }
    loadSessions();
  };

  const handleSelectCustomer = async (sessionId) => {
    setCustomerProfile(null);
    setActiveChat(sessionId);
    setShowProfileDetails(false);

    await api.put(`/chat/read/${sessionId}`).catch(e => { });

    setCustomers(prev => prev.map(c =>
      c.session_id === sessionId ? { ...c, unread: 0 } : c
    ));
    
    // Recalculate total unread
    const remainingUnread = customers.reduce((sum, c) => 
      c.session_id === sessionId ? sum : sum + (c.unread || 0), 0
    );
    setTotalUnread(remainingUnread);
  };

  const handleReaction = async (msgId, emoji) => {
    const currentMsg = messages.find(m => m.id === msgId);
    const newReaction = currentMsg?.reaction === emoji ? null : emoji;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reaction: newReaction } : m));
    setEmojiPickerId(null);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message_reaction',
        message_id: msgId,
        session_id: activeChat,
        reaction: newReaction
      }));
    } else {
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
      setMessages(prev => prev.map(m => m.id === editDialog.message.id ? { ...m, text: editText, isEdited: true } : m));
      setEditDialog({ open: false, message: null });
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message_edited',
          message_id: editDialog.message.id,
          session_id: activeChat,
          new_message: editText
        }));
      }
    } catch (e) {
      console.error('Edit failed:', e);
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
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message_deleted',
          message_id: deleteConfirm.id,
          session_id: activeChat
        }));
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleCopyText = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setMessageMenu(null);
    }
  };

  const handleOpenViewer = (imageUrl = null, fileData = null, messageId = null) => {
    setViewer({ open: true, imageUrl: imageUrl || '', fileData, messageId });
  };

  const handleCloseViewer = () => {
    setViewer({ open: false, imageUrl: '', fileData: null, messageId: null });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('session_id', activeChat);
    fd.append('is_admin', 'true');
    try {
      const res = await api.post('/chat/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessages(prev => [...prev, {
        id: res.data.id,
        from: 'admin',
        type: 'image',
        imageUrl: res.data.url,
        text: '',
        senderName: 'You',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
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
    const fd = new FormData();
    fd.append('file', file);
    fd.append('session_id', activeChat);
    fd.append('is_admin', 'true');
    try {
      const res = await api.post('/chat/upload/file', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fi = {
        name: res.data.name || file.name,
        size: res.data.size || file.size,
        url: res.data.url
      };
      setMessages(prev => [...prev, {
        id: res.data.id,
        from: 'admin',
        type: 'file',
        fileData: fi,
        text: '',
        senderName: 'You',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
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
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'delete_session',
        session_id: deleteSessionConfirm.sessionId
      }));
    }
    
    try {
      await api.delete(`/chat/admin/session/${deleteSessionConfirm.sessionId}`);
      setCustomers(prev => prev.filter(c => c.session_id !== deleteSessionConfirm.sessionId));
      if (activeChat === deleteSessionConfirm.sessionId) {
        setActiveChat(null);
        setMessages([]);
      }
      setDeleteSessionConfirm(null);
    } catch (e) {
      console.error('Delete session failed:', e);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mr.onstop = async () => {
        clearInterval(recordingTimerRef.current);
        const duration = recordingTime;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size === 0) {
          setIsRecording(false);
          setRecordingTime(0);
          return;
        }
        const fd = new FormData();
        fd.append('file', blob, `voice_${Date.now()}.webm`);
        fd.append('session_id', activeChat);
        fd.append('duration', String(duration));
        fd.append('is_admin', 'true');
        try {
          const res = await api.post('/chat/upload/voice', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          setMessages(prev => [...prev, {
            id: res.data.id,
            from: 'admin',
            type: 'voice',
            voiceUrl: res.data.url,
            voiceDuration: res.data.duration || duration,
            text: '',
            senderName: 'You',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } catch (e) {
          console.error('Voice upload failed:', e);
        }
        setIsRecording(false);
        setRecordingTime(0);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      let s = 0;
      recordingTimerRef.current = setInterval(() => {
        s++;
        setRecordingTime(s);
      }, 1000);
    } catch (e) {
      alert('Please allow microphone access');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const playVoice = (url, id) => {
    if (playingAudio === id) {
      audioRef.current.pause();
      setPlayingAudio(null);
      return;
    }
    audioRef.current.src = url;
    audioRef.current.play();
    setPlayingAudio(id);
    audioRef.current.onended = () => setPlayingAudio(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvatarUrl = () => {
    return customerProfile?.avatar_url || activeCustomer?.avatar_url || null;
  };

  const getDisplayName = () => {
    return customerProfile?.name || activeCustomer?.displayName || 'Customer';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const filteredCustomers = customers.filter(c =>
    (c.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.sender_email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const activeCustomer = customers.find(c => c.session_id === activeChat);

  return (
    <Box sx={{ bgcolor: '#f0f2f5', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar */}
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
                sx={{
                  fontSize: { xs: '0.6rem', sm: '0.7rem' },
                  height: { xs: 20, sm: 24 },
                  bgcolor: connected ? '#dcfce7' : '#fee2e2',
                  color: connected ? '#15803d' : '#dc2626',
                  fontWeight: 600
                }}
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
            {totalUnread > 0 && (
              <Badge badgeContent={totalUnread} color="error" max={99}>
                <ChatIcon sx={{ color: 'white', fontSize: { xs: 20, sm: 24 } }} />
              </Badge>
            )}
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.3, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            {customers.length} conversation{totalUnread > 0 ? ` • ${totalUnread} unread` : ''}
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 1, sm: 1.5 }, borderBottom: '1px solid #e4e6eb' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: '#65676b', fontSize: { xs: 16, sm: 20 } }} /></InputAdornment>,
              sx: {
                borderRadius: 50,
                bgcolor: '#f0f2f5',
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                '& fieldset': { border: 'none' }
              }
            }}
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
                  <Badge
                    badgeContent={c.unread || 0}
                    color="error"
                    overlap="circular"
                    sx={{ 
                      '& .MuiBadge-badge': { 
                        fontSize: '0.6rem', 
                        height: 18, 
                        minWidth: 18,
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontWeight: 'bold'
                      } 
                    }}
                  >
                    <Avatar
                      sx={{
                        width: { xs: 40, sm: 48 },
                        height: { xs: 40, sm: 48 },
                        bgcolor: c.avatar_url ? 'transparent' : '#1877f2'
                      }}
                      src={c.avatar_url || ''}
                    >
                      {!c.avatar_url && (
                        <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 700, color: 'white' }}>
                          {(c.displayName || 'C').charAt(0).toUpperCase()}
                        </Typography>
                      )}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography fontWeight={activeChat === c.session_id ? 700 : 500} fontSize={{ xs: '0.8rem', sm: '0.9rem' }} color="#050505" noWrap>
                      {c.displayName}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="#65676b" noWrap sx={{ fontSize: '0.7rem' }}>
                      {getMessagePreview(c.last_message, c.message_type)}
                    </Typography>
                  }
                />
                <IconButton
                  className="delete-session-btn"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(c.session_id, c.displayName); }}
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

      {/* Chat Area */}
      <Box sx={{
        flex: 1,
        display: { xs: activeChat ? 'flex' : 'none', sm: 'flex' },
        flexDirection: 'column',
        bgcolor: '#f0f2f5'
      }}>
        {activeChat ? (
          <>
            {/* Chat Header with Complete Customer Profile */}
            <Box sx={{ 
              px: { xs: 1.5, sm: 2 }, 
              py: { xs: 0.8, sm: 1 }, 
              bgcolor: 'white', 
              borderBottom: '1px solid #e4e6eb', 
              flexShrink: 0 
            }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton onClick={() => setActiveChat(null)} size="small">
                  <ArrowBack sx={{ fontSize: { xs: 20, sm: 22 } }} />
                </IconButton>

                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: customerProfile?.is_active ? '#22c55e' : '#94a3b8',
                      color: customerProfile?.is_active ? '#22c55e' : '#94a3b8',
                      boxShadow: `0 0 0 2px white`,
                      width: 12,
                      height: 12,
                      borderRadius: '50%'
                    }
                  }}
                >
                  <Avatar
                    sx={{
                      width: { xs: 40, sm: 48 },
                      height: { xs: 40, sm: 48 },
                      bgcolor: getAvatarUrl() ? 'transparent' : '#1877f2',
                      cursor: 'pointer'
                    }}
                    src={getAvatarUrl() || ''}
                    onClick={() => setShowProfileDetails(!showProfileDetails)}
                  >
                    {!getAvatarUrl() && (
                      <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 700, color: 'white' }}>
                        {getInitials()}
                      </Typography>
                    )}
                  </Avatar>
                </Badge>

                <Box 
                  sx={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => setShowProfileDetails(!showProfileDetails)}
                >
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="subtitle2" fontWeight={600} color="#050505" fontSize={{ xs: '0.85rem', sm: '0.95rem' }}>
                      {getDisplayName()}
                    </Typography>
                    
                    {customerProfile?.is_registered ? (
                      <Tooltip title="Registered User">
                        <CheckCircle sx={{ fontSize: 16, color: '#22c55e' }} />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Guest User">
                        <Info sx={{ fontSize: 16, color: '#94a3b8' }} />
                      </Tooltip>
                    )}
                    
                    {customerProfile?.is_active && (
                      <Chip 
                        label="Online" 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          fontSize: '0.6rem',
                          bgcolor: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 600
                        }} 
                      />
                    )}
                  </Stack>

                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.3 }}>
                    {customerProfile?.email && (
                      <Stack direction="row" spacing={0.3} alignItems="center">
                        <Email sx={{ fontSize: 12, color: '#65676b' }} />
                        <Typography variant="caption" color="#65676b" fontSize="0.65rem" noWrap sx={{ maxWidth: 150 }}>
                          {customerProfile.email}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>

                {/* Total Unread Badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Badge 
                    badgeContent={totalUnread} 
                    color="error"
                    max={99}
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.65rem',
                        height: 20,
                        minWidth: 20,
                      }
                    }}
                  >
                    <ChatIcon sx={{ 
                      fontSize: 22, 
                      color: totalUnread > 0 ? '#1877f2' : '#94a3b8',
                      transition: 'color 0.3s ease'
                    }} />
                  </Badge>
                  
                  {totalUnread > 0 && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#ef4444', 
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        display: { xs: 'none', sm: 'block' }
                      }}
                    >
                      New
                    </Typography>
                  )}
                </Box>

                <Tooltip title="View Profile Details">
                  <IconButton 
                    size="small"
                    onClick={() => setShowProfileDetails(!showProfileDetails)}
                    sx={{ 
                      bgcolor: showProfileDetails ? '#e7f3ff' : 'transparent',
                      '&:hover': { bgcolor: '#f0f2f5' }
                    }}
                  >
                    <Info sx={{ fontSize: 18, color: showProfileDetails ? '#1877f2' : '#65676b' }} />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Expanded Profile Details Panel */}
              {showProfileDetails && customerProfile && (
                <Paper 
                  elevation={0}
                  sx={{ 
                    mt: 1.5, 
                    p: 2, 
                    bgcolor: '#f8fafc', 
                    borderRadius: 2,
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          bgcolor: getAvatarUrl() ? 'transparent' : '#1877f2',
                          border: '3px solid white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        src={getAvatarUrl() || ''}
                      >
                        {!getAvatarUrl() && (
                          <Typography sx={{ fontSize: 28, fontWeight: 700, color: 'white' }}>
                            {getInitials()}
                          </Typography>
                        )}
                      </Avatar>
                      
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="#1a1a1a">
                          Customer Profile
                        </Typography>
                        <Typography variant="body2" color="#65676b">
                          {customerProfile.is_registered ? 'Registered User' : 'Guest User'}
                        </Typography>
                      </Box>
                      
                      <IconButton size="small" onClick={() => setShowProfileDetails(false)}>
                        <Close sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>

                    <Divider />

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                      <Box>
                        <Typography variant="caption" color="#65676b" fontWeight={600}>
                          Full Name
                        </Typography>
                        <Typography variant="body2" color="#050505" fontWeight={500}>
                          {customerProfile.name || 'N/A'}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#65676b" fontWeight={600}>
                          Email
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Email sx={{ fontSize: 14, color: '#65676b' }} />
                          <Typography variant="body2" color="#050505">
                            {customerProfile.email || 'N/A'}
                          </Typography>
                        </Stack>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#65676b" fontWeight={600}>
                          Phone
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Phone sx={{ fontSize: 14, color: '#65676b' }} />
                          <Typography variant="body2" color="#050505">
                            {customerProfile.phone || 'N/A'}
                          </Typography>
                        </Stack>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#65676b" fontWeight={600}>
                          User ID
                        </Typography>
                        <Typography variant="body2" color="#050505" fontFamily="monospace" fontSize="0.8rem">
                          {customerProfile.user_id ? `#${customerProfile.user_id}` : 'Guest'}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#65676b" fontWeight={600}>
                          Account Status
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            icon={customerProfile.is_registered ? <CheckCircle sx={{ fontSize: 14 }} /> : <Cancel sx={{ fontSize: 14 }} />}
                            label={customerProfile.is_registered ? 'Registered' : 'Guest'}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              bgcolor: customerProfile.is_registered ? '#dcfce7' : '#f1f5f9',
                              color: customerProfile.is_registered ? '#15803d' : '#64748b',
                            }}
                          />
                        </Stack>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#65676b" fontWeight={600}>
                          Active Status
                        </Typography>
                        <Chip
                          icon={customerProfile.is_active ? <Circle sx={{ fontSize: 8, color: '#22c55e' }} /> : <Circle sx={{ fontSize: 8, color: '#94a3b8' }} />}
                          label={customerProfile.is_active ? 'Active Now' : 'Offline'}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            bgcolor: customerProfile.is_active ? '#dcfce7' : '#f1f5f9',
                            color: customerProfile.is_active ? '#15803d' : '#64748b',
                          }}
                        />
                      </Box>

                      {customerProfile.created_at && (
                        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                          <Typography variant="caption" color="#65676b" fontWeight={600}>
                            Member Since
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <AccessTime sx={{ fontSize: 14, color: '#65676b' }} />
                            <Typography variant="body2" color="#050505">
                              {formatDate(customerProfile.created_at)}
                            </Typography>
                          </Stack>
                        </Box>
                      )}

                      {customerProfile.telegram_chat_id && (
                        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                          <Typography variant="caption" color="#65676b" fontWeight={600}>
                            Telegram Connected
                          </Typography>
                          <Typography variant="body2" color="#22c55e" fontWeight={500}>
                            ✅ Yes (ID: {customerProfile.telegram_chat_id})
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              )}
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 2 }}>
              {loading ? (
                <Box textAlign="center" py={6}><CircularProgress size={28} sx={{ color: '#1877f2' }} /></Box>
              ) : messages.length === 0 ? (
                <Box textAlign="center" pt={4}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: getAvatarUrl() ? 'transparent' : '#1877f2',
                      mx: 'auto',
                      mb: 2,
                      border: '4px solid white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    src={getAvatarUrl() || ''}
                  >
                    {!getAvatarUrl() && (
                      <Typography sx={{ fontSize: 40, fontWeight: 700, color: 'white' }}>
                        {getInitials()}
                      </Typography>
                    )}
                  </Avatar>
                  
                  <Typography fontWeight={700} color="#050505" fontSize="1.2rem" mb={0.5}>
                    {getDisplayName()}
                  </Typography>

                  <Stack spacing={1.5} sx={{ maxWidth: 400, mx: 'auto', mt: 3 }}>
                    {customerProfile?.email && (
                      <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'white' }}>
                        <Email sx={{ color: '#1877f2', fontSize: 20 }} />
                        <Box>
                          <Typography variant="caption" color="#65676b" fontWeight={600}>Email</Typography>
                          <Typography variant="body2" color="#050505">{customerProfile.email}</Typography>
                        </Box>
                      </Paper>
                    )}

                    {customerProfile?.phone && (
                      <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'white' }}>
                        <Phone sx={{ color: '#1877f2', fontSize: 20 }} />
                        <Box>
                          <Typography variant="caption" color="#65676b" fontWeight={600}>Phone</Typography>
                          <Typography variant="body2" color="#050505">{customerProfile.phone}</Typography>
                        </Box>
                      </Paper>
                    )}

                    <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'white' }}>
                      <BadgeIcon sx={{ color: '#1877f2', fontSize: 20 }} />
                      <Box>
                        <Typography variant="caption" color="#65676b" fontWeight={600}>Account Type</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" color="#050505">
                            {customerProfile?.is_registered ? 'Registered User' : 'Guest User'}
                          </Typography>
                          {customerProfile?.user_id && (
                            <Chip label={`ID: ${customerProfile.user_id}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                          )}
                        </Stack>
                      </Box>
                    </Paper>

                    {customerProfile?.is_registered && (
                      <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'white' }}>
                        {customerProfile?.is_active ? (
                          <Circle sx={{ color: '#22c55e', fontSize: 20 }} />
                        ) : (
                          <Circle sx={{ color: '#94a3b8', fontSize: 20 }} />
                        )}
                        <Box>
                          <Typography variant="caption" color="#65676b" fontWeight={600}>Status</Typography>
                          <Typography variant="body2" color={customerProfile?.is_active ? '#22c55e' : '#64748b'}>
                            {customerProfile?.is_active ? 'Active Now' : 'Offline'}
                          </Typography>
                        </Box>
                      </Paper>
                    )}

                    {customerProfile?.created_at && (
                      <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'white' }}>
                        <AccessTime sx={{ color: '#1877f2', fontSize: 20 }} />
                        <Box>
                          <Typography variant="caption" color="#65676b" fontWeight={600}>Member Since</Typography>
                          <Typography variant="body2" color="#050505">{formatDate(customerProfile.created_at)}</Typography>
                        </Box>
                      </Paper>
                    )}
                  </Stack>

                  <Typography variant="body2" color="#94a3b8" mt={3}>
                    No messages yet. Start the conversation!
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={0.5}>
                  {messages.map((m, i) => (
                    <Box
                      key={m.id || i}
                      sx={{
                        display: 'flex',
                        justifyContent: m.from === 'admin' ? 'flex-end' : 'flex-start',
                        mb: 0.3,
                        position: 'relative',
                        '&:hover .msg-actions': { opacity: 1, visibility: 'visible' }
                      }}
                    >
                      {m.from === 'customer' && (
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            mr: 0.5,
                            bgcolor: getAvatarUrl() ? 'transparent' : '#1877f2',
                            flexShrink: 0,
                            mt: 0.5,
                            display: { xs: 'none', sm: 'flex' }
                          }}
                          src={getAvatarUrl() || ''}
                        >
                          {!getAvatarUrl() && (
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
                              {getInitials()}
                            </Typography>
                          )}
                        </Avatar>
                      )}
                      <Box sx={{ maxWidth: { xs: '90%', sm: '70%', md: '60%' }, position: 'relative' }}>
                        {/* Message Actions Bar */}
                        <Box
                          className="msg-actions"
                          sx={{
                            position: 'absolute',
                            top: -36,
                            right: m.from === 'admin' ? 0 : 'auto',
                            left: m.from === 'customer' ? 0 : 'auto',
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
                            border: '1px solid #e4e6eb'
                          }}
                        >
                          {QUICK_REACTIONS.map(r => (
                            <IconButton
                              key={r}
                              size="small"
                              onClick={(e) => { e.stopPropagation(); handleReaction(m.id, r); }}
                              sx={{ p: 0.3, '&:hover': { transform: 'scale(1.4)', bgcolor: '#f0f2f5' } }}
                            >
                              <Typography sx={{ fontSize: '1rem' }}>{r}</Typography>
                            </IconButton>
                          ))}
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === m.id ? null : m.id); }}
                            sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}
                          >
                            <InsertEmoticon sx={{ fontSize: 16, color: '#65676b' }} />
                          </IconButton>
                          {m.from === 'admin' && (
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); setSelectedMessage(m); setMessageMenu(e.currentTarget); }}
                              sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}
                            >
                              <MoreHoriz sx={{ fontSize: 16, color: '#65676b' }} />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); if (m.type === 'text') handleCopyText(m.text); else if (m.type === 'image') handleCopyText(m.imageUrl); else if (m.type === 'file' && m.fileData) handleCopyText(m.fileData.url); else if (m.type === 'voice' && m.voiceUrl) handleCopyText(m.voiceUrl); }}
                            sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}
                          >
                            <ContentCopy sx={{ fontSize: 14, color: '#65676b' }} />
                          </IconButton>
                        </Box>

                        {/* Emoji Picker */}
                        {emojiPickerId === m.id && (
                          <Box sx={{ position: 'absolute', bottom: m.reaction ? 50 : 30, right: m.from === 'admin' ? 0 : 'auto', left: m.from === 'customer' ? 0 : 'auto', zIndex: 1000 }}>
                            <Box sx={{ position: 'relative' }}>
                              <EmojiPicker
                                onEmojiClick={(emojiData) => { handleReaction(m.id, emojiData.emoji); }}
                                emojiStyle={EmojiStyle.NATIVE}
                                theme={Theme.LIGHT}
                                width={isMobile ? 280 : 320}
                                height={380}
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

                        {/* Message Bubble */}
                        <Box
                          sx={{
                            px: m.type === 'text' ? 1.5 : 0,
                            py: m.type === 'text' ? 1 : 0,
                            borderRadius: m.type === 'text' ? '18px 18px 4px 18px' : '12px',
                            bgcolor: m.type === 'text' ? (m.from === 'admin' ? '#0084ff' : '#e4e6eb') : 'transparent',
                            color: m.type === 'text' ? (m.from === 'admin' ? 'white' : '#050505') : 'inherit',
                            display: 'inline-block',
                            maxWidth: '100%',
                            overflow: 'visible',
                            position: 'relative'
                          }}
                        >
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
                          {m.type === 'image' && (
                            <Box sx={{ position: 'relative' }}>
                              <Box
                                sx={{
                                  maxWidth: 250,
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                  '&:hover': { opacity: 0.9 }
                                }}
                                onClick={() => handleOpenViewer(m.imageUrl, null, m.id)}
                              >
                                <img
                                  src={m.imageUrl}
                                  alt="Shared"
                                  style={{ width: '100%', display: 'block', maxHeight: 250, objectFit: 'cover' }}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: m.from === 'admin' ? 'white' : '#65676b', opacity: 0.8, fontSize: '0.7rem' }}>
                                📷 Photo
                              </Typography>
                            </Box>
                          )}
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
                              onClick={() => handleOpenViewer(null, m.fileData, m.id)}
                            >
                              <Box
                                sx={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: '10px',
                                  bgcolor: '#e8f0fe',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                <AttachFile sx={{ color: '#0084ff', fontSize: 22 }} />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={600} fontSize="0.85rem" noWrap sx={{ color: '#1a1a1a' }}>
                                  {m.fileData.name || 'File'}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.3 }}>
                                  <Typography variant="caption" color="#65676b" fontSize="0.7rem">
                                    {m.fileData.size ? `${Math.round(m.fileData.size / 1024)} KB` : 'File'}
                                  </Typography>
                                </Stack>
                              </Box>
                            </Paper>
                          )}
                          {m.type === 'voice' && (
                            <Stack
                              direction="row"
                              spacing={1.2}
                              alignItems="center"
                              sx={{
                                px: 1.5,
                                py: 1.2,
                                borderRadius: '18px',
                                bgcolor: m.from === 'admin' ? 'rgba(255,255,255,0.15)' : '#f0f2f5',
                                border: m.from === 'admin' ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e4e6eb',
                                minWidth: 200,
                                maxWidth: 280
                              }}
                            >
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
                                  '&:hover': { bgcolor: '#0066cc' }
                                }}
                              >
                                {playingAudio === m.id ? (
                                  <Pause sx={{ fontSize: 16, color: 'white' }} />
                                ) : (
                                  <PlayArrow sx={{ fontSize: 18, color: 'white', ml: 0.3 }} />
                                )}
                              </Box>
                              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25, height: 32 }}>
                                {[12, 16, 10, 20, 14, 18, 24, 12, 16, 22, 14, 18, 20, 12, 16, 10, 22, 14, 18, 12].map((h, i) => (
                                  <Box
                                    key={i}
                                    sx={{
                                      width: 2.5,
                                      height: `${h}px`,
                                      borderRadius: '3px',
                                      bgcolor: playingAudio === m.id ? '#0084ff' : '#94a3b8',
                                      opacity: playingAudio === m.id ? 1 : 0.5
                                    }}
                                  />
                                ))}
                              </Box>
                              {m.voiceDuration > 0 && (
                                <Typography variant="caption" sx={{ color: '#65676b', fontSize: '0.7rem', fontWeight: 600, minWidth: 30, textAlign: 'right' }}>
                                  0:{String(m.voiceDuration).padStart(2, '0')}
                                </Typography>
                              )}
                            </Stack>
                          )}
                        </Box>

                        {/* Reaction */}
                        {m.reaction && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: -14,
                              right: m.from === 'admin' ? 4 : 'auto',
                              left: m.from === 'customer' ? 4 : 'auto',
                              zIndex: 5
                            }}
                          >
                            <Chip
                              label={m.reaction}
                              size="small"
                              onClick={() => handleReaction(m.id, m.reaction)}
                              sx={{
                                height: 22,
                                fontSize: '0.8rem',
                                bgcolor: 'white',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                                borderRadius: '12px',
                                border: '1px solid #e4e6eb',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#f0f2f5' }
                              }}
                            />
                          </Box>
                        )}

                        {/* Timestamp */}
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.2, mx: 0.5 }}>
                          {m.from === 'customer' && m.senderName && m.senderName !== 'Customer' && (
                            <Typography variant="caption" fontWeight={600} color="#1877f2" fontSize="0.6rem">
                              {m.senderName}
                            </Typography>
                          )}
                          {m.isEdited && (
                            <Typography variant="caption" color="#94a3b8" fontSize="0.55rem">
                              Edited
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ color: '#65676b', fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
                            {m.time}
                          </Typography>
                        </Stack>
                      </Box>
                      {m.from === 'admin' && (
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            ml: 0.5,
                            bgcolor: '#42b72a',
                            flexShrink: 0,
                            mt: 0.5,
                            display: { xs: 'none', sm: 'flex' }
                          }}
                        >
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

            {/* Input Area */}
            <Box sx={{ px: { xs: 1, sm: 2 }, pb: { xs: 1, sm: 1.5 }, pt: 1, bgcolor: 'white', flexShrink: 0, borderTop: '1px solid #e4e6eb' }}>
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
              <Stack direction="row" spacing={0.5} alignItems="center">
                <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
                <IconButton
                  size="small"
                  onClick={() => imageInputRef.current?.click()}
                  sx={{ color: '#65676b' }}
                >
                  <Image sx={{ fontSize: { xs: 20, sm: 22 } }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ color: '#65676b' }}
                >
                  <AttachFile sx={{ fontSize: { xs: 20, sm: 22 } }} />
                </IconButton>
                <Box sx={{ flex: 1, bgcolor: '#f0f2f5', borderRadius: 50, px: 1.5 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    size="small"
                    placeholder="Aa"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: { fontSize: { xs: '0.8rem', sm: '0.9rem' } }
                    }}
                  />
                </Box>
                {input.trim() ? (
                  <IconButton onClick={handleSend} sx={{ color: '#1877f2' }}>
                    <Send sx={{ fontSize: { xs: 20, sm: 22 } }} />
                  </IconButton>
                ) : (
                  <IconButton
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    sx={{ color: '#1877f2' }}
                  >
                    {isRecording ? <Stop sx={{ fontSize: { xs: 20, sm: 22 }, color: '#ef4444' }} /> : <Mic sx={{ fontSize: { xs: 20, sm: 22 } }} />}
                  </IconButton>
                )}
              </Stack>
            </Box>
          </>
        ) : (
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

      {/* Menus and Dialogs */}
      <Menu
        anchorEl={messageMenu}
        open={Boolean(messageMenu)}
        onClose={() => setMessageMenu(null)}
      >
        {selectedMessage?.type === 'text' && (
          <MenuItem onClick={handleEditClick}>
            <Edit sx={{ mr: 1, fontSize: 18 }} /> Edit
          </MenuItem>
        )}
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

      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, message: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Message</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, message: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Message?</DialogTitle>
        <DialogContent>
          <Typography>This will be permanently deleted.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteSessionConfirm}
        onClose={() => setDeleteSessionConfirm(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Delete sx={{ color: '#ef4444' }} /> Delete Conversation?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Are you sure you want to delete the entire conversation with <strong>{deleteSessionConfirm?.customerName}</strong>?
          </Typography>
          <Typography variant="body2" color="#ef4444" sx={{ bgcolor: '#fef2f2', p: 1.5, borderRadius: 1 }}>
            ⚠️ This will permanently delete all messages in this conversation.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteSessionConfirm(null)} variant="outlined">Cancel</Button>
          <Button onClick={confirmDeleteSession} variant="contained" color="error" startIcon={<Delete />}>Delete Conversation</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: { xs: 0, sm: 8 } }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={() => setNotification({ ...notification, open: false })}
          sx={{ borderRadius: 2, cursor: 'pointer' }}
          onClick={() => {
            if (notification.sessionId) handleSelectCustomer(notification.sessionId);
            setNotification({ ...notification, open: false });
          }}
        >
          <Stack spacing={0.3}>
            <Typography variant="subtitle2" fontWeight={700}>📩 {notification.customerName}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>{notification.message}</Typography>
          </Stack>
        </Alert>
      </Snackbar>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <FileViewer
        open={viewer.open}
        imageUrl={viewer.imageUrl}
        fileData={viewer.fileData}
        messageId={viewer.messageId}
        onClose={handleCloseViewer}
      />
    </Box>
  );
};

export default AdminChat;