// src/components/payment/PaymentModal.jsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  QrCodeScanner,
  AttachMoney,
  CloudUpload,
  CheckCircle,
  Close,
  ContentCopy,
  Payment,
} from '@mui/icons-material';
import api from '../../api/axios';

const PaymentModal = ({ open, onClose, order, onPaymentSuccess }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'info' });

  const amount = order?.total || 0;

  // Generate QR Code
  const handleGenerateQR = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const response = await api.post('/payment/generate-khqr', {
        order_id: order.id,
        amount: amount
      });
      setQrCode(response.data);
      setMessage({ text: 'QR Code generated! Scan with your banking app.', severity: 'success' });
    } catch (error) {
      setMessage({ text: error.response?.data?.detail || 'Failed to generate QR', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Upload Payment Proof
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile || !order) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', proofFile);
    
    try {
      const response = await api.post(`/payment/upload-proof/${order.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ text: 'Payment proof uploaded! Waiting for admin verification.', severity: 'success' });
      onPaymentSuccess?.(response.data);
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      setMessage({ text: error.response?.data?.detail || 'Failed to upload proof', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // Copy account number
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: 'Copied to clipboard!', severity: 'success' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>
          💰 Payment - Order #{order?.id}
        </Typography>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Order Summary */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8fafc' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="body2" color="text.secondary">Total Amount</Typography>
              <Typography variant="h5" fontWeight={700} color="#059669">
                ${amount.toFixed(2)}
              </Typography>
            </Box>
            <Chip 
              label={order?.status || 'Pending'} 
              color={order?.status === 'pending' ? 'warning' : 'info'}
              size="small"
            />
          </Stack>
        </Paper>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          <Tab icon={<QrCodeScanner />} label="QR Code" iconPosition="start" />
          <Tab icon={<AttachMoney />} label="Cash / Bank" iconPosition="start" />
        </Tabs>

        {/* Message */}
        {message.text && (
          <Alert severity={message.severity} sx={{ mb: 2, borderRadius: 2 }}>
            {message.text}
          </Alert>
        )}

        {/* Tab 1: QR Code */}
        {activeTab === 0 && (
          <Box>
            {!qrCode ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Generate a QR code for quick payment
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleGenerateQR}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <QrCodeScanner />}
                  sx={{ mt: 2, borderRadius: 2, textTransform: 'none' }}
                >
                  {loading ? 'Generating...' : 'Generate QR Code'}
                </Button>
              </Box>
            ) : (
              <Stack spacing={3}>
                {/* QR Code Image */}
                <Box textAlign="center">
                  <Paper elevation={2} sx={{ p: 3, display: 'inline-block', borderRadius: 3 }}>
                    <img 
                      src={qrCode.qr_image} 
                      alt="Payment QR Code" 
                      style={{ width: 250, height: 250 }}
                    />
                  </Paper>
                  <Typography variant="caption" display="block" color="text.secondary" mt={1}>
                    Scan with ABA, ACLEDA, Wing, or Bakong app
                  </Typography>
                </Box>

                {/* Bank Details */}
                <Box sx={{ bgcolor: '#f8fafc', p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Bank Transfer Details
                  </Typography>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Bank</Typography>
                      <Typography variant="body2" fontWeight={500}>{qrCode.bank_info?.bank_name}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Account Name</Typography>
                      <Typography variant="body2" fontWeight={500}>{qrCode.bank_info?.account_name}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Account Number</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                          {qrCode.bank_info?.account_number}
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(qrCode.bank_info?.account_number)}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Box>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Amount</Typography>
                      <Typography variant="body2" fontWeight={700} color="#059669">
                        ${qrCode.amount}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>

                {/* Upload Proof */}
                <Divider />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Upload Payment Proof
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                    After completing payment, upload a screenshot or photo of the transfer confirmation
                  </Typography>

                  {proofPreview && (
                    <Box sx={{ mb: 2, position: 'relative', display: 'inline-block' }}>
                      <img 
                        src={proofPreview} 
                        alt="Payment Proof" 
                        style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8 }}
                      />
                      <IconButton 
                        size="small" 
                        onClick={() => { setProofFile(null); setProofPreview(null); }}
                        sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'white' }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  )}

                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUpload />}
                    fullWidth
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    {proofFile ? proofFile.name : 'Choose Screenshot'}
                    <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                  </Button>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleUploadProof}
                    disabled={!proofFile || uploading}
                    startIcon={uploading ? <CircularProgress size={20} /> : <CheckCircle />}
                    sx={{ mt: 2, borderRadius: 2, textTransform: 'none' }}
                  >
                    {uploading ? 'Uploading...' : 'Submit Payment Proof'}
                  </Button>
                </Box>
              </Stack>
            )}
          </Box>
        )}

        {/* Tab 2: Cash / Bank */}
        {activeTab === 1 && (
          <Stack spacing={3}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Cash Payment Instructions:</strong>
              </Typography>
              <Typography variant="body2">
                1. Pay the exact amount in cash to our staff<br />
                2. Or transfer to the bank account below<br />
                3. Upload the receipt/confirmation
              </Typography>
            </Alert>

            {/* Bank Details */}
            <Box sx={{ bgcolor: '#f8fafc', p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Bank Transfer Details
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Bank</Typography>
                  <Typography variant="body2" fontWeight={500}>{settings.BANK_NAME || 'ABA Bank'}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Account Name</Typography>
                  <Typography variant="body2" fontWeight={500}>{settings.BANK_ACCOUNT_NAME || 'MOK KOLSAMBATH'}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Account Number</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                      {settings.BANK_ACCOUNT_NUMBER || '003039935'}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(settings.BANK_ACCOUNT_NUMBER || '003039935')}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Box>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Amount</Typography>
                  <Typography variant="body2" fontWeight={700} color="#059669">
                    ${amount.toFixed(2)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            {/* Upload Receipt */}
            <Divider />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Upload Payment Receipt
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Upload a photo of your cash receipt or bank transfer confirmation
              </Typography>

              {proofPreview && (
                <Box sx={{ mb: 2, position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={proofPreview} 
                    alt="Receipt" 
                    style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8 }}
                  />
                  <IconButton 
                    size="small" 
                    onClick={() => { setProofFile(null); setProofPreview(null); }}
                    sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'white' }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              )}

              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                fullWidth
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                {proofFile ? proofFile.name : 'Upload Receipt'}
                <input type="file" hidden accept="image/*" onChange={handleFileChange} />
              </Button>

              <Button
                variant="contained"
                fullWidth
                onClick={handleUploadProof}
                disabled={!proofFile || uploading}
                startIcon={uploading ? <CircularProgress size={20} /> : <CheckCircle />}
                sx={{ mt: 2, borderRadius: 2, textTransform: 'none' }}
              >
                {uploading ? 'Uploading...' : 'Submit Receipt'}
              </Button>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none' }}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={() => {
            if (activeTab === 0 && !qrCode) {
              handleGenerateQR();
            } else {
              onClose();
            }
          }}
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          {activeTab === 0 && !qrCode ? 'Generate QR' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentModal;