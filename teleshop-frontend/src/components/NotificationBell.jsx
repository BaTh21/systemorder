// src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  NotificationsOff,
  CheckCircle,
  Cancel,
  ShoppingCart,
  LocalShipping,
  Payment,
  CheckCircleOutline,
  Clear,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const NotificationBell = () => {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [pollingInterval, setPollingInterval] = useState(null);
  
  const open = Boolean(anchorEl);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/notifications', {
        params: { limit: 50 }
      });
      setNotifications(response.data.items || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      const interval = setInterval(fetchNotifications, 30000);
      setPollingInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
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
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (!notifications.find(n => n.id === notificationId)?.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setSnackbar({ 
        open: true, 
        message: 'Notification deleted', 
        severity: 'success' 
      });
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Failed to delete notification', 
        severity: 'error' 
      });
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      account_approved: <CheckCircle sx={{ color: '#22c55e' }} />,
      account_rejected: <Cancel sx={{ color: '#dc2626' }} />,
      order_created: <ShoppingCart sx={{ color: '#2563eb' }} />,
      order_updated: <ShoppingCart sx={{ color: '#2563eb' }} />,
      payment_received: <Payment sx={{ color: '#22c55e' }} />,
      shipping_update: <LocalShipping sx={{ color: '#f59e0b' }} />,
      order_completed: <CheckCircleOutline sx={{ color: '#22c55e' }} />,
      promotion: <NotificationsActive sx={{ color: '#ec4899' }} />,
    };
    return icons[type] || <Notifications sx={{ color: '#94a3b8' }} />;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  return (
    <>
      <IconButton onClick={handleClick} color="inherit">
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <Notifications />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
            borderRadius: 2,
            overflow: 'hidden',
            mt: 1,
          },
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          bgcolor: '#f8fafc', 
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Notifications
            {unreadCount > 0 && (
              <Chip 
                label={`${unreadCount} new`} 
                size="small" 
                color="primary"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          {unreadCount > 0 && (
            <Button 
              size="small" 
              onClick={markAllAsRead}
              sx={{ textTransform: 'none' }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        {/* Notification List */}
        <Box sx={{ overflow: 'auto', maxHeight: 400 }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsOff sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
              <Typography variant="body2" color="#94a3b8">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid #f1f5f9',
                    bgcolor: notification.is_read ? 'transparent' : '#f0f7ff',
                    '&:hover': {
                      bgcolor: '#f8fafc',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={notification.is_read ? 400 : 600}>
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {formatTime(notification.created_at)}
                        </Typography>
                      </Box>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={() => deleteNotification(notification.id)}
                    sx={{ ml: 1, color: '#94a3b8' }}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ 
            p: 1.5, 
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
            bgcolor: '#fafbfc'
          }}>
            <Button 
              size="small" 
              href="/notifications"
              sx={{ textTransform: 'none', color: '#2563eb' }}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Popover>

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
    </>
  );
};

export default NotificationBell;