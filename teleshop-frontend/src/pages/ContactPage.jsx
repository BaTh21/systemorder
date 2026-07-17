// src/pages/ContactPage.jsx
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  TextField,
  Button,
  Stack,
  Alert,
  Snackbar,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  Email,
  Phone,
  LocationOn,
  AccessTime,
  Send,
  CheckCircle,
  Telegram,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

const ContactPage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    subject: '',
    message: '',
    order_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post('/contact', formData);
      setSnackbar({ open: true, message: 'Message sent! We\'ll reply within 24 hours.', severity: 'success' });
      setFormData({ ...formData, subject: '', message: '', order_id: '' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to send message. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const subjects = [
    'Order Issue',
    'Payment Problem',
    'Product Question',
    'Account Help',
    'Technical Support',
    'Returns & Refunds',
    'Shipping Question',
    'Other',
  ];

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        
        {/* Header */}
        <Box textAlign="center" mb={5}>
          <Typography variant="h3" fontWeight={800} color="#0f172a" gutterBottom>
            Contact Us
          </Typography>
          <Typography variant="body1" color="#64748b" maxWidth={600} mx="auto">
            Have a question or need help? We're here for you. Fill out the form below or reach us directly.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          
          {/* Contact Form */}
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <Typography variant="h5" fontWeight={700} color="#0f172a" mb={3}>
                Send us a Message
              </Typography>
              
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1}>
                      Name
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      size="small"
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1}>
                      Email
                    </Typography>
                    <TextField
                      fullWidth
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      size="small"
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1}>
                      Subject
                    </Typography>
                    <TextField
                      fullWidth
                      select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      size="small"
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {subjects.map((s) => (
                        <MenuItem key={s} value={s}>{s}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1}>
                      Order ID (if applicable)
                    </Typography>
                    <TextField
                      fullWidth
                      value={formData.order_id}
                      onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                      size="small"
                      placeholder="e.g., 123"
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1}>
                      Message
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      size="small"
                      placeholder="Describe your issue in detail..."
                      sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 1.5, px: 4 }}
                    >
                      {loading ? 'Sending...' : 'Send Message'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          </Grid>

          {/* Contact Info */}
          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              
              {/* Quick Contact */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Typography variant="h6" fontWeight={700} color="#0f172a" mb={3}>
                  Contact Information
                </Typography>
                
                <Stack spacing={2.5}>
                  {[
                    { icon: <Email sx={{ color: '#2563eb' }} />, label: 'Email', value: 'support@teleshop.com', sub: 'We reply within 24 hours' },
                    { icon: <Phone sx={{ color: '#22c55e' }} />, label: 'Phone', value: '+1 (234) 567-8900', sub: 'Mon-Fri, 9AM-6PM' },
                    { icon: <Telegram sx={{ color: '#0088cc' }} />, label: 'Telegram', value: '@TeleShopBot', sub: '24/7 automated support' },
                    { icon: <LocationOn sx={{ color: '#f59e0b' }} />, label: 'Office', value: '123 Commerce St, NY', sub: 'Visit us!' },
                    { icon: <AccessTime sx={{ color: '#8b5cf6' }} />, label: 'Hours', value: 'Mon-Fri: 9AM - 9PM', sub: 'Sat: 9AM - 6PM, Sun: Closed' },
                  ].map((item, i) => (
                    <Stack key={i} direction="row" spacing={2}>
                      <Box sx={{ mt: 0.3 }}>{item.icon}</Box>
                      <Box>
                        <Typography variant="caption" color="#94a3b8">{item.label}</Typography>
                        <Typography variant="body2" fontWeight={600} color="#0f172a">{item.value}</Typography>
                        <Typography variant="caption" color="#94a3b8">{item.sub}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Paper>

              {/* FAQ Quick Links */}
              <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#eff6ff' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} color="#0f172a" mb={1}>
                    Quick Links
                  </Typography>
                  <Stack spacing={1}>
                    {[
                      { text: 'Track Your Order →', link: '/orders' },
                      { text: 'My Profile →', link: '/profile' },
                      { text: 'Payment Info →', link: '/orders' },
                      { text: 'FAQ →', link: '#' },
                    ].map((link, i) => (
                      <Button
                        key={i}
                        component={RouterLink}
                        to={link.link}
                        sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#2563eb', fontWeight: 500 }}
                      >
                        <CheckCircle sx={{ mr: 1, fontSize: 18, color: '#22c55e' }} />
                        {link.text}
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

            </Stack>
          </Grid>
        </Grid>
      </Container>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ContactPage;