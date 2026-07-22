// src/pages/admin/AdminChat.jsx - Fully Responsive
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, TextField, IconButton, Avatar, Chip,
  List, ListItem, ListItemAvatar, ListItemText, Badge, Button,
  CircularProgress, Paper, InputAdornment, useMediaQuery, useTheme,
  Snackbar, Alert,
} from '@mui/material';
import {
  Send, ArrowBack, Chat as ChatIcon, Person, SupportAgent,
  Circle, Refresh, Search, Phone,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

const getWsUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  return apiUrl.replace('http', 'ws').replace('/api', '');
};

const AdminChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', customerName: '', sessionId: '' });
  const [totalUnread, setTotalUnread] = useState(0);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(null);
  const token = localStorage.getItem('access_token');

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { loadSessions(); connectWs(); return () => { if(wsRef.current) wsRef.current.close(); }; }, []);
  useEffect(() => { if(activeChat) loadMessages(activeChat); }, [activeChat]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);
  
  // Update unread count and document title
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
              from: 'customer', text: data.message,
              senderName: data.sender_name || 'Customer',
              time: data.timestamp || new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
            }]);
            api.put(`/chat/read/${sid}`).catch(e => {});
          } else {
            setNotification({
              open: true,
              message: data.message?.substring(0, 60),
              customerName: data.sender_name || 'Customer',
              sessionId: sid,
            });
          }
          loadSessions();
        }
      } catch (e) {}
    };
    ws.onclose = () => setConnected(false);
  };

  const loadSessions = async () => {
    try {
      const res = await api.get('/chat/admin/sessions');
      setCustomers((res.data || []).map(c => ({
        ...c,
        unread: c.session_id === activeChatRef.current ? 0 : c.unread,
      })));
    } catch(e) {}
  };

  const loadMessages = async (sid) => {
    setLoading(true);
    try {
      const res = await api.get(`/chat/messages/${sid}`);
      setMessages((res.data||[]).map(m => ({
        from: m.is_admin_reply?'admin':'customer',
        text: m.message,
        senderName: m.is_admin_reply?'You':(m.sender_name||'Customer'),
        time: new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
      })));
    } catch(e){ setMessages([]); }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeChat) return;
    const txt = input; setInput('');
    const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    setMessages(prev => [...prev, { from:'admin', text:txt, senderName:'You', time }]);
    try { await api.post('/chat/admin/reply', { message:txt, session_id:activeChat, admin_name:user?.full_name||'Admin' }); } catch(e){}
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ session_id:activeChat, message:txt, admin_name:user?.full_name||'Admin', timestamp:time }));
    }
    loadSessions();
  };

  const handleSelectCustomer = (sessionId) => {
    setActiveChat(sessionId);
    api.put(`/chat/read/${sessionId}`).catch(e => {});
    setCustomers(prev => prev.map(c => c.session_id === sessionId ? { ...c, unread: 0 } : c));
  };

  const filteredCustomers = customers.filter(c =>
    (c.sender_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCustomer = customers.find(c => c.session_id === activeChat);

  return (
    <Box sx={{ bgcolor: '#f0f2f5', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      
      {/* Sidebar - Hidden on mobile when chat is open */}
      <Box sx={{ 
        width: { xs: '100%', sm: 340, md: 360 },
        minWidth: { xs: '100%', sm: 340, md: 360 },
        bgcolor: 'white',
        borderRight: '1px solid #e4e6eb',
        display: { xs: activeChat ? 'none' : 'flex', sm: 'flex' },
        flexDirection: 'column',
      }}>
        {/* Header */}
        <Box sx={{ 
          p: { xs: 1.5, sm: 2 }, 
          borderBottom: '1px solid #e4e6eb', 
          bgcolor: '#0f172a', 
          color: 'white' 
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin')} 
              sx={{ color: 'white', textTransform: 'none', fontSize: { xs: '0.7rem', sm: '0.8rem' }, '&:hover':{bgcolor:'rgba(255,255,255,0.08)'} }}>
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
              <Badge badgeContent={totalUnread} color="error" max={99}
                sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 18, minWidth: 18 } }}>
                <ChatIcon sx={{ color: 'white', fontSize: { xs: 20, sm: 24 } }} />
              </Badge>
            )}
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.3, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            {customers.length} conversation{totalUnread > 0 ? ` • ${totalUnread} unread` : ''}
          </Typography>
        </Box>

        {/* Search */}
        <Box sx={{ p: { xs: 1, sm: 1.5 }, borderBottom: '1px solid #e4e6eb' }}>
          <TextField
            fullWidth size="small" placeholder="Search..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: '#65676b', fontSize: { xs: 16, sm: 20 } }} /></InputAdornment>,
              sx: { borderRadius: 50, bgcolor: '#f0f2f5', fontSize: { xs: '0.75rem', sm: '0.85rem' }, '& fieldset': { border: 'none' } }
            }}
          />
        </Box>

        {/* Customer List */}
        <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
          {filteredCustomers.length === 0 ? (
            <Box textAlign="center" py={6} px={2}>
              <ChatIcon sx={{ fontSize: { xs: 36, sm: 48 }, color: '#cbd5e1', mb: 1 }} />
              <Typography color="#94a3b8" fontSize={{ xs: '0.8rem', sm: '0.9rem' }}>No conversations</Typography>
              <Button variant="outlined" onClick={loadSessions} size="small"
                sx={{ mt: 2, borderRadius: 50, textTransform: 'none', fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                <Refresh sx={{ mr: 0.5, fontSize: 14 }} /> Refresh
              </Button>
            </Box>
          ) : (
            filteredCustomers.map(c => (
              <ListItem
                key={c.session_id}
                button
                selected={activeChat === c.session_id}
                onClick={() => handleSelectCustomer(c.session_id)}
                sx={{
                  py: { xs: 1, sm: 1.2 }, px: { xs: 1.5, sm: 2 },
                  bgcolor: activeChat === c.session_id ? '#e7f3ff' : 'transparent',
                  '&:hover': { bgcolor: '#f0f2f5' },
                }}
              >
                <ListItemAvatar sx={{ minWidth: { xs: 44, sm: 56 } }}>
                  <Badge badgeContent={c.unread} color="error" overlap="circular"
                    sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>
                    <Avatar sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, bgcolor: '#1877f2' }}>
                      <Person sx={{ fontSize: { xs: 20, sm: 24 } }} />
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={c.sender_name || 'Customer'}
                  secondary={c.last_message?.substring(0, 30) || 'No messages'}
                  primaryTypographyProps={{ fontWeight: activeChat === c.session_id ? 700 : 500, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: '#050505' }}
                  secondaryTypographyProps={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: '#65676b', noWrap: true }}
                />
              </ListItem>
            ))
          )}
        </List>
      </Box>

      {/* Chat Area - Shows on mobile when activeChat is set */}
      <Box sx={{ 
        flex: 1, 
        display: { xs: activeChat ? 'flex' : 'none', sm: 'flex' }, 
        flexDirection: 'column',
        bgcolor: '#f0f2f5',
      }}>
        {activeChat ? (<>
          {/* Chat Header */}
          <Box sx={{ 
            px: { xs: 1.5, sm: 2 }, 
            py: { xs: 0.8, sm: 1 }, 
            bgcolor: 'white', 
            borderBottom: '1px solid #e4e6eb', 
            flexShrink: 0 
          }}>
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
                    {activeCustomer?.sender_name || 'Customer'}
                  </Typography>
                  <Typography variant="caption" color="#22c55e" fontWeight={500}>● Online</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={loadSessions}>
                <Refresh sx={{ fontSize: { xs: 16, sm: 18 }, color: '#65676b' }} />
              </IconButton>
            </Stack>
          </Box>

          {/* Messages */}
          <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 2 }}>
            {loading ? (
              <Box textAlign="center" py={6}><CircularProgress size={28} sx={{ color: '#1877f2' }} /></Box>
            ) : messages.length === 0 ? (
              <Box textAlign="center" pt={8}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: '#1877f2', mx: 'auto', mb: 2 }}>
                  <Person sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography fontWeight={600} color="#050505" fontSize={{ xs: '0.9rem', sm: '1rem' }}>
                  {activeCustomer?.sender_name || 'Customer'}
                </Typography>
                <Typography variant="body2" color="#65676b" fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>
                  Start chatting
                </Typography>
              </Box>
            ) : (
              <Stack spacing={0.3}>
                {messages.map((m, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: m.from === 'admin' ? 'flex-end' : 'flex-start', mb: 0.3 }}>
                    {m.from === 'customer' && (
                      <Avatar sx={{ width: 24, height: 24, mr: 0.5, bgcolor: '#1877f2', flexShrink: 0, mt: 0.5, display: { xs: 'none', sm: 'flex' } }}>
                        <Person sx={{ fontSize: 14 }} />
                      </Avatar>
                    )}
                    <Box sx={{ maxWidth: { xs: '90%', sm: '70%', md: '60%' } }}>
                      <Box sx={{
                        px: 1.5, py: 1,
                        borderRadius: m.from === 'admin' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        bgcolor: m.from === 'admin' ? '#1877f2' : '#e4e6eb',
                        color: m.from === 'admin' ? 'white' : '#050505',
                        display: 'inline-block', maxWidth: '100%',
                      }}>
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {m.text}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.2, mx: 0.5, color: '#65676b', fontSize: { xs: '0.6rem', sm: '0.65rem' }, textAlign: m.from === 'admin' ? 'right' : 'left' }}>
                        {m.time}
                      </Typography>
                    </Box>
                    {m.from === 'admin' && (
                      <Avatar sx={{ width: 24, height: 24, ml: 0.5, bgcolor: '#42b72a', flexShrink: 0, mt: 0.5, display: { xs: 'none', sm: 'flex' } }}>
                        <SupportAgent sx={{ fontSize: 14 }} />
                      </Avatar>
                    )}
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Stack>
            )}
          </Box>

          {/* Input */}
          <Box sx={{ px: { xs: 1, sm: 2 }, pb: { xs: 1, sm: 1.5 }, pt: 1, bgcolor: 'white', flexShrink: 0, borderTop: '1px solid #e4e6eb' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ flex: 1, bgcolor: '#f0f2f5', borderRadius: 50, px: 1.5 }}>
                <TextField
                  fullWidth multiline maxRows={4} size="small" placeholder="Aa"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  variant="standard" InputProps={{ disableUnderline: true, sx: { fontSize: { xs: '0.8rem', sm: '0.9rem' } } }}
                />
              </Box>
              <IconButton onClick={handleSend} disabled={!input.trim()}
                sx={{ color: input.trim() ? '#1877f2' : '#65676b', p: { xs: 0.5, sm: 1 } }}>
                <Send sx={{ fontSize: { xs: 20, sm: 22 } }} />
              </IconButton>
            </Stack>
          </Box>
        </>) : (
          /* Empty State */
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', p: 3 }}>
            <Box sx={{ width: { xs: 72, sm: 96 }, height: { xs: 72, sm: 96 }, borderRadius: '50%', bgcolor: '#e4e6eb', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <ChatIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: '#65676b' }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color="#050505" textAlign="center" fontSize={{ xs: '1rem', sm: '1.25rem' }}>
              Messenger Support
            </Typography>
            <Typography variant="body2" color="#65676b" textAlign="center" fontSize={{ xs: '0.8rem', sm: '0.875rem' }} mt={1}>
              Select a conversation to start chatting
            </Typography>
          </Box>
        )}
      </Box>

      {/* Notification */}
      <Snackbar open={notification.open} autoHideDuration={5000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: { xs: 0, sm: 8 } }}>
        <Alert severity="info" variant="filled"
          onClose={() => setNotification({ ...notification, open: false })}
          sx={{ borderRadius: 2, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
          onClick={() => {
            if (notification.sessionId) handleSelectCustomer(notification.sessionId);
            setNotification({ ...notification, open: false });
          }}>
          <Stack spacing={0.3}>
            <Typography variant="subtitle2" fontWeight={700}>📩 {notification.customerName}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>{notification.message}</Typography>
          </Stack>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminChat;