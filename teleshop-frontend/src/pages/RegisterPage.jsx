// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { 
  CheckCircle, 
  Error,  // ✅ Use 'Error' instead of 'ErrorOutline'
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });
  const [errors, setErrors] = useState([]);
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setGeneralError('');
    setLoading(true);
    
    try {
      const result = await register(formData);
      console.log('Registration result:', result);
      
      setRegistrationData(result);
      setShowSuccessDialog(true);
      
    } catch (error) {
      console.log('Error response:', error.response?.data);
      
      if (error.response?.status === 422) {
        const data = error.response.data;
        
        if (data.errors && Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else if (data.detail && Array.isArray(data.detail)) {
          setErrors(data.detail);
        } else if (typeof data.detail === 'string') {
          setGeneralError(data.detail);
        } else {
          setGeneralError('Validation failed. Please check your input.');
        }
      } else if (error.response?.data?.detail) {
        setGeneralError(error.response.data.detail);
      } else {
        setGeneralError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (fieldName) => {
    const error = errors.find(e => e.field === fieldName);
    return error ? error.message : '';
  };

  const handleCloseDialog = () => {
    setShowSuccessDialog(false);
    navigate('/login');
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight={700}>Create Account</Typography>
          <Typography variant="body2" color="#94a3b8" mt={1}>
            Join TeleShop today
          </Typography>
        </Box>
        
        {/* General Error */}
        {generalError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {generalError}
          </Alert>
        )}
        
        {/* Detailed Validation Errors */}
        {errors.length > 0 && (
          <Alert 
            severity="error" 
            sx={{ mb: 2, borderRadius: 2 }}
            icon={<Error />}
          >
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Please fix the following errors:
            </Typography>
            {errors.map((error, index) => (
              <Typography key={index} variant="body2" color="#dc2626" sx={{ ml: 2 }}>
                • <strong>{error.field}:</strong> {error.message}
              </Typography>
            ))}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
            error={!!getFieldError('full_name')}
            sx={{ mb: 2 }}
            InputProps={{ sx: { borderRadius: 2 } }}
          />
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            error={!!getFieldError('email')}
            sx={{ mb: 2 }}
            InputProps={{ sx: { borderRadius: 2 } }}
          />
          <TextField
            fullWidth
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            error={!!getFieldError('phone')}
            placeholder="012345678"
            sx={{ mb: 2 }}
            InputProps={{ sx: { borderRadius: 2 } }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            error={!!getFieldError('password')}
            sx={{ mb: 3 }}
            InputProps={{ sx: { borderRadius: 2 } }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            fullWidth 
            size="large"
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Account'}
          </Button>
        </form>
        
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="#64748b">
            Already have an account?{' '}
            <RouterLink to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
              Login here
            </RouterLink>
          </Typography>
        </Box>
      </Paper>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 60, color: '#22c55e', mb: 1 }} />
          <Typography variant="h5" fontWeight={700}>Registration Successful!</Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText textAlign="center" paragraph>
            Your account has been created successfully.
          </DialogContentText>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>⏳ Account Pending Approval</strong>
              <br />
              Your account is waiting for admin approval. You will be notified via Telegram once approved.
            </Typography>
          </Alert>
          {registrationData && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="caption" color="#94a3b8">
                User ID: {registrationData.user_id}
              </Typography>
              <Typography variant="caption" color="#94a3b8" display="block">
                Status: {registrationData.status}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="contained" 
            fullWidth 
            onClick={handleCloseDialog}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RegisterPage;