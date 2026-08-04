// src/components/payment/PaymentInfo.jsx
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Chip,
  Snackbar,
  IconButton,
} from '@mui/material';
import { 
  Payment, 
  Upload, 
  ContentCopy, 
  CheckCircle, 
  QrCodeScanner,
  AttachMoney,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import KHQRPayment from './KHQRPayment';

const PaymentInfo = ({ orderTotal, orderId, orderStatus }) => {
  const navigate = useNavigate();
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    fetchPaymentInfo();
  }, []);

  const fetchPaymentInfo = async () => {
    try {
      const response = await api.get('/admin/payment-info');
      setPaymentInfo(response.data);
    } catch (error) {
      console.error('Error fetching payment info:', error);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if payment is already completed
  const isPaid = orderStatus === 'paid' || orderStatus === 'completed' || orderStatus === 'shipping';

  if (isPaid) {
    return (
      <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CheckCircle />
          <Typography variant="body2" fontWeight={600}>
            Payment has been completed for this order.
          </Typography>
        </Stack>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!paymentInfo) {
    return null;
  }

  return (
    <Card variant="outlined" sx={{ mt: 2, borderRadius: 3, borderColor: '#e2e8f0' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Payment color="primary" />
            <Typography variant="h6" fontWeight={700}>Payment Details</Typography>
          </Stack>
          <Chip 
            label={orderStatus || 'Pending'} 
            color={orderStatus === 'pending' ? 'warning' : 'info'}
            size="small"
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Amount */}
        <Box sx={{ mb: 3, p: 2.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="caption" color="#64748b">Amount to Pay</Typography>
              <Typography variant="h4" fontWeight={800} color="#059669">
                ${Number(orderTotal || 0).toFixed(2)}
              </Typography>
            </Box>
            <Chip 
              icon={<AttachMoney />} 
              label="USD" 
              color="success" 
              size="small" 
              variant="outlined"
            />
          </Stack>
        </Box>

        {/* Bank Details */}
        <Box sx={{ mb: 3, p: 2.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            🏦 Bank Transfer Details
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="#64748b">Bank</Typography>
              <Typography variant="body2" fontWeight={600} color="#0f172a">
                {paymentInfo.bank_name}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="#64748b">Account Name</Typography>
              <Typography variant="body2" fontWeight={600} color="#0f172a">
                {paymentInfo.account_name}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="#64748b">Account Number</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={700} fontFamily="monospace" fontSize="1rem" color="#2563eb">
                  {paymentInfo.account_number}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => copyToClipboard(paymentInfo.account_number)}
                  sx={{ p: 0.5 }}
                >
                  {copied ? 
                    <CheckCircle sx={{ color: '#22c55e', fontSize: 16 }} /> : 
                    <ContentCopy sx={{ fontSize: 14, color: '#94a3b8' }} />
                  }
                </IconButton>
              </Stack>
            </Stack>
            {paymentInfo.swift_code && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="#64748b">SWIFT Code</Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {paymentInfo.swift_code}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Box>

        {/* QR Code Section */}
        <Box sx={{ mb: 3 }}>
          <KHQRPayment orderId={orderId} amount={orderTotal} />
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Instructions */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            📋 Instructions:
          </Typography>
          {paymentInfo.instructions?.map((instruction, index) => (
            <Typography key={index} variant="body2" color="#64748b" sx={{ mb: 0.5, display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ marginRight: 8 }}>•</span>
              {instruction}
            </Typography>
          ))}
        </Box>

        {/* Action Button */}
        <Button
          variant="contained"
          fullWidth
          startIcon={<Upload />}
          onClick={() => navigate(`/orders/${orderId}/upload-payment`)}
          sx={{ 
            borderRadius: 2, 
            textTransform: 'none', 
            fontWeight: 600, 
            py: 1.5,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}
        >
          Upload Payment Proof
        </Button>

        <Typography variant="caption" color="#94a3b8" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          After payment, upload screenshot for verification
        </Typography>
      </CardContent>

      <Snackbar 
        open={copied} 
        autoHideDuration={2000} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled" sx={{ borderRadius: 2 }}>
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default PaymentInfo;