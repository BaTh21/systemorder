// src/pages/NotificationsPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  ShoppingCart,
  LocalShipping,
  Payment,
  CheckCircleOutline,
  Clear,
  NotificationsActive,
  NotificationsOff,
  DoneAll,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/axios';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchNotifications();
  }, [tabValue]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const unreadOnly = tabValue === 1;
      const response = await api.get('/notifications', {
        params: { limit: 100, unread_only: unreadOnly }
      });
      setNotifications(response.data.items || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setSnackbar({ open: true, message: 'All notifications marked as read', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to mark all as read', severity: 'error' });
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setSnackbar({ open: true, message: 'Notification deleted', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete notification', severity: 'error' });
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      account_approved: <CheckCircle sx={{ color: '#22c55e', fontSize: 28 }} />,
      account_rejected: <Cancel sx={{ color: '#dc2626', fontSize: 28 }} />,
      order_created: <ShoppingCart sx={{ color: '#2563eb', fontSize: 28 }} />,
      order_updated: <ShoppingCart sx={{ color: '#2563eb', fontSize: 28 }} />,
      payment_received: <Payment sx={{ color: '#22c55e', fontSize: 28 }} />,
      shipping_update: <LocalShipping sx={{ color: '#f59e0b', fontSize: 28 }} />,
      order_completed: <CheckCircleOutline sx={{ color: '#22c55e', fontSize: 28 }} />,
      promotion: <NotificationsActive sx={{ color: '#ec4899', fontSize: 28 }} />,
    };
    return icons[type] || <NotificationsActive sx={{ color: '#94a3b8', fontSize: 28 }} />;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Notifications
        </Typography>
        {unreadCount > 0 && (
          <Button
            startIcon={<DoneAll />}
            onClick={markAllAsRead}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Mark all read
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(e, v) => setTabValue(v)}
        sx={{ mb: 3, borderBottom: '1px solid #e2e8f0' }}
      >
        <Tab label={`All (${notifications.length})`} />
        <Tab label={`Unread (${unreadCount})`} />
      </Tabs>

      {/* Notification List */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <NotificationsOff sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
            <Typography variant="h6" color="#94a3b8">
              {tabValue === 0 ? 'No notifications yet' : 'No unread notifications'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((notification, index) => (
              <Box key={notification.id}>
                <ListItem
                  sx={{
                    py: 2,
                    px: 3,
                    bgcolor: notification.is_read ? 'transparent' : '#f0f7ff',
                    '&:hover': { bgcolor: '#f8fafc' },
                  }}
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      {!notification.is_read && (
                        <IconButton
                          size="small"
                          onClick={() => markAsRead(notification.id)}
                          sx={{ color: '#2563eb' }}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => deleteNotification(notification.id)}
                        sx={{ color: '#94a3b8' }}
                      >
                        <Clear fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 48 }}>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body1" fontWeight={notification.is_read ? 400 : 600}>
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {formatTime(notification.created_at)}
                          {!notification.is_read && (
                            <Chip 
                              label="New" 
                              size="small" 
                              color="primary" 
                              sx={{ ml: 1, height: 18, fontSize: '0.6rem' }} 
                            />
                          )}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Paper>

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
    </Container>
  );
};

export default NotificationsPage;