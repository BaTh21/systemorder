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
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

const TelegramConnect = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [chatId, setChatId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.telegram_chat_id) {
      setConnected(true);
      setChatId(user.telegram_chat_id);
    }
  }, [user]);

  const handleConnect = async () => {
    if (!chatId) {
      setError('Please enter your Telegram Chat ID');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/telegram/connect', { chat_id: chatId });
      setConnected(true);
      setSuccess('Telegram connected successfully!');
      setOpenDialog(false);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to connect Telegram');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await api.post('/telegram/disconnect');
      setConnected(false);
      setChatId('');
      setSuccess('Telegram disconnected');
    } catch (error) {
      setError('Failed to disconnect Telegram');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TelegramIcon sx={{ fontSize: 40, color: '#0088cc' }} />
          <Box>
            <Typography variant="h6">
              Telegram Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {connected
                ? 'You will receive order updates via Telegram'
                : 'Connect Telegram to receive order updates'}
            </Typography>
          </Box>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {connected ? (
          <Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Connected Chat ID: <code>{chatId}</code>
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisconnect}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Disconnect Telegram'}
            </Button>
          </Box>
        ) : (
          <Button
            variant="contained"
            startIcon={<TelegramIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: '#0088cc', '&:hover': { bgcolor: '#006699' } }}
          >
            Connect Telegram
          </Button>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Connect Telegram</DialogTitle>
          <DialogContent>
            <Stepper activeStep={0} orientation="vertical" sx={{ mt: 2 }}>
              <Step>
                <StepLabel>
                  Open Telegram and search for <strong>@userinfobot</strong>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  Start the bot and send <code>/start</code>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  Copy your Chat ID from the bot's response
                </StepLabel>
              </Step>
            </Stepper>
            
            <TextField
              fullWidth
              label="Your Telegram Chat ID"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              sx={{ mt: 3 }}
              helperText="Paste your Chat ID here"
              placeholder="e.g., 123456789"
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>How to get your Chat ID:</strong><br />
                1. Open Telegram app<br />
                2. Search for <code>@userinfobot</code><br />
                3. Click Start and send <code>/start</code><br />
                4. Copy the number next to "Id"
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleConnect}
              disabled={loading || !chatId}
              startIcon={loading ? <CircularProgress size={20} /> : <TelegramIcon />}
            >
              Connect
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TelegramConnect;