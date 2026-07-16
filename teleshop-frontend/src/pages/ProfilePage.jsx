// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  TextField,
  Button,
  Avatar,
  Stack,
  Chip,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  CircularProgress,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Edit,
  Save,
  Security,
  ShoppingBag,
  Notifications,
  Visibility,
  VisibilityOff,
  Lock,
  VpnKey,
  CheckCircle,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TelegramConnect from '../components/telegram/TelegramConnect';
import api from '../api/axios';

const ProfilePage = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (tabValue === 1) {
      fetchOrders();
    }
  }, [tabValue]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await api.get('/orders');
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', {
        full_name: formData.full_name,
        phone: formData.phone,
      });

      const userResponse = await api.get('/auth/me');
      if (userResponse.data) {
        setFormData({
          full_name: userResponse.data.full_name || '',
          email: userResponse.data.email || '',
          phone: userResponse.data.phone || '',
        });
      }

      setEditing(false);
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (error) {
      console.error('Save error:', error);
      setSnackbar({ open: true, message: 'Failed to update profile', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordData.current_password) {
      errors.current_password = 'Current password is required';
    }
    if (!passwordData.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 6) {
      errors.new_password = 'Password must be at least 6 characters';
    } else if (passwordData.new_password === passwordData.current_password) {
      errors.new_password = 'New password must be different from current';
    }
    if (!passwordData.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePassword()) return;

    setChangingPassword(true);
    try {
      await api.put('/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordErrors({});
      setSnackbar({ open: true, message: 'Password changed successfully!', severity: 'success' });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to change password. Check your current password.';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const statusColors = {
    pending: 'default',
    confirmed: 'primary',
    waiting_payment: 'warning',
    paid: 'info',
    purchasing: 'info',
    shipping: 'primary',
    completed: 'success',
    cancelled: 'error',
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">

        {/* Profile Header */}
        <Paper elevation={0} sx={{ p: 4, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#2563eb',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h5" fontWeight={700} color="#0f172a">
                {user?.full_name || 'User'}
              </Typography>
              <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                <Chip icon={<Email sx={{ fontSize: 14 }} />} label={user?.email} size="small" variant="outlined" />
                {user?.phone && <Chip icon={<Phone sx={{ fontSize: 14 }} />} label={user?.phone} size="small" variant="outlined" />}
                {user?.role === 'admin' && <Chip label="Admin" size="small" color="primary" />}
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* Tabs */}
        <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white', overflow: 'hidden' }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2, borderBottom: '1px solid #e2e8f0' }}
          >
            <Tab icon={<Person />} label="Personal Info" iconPosition="start" />
            <Tab icon={<ShoppingBag />} label="My Orders" iconPosition="start" />
            <Tab icon={<Security />} label="Security" iconPosition="start" />
            <Tab icon={<Notifications />} label="Telegram" iconPosition="start" />
          </Tabs>

          <Box sx={{ p: 3 }}>

            {/* Personal Info Tab */}
            {tabValue === 0 && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight={600} color="#0f172a">
                    Personal Information
                  </Typography>
                  <Button
                    variant={editing ? 'contained' : 'outlined'}
                    startIcon={editing ? <Save /> : <Edit />}
                    onClick={() => editing ? handleSave() : setEditing(true)}
                    disabled={saving}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    {saving ? <CircularProgress size={20} /> : editing ? 'Save Changes' : 'Edit Profile'}
                  </Button>
                </Stack>

                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1}>
                      Full Name
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!editing}
                      size="small"
                      InputProps={{
                        startAdornment: <Person sx={{ color: '#94a3b8', mr: 1, fontSize: 20 }} />,
                      }}
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1}>
                      Email Address
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.email}
                      disabled
                      size="small"
                      InputProps={{
                        startAdornment: <Email sx={{ color: '#94a3b8', mr: 1, fontSize: 20 }} />,
                      }}
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1}>
                      Phone Number
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!editing}
                      size="small"
                      InputProps={{
                        startAdornment: <Phone sx={{ color: '#94a3b8', mr: 1, fontSize: 20 }} />,
                      }}
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1}>
                      Account Type
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={user?.role === 'admin' ? 'Administrator' : 'Customer'}
                        color={user?.role === 'admin' ? 'primary' : 'default'}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* My Orders Tab */}
            {tabValue === 1 && (
              <Box>
                <Typography variant="h6" fontWeight={600} color="#0f172a" mb={3}>
                  My Orders
                </Typography>

                {loadingOrders ? (
                  <Box textAlign="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : orders.length === 0 ? (
                  <Box textAlign="center" py={6}>
                    <ShoppingBag sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
                    <Typography variant="h6" color="#94a3b8" gutterBottom>
                      No orders yet
                    </Typography>
                    <Button
                      variant="contained"
                      component={RouterLink}
                      to="/products"
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, mt: 2 }}
                    >
                      Start Shopping
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {orders.slice(0, 10).map(order => (
                      <Paper
                        key={order.id}
                        variant="outlined"
                        sx={{ p: 2, borderRadius: 2, borderColor: '#e2e8f0' }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                              #{String(order.id).padStart(6, '0')}
                            </Typography>
                            <Chip
                              label={(order.status || '').replace(/_/g, ' ')}
                              size="small"
                              color={statusColors[order.status] || 'default'}
                            />
                          </Stack>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="body2" fontWeight={600} color="#059669">
                              ${Number(order.total || 0).toFixed(2)}
                            </Typography>
                            <Button
                              size="small"
                              component={RouterLink}
                              to={`/orders/${order.id}`}
                              sx={{ textTransform: 'none' }}
                            >
                              View
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {/* Security Tab - Password Change */}
            {tabValue === 2 && (
              <Box>
                <Typography variant="h6" fontWeight={600} color="#0f172a" mb={1}>
                  Change Password
                </Typography>
                <Typography variant="body2" color="#94a3b8" mb={3}>
                  Choose a strong password that you don't use elsewhere
                </Typography>

                <Box maxWidth={500}>
                  {/* Password Requirements */}
                  <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#f8fafc' }}>
                    <Typography variant="caption" fontWeight={600} color="#0f172a" gutterBottom display="block">
                      Password Requirements:
                    </Typography>
                    <List dense disablePadding>
                      {[
                        { text: 'At least 6 characters long', valid: passwordData.new_password.length >= 6 },
                        { text: 'Different from current password', valid: passwordData.new_password && passwordData.new_password !== passwordData.current_password },
                        { text: 'Passwords match', valid: passwordData.new_password && passwordData.new_password === passwordData.confirm_password },
                      ].map((req, i) => (
                        <ListItem key={i} sx={{ py: 0.3 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <CheckCircle sx={{ fontSize: 16, color: req.valid ? '#22c55e' : '#e2e8f0' }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={req.text} 
                            primaryTypographyProps={{ 
                              fontSize: '0.8rem', 
                              color: req.valid ? '#475569' : '#94a3b8' 
                            }} 
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>

                  {/* Current Password */}
                  <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} mb={0.5} display="block">
                    Current Password
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    error={!!passwordErrors.current_password}
                    helperText={passwordErrors.current_password}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: '#94a3b8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => togglePasswordVisibility('current')}>
                            {showPasswords.current ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />

                  {/* New Password */}
                  <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} mb={0.5} display="block" mt={2.5}>
                    New Password
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    error={!!passwordErrors.new_password}
                    helperText={passwordErrors.new_password}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <VpnKey sx={{ color: '#94a3b8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => togglePasswordVisibility('new')}>
                            {showPasswords.new ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />

                  {/* Confirm Password */}
                  <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} mb={0.5} display="block" mt={2.5}>
                    Confirm New Password
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    error={!!passwordErrors.confirm_password}
                    helperText={passwordErrors.confirm_password}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <VpnKey sx={{ color: '#94a3b8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => togglePasswordVisibility('confirm')}>
                            {showPasswords.confirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handlePasswordChange}
                    disabled={!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password || changingPassword}
                    sx={{ mt: 3, borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 1.2 }}
                  >
                    {changingPassword ? <CircularProgress size={20} /> : 'Update Password'}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Telegram Tab */}
            {tabValue === 3 && (
              <Box>
                <Typography variant="h6" fontWeight={600} color="#0f172a" mb={3}>
                  Telegram Notifications
                </Typography>
                <TelegramConnect />
              </Box>
            )}

          </Box>
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
    </Box>
  );
};

export default ProfilePage;