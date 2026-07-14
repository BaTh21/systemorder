// src/components/payment/PaymentInfo.jsx
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  AccountBalance,
  ContentCopy,
  QrCode,
  CheckCircle,
} from '@mui/icons-material';
import api from '../../api/axios';

const PaymentInfo = ({ orderTotal, orderId }) => {
  const [paymentInfo, setPaymentInfo] = useState(null);
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
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (!paymentInfo) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalance /> Payment Information
        </Typography>
        
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Please transfer the exact amount to:
          </Typography>
          <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
            ${orderTotal}
          </Typography>
        </Box>

        <List dense>
          <ListItem>
            <ListItemIcon><AccountBalance /></ListItemIcon>
            <ListItemText 
              primary="Bank" 
              secondary={paymentInfo.bank_name}
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon><AccountBalance /></ListItemIcon>
            <ListItemText 
              primary="Account Name" 
              secondary={paymentInfo.account_name}
            />
          </ListItem>
          
          <ListItem
            secondaryAction={
              <Button size="small" onClick={() => copyToClipboard(paymentInfo.account_number)}>
                <ContentCopy fontSize="small" />
              </Button>
            }
          >
            <ListItemIcon><AccountBalance /></ListItemIcon>
            <ListItemText 
              primary="Account Number" 
              secondary={
                <Typography variant="body1" fontWeight="bold" fontFamily="monospace">
                  {paymentInfo.account_number}
                </Typography>
              }
            />
          </ListItem>
          
          {paymentInfo.swift_code && (
            <ListItem>
              <ListItemIcon><AccountBalance /></ListItemIcon>
              <ListItemText 
                primary="SWIFT Code" 
                secondary={paymentInfo.swift_code}
              />
            </ListItem>
          )}
        </List>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<QrCode />}
            onClick={() => setShowQR(true)}
            fullWidth
          >
            Show QR Code
          </Button>
          
          <Button
            variant="contained"
            component="label"
            fullWidth
          >
            Upload Receipt
            <input type="file" hidden accept="image/*" />
          </Button>
        </Box>

        <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
          <Typography variant="body2">
            <CheckCircle fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            After payment, upload your receipt and we'll verify within 1-2 hours.
          </Typography>
        </Box>

        {/* QR Code Dialog */}
        <Dialog open={showQR} onClose={() => setShowQR(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Scan QR Code to Pay</DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              {paymentInfo.qr_code_url ? (
                <img 
                  src={paymentInfo.qr_code_url} 
                  alt="Payment QR Code" 
                  style={{ maxWidth: '100%', maxHeight: 400 }}
                />
              ) : (
                <Typography color="text.secondary">
                  QR Code not available
                </Typography>
              )}
              <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                ${orderTotal}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {paymentInfo.bank_name} | {paymentInfo.account_number}
              </Typography>
            </Box>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PaymentInfo;