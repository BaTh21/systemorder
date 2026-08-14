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
  const [adminProfile, setAdminProfile] = useState({
    full_name: '',
    username: '',
    avatar_url: null,
    role: 'Admin'
  });

  const [isCustomerTyping, setIsCustomerTyping] = useState(false);

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

  // ULTRA-FAST INPUT REFS
  const inputRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef(null);
  const inputValueRef = useRef('');

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const activeChatRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const token = localStorage.getItem('access_token');
  const shouldAutoScrollRef = useRef(true);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Load admin profile
  useEffect(() => {
    if (user) {
      setAdminProfile({
        full_name: user.full_name || 'Admin',
        email: user.email || '',
        avatar_url: user.avatar_url || null,
        role: user.role?.value || 'Admin'
      });
    }
  }, [user]);

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

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight > 50) {
        shouldAutoScrollRef.current = false;
      } else {
        shouldAutoScrollRef.current = true;
      }
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
  };

  const forceScrollToBottom = () => {
    shouldAutoScrollRef.current = true;
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 150);
  };

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

          if (data.type === 'typing') {
            if (data.sender === 'customer') {
              setIsCustomerTyping(data.is_typing);
              if (data.is_typing) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  setIsCustomerTyping(false);
                }, 1500);
              }
            }
            return;
          }

          if (data.type === 'customer_message') {
            const sid = data.session_id || data.from_user_id;

            if (activeChatRef.current !== sid) {
              setTotalUnread(prev => prev + 1);
            }

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

              setTimeout(() => forceScrollToBottom(), 100);
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
              setTimeout(() => forceScrollToBottom(), 100);
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

  const fetchAdminProfile = async () => {
    try {
      const response = await api.get('/chat/admin-profile');
      if (response.data) {
        console.log('👤 Admin profile fetched:', response.data);
        setAdminProfile({
          full_name: response.data.full_name || user?.full_name || 'Admin',
          email: response.data.email || user?.email || '',
          avatar_url: response.data.avatar_url || user?.avatar_url || null,
          role: response.data.role || 'Admin'
        });
      }
    } catch (error) {
      console.log('Could not fetch admin profile, using user data');
      if (user) {
        setAdminProfile({
          full_name: user.full_name || 'Admin',
          email: user.email || '',
          avatar_url: user.avatar_url || null,
          role: user.role?.value || 'Admin'
        });
      }
    }
  };

  useEffect(() => {
    fetchAdminProfile();
  }, [user]);

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const loadCustomerProfileByUserId = async (userId, fallbackProfile) => {
    if (!userId) {
      console.log('👤 No user ID, using fallback profile:', fallbackProfile);
      setCustomerProfile(fallbackProfile);
      return;
    }

    try {
      const res = await api.get(`/chat/customer-profile-by-user/${userId}`);
      console.log('📋 Customer profile from API:', res.data);

      if (res.data && res.data.is_admin) {
        console.log('⚠️ API returned admin data, using fallback');
        setCustomerProfile(fallbackProfile);
        return;
      }

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
    setTimeout(() => scrollToBottom(), 200);
  };

  // ULTRA-FAST SEND FUNCTION
  const sendAdminMessage = async (txt) => {
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

      setTimeout(() => forceScrollToBottom(), 100);
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
        setTimeout(() => forceScrollToBottom(), 100);
      } catch (e) {
        console.error('Send failed:', e);
        setSnackbar({ open: true, message: 'Failed to send message', severity: 'error' });
      }
    }
    loadSessions();
  };

  const handleSelectCustomer = async (sessionId) => {
    setCustomerProfile(null);
    setActiveChat(sessionId);
    setShowProfileDetails(false);
    setIsCustomerTyping(false);
    shouldAutoScrollRef.current = true;

    await api.put(`/chat/read/${sessionId}`).catch(e => { });

    setCustomers(prev => prev.map(c =>
      c.session_id === sessionId ? { ...c, unread: 0 } : c
    ));

    const remainingUnread = customers.reduce((sum, c) =>
      c.session_id === sessionId ? sum : sum + (c.unread || 0), 0
    );
    setTotalUnread(remainingUnread);

    await loadMessages(sessionId);
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
      setTimeout(() => forceScrollToBottom(), 100);
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
      setTimeout(() => forceScrollToBottom(), 100);
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
          setTimeout(() => forceScrollToBottom(), 100);
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
    <Box sx={{ height: '100vh', display: 'flex', overflow: 'hidden', bgcolor: '#f0f2f5' }}>
      {/* Sidebar */}
      <Box sx={{
        width: { xs: '100%', sm: 340, md: 380 },
        minWidth: { xs: '100%', sm: 340, md: 380 },
        bgcolor: 'white',
        borderRight: '1px solid #e4e6eb',
        display: { xs: activeChat ? 'none' : 'flex', sm: 'flex' },
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}>
        <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid #e4e6eb', bgcolor: '#0f172a', color: 'white', flexShrink: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin')} sx={{ color: 'white', textTransform: 'none', fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
              Dashboard
            </Button>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Edit Profile">
                <Avatar
                  src={adminProfile.avatar_url}
                  onClick={() => navigate('/admin/profile')}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: adminProfile.avatar_url ? 'transparent' : '#42b72a',
                    border: '2px solid white',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8 }
                  }}
                >
                  {!adminProfile.avatar_url && (
                    adminProfile.full_name
                      ? adminProfile.full_name.charAt(0).toUpperCase()
                      : <SupportAgent sx={{ fontSize: 18 }} />
                  )}
                </Avatar>
              </Tooltip>

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
            <Box>
              <Typography variant="h6" fontWeight={700} fontSize={{ xs: '1rem', sm: '1.1rem', md: '1.25rem' }}>
                Messages
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
                {adminProfile.full_name} • {adminProfile.role}
              </Typography>
            </Box>
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

        <Box sx={{ p: { xs: 1, sm: 1.5 }, borderBottom: '1px solid #e4e6eb', flexShrink: 0 }}>
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
        height: '100vh',
        bgcolor: '#f0f2f5',
        overflow: 'hidden',
      }}>
        {activeChat ? (
          <>
            {/* Header */}
            <Box sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.8, sm: 1 },
              bgcolor: 'white',
              borderBottom: '1px solid #e4e6eb',
              flexShrink: 0,
              minHeight: { xs: 60, sm: 70 },
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ height: '100%' }}>
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
                  sx={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                  onClick={() => setShowProfileDetails(!showProfileDetails)}
                >
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="subtitle2" fontWeight={600} color="#050505" fontSize={{ xs: '0.85rem', sm: '0.95rem' }} noWrap>
                      {getDisplayName()}
                    </Typography>

                    {customerProfile?.is_registered ? (
                      <Tooltip title="Registered User">
                        <CheckCircle sx={{ fontSize: 16, color: '#22c55e', flexShrink: 0 }} />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Guest User">
                        <Info sx={{ fontSize: 16, color: '#94a3b8', flexShrink: 0 }} />
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
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </Stack>

                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.3 }}>
                    {customerProfile?.email && (
                      <Stack direction="row" spacing={0.3} alignItems="center" sx={{ minWidth: 0 }}>
                        <Email sx={{ fontSize: 12, color: '#65676b', flexShrink: 0 }} />
                        <Typography variant="caption" color="#65676b" fontSize="0.65rem" noWrap sx={{ maxWidth: 150 }}>
                          {customerProfile.email}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
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
                </Box>
              </Stack>
            </Box>

            {/* Messages */}
            <Box
              ref={messagesContainerRef}
              onScroll={handleScroll}
              sx={{
                flex: 1,
                overflow: 'auto',
                px: { xs: 1, sm: 2, md: 3 },
                py: 2,
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '10px' },
                '&::-webkit-scrollbar-thumb': { background: '#c1c1c1', borderRadius: '10px', '&:hover': { background: '#a8a8a8' } },
              }}
            >
              {loading ? (
                <Box textAlign="center" py={6}><CircularProgress size={28} sx={{ color: '#1877f2' }} /></Box>
              ) : messages.length === 0 ? (
                <Box textAlign="center" pt={4}>
                  <Typography color="#94a3b8">No messages yet</Typography>
                </Box>
              ) : (
                <Stack spacing={0.5}>
                  {messages.map((m, i) => (
                    <Box
                      key={m.id || i}
                      sx={{
                        display: 'flex',
                        justifyContent: m.from === 'admin' ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        mb: 1,
                        position: 'relative',
                      }}
                    >
                      {/* Customer Avatar */}
                      {m.from === 'customer' && (
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            mr: 1,
                            mt: 'auto',
                            bgcolor: getAvatarUrl() ? 'transparent' : '#1877f2',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
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

                      <Box sx={{ maxWidth: '70%', display: 'flex', flexDirection: 'column' }}>
                        {m.from === 'customer' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', mr: 1 }}>
                              {m.senderName || getDisplayName()}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ position: 'relative', width: '100%' }}>
                          <Box className="message-bubble" sx={{ position: 'relative', '&:hover .msg-actions': { opacity: 1, visibility: 'visible' } }}>
                            {/* Message Actions */}
                            <Box className="msg-actions" sx={{
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
                              border: '1px solid #e4e6eb',
                            }}>
                              {QUICK_REACTIONS.map(r => (
                                <IconButton key={r} size="small" onClick={(e) => { e.stopPropagation(); handleReaction(m.id, r); }} sx={{ p: 0.3, '&:hover': { transform: 'scale(1.4)', bgcolor: '#f0f2f5' } }}>
                                  <Typography sx={{ fontSize: '1rem' }}>{r}</Typography>
                                </IconButton>
                              ))}
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === m.id ? null : m.id); }} sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}>
                                <InsertEmoticon sx={{ fontSize: 16, color: '#65676b' }} />
                              </IconButton>
                              {m.from === 'admin' && (
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedMessage(m); setMessageMenu(e.currentTarget); }} sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}>
                                  <MoreHoriz sx={{ fontSize: 16, color: '#65676b' }} />
                                </IconButton>
                              )}
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); if (m.type === 'text') handleCopyText(m.text); else if (m.type === 'image') handleCopyText(m.imageUrl); else if (m.type === 'file' && m.fileData) handleCopyText(m.fileData.url); else if (m.type === 'voice' && m.voiceUrl) handleCopyText(m.voiceUrl); }} sx={{ p: 0.3, '&:hover': { bgcolor: '#f0f2f5' } }}>
                                <ContentCopy sx={{ fontSize: 14, color: '#65676b' }} />
                              </IconButton>
                            </Box>

                            {/* Message Content */}
                            {m.type === 'text' && (
                              <Box sx={{ bgcolor: m.from === 'admin' ? 'primary.main' : 'white', p: 2, borderRadius: 3, boxShadow: 1, wordBreak: 'break-word', transition: 'all 0.2s' }}>
                                <Typography variant="body2" sx={{ color: m.from === 'admin' ? 'white' : 'text.primary', wordBreak: 'break-word', lineHeight: 1.4, fontSize: '0.9rem' }}>
                                  {m.text}
                                  {m.isEdited && (
                                    <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.7, ml: 0.5, color: m.from === 'admin' ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                                      (edited)
                                    </Typography>
                                  )}
                                </Typography>
                              </Box>
                            )}

                            {m.type === 'image' && (
                              <Box sx={{ mb: 1, position: 'relative' }}>
                                <Box sx={{ maxWidth: 250, borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', '&:hover': { opacity: 0.9 } }} onClick={() => handleOpenViewer(m.imageUrl, null, m.id)}>
                                  <img src={m.imageUrl} alt="Shared" style={{ width: '100%', display: 'block', maxHeight: 250, objectFit: 'cover' }} />
                                </Box>
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: m.from === 'admin' ? 'white' : '#65676b', opacity: 0.8, fontSize: '0.7rem' }}>
                                  📷 Photo
                                </Typography>
                              </Box>
                            )}

                            {m.type === 'file' && m.fileData && (
                              <Paper sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: m.from === 'admin' ? 'primary.main' : 'grey.300', color: m.from === 'admin' ? 'white' : 'black', borderRadius: 2, cursor: 'pointer', maxWidth: { xs: 200, sm: 400 } }} onClick={() => handleOpenViewer(null, m.fileData, m.id)}>
                                <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: 1, borderRadius: '50%', width: 40, height: 40, mr: 0.5 }}>
                                  <AttachFile sx={{ mr: 1, color: m.from === 'admin' ? 'primary.main' : 'grey' }} />
                                </Box>
                                <Typography variant="body2" noWrap sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                  {m.fileData.name || 'File'}
                                </Typography>
                              </Paper>
                            )}

                            {m.type === 'voice' && (
                              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ px: 1.5, py: 1.2, borderRadius: '18px', bgcolor: m.from === 'admin' ? 'primary.main' : '#f0f2f5', border: m.from === 'admin' ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e4e6eb', minWidth: 200, maxWidth: 280 }}>
                                <Box onClick={() => playVoice(m.voiceUrl, m.id)} sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#0084ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, '&:hover': { bgcolor: '#0066cc' } }}>
                                  {playingAudio === m.id ? <Pause sx={{ fontSize: 16, color: 'white' }} /> : <PlayArrow sx={{ fontSize: 18, color: 'white', ml: 0.3 }} />}
                                </Box>
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25, height: 32 }}>
                                  {[12, 16, 10, 20, 14, 18, 24, 12, 16, 22, 14, 18, 20, 12, 16, 10, 22, 14, 18, 12].map((h, i) => (
                                    <Box key={i} sx={{ width: 2.5, height: `${h}px`, borderRadius: '3px', bgcolor: playingAudio === m.id ? '#0084ff' : '#94a3b8', opacity: playingAudio === m.id ? 1 : 0.5 }} />
                                  ))}
                                </Box>
                                {m.voiceDuration > 0 && (
                                  <Typography variant="caption" sx={{ color: '#65676b', fontSize: '0.7rem', fontWeight: 600, minWidth: 30, textAlign: 'right' }}>
                                    0:{String(m.voiceDuration).padStart(2, '0')}
                                  </Typography>
                                )}
                              </Stack>
                            )}

                            {/* Reaction */}
                            {m.reaction && (
                              <Box sx={{ display: 'inline-flex', mt: 0.5 }}>
                                <Chip label={m.reaction} size="small" onClick={() => handleReaction(m.id, m.reaction)} sx={{ height: 22, fontSize: '0.8rem', bgcolor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid #e4e6eb', cursor: 'pointer', '&:hover': { bgcolor: '#f0f2f5' } }} />
                              </Box>
                            )}

                            {/* Time */}
                            <Box sx={{ display: 'flex', justifyContent: m.from === 'admin' ? 'flex-end' : 'flex-start', alignItems: 'center', mt: 0.5, gap: 0.5 }}>
                              <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem', lineHeight: 1, color: 'text.secondary', mt: 0.25 }}>
                                {m.time}
                                {m.isEdited && <span style={{ opacity: 0.6, marginLeft: 4 }}>· edited</span>}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Box>

                      {/* Admin Avatar */}
                      {m.from === 'admin' && (
                        <Avatar
                          src={adminProfile.avatar_url}
                          sx={{
                            width: 32,
                            height: 32,
                            ml: 1,
                            mt: 'auto',
                            bgcolor: adminProfile.avatar_url ? 'transparent' : '#42b72a',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            border: '2px solid white',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          {!adminProfile.avatar_url && (
                            adminProfile.full_name
                              ? adminProfile.full_name.charAt(0).toUpperCase()
                              : <SupportAgent sx={{ fontSize: 16 }} />
                          )}
                        </Avatar>
                      )}
                    </Box>
                  ))}

                  {/* Typing Indicator */}
                  {isCustomerTyping && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1, mt: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: getAvatarUrl() ? 'transparent' : '#1877f2' }} src={getAvatarUrl() || ''}>
                        {!getAvatarUrl() && <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{getInitials()}</Typography>}
                      </Avatar>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#e4e6eb', px: 2, py: 1, borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">{getDisplayName()} is typing</Typography>
                        <Box sx={{ display: 'flex', gap: 0.3 }}>
                          <Box sx={{ width: 4, height: 4, bgcolor: '#65676b', borderRadius: '50%', animation: 'typingBounce 1.4s infinite', animationDelay: '0s' }} />
                          <Box sx={{ width: 4, height: 4, bgcolor: '#65676b', borderRadius: '50%', animation: 'typingBounce 1.4s infinite', animationDelay: '0.2s' }} />
                          <Box sx={{ width: 4, height: 4, bgcolor: '#65676b', borderRadius: '50%', animation: 'typingBounce 1.4s infinite', animationDelay: '0.4s' }} />
                        </Box>
                      </Box>
                    </Box>
                  )}

                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </Box>

            {/* ULTRA-FAST Input Area */}
            <Box sx={{ px: { xs: 1, sm: 2 }, pb: { xs: 1, sm: 1.5 }, pt: 1, bgcolor: 'white', flexShrink: 0, borderTop: '1px solid #e4e6eb', minHeight: { xs: 56, sm: 64 } }}>
              {isRecording && (
                <Box sx={{ textAlign: 'center', mb: 1 }}>
                  <Chip icon={<Circle sx={{ fontSize: 8, color: '#ef4444' }} />} label={`Recording ${recordingTime}s`} color="error" size="small" onDelete={stopRecording} />
                </Box>
              )}
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: '100%' }}>
                <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
                <IconButton size="small" onClick={() => imageInputRef.current?.click()} sx={{ color: '#65676b' }}>
                  <Image sx={{ fontSize: { xs: 20, sm: 22 } }} />
                </IconButton>
                <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: '#65676b' }}>
                  <AttachFile sx={{ fontSize: { xs: 20, sm: 22 } }} />
                </IconButton>
                
                {/* ULTRA-FAST INPUT - No React state on keystroke */}
                <Box sx={{ flex: 1, bgcolor: '#f0f2f5', borderRadius: 50, px: 1.5 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Aa"
                    defaultValue=""
                    onInput={(e) => {
                      const value = e.target.value;
                      inputValueRef.current = value;
                      
                      // IMMEDIATE typing indicator - no delay
                      if (value.length > 0 && activeChat && !isTypingRef.current) {
                        isTypingRef.current = true;
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify({
                            type: 'typing',
                            is_typing: true,
                            session_id: activeChat,
                            admin_name: user?.full_name || 'Admin'
                          }));
                        }
                      }
                      
                      // Reset typing timer
                      if (typingTimerRef.current) {
                        clearTimeout(typingTimerRef.current);
                      }
                      
                      // Stop typing after 500ms of no input
                      typingTimerRef.current = setTimeout(() => {
                        if (isTypingRef.current) {
                          isTypingRef.current = false;
                          if (wsRef.current?.readyState === WebSocket.OPEN && activeChat) {
                            wsRef.current.send(JSON.stringify({
                              type: 'typing',
                              is_typing: false,
                              session_id: activeChat,
                              admin_name: user?.full_name || 'Admin'
                            }));
                          }
                        }
                        typingTimerRef.current = null;
                      }, 500);
                      
                      // Stop typing immediately if input becomes empty
                      if (value.length === 0 && isTypingRef.current) {
                        isTypingRef.current = false;
                        if (wsRef.current?.readyState === WebSocket.OPEN && activeChat) {
                          wsRef.current.send(JSON.stringify({
                            type: 'typing',
                            is_typing: false,
                            session_id: activeChat,
                            admin_name: user?.full_name || 'Admin'
                          }));
                        }
                        if (typingTimerRef.current) {
                          clearTimeout(typingTimerRef.current);
                          typingTimerRef.current = null;
                        }
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const value = inputValueRef.current.trim();
                        if (value && activeChat) {
                          // Clear typing state
                          if (isTypingRef.current) {
                            isTypingRef.current = false;
                            if (wsRef.current?.readyState === WebSocket.OPEN && activeChat) {
                              wsRef.current.send(JSON.stringify({
                                type: 'typing',
                                is_typing: false,
                                session_id: activeChat,
                                admin_name: user?.full_name || 'Admin'
                              }));
                            }
                          }
                          if (typingTimerRef.current) {
                            clearTimeout(typingTimerRef.current);
                            typingTimerRef.current = null;
                          }
                          // Send message
                          sendAdminMessage(value);
                          // Clear input
                          if (inputRef.current) {
                            inputRef.current.value = '';
                            inputValueRef.current = '';
                            setInput('');
                          }
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 0',
                      fontSize: window.innerWidth < 600 ? '0.8rem' : '0.9rem',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontFamily: 'inherit',
                      resize: 'none',
                      minHeight: '24px',
                      maxHeight: '80px',
                      overflow: 'auto'
                    }}
                  />
                </Box>

                {input.trim() ? (
                  <IconButton
                    onClick={() => {
                      const value = inputValueRef.current.trim();
                      if (value && activeChat) {
                        // Clear typing state
                        if (isTypingRef.current) {
                          isTypingRef.current = false;
                          if (wsRef.current?.readyState === WebSocket.OPEN && activeChat) {
                            wsRef.current.send(JSON.stringify({
                              type: 'typing',
                              is_typing: false,
                              session_id: activeChat,
                              admin_name: user?.full_name || 'Admin'
                            }));
                          }
                        }
                        if (typingTimerRef.current) {
                          clearTimeout(typingTimerRef.current);
                          typingTimerRef.current = null;
                        }
                        sendAdminMessage(value);
                        if (inputRef.current) {
                          inputRef.current.value = '';
                          inputValueRef.current = '';
                          setInput('');
                        }
                      }
                    }}
                    sx={{ color: '#1877f2' }}
                  >
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

      {/* Message Menu */}
      <Menu anchorEl={messageMenu} open={Boolean(messageMenu)} onClose={() => setMessageMenu(null)}>
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, message: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Message</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={3} value={editText} onChange={e => setEditText(e.target.value)} autoFocus sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, message: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Message?</DialogTitle>
        <DialogContent>
          <Typography>This will be permanently deleted.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Session Dialog */}
      <Dialog open={!!deleteSessionConfirm} onClose={() => setDeleteSessionConfirm(null)} maxWidth="xs" fullWidth>
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

      {/* Notifications */}
      <Snackbar open={notification.open} autoHideDuration={5000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} sx={{ mt: { xs: 0, sm: 8 } }}>
        <Alert severity="info" variant="filled" onClose={() => setNotification({ ...notification, open: false })} sx={{ borderRadius: 2, cursor: 'pointer' }} onClick={() => { if (notification.sessionId) handleSelectCustomer(notification.sessionId); setNotification({ ...notification, open: false }); }}>
          <Stack spacing={0.3}>
            <Typography variant="subtitle2" fontWeight={700}>📩 {notification.customerName}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>{notification.message}</Typography>
          </Stack>
        </Alert>
      </Snackbar>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <FileViewer open={viewer.open} imageUrl={viewer.imageUrl} fileData={viewer.fileData} messageId={viewer.messageId} onClose={handleCloseViewer} />

      <style>{`@keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }`}</style>
    </Box>
  );
};

export default AdminChat;