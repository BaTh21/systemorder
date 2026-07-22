// src/components/payment/KHQRPayment.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  QrCode,
  ContentCopy,
  CheckCircle,
  AccountBalance,
} from '@mui/icons-material';
import api from '../../api/axios';

const KHQRPayment = ({ orderId, amount }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchKHQR();
    }
  }, [orderId]);

  const fetchKHQR = async () => {
    try {
      const response = await api.get(`/payment/khqr-info`, {
        params: { order_id: orderId }
      });
      setQrData(response.data);
    } catch (error) {
      console.error('Error fetching KHQR:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyAccountNumber = () => {
    if (qrData?.bank_account) {
      navigator.clipboard.writeText(qrData.bank_account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  }

  if (!qrData) {
    return <Typography color="error">Failed to load payment info</Typography>;
  }

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '2px solid #bbf7d0', bgcolor: '#f0fdf4' }}>
      <Stack spacing={3} alignItems="center">
        
        {/* Title */}
        <Stack direction="row" spacing={1} alignItems="center">
          <AccountBalance sx={{ color: '#059669', fontSize: 28 }} />
          <Typography variant="h6" fontWeight={700} color="#0f172a">
            Bakong KHQR Payment
          </Typography>
        </Stack>

        {/* QR Code */}
        {qrData.qr_image && (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'white', 
            borderRadius: 2, 
            border: '2px solid #e2e8f0',
            display: 'inline-block',
          }}>
            <img 
              src={qrData.qr_image} 
              alt="KHQR Code" 
              style={{ width: 250, height: 250 }}
            />
          </Box>
        )}

        {/* Amount */}
        <Box textAlign="center">
          <Typography variant="caption" color="#64748b">Amount to Pay</Typography>
          <Typography variant="h4" fontWeight={800} color="#059669">
            ${Number(amount || qrData.amount).toFixed(2)}
          </Typography>
        </Box>

        <Divider sx={{ width: '100%' }} />

        {/* Bank Details */}
        <Box width="100%">
          <Typography variant="subtitle2" fontWeight={600} color="#0f172a" gutterBottom>
            Bank Details
          </Typography>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="#64748b">Bank</Typography>
              <Typography variant="body2" fontWeight={600}>{qrData.bank_name}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="#64748b">Account Name</Typography>
              <Typography variant="body2" fontWeight={600}>{qrData.account_name}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="#64748b">Account Number</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                  {qrData.bank_account}
                </Typography>
                <Button size="small" onClick={copyAccountNumber} sx={{ minWidth: 'auto', p: 0.5 }}>
                  {copied ? <CheckCircle sx={{ color: '#22c55e', fontSize: 18 }} /> : <ContentCopy sx={{ fontSize: 16 }} />}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        {/* Instructions */}
        <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, width: '100%' }}>
          <Typography variant="caption" fontWeight={600} color="#2563eb" gutterBottom display="block">
            How to Pay:
          </Typography>
          <Stack spacing={0.5}>
            {[
              '1. Open your Bakong app or any bank app',
              '2. Scan the QR code above',
              '3. Confirm the amount and pay',
              '4. Upload payment screenshot on the order page',
            ].map((step, i) => (
              <Typography key={i} variant="caption" color="#475569">
                {step}
              </Typography>
            ))}
          </Stack>
        </Box>

      </Stack>
    </Paper>
  );
};

export default KHQRPayment;