// src/components/chat/ChatSupport.jsx - Fully Responsive
import { useState, useEffect, useRef } from 'react';
import { 
  Box, Fab, Drawer, Typography, TextField, Stack, IconButton, 
  Avatar, Paper, Chip, useMediaQuery, useTheme 
} from '@mui/material';
import { 
  Chat as ChatIcon, Close, Send, Telegram, 
  SupportAgent, Phone 
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
  const wsRef = useRef(null);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    if (!open) return;
    loadHistory();
    connectWs();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [open]);

  const connectWs = () => {
    if (!token) return;
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(`${getWsUrl()}/ws/customer/${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Customer WS connected');
      setConnected(true);
      const senderName = user?.full_name || 'Customer';
      ws.send(JSON.stringify({
        type: "connect",
        session_id: sessionId,
        sender_name: senderName,
      }));
    };

    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.type === 'admin_reply') {
        setMessages(prev => [...prev, {
          from: 'admin',
          text: d.message,
          time: d.timestamp,
          adminName: d.admin_name
        }]);
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = (e) => console.error('WS error:', e);
  };

  const loadHistory = async () => {
    try {
      const res = await api.get(`/chat/messages/${sessionId}`);
      if (res.data?.length) {
        setMessages(res.data.map(m => ({ 
          from: m.is_admin_reply ? 'admin' : 'user', 
          text: m.message, 
          time: new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), 
          adminName: m.is_admin_reply ? m.sender_name : null 
        })));
      } else {
        setMessages([{ 
          from: 'support', 
          text: '👋 Welcome! How can we help you?', 
          time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) 
        }]);
      }
    } catch { 
      setMessages([{ 
        from: 'support', 
        text: '👋 Welcome! How can we help you?', 
        time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) 
      }]); 
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const txt = input;
    setInput('');
    const senderName = user?.full_name || 'Customer';

    setMessages(prev => [...prev, {
      from: 'user',
      text: txt,
      time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
    }]);

    try {
      await api.post('/chat/send', {
        message: txt,
        sender_name: senderName,
        sender_email: user?.email || '',
        session_id: sessionId
      });
    } catch (e) {
      console.error('Save error:', e);
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        message: txt,
        sender_name: senderName,
        session_id: sessionId,
        timestamp: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
      }));
    }
  };

  const quick = ['📦 Track order', '💰 Payment help', '🔄 Returns', '📱 Product question'];

  return (<>
    {/* Chat FAB Button */}
    <Fab 
      color="primary" 
      onClick={() => setOpen(true)} 
      sx={{ 
        position: 'fixed', 
        bottom: { xs: 16, sm: 24 }, 
        right: { xs: 16, sm: 24 }, 
        bgcolor: '#1877f2', 
        zIndex: 1000, 
        boxShadow: '0 4px 20px rgba(24,119,242,0.4)', 
        width: { xs: 48, sm: 56 }, 
        height: { xs: 48, sm: 56 },
        '&:hover': { bgcolor: '#166fe5' } 
      }}
    >
      <ChatIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
    </Fab>

    {/* Chat Drawer */}
    <Drawer 
      anchor="right" 
      open={open} 
      onClose={() => setOpen(false)} 
      PaperProps={{ 
        sx: { 
          width: { xs: '100%', sm: 400 }, 
          borderTopLeftRadius: { xs: 0, sm: 16 }, 
          borderBottomLeftRadius: { xs: 0, sm: 16 },
        } 
      }}
    >
      {/* Header */}
      <Box sx={{ 
        bgcolor: '#1877f2', 
        color: 'white', 
        p: { xs: 1.5, sm: 2 },
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ 
              bgcolor: 'white', 
              color: '#1877f2', 
              width: { xs: 36, sm: 40 }, 
              height: { xs: 36, sm: 40 } 
            }}>
              <SupportAgent sx={{ fontSize: { xs: 20, sm: 24 } }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} fontSize={{ xs: '0.9rem', sm: '1rem' }}>
                TeleShop Support
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ 
                  width: { xs: 7, sm: 8 }, 
                  height: { xs: 7, sm: 8 }, 
                  borderRadius: '50%', 
                  bgcolor: connected ? '#22c55e' : '#ef4444' 
                }} />
                <Typography variant="caption" fontSize={{ xs: '0.65rem', sm: '0.7rem' }}>
                  {connected ? 'Online' : 'Offline'}
                </Typography>
              </Stack>
            </Box>
          </Stack>
          <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }} size={isMobile ? 'small' : 'medium'}>
            <Close sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
        </Stack>
      </Box>

      {/* Contact Bar */}
      <Paper sx={{ 
        p: { xs: 1, sm: 1.5 }, 
        bgcolor: '#f8fafc', 
        borderBottom: '1px solid #e2e8f0' 
      }}>
        <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
          <Chip 
            icon={<Telegram sx={{ fontSize: { xs: 12, sm: 14 } }} />} 
            label="@TeleShopBot" 
            size="small" 
            variant="outlined" 
            color="primary" 
            sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 24, sm: 28 } }} 
          />
          <Chip 
            icon={<Phone sx={{ fontSize: { xs: 12, sm: 14 } }} />} 
            label="+855 12 345 678" 
            size="small" 
            variant="outlined" 
            sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 24, sm: 28 } }} 
          />
        </Stack>
      </Paper>

      {/* Messages */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: { xs: 1.5, sm: 2 }, 
        bgcolor: '#f0f2f5', 
      }}>
        <Stack spacing={1.5}>
          {messages.map((m, i) => (
            <Box key={i} sx={{ 
              display: 'flex', 
              justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start',
              mb: 0.3,
            }}>
              {(m.from === 'support' || m.from === 'admin') && (
                <Avatar sx={{ 
                  width: { xs: 24, sm: 28 }, 
                  height: { xs: 24, sm: 28 }, 
                  mr: 0.5, 
                  bgcolor: m.from === 'admin' ? '#42b72a' : '#1877f2', 
                  flexShrink: 0 
                }}>
                  <SupportAgent sx={{ fontSize: { xs: 14, sm: 16 } }} />
                </Avatar>
              )}
              <Box sx={{ maxWidth: { xs: '85%', sm: '75%' } }}>
                <Box sx={{
                  px: { xs: 1.2, sm: 1.5 }, 
                  py: { xs: 0.8, sm: 1 },
                  borderRadius: m.from === 'user' 
                    ? '18px 18px 4px 18px' 
                    : '18px 18px 18px 4px',
                  bgcolor: m.from === 'user' 
                    ? '#1877f2' 
                    : m.from === 'admin' 
                      ? '#e4e6eb' 
                      : 'white',
                  color: m.from === 'user' ? 'white' : '#050505',
                  border: m.from === 'support' ? '1px solid #e2e8f0' : 'none',
                }}>
                  {m.adminName && (
                    <Typography variant="caption" fontWeight={600} 
                      sx={{ color: '#1877f2', display: 'block', mb: 0.2, fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
                      {m.adminName}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ 
                    whiteSpace: 'pre-line', 
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    lineHeight: 1.4,
                  }}>
                    {m.text}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ 
                  opacity: 0.7, 
                  fontSize: { xs: '0.55rem', sm: '0.6rem' }, 
                  mt: 0.2, 
                  mx: 0.5,
                  display: 'block',
                  textAlign: m.from === 'user' ? 'right' : 'left',
                }}>
                  {m.time}
                </Typography>
              </Box>
            </Box>
          ))}
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
                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                height: { xs: 26, sm: 28 },
                '&:hover': { bgcolor: '#e7f3ff', borderColor: '#1877f2' } 
              }} 
            />
          ))}
        </Stack>
      </Box>

      {/* Input */}
      <Box sx={{ 
        p: { xs: 1.5, sm: 2 }, 
        borderTop: '1px solid #e2e8f0', 
        bgcolor: 'white' 
      }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <Box sx={{ 
            flex: 1, 
            bgcolor: '#f0f2f5', 
            borderRadius: 50, 
            px: { xs: 1.5, sm: 2 }, 
            py: 0.3,
          }}>
            <TextField 
              fullWidth 
              size="small" 
              placeholder="Aa..." 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              variant="standard"
              multiline
              maxRows={4}
              InputProps={{ 
                disableUnderline: true, 
                sx: { fontSize: { xs: '0.8rem', sm: '0.9rem' } } 
              }}
            />
          </Box>
          <IconButton 
            onClick={send} 
            disabled={!input.trim()} 
            sx={{ 
              bgcolor: input.trim() ? '#1877f2' : '#e4e6eb', 
              color: input.trim() ? 'white' : '#94a3b8',
              width: { xs: 36, sm: 40 }, 
              height: { xs: 36, sm: 40 },
              '&:hover': { bgcolor: '#166fe5' },
              '&:disabled': { bgcolor: '#e4e6eb' },
              flexShrink: 0,
            }}
          >
            <Send sx={{ fontSize: { xs: 18, sm: 20 } }} />
          </IconButton>
        </Stack>
      </Box>
    </Drawer>
  </>);
};

export default ChatSupport;