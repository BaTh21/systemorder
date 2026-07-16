// src/components/telegram/TelegramConnect.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Stack,
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

const TelegramConnect = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [chatId, setChatId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user?.telegram_chat_id) {
      setConnected(true);
      setChatId(user.telegram_chat_id);
    }
  }, [user]);

  const handleConnect = async () => {
    if (!chatId.trim()) {
      setMessage({ type: 'error', text: 'Please enter your Telegram Chat ID' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      await api.post('/telegram/connect', { chat_id: chatId.trim() });
      setConnected(true);
      setMessage({ type: 'success', text: 'Telegram connected successfully!' });
      setOpenDialog(false);
    } catch (error) {
      console.error('Connect error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to connect Telegram';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      await api.post('/telegram/disconnect');
      setConnected(false);
      setChatId('');
      setMessage({ type: 'success', text: 'Telegram disconnected successfully' });
    } catch (error) {
      console.error('Disconnect error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to disconnect Telegram';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBot = () => {
    window.open('https://t.me/ecommerce_system_bot', '_blank');
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <Card variant="outlined" sx={{ borderColor: '#e2e8f0', borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TelegramIcon sx={{ fontSize: 40, color: '#0088cc' }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Telegram Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {connected
                ? '✅ You will receive order updates via Telegram'
                : 'Connect Telegram to get real-time order updates'}
            </Typography>
          </Box>
        </Box>

        {/* Show only ONE message at a time */}
        {message.text && (
          <Alert 
            severity={message.type} 
            sx={{ mb: 2, borderRadius: 2 }}
            onClose={() => setMessage({ type: '', text: '' })}
          >
            {message.text}
          </Alert>
        )}

        {connected ? (
          <Box>
            <Box sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 20 }} />
                <Typography variant="body2" fontWeight={500} color="#15803d">
                  Connected
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ mt: 1, color: '#475569' }}>
                Chat ID: <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>{chatId}</code>
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisconnect}
              disabled={loading}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              {loading ? <CircularProgress size={20} /> : 'Disconnect Telegram'}
            </Button>
          </Box>
        ) : (
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<TelegramIcon />}
              onClick={handleOpenBot}
              sx={{ 
                bgcolor: '#0088cc', 
                borderRadius: 2, 
                textTransform: 'none', 
                fontWeight: 600,
                '&:hover': { bgcolor: '#006699' } 
              }}
            >
              Open Telegram Bot
            </Button>
            <Button
              variant="outlined"
              onClick={() => setOpenDialog(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Enter Chat ID Manually
            </Button>
          </Stack>
        )}

        {/* Manual Chat ID Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Connect Telegram</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2, color: '#475569' }}>
              <strong>How to get your Chat ID:</strong>
            </Typography>
            <Stepper activeStep={-1} orientation="vertical" sx={{ mb: 2 }}>
              {[
                'Open Telegram and search for @userinfobot',
                'Click Start and send /start',
                'Copy the number next to "Id"',
                'Paste it below and click Connect',
              ].map((step, i) => (
                <Step key={i}>
                  <StepLabel>
                    <Typography variant="body2">{step}</Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
            
            <TextField
              fullWidth
              label="Your Telegram Chat ID"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              sx={{ mt: 2 }}
              placeholder="Enter your Chat ID (e.g., 123456789)"
              size="small"
              InputProps={{ sx: { borderRadius: 2 } }}
              onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button 
              onClick={() => setOpenDialog(false)}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConnect}
              disabled={loading || !chatId.trim()}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              {loading ? <CircularProgress size={20} /> : 'Connect'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TelegramConnect;