import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Stack,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Alert,
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../api/axios';

const TelegramRedirectModal = ({ open, onClose, onSuccess }) => {
  const [step, setStep] = useState(0); // 0: intro, 1: enter Chat ID, 2: success
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [checking, setChecking] = useState(true);
  const [chatId, setChatId] = useState('');

  // Check if already connected when modal opens
  useEffect(() => {
    if (open) {
      checkInitialStatus();
    }
  }, [open]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep(0);
      setMessage({ type: '', text: '' });
      setChatId('');
    }
  }, [open]);

  const checkInitialStatus = async () => {
    setChecking(true);
    try {
      const res = await api.get('/telegram/status');
      if (res.data.connected) {
        // Already connected - close immediately and proceed
        onSuccess();
        onClose();
        return;
      }
    } catch (e) {
      console.error('Status check failed:', e);
    } finally {
      setChecking(false);
    }
  };

  const handleOpenBot = () => {
    window.open('https://t.me/ecommerce_system_bot', '_blank');
    setStep(1); // Move to enter Chat ID step
  };

  const handleConnect = async () => {
    if (!chatId.trim()) {
      setMessage({ type: 'error', text: 'Please enter your Chat ID' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/telegram/connect', { chat_id: chatId.trim() });
      setStep(2); // Success!
      // Auto-close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Connect error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to connect Telegram';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onSuccess();
    onClose();
  };

  // Show loading while checking initial status
  if (checking) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogContent sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={40} />
          <Typography sx={{ mt: 2 }}>Processing your order...</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* STEP 0: Intro */}
      {step === 0 && (
        <>
          <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pt: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <TelegramIcon sx={{ color: '#0088cc', fontSize: 28 }} />
              <span>Stay Updated with Telegram</span>
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
            <TelegramIcon sx={{ fontSize: 72, color: '#0088cc', mb: 2 }} />
            <Typography variant="h6" gutterBottom fontWeight={600} color="#0f172a">
              Your order has been placed! 🎉
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Connect Telegram to receive real-time order updates, payment confirmations, and shipping notifications.
            </Typography>

            <Box sx={{ bgcolor: '#f0fdf4', p: 2, borderRadius: 2, mb: 2, border: '1px solid #bbf7d0' }}>
              <Typography variant="body2" fontWeight={600} color="#15803d">
                ✨ Takes less than 30 seconds!
              </Typography>
              <Typography variant="caption" color="#475569">
                Open the bot, get your Chat ID, paste it below.
              </Typography>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<TelegramIcon />}
              onClick={handleOpenBot}
              sx={{
                bgcolor: '#0088cc',
                borderRadius: 2,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1.1rem',
                boxShadow: '0 4px 12px rgba(0, 136, 204, 0.4)',
                '&:hover': { bgcolor: '#006699' },
              }}
            >
              Open Telegram Bot
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={handleSkip}
              sx={{ textTransform: 'none', color: '#94a3b8' }}
            >
              Skip for now
            </Button>
          </DialogActions>
        </>
      )}

      {/* STEP 1: Enter Chat ID */}
      {step === 1 && (
        <>
          <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pt: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <TelegramIcon sx={{ color: '#0088cc', fontSize: 28 }} />
              <span>Connect Your Telegram</span>
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ pb: 1 }}>
            <Typography variant="body2" sx={{ mb: 2, color: '#475569' }}>
              <strong>How to get your Chat ID:</strong>
            </Typography>
            
            <Stepper activeStep={-1} orientation="vertical" sx={{ mb: 2 }}>
              {[
                'Open Telegram and find @ecommerce_system_bot',
                'Send /start to the bot',
                'Copy the Chat ID number from the reply',
                'Paste it below and click Connect',
              ].map((s, i) => (
                <Step key={i}>
                  <StepLabel>
                    <Typography variant="body2">{s}</Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            {message.text && (
              <Alert 
                severity={message.type} 
                sx={{ mb: 2, borderRadius: 2 }}
                onClose={() => setMessage({ type: '', text: '' })}
              >
                {message.text}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Your Telegram Chat ID"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Enter your Chat ID (e.g., 1172933097)"
              size="small"
              autoFocus
              InputProps={{ sx: { borderRadius: 2 } }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleConnect();
              }}
            />
          </DialogContent>

          <DialogActions sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleConnect}
              disabled={loading || !chatId.trim()}
              sx={{
                borderRadius: 2,
                py: 1.3,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
                '&:disabled': { bgcolor: '#a7f3d0' },
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Connect Telegram'}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={handleOpenBot}
              sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#cbd5e1', color: '#475569' }}
            >
              Open Bot Again
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={handleSkip}
              sx={{ textTransform: 'none', color: '#94a3b8' }}
            >
              Skip for now
            </Button>
          </DialogActions>
        </>
      )}

      {/* STEP 2: Success! */}
      {step === 2 && (
        <>
          <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pt: 3, color: '#059669' }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 32 }} />
              <span>Connected Successfully!</span>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
            <Box sx={{ py: 3 }}>
              <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                <TelegramIcon sx={{ fontSize: 40, color: '#0088cc' }} />
              </Box>
              <Typography variant="h6" gutterBottom fontWeight={600} color="#0f172a">
                Telegram Connected! 🎉
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You will now receive order updates via Telegram.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Redirecting to your orders...
              </Typography>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

export default TelegramRedirectModal;