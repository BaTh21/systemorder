// src/pages/CheckoutPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Stack,
  Divider,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Person,
  Phone,
  Home,
  ShoppingCart,
  CheckCircle,
  LocalShipping,
  Payment,
  Shield,
  WarningAmber,
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import api from '../api/axios';

const steps = ['Shipping', 'Review', 'Confirm'];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems, totalPrice, clearCart } = useCart();
  const [activeStep, setActiveStep] = useState(0);
  const [shippingAddress, setShippingAddress] = useState({
    full_name: '',
    address: '',
    phone: '',
  });
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [alertDialog, setAlertDialog] = useState({ open: false, message: '' });

  const handleAddressChange = (e) => {
    setShippingAddress({ ...shippingAddress, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const orderData = {
        shipping_address: {
          full_name: shippingAddress.full_name,
          address_line1: shippingAddress.address,
          phone: shippingAddress.phone,
        },
        customer_notes: notes,
        payment_method: 'bank_transfer',
      };
      await api.post('/orders', orderData);
      await clearCart();
      navigate('/orders');
    } catch (error) {
      console.error('Error placing order:', error);
      setAlertDialog({ open: true, message: 'Failed to place order. Please try again.' });
    } finally {
      setPlacing(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!shippingAddress.full_name || !shippingAddress.address || !shippingAddress.phone) {
        setAlertDialog({ 
          open: true, 
          message: 'Please fill in all shipping details:\n\n' +
            (!shippingAddress.full_name ? '• Full Name is required\n' : '') +
            (!shippingAddress.address ? '• Address is required\n' : '') +
            (!shippingAddress.phone ? '• Phone Number is required' : '')
        });
        return;
      }
    }
    setActiveStep(activeStep + 1);
  };

  const handleBack = () => { setActiveStep(activeStep - 1); };

  if (cartItems.length === 0) {
    return (
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="sm" sx={{ textAlign: 'center', py: 8 }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <ShoppingCart sx={{ fontSize: 36, color: '#94a3b8' }} />
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom color="#0f172a">Your cart is empty</Typography>
          <Typography variant="body2" color="#94a3b8" mb={4}>Add some products to get started!</Typography>
          <Button variant="contained" onClick={() => navigate('/products')} 
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 4, py: 1.2, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
            Browse Products
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 5 } }}>
      <Container maxWidth="lg">
        
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" fontWeight={800} color="#0f172a" gutterBottom>
            Checkout
          </Typography>
          <Typography variant="body2" color="#94a3b8">
            Complete your order in a few steps
          </Typography>
        </Box>

        {/* Stepper */}
        <Box sx={{ maxWidth: 700, mx: 'auto' }}>
          <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
            {[
              { label: 'Shipping', icon: <LocalShipping /> },
              { label: 'Review', icon: <CheckCircle /> },
              { label: 'Confirm', icon: <Payment /> },
            ].map((step, index) => (
              <Step key={step.label} completed={activeStep > index}>
                <StepLabel
                  StepIconComponent={() => (
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: activeStep >= index ? '#2563eb' : '#e2e8f0',
                        color: activeStep >= index ? 'white' : '#94a3b8',
                        fontSize: '1rem',
                      }}
                    >
                      {activeStep > index ? <CheckCircle sx={{ fontSize: 20 }} /> : step.icon}
                    </Avatar>
                  )}
                >
                  <Typography variant="body2" fontWeight={activeStep === index ? 700 : 400} color={activeStep >= index ? '#0f172a' : '#94a3b8'}>
                    {step.label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Content Card */}
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <Paper elevation={0} sx={{ 
            borderRadius: 4, 
            border: '1px solid #e2e8f0', 
            bgcolor: 'white',
            overflow: 'hidden',
          }}>
            
            {/* Step Indicator */}
            <Box sx={{ bgcolor: '#2563eb', color: 'white', px: 3, py: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {activeStep === 0 && '📦 Shipping Information'}
                {activeStep === 1 && '📋 Review Your Order'}
                {activeStep === 2 && '✅ Confirm & Pay'}
              </Typography>
            </Box>

            <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              
              {/* Step 1: Shipping Form */}
              {activeStep === 0 && (
                <Stack spacing={3}>
                  <TextField fullWidth label="Full Name" name="full_name" value={shippingAddress.full_name}
                    onChange={handleAddressChange} required placeholder="Enter your full name"
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Person sx={{ color: '#2563eb', fontSize: 20 }} />
                          </Box>
                        </Box>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fafafa', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#2563eb' } } }} />
                  
                  <TextField fullWidth label="Address" name="address" value={shippingAddress.address}
                    onChange={handleAddressChange} required placeholder="Enter your Address"
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Home sx={{ color: '#22c55e', fontSize: 20 }} />
                          </Box>
                        </Box>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fafafa', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#2563eb' } } }} />
                  
                  <TextField fullWidth label="Phone Number" name="phone" value={shippingAddress.phone}
                    onChange={handleAddressChange} required placeholder="Enter your phone number"
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Phone sx={{ color: '#f59e0b', fontSize: 20 }} />
                          </Box>
                        </Box>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fafafa', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#2563eb' } } }} />
                </Stack>
              )}

              {/* Step 2: Review Order */}
              {activeStep === 1 && (
                <Box>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderColor: '#e2e8f0', bgcolor: '#f8fafc', mb: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LocalShipping sx={{ color: '#2563eb', fontSize: 20 }} />
                      </Box>
                      <Typography variant="subtitle2" fontWeight={700} color="#0f172a">Shipping Address</Typography>
                    </Stack>
                    <Stack spacing={0.5} pl={6.5}>
                      <Typography variant="body2" fontWeight={600}>{shippingAddress.full_name}</Typography>
                      <Typography variant="body2" color="#475569">{shippingAddress.address}</Typography>
                      <Typography variant="body2" color="#475569">{shippingAddress.phone}</Typography>
                    </Stack>
                  </Paper>

                  <Typography variant="subtitle2" fontWeight={700} color="#0f172a" mb={2}>Order Items</Typography>
                  <Stack spacing={1.5} mb={3}>
                    {cartItems.map((item) => (
                      <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center"
                        sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{item.product_name}</Typography>
                          <Typography variant="caption" color="#94a3b8">
                            Qty: {item.quantity} × ${Number(item.unit_price || 0).toFixed(2)}
                          </Typography>
                        </Box>
                        <Chip label={`$${Number(item.total_price || 0).toFixed(2)}`} color="success" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </Stack>
                    ))}
                  </Stack>

                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderColor: '#e2e8f0', bgcolor: '#f8fafc' }}>
                    <Stack spacing={1.5}>
                      {[
                        { label: 'Subtotal', value: `$${totalPrice.toFixed(2)}` },
                        { label: 'Shipping', value: '$5.00' },
                        { label: 'Service Fee (5%)', value: `$${(totalPrice * 0.05).toFixed(2)}` },
                      ].map((row) => (
                        <Stack key={row.label} direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="#64748b">{row.label}</Typography>
                          <Typography variant="body2" fontWeight={500}>{row.value}</Typography>
                        </Stack>
                      ))}
                      <Divider />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography fontWeight={800} color="#0f172a" fontSize="1.1rem">Total</Typography>
                        <Typography fontWeight={800} color="#059669" fontSize="1.2rem">
                          ${(totalPrice + 5 + totalPrice * 0.05).toFixed(2)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>

                  <TextField fullWidth label="Order Notes (Optional)" value={notes}
                    onChange={(e) => setNotes(e.target.value)} multiline rows={2}
                    sx={{ mt: 3, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fafafa' } }} />
                </Box>
              )}

              {/* Step 3: Confirm */}
              {activeStep === 2 && (
                <Box textAlign="center" py={4}>
                  <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                    <Shield sx={{ fontSize: 40, color: '#22c55e' }} />
                  </Box>
                  <Typography variant="h5" fontWeight={700} color="#0f172a" gutterBottom>Ready to Order</Typography>
                  <Typography variant="body2" color="#64748b" mb={3}>Your order will be processed immediately</Typography>
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: '#bbf7d0', bgcolor: '#f0fdf4', display: 'inline-block', mb: 2 }}>
                    <Typography variant="h3" fontWeight={800} color="#059669">
                      ${(totalPrice + 5 + totalPrice * 0.05).toFixed(2)}
                    </Typography>
                  </Paper>
                  <Typography variant="caption" color="#94a3b8" display="block">
                    Payment: Bank Transfer • {cartItems.length} item(s)
                  </Typography>
                </Box>
              )}

              {/* Navigation Buttons */}
              <Stack direction="row" justifyContent="flex-end" alignItems="center" 
                sx={{ mt: activeStep === 0 ? 5 : 3, pt: 3, borderTop: '1px solid #e2e8f0', gap: 1.5 }}>
                
                {activeStep > 0 && (
                  <Button onClick={handleBack} variant="outlined"
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500, px: 3, py: 1, borderColor: '#e2e8f0', color: '#64748b', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}>
                    ← Back
                  </Button>
                )}

                {activeStep === steps.length - 1 ? (
                  <Button variant="contained" onClick={handlePlaceOrder} disabled={placing}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 5, py: 1.2, bgcolor: '#059669', fontSize: '1rem', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)', '&:hover': { bgcolor: '#047857', boxShadow: '0 6px 16px rgba(5, 150, 105, 0.4)' }, '&:disabled': { bgcolor: '#a7f3d0' } }}>
                    {placing ? 'Placing Order...' : '✓ Place Order'}
                  </Button>
                ) : (
                  <Button variant="contained" onClick={handleNext}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 4, py: 1, bgcolor: '#2563eb', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', '&:hover': { bgcolor: '#1d4ed8', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' } }}>
                    Next →
                  </Button>
                )}
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Container>

      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onClose={() => setAlertDialog({ open: false, message: '' })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarningAmber sx={{ color: '#f59e0b' }} />
          </Box>
          <Typography variant="h6" fontWeight={700} color="#0f172a">Incomplete Form</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="#475569" sx={{ whiteSpace: 'pre-line' }}>{alertDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button variant="contained" onClick={() => setAlertDialog({ open: false, message: '' })}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 4 }}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CheckoutPage;