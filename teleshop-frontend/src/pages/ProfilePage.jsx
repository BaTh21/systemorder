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
  useMediaQuery,
  useTheme,
  Badge,
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
  CloudUpload,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TelegramConnect from '../components/telegram/TelegramConnect';
import api from '../api/axios';

const ProfilePage = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  useEffect(() => {
    if (tabValue === 1) fetchOrders();
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({ open: true, message: 'Image must be less than 5MB', severity: 'error' });
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setSnackbar({ open: true, message: 'Only JPG, PNG, GIF, WebP allowed', severity: 'error' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await api.post('/auth/upload-avatar', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setAvatarUrl(response.data.avatar_url);
      setSnackbar({ open: true, message: 'Profile picture updated!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to upload image', severity: 'error' });
    } finally {
      setUploadingAvatar(false);
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
        setAvatarUrl(userResponse.data.avatar_url || '');
      }
      setEditing(false);
      setSnackbar({ open: true, message: 'Profile updated!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update profile', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordData.current_password) errors.current_password = 'Required';
    if (!passwordData.new_password) errors.new_password = 'Required';
    else if (passwordData.new_password.length < 6) errors.new_password = 'At least 6 characters';
    else if (passwordData.new_password === passwordData.current_password) errors.new_password = 'Must be different';
    if (!passwordData.confirm_password) errors.confirm_password = 'Required';
    else if (passwordData.new_password !== passwordData.confirm_password) errors.confirm_password = 'Not match';
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
      setSnackbar({ open: true, message: 'Password changed!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.detail || 'Failed', severity: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const statusColors = {
    pending: 'default', confirmed: 'primary', waiting_payment: 'warning',
    paid: 'info', purchasing: 'info', shipping: 'primary',
    completed: 'success', cancelled: 'error',
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 3, md: 4 } }}>
      <Container maxWidth="lg">
        
        {/* Profile Header */}
        <Paper elevation={0} sx={{ 
          p: { xs: 2, sm: 3, md: 4 }, 
          mb: { xs: 2, sm: 3 }, 
          borderRadius: { xs: 2, sm: 3 }, 
          border: '1px solid #e2e8f0', 
          bgcolor: 'white' 
        }}>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={{ xs: 2, sm: 3 }} 
            alignItems={{ xs: 'center', sm: 'center' }}
            textAlign={{ xs: 'center', sm: 'left' }}
          >
            {/* Avatar with Upload Badge */}
            <Box sx={{ position: 'relative' }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <label htmlFor="avatar-upload" style={{ cursor: 'pointer' }}>
                    <input
                      id="avatar-upload"
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        bgcolor: '#2563eb',
                        border: '2px solid white',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#1d4ed8' },
                      }}
                    >
                      <CloudUpload sx={{ fontSize: 14 }} />
                    </Avatar>
                  </label>
                }
              >
                <Avatar
                  src={avatarUrl || ''}
                  sx={{
                    width: { xs: 64, sm: 72, md: 80 },
                    height: { xs: 64, sm: 72, md: 80 },
                    bgcolor: avatarUrl ? 'transparent' : '#2563eb',
                    fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2rem' },
                    fontWeight: 700,
                    border: '3px solid #e2e8f0',
                  }}
                >
                  {!avatarUrl && (user?.full_name?.charAt(0)?.toUpperCase() || 'U')}
                </Avatar>
              </Badge>
              {uploadingAvatar && (
                <CircularProgress 
                  size={24} 
                  sx={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    marginTop: '-12px', 
                    marginLeft: '-12px',
                    zIndex: 1,
                  }} 
                />
              )}
            </Box>

            {/* User Info */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700} color="#0f172a" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' } }}>
                {user?.full_name || 'User'}
              </Typography>
              <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" justifyContent={{ xs: 'center', sm: 'flex-start' }} useFlexGap>
                <Chip icon={<Email sx={{ fontSize: { xs: 12, sm: 14 } }} />} label={user?.email} size="small" variant="outlined" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }} />
                {user?.phone && <Chip icon={<Phone sx={{ fontSize: { xs: 12, sm: 14 } }} />} label={user?.phone} size="small" variant="outlined" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }} />}
                {user?.role === 'admin' && <Chip label="Admin" size="small" color="primary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }} />}
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* Tabs */}
        <Paper elevation={0} sx={{ 
          mb: { xs: 2, sm: 3 }, 
          borderRadius: { xs: 2, sm: 3 }, 
          border: '1px solid #e2e8f0', 
          bgcolor: 'white', 
          overflow: 'hidden' 
        }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ 
              px: { xs: 1, sm: 2 }, 
              borderBottom: '1px solid #e2e8f0',
              '& .MuiTab-root': {
                minHeight: { xs: 48, sm: 56, md: 64 },
                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                px: { xs: 1.5, sm: 2, md: 3 },
              }
            }}
          >
            <Tab icon={<Person sx={{ fontSize: { xs: 18, sm: 20 } }} />} label="Personal Info" iconPosition="start" />
            <Tab icon={<ShoppingBag sx={{ fontSize: { xs: 18, sm: 20 } }} />} label="My Orders" iconPosition="start" />
            <Tab icon={<Security sx={{ fontSize: { xs: 18, sm: 20 } }} />} label="Security" iconPosition="start" />
            <Tab icon={<Notifications sx={{ fontSize: { xs: 18, sm: 20 } }} />} label="Telegram" iconPosition="start" />
          </Tabs>

          <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>

            {/* Personal Info Tab */}
            {tabValue === 0 && (
              <Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={3} spacing={1}>
                  <Typography variant="h6" fontWeight={600} color="#0f172a" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                    Personal Information
                  </Typography>
                  <Button
                    variant={editing ? 'contained' : 'outlined'}
                    startIcon={editing ? <Save /> : <Edit />}
                    onClick={() => editing ? handleSave() : setEditing(true)}
                    disabled={saving}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, width: { xs: '100%', sm: 'auto' } }}
                  >
                    {saving ? <CircularProgress size={20} /> : editing ? 'Save Changes' : 'Edit Profile'}
                  </Button>
                </Stack>

                <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                      Full Name
                    </Typography>
                    <TextField fullWidth value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!editing} size="small"
                      InputProps={{ startAdornment: <Person sx={{ color: '#94a3b8', mr: 1, fontSize: { xs: 16, sm: 20 } }} /> }}
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                      Email Address
                    </Typography>
                    <TextField fullWidth value={formData.email} disabled size="small"
                      InputProps={{ startAdornment: <Email sx={{ color: '#94a3b8', mr: 1, fontSize: { xs: 16, sm: 20 } }} /> }}
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                      Phone Number
                    </Typography>
                    <TextField fullWidth value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!editing} size="small"
                      InputProps={{ startAdornment: <Phone sx={{ color: '#94a3b8', mr: 1, fontSize: { xs: 16, sm: 20 } }} /> }}
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                      Account Type
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip label={user?.role === 'admin' ? 'Administrator' : 'Customer'} color={user?.role === 'admin' ? 'primary' : 'default'} />
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* My Orders Tab */}
            {tabValue === 1 && (
              <Box>
                <Typography variant="h6" fontWeight={600} color="#0f172a" mb={3} sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                  My Orders
                </Typography>
                {loadingOrders ? (
                  <Box textAlign="center" py={4}><CircularProgress /></Box>
                ) : orders.length === 0 ? (
                  <Box textAlign="center" py={6}>
                    <ShoppingBag sx={{ fontSize: { xs: 40, sm: 48, md: 60 }, color: '#cbd5e1', mb: 2 }} />
                    <Typography variant="h6" color="#94a3b8" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>No orders yet</Typography>
                    <Button variant="contained" component={RouterLink} to="/products"
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, mt: 2, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                      Start Shopping
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={{ xs: 1.5, sm: 2 }}>
                    {orders.slice(0, 10).map(order => (
                      <Paper key={order.id} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, borderColor: '#e2e8f0' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                          <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
                            <Typography variant="body2" fontWeight={600} fontFamily="monospace" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                              #{String(order.id).padStart(6, '0')}
                            </Typography>
                            <Chip label={(order.status || '').replace(/_/g, ' ')} size="small" color={statusColors[order.status] || 'default'}
                              sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }} />
                          </Stack>
                          <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
                            <Typography variant="body2" fontWeight={600} color="#059669" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                              ${Number(order.total || 0).toFixed(2)}
                            </Typography>
                            <Button size="small" component={RouterLink} to={`/orders/${order.id}`}
                              sx={{ textTransform: 'none', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>View</Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {/* Security Tab */}
            {tabValue === 2 && (
              <Box>
                <Typography variant="h6" fontWeight={600} color="#0f172a" mb={1} sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                  Change Password
                </Typography>
                <Typography variant="body2" color="#94a3b8" mb={3} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                  Choose a strong password
                </Typography>

                <Box maxWidth={500}>
                  <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#f8fafc' }}>
                    <Typography variant="caption" fontWeight={600} color="#0f172a" gutterBottom display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                      Requirements:
                    </Typography>
                    <List dense disablePadding>
                      {[
                        { text: 'At least 6 characters', valid: passwordData.new_password.length >= 6 },
                        { text: 'Different from current', valid: passwordData.new_password && passwordData.new_password !== passwordData.current_password },
                        { text: 'Passwords match', valid: passwordData.new_password && passwordData.new_password === passwordData.confirm_password },
                      ].map((req, i) => (
                        <ListItem key={i} sx={{ py: 0.2 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <CheckCircle sx={{ fontSize: { xs: 14, sm: 16 }, color: req.valid ? '#22c55e' : '#e2e8f0' }} />
                          </ListItemIcon>
                          <ListItemText primary={req.text} primaryTypographyProps={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, color: req.valid ? '#475569' : '#94a3b8' }} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>

                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} mb={0.5} display="block" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                        Current Password
                      </Typography>
                      <TextField fullWidth type={showPasswords.current ? 'text' : 'password'} value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        error={!!passwordErrors.current_password} helperText={passwordErrors.current_password} size="small"
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><Lock sx={{ color: '#94a3b8', fontSize: { xs: 16, sm: 20 } }} /></InputAdornment>,
                          endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => togglePasswordVisibility('current')}>{showPasswords.current ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    </Box>

                    <Box>
                      <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} mb={0.5} display="block" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                        New Password
                      </Typography>
                      <TextField fullWidth type={showPasswords.new ? 'text' : 'password'} value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        error={!!passwordErrors.new_password} helperText={passwordErrors.new_password} size="small"
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><VpnKey sx={{ color: '#94a3b8', fontSize: { xs: 16, sm: 20 } }} /></InputAdornment>,
                          endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => togglePasswordVisibility('new')}>{showPasswords.new ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    </Box>

                    <Box>
                      <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} mb={0.5} display="block" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                        Confirm Password
                      </Typography>
                      <TextField fullWidth type={showPasswords.confirm ? 'text' : 'password'} value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        error={!!passwordErrors.confirm_password} helperText={passwordErrors.confirm_password} size="small"
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><VpnKey sx={{ color: '#94a3b8', fontSize: { xs: 16, sm: 20 } }} /></InputAdornment>,
                          endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => togglePasswordVisibility('confirm')}>{showPasswords.confirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    </Box>

                    <Button variant="contained" fullWidth onClick={handlePasswordChange}
                      disabled={!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password || changingPassword}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 1.2, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                      {changingPassword ? <CircularProgress size={20} /> : 'Update Password'}
                    </Button>
                  </Stack>
                </Box>
              </Box>
            )}

            {/* Telegram Tab */}
            {tabValue === 3 && (
              <Box>
                <Typography variant="h6" fontWeight={600} color="#0f172a" mb={3} sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                  Telegram Notifications
                </Typography>
                <TelegramConnect />
              </Box>
            )}

          </Box>
        </Paper>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default ProfilePage;