// src/pages/admin/AdminProfile.jsx
import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Stack, TextField, Button, Avatar, IconButton,
  Paper, Divider, Snackbar, Alert, CircularProgress, Grid
} from '@mui/material';
import {
  Save, PhotoCamera, ArrowBack, Person
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

const AdminProfile = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar_url: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSnackbar({ open: true, message: 'Please select an image file', severity: 'error' });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({ open: true, message: 'Image must be less than 5MB', severity: 'error' });
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/auth/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newAvatarUrl = res.data.avatar_url;
      setProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));
      
      // Update user context
      if (setUser) {
        setUser(prev => ({ ...prev, avatar_url: newAvatarUrl }));
      }
      
      // Also update localStorage if needed
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.avatar_url = newAvatarUrl;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      
      setSnackbar({ open: true, message: 'Profile picture updated!', severity: 'success' });
    } catch (e) {
      console.error('Avatar upload failed:', e);
      const errorMsg = e.response?.data?.detail || 'Failed to upload image';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!profile.full_name.trim()) {
      setSnackbar({ open: true, message: 'Full name is required', severity: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', {
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
      });
      
      // Update user context
      if (setUser) {
        setUser(prev => ({ 
          ...prev, 
          full_name: res.data.full_name,
          phone: res.data.phone,
          avatar_url: res.data.avatar_url
        }));
      }
      
      // Update localStorage
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.full_name = res.data.full_name;
        parsed.phone = res.data.phone;
        parsed.avatar_url = res.data.avatar_url;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (e) {
      console.error('Profile update failed:', e);
      const errorMsg = e.response?.data?.detail || 'Failed to update profile';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 700, mx: 'auto' }}>
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <IconButton onClick={() => navigate('/admin')} sx={{ bgcolor: '#f0f2f5' }}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Admin Profile
            </Typography>
            <Typography variant="body2" color="#65676b">
              Manage your profile information and picture
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {/* Avatar Section */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Avatar
              src={profile.avatar_url}
              sx={{
                width: 140,
                height: 140,
                border: '4px solid white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                fontSize: 56,
                fontWeight: 'bold',
                bgcolor: profile.avatar_url ? 'transparent' : '#42b72a'
              }}
            >
              {!profile.avatar_url && (
                profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'
              )}
            </Avatar>
            
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                bgcolor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                width: 40,
                height: 40,
                '&:hover': { bgcolor: '#f0f2f5' }
              }}
            >
              {uploading ? (
                <CircularProgress size={20} />
              ) : (
                <PhotoCamera sx={{ fontSize: 20, color: '#65676b' }} />
              )}
            </IconButton>
          </Box>
          
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept="image/*"
            onChange={handleAvatarUpload}
          />
          
          <Button
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            sx={{ mt: 1.5, textTransform: 'none' }}
          >
            {uploading ? 'Uploading...' : 'Change Profile Picture'}
          </Button>
        </Box>

        {/* Profile Fields */}
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" color="#65676b" fontWeight={600} mb={0.5} display="block">
                Full Name *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={profile.full_name}
                onChange={e => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter your full name"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="#65676b" fontWeight={600} mb={0.5} display="block">
                Email
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={profile.email}
                disabled
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: '#f1f5f9',
                  },
                  '& .Mui-disabled': {
                    color: '#64748b',
                    WebkitTextFillColor: '#64748b',
                  }
                }}
              />
              <Typography variant="caption" color="#94a3b8">
                Email cannot be changed
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="#65676b" fontWeight={600} mb={0.5} display="block">
                Phone
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={profile.phone}
                onChange={e => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter your phone number"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }
                }}
              />
            </Grid>
          </Grid>

          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: 2,
              bgcolor: '#0084ff',
              '&:hover': { bgcolor: '#0066cc' },
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              mt: 1,
              boxShadow: '0 4px 12px rgba(0,132,255,0.3)',
            }}
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled" 
          sx={{ borderRadius: 2, minWidth: 300 }}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminProfile;