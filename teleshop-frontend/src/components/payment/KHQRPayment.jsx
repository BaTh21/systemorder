// src/components/payment/KHQRPayment.jsx
import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import {
  ContentCopy,
  CheckCircle,
} from '@mui/icons-material';

const KHQRPayment = ({ orderId, amount }) => {
  const [copied, setCopied] = useState(false);
  
  // Use your uploaded QR image
  const qrImageUrl = import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/uploads/payments/qr-code.jpg`
    : '/uploads/payments/qr-code.jpg';

  const bankAccount = "003039935";
  const accountName = "MOK KOLSAMBATH";
  const bankName = "ABA Bank";

  const copyAccountNumber = () => {
    navigator.clipboard.writeText(bankAccount);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Paper elevation={0} sx={{ 
      p: 3, 
      borderRadius: 3, 
      border: '2px solid #00B14F', 
      bgcolor: '#ffffff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      
      {/* ABA Brand Header */}
      <Box sx={{ 
        bgcolor: '#00B14F', 
        color: 'white', 
        mx: -3, 
        mt: -3, 
        mb: 3, 
        px: 3, 
        py: 2,
        textAlign: 'center',
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
          <Box sx={{ 
            width: 40, height: 40, borderRadius: 2, 
            bgcolor: 'white', color: '#00B14F', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontWeight: 800, fontSize: '0.8rem', letterSpacing: -1,
          }}>
            ABA
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} letterSpacing={1}>
              ABA PAY
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Scan with ABA Mobile App
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Stack spacing={3} alignItems="center">
        
        {/* QR Code Image from uploads */}
        <Box sx={{ 
          p: 2.5, 
          bgcolor: 'white', 
          borderRadius: 2, 
          border: '2px solid #e2e8f0',
          display: 'inline-block',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          <img 
            src={qrImageUrl} 
            alt="ABA KHQR Code" 
            style={{ width: 220, height: 220, objectFit: 'contain' }}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/220/00B14F/white?text=QR+Code';
            }}
          />
        </Box>

        {/* Amount */}
        <Box textAlign="center">
          <Typography variant="caption" color="#64748b">Amount to Pay</Typography>
          <Typography variant="h3" fontWeight={800} color="#059669">
            ${Number(amount || 0).toFixed(2)}
          </Typography>
          <Typography variant="caption" color="#94a3b8">
            Order #{orderId}
          </Typography>
        </Box>

        <Divider sx={{ width: '100%', borderColor: '#e2e8f0' }} />

        {/* Bank Details */}
        <Box width="100%">
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="#64748b">Bank</Typography>
              <Box sx={{ 
                bgcolor: '#00B14F', color: 'white', 
                px: 1.5, py: 0.3, borderRadius: 1, 
                fontWeight: 700, fontSize: '0.75rem' 
              }}>
                {bankName}
              </Box>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="#64748b">Account Name</Typography>
              <Typography variant="body2" fontWeight={700} color="#0f172a">
                {accountName}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="#64748b">Account Number</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={700} fontFamily="monospace" fontSize="1rem" color="#00B14F">
                  {bankAccount}
                </Typography>
                <Button size="small" onClick={copyAccountNumber} sx={{ minWidth: 'auto', p: 0.5 }}>
                  {copied ? 
                    <CheckCircle sx={{ color: '#22c55e', fontSize: 18 }} /> : 
                    <ContentCopy sx={{ fontSize: 16, color: '#94a3b8' }} />
                  }
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        <Divider sx={{ width: '100%', borderColor: '#e2e8f0' }} />

        {/* Instructions */}
        <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, width: '100%' }}>
          <Typography variant="caption" fontWeight={700} color="#00B14F" gutterBottom display="block">
            📱 How to Pay with ABA Mobile:
          </Typography>
          <Stack spacing={0.3}>
            {[
              '1. Open ABA Mobile App',
              '2. Tap Scan QR',
              '3. Scan the QR code above',
              '4. Confirm amount and pay',
              '5. Upload payment screenshot',
            ].map((step, i) => (
              <Typography key={i} variant="caption" color="#475569">{step}</Typography>
            ))}
          </Stack>
        </Box>

        <Box sx={{ p: 1.5, bgcolor: '#eff6ff', borderRadius: 2, width: '100%', textAlign: 'center' }}>
          <Typography variant="caption" color="#2563eb" fontWeight={500}>
            ✅ Also works with <strong>ACLEDA</strong>, <strong>Wing</strong>, <strong>TrueMoney</strong> & other Bakong banks
          </Typography>
        </Box>

      </Stack>
    </Paper>
  );
};

export default KHQRPayment;