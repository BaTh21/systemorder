// src/components/payment/KHQRPayment.jsx
import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Divider,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  IconButton as MuiIconButton,
} from '@mui/material';
import {
  ContentCopy,
  CheckCircle,
  QrCodeScanner,
  ZoomIn,
  Close,
} from '@mui/icons-material';

const KHQRPayment = ({ orderId, amount }) => {
  const [copied, setCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  
  // ✅ Use your uploaded QR image
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
    <>
      <Paper elevation={0} sx={{ 
        p: { xs: 2, sm: 2.5, md: 3 }, 
        borderRadius: 3, 
        border: '2px solid #00B14F', 
        bgcolor: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        maxWidth: { xs: '100%', sm: 480, md: 520 },
        mx: 'auto',
      }}>
        
        {/* ABA Brand Header */}
        <Box sx={{ 
          bgcolor: '#00B14F', 
          color: 'white', 
          mx: { xs: -2, sm: -2.5, md: -3 }, 
          mt: { xs: -2, sm: -2.5, md: -3 }, 
          mb: { xs: 2, sm: 2.5 }, 
          px: { xs: 2, sm: 2.5, md: 3 }, 
          py: { xs: 1.5, sm: 2 },
          textAlign: 'center',
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
            <Box sx={{ 
              width: { xs: 32, sm: 36, md: 40 }, 
              height: { xs: 32, sm: 36, md: 40 }, 
              borderRadius: 2, 
              bgcolor: 'white', 
              color: '#00B14F', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 800, 
              fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.8rem' }, 
              letterSpacing: -1,
            }}>
              ABA
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} letterSpacing={1} fontSize={{ xs: '0.8rem', sm: '0.9rem', md: '1rem' }}>
                ABA PAY
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.65rem' } }}>
                Scan with ABA Mobile App
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Stack spacing={{ xs: 2, sm: 2.5 }} alignItems="center">
          
          {/* ✅ QR Code Image - Fixed Size */}
          <Box 
            sx={{ 
              p: { xs: 1.5, sm: 2 }, 
              bgcolor: 'white', 
              borderRadius: 2, 
              border: '2px solid #e2e8f0',
              display: 'inline-block',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              cursor: 'pointer',
              '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
              transition: 'box-shadow 0.3s ease',
              position: 'relative',
            }}
            onClick={() => setQrDialogOpen(true)}
          >
            <Box
              component="img"
              src={qrImageUrl}
              alt="ABA KHQR Code"
              sx={{
                width: { xs: 140, sm: 170, md: 200 },
                height: { xs: 140, sm: 170, md: 200 },
                objectFit: 'contain',
                display: 'block',
              }}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/200/00B14F/white?text=QR+Code';
              }}
            />
            {/* Zoom Icon Overlay */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 6,
                right: 6,
                bgcolor: 'rgba(0,0,0,0.6)',
                borderRadius: '50%',
                width: { xs: 28, sm: 32, md: 36 },
                height: { xs: 28, sm: 32, md: 36 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ZoomIn sx={{ color: 'white', fontSize: { xs: 16, sm: 18, md: 20 } }} />
            </Box>
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' }, mt: -1 }}>
            Click to enlarge
          </Typography>

          {/* Amount */}
          <Box textAlign="center">
            <Typography variant="caption" color="#64748b" fontSize={{ xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }}>
              Amount to Pay
            </Typography>
            <Typography variant="h4" fontWeight={800} color="#059669" fontSize={{ xs: '1.5rem', sm: '1.8rem', md: '2rem' }}>
              ${Number(amount || 0).toFixed(2)}
            </Typography>
            <Typography variant="caption" color="#94a3b8" fontSize={{ xs: '0.55rem', sm: '0.6rem', md: '0.65rem' }}>
              Order #{orderId}
            </Typography>
          </Box>

          <Divider sx={{ width: '100%', borderColor: '#e2e8f0' }} />

          {/* Bank Details */}
          <Box width="100%">
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="#64748b" fontSize={{ xs: '0.75rem', sm: '0.8rem', md: '0.85rem' }}>
                  Bank
                </Typography>
                <Box sx={{ 
                  bgcolor: '#00B14F', 
                  color: 'white', 
                  px: 1.5, 
                  py: 0.3, 
                  borderRadius: 1, 
                  fontWeight: 700, 
                  fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' } 
                }}>
                  {bankName}
                </Box>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="#64748b" fontSize={{ xs: '0.75rem', sm: '0.8rem', md: '0.85rem' }}>
                  Account Name
                </Typography>
                <Typography variant="body2" fontWeight={700} color="#0f172a" fontSize={{ xs: '0.75rem', sm: '0.8rem', md: '0.85rem' }}>
                  {accountName}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="#64748b" fontSize={{ xs: '0.75rem', sm: '0.8rem', md: '0.85rem' }}>
                  Account Number
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={700} fontFamily="monospace" fontSize={{ xs: '0.8rem', sm: '0.9rem', md: '1rem' }} color="#00B14F">
                    {bankAccount}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={copyAccountNumber} 
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    {copied ? 
                      <CheckCircle sx={{ color: '#22c55e', fontSize: 16 }} /> : 
                      <ContentCopy sx={{ fontSize: 14, color: '#94a3b8' }} />
                    }
                  </IconButton>
                </Stack>
              </Stack>
            </Stack>
          </Box>

          <Divider sx={{ width: '100%', borderColor: '#e2e8f0' }} />

          {/* Instructions */}
          <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#f0fdf4', borderRadius: 2, width: '100%' }}>
            <Typography variant="caption" fontWeight={700} color="#00B14F" gutterBottom display="block" fontSize={{ xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }}>
              📱 How to Pay:
            </Typography>
            <Stack spacing={0.3}>
              {[
                '1. Open ABA Mobile App',
                '2. Tap Scan QR',
                '3. Scan the QR code above',
                '4. Confirm amount and pay',
                '5. Upload payment screenshot',
              ].map((step, i) => (
                <Typography key={i} variant="caption" color="#475569" fontSize={{ xs: '0.6rem', sm: '0.65rem', md: '0.7rem' }}>
                  {step}
                </Typography>
              ))}
            </Stack>
          </Box>

          <Box sx={{ 
            p: 1.5, 
            bgcolor: '#eff6ff', 
            borderRadius: 2, 
            width: '100%', 
            textAlign: 'center' 
          }}>
            <Typography variant="caption" color="#2563eb" fontWeight={500} fontSize={{ xs: '0.55rem', sm: '0.6rem', md: '0.65rem' }}>
              ✅ Works with <strong>ABA</strong>, <strong>ACLEDA</strong>, <strong>Wing</strong>, <strong>TrueMoney</strong>
            </Typography>
          </Box>

        </Stack>
      </Paper>

      {/* QR Code Zoom Dialog */}
      <Dialog 
        open={qrDialogOpen} 
        onClose={() => setQrDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: 'transparent',
            boxShadow: 'none',
            maxWidth: 450,
            mx: 'auto',
          }
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <Box sx={{ 
            position: 'relative', 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 250,
          }}>
            <Box
              component="img"
              src={qrImageUrl}
              alt="QR Code Full Size"
              sx={{
                width: '100%',
                maxWidth: 400,
                height: 'auto',
                borderRadius: 2,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/400/00B14F/white?text=QR+Code';
              }}
            />
            <MuiIconButton
              onClick={() => setQrDialogOpen(false)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0,0,0,0.6)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
              }}
            >
              <Close />
            </MuiIconButton>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={copied} 
        autoHideDuration={2000} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled" sx={{ borderRadius: 2 }}>
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
};

export default KHQRPayment;