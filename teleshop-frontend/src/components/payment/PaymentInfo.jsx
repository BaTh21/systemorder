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
} from '@mui/material';
import { Payment, Upload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const PaymentInfo = ({ orderTotal, orderId }) => {
  const navigate = useNavigate();
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!paymentInfo) {
    return null;
  }

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Payment color="primary" />
          <Typography variant="h6">Payment Details</Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Amount */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="body2" color="white">
            Amount to Pay
          </Typography>
          <Typography variant="h5" color="white" fontWeight="bold">
            ${orderTotal}
          </Typography>
        </Box>

        {/* Bank Details */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Bank
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {paymentInfo.bank_name}
          </Typography>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Account Name
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {paymentInfo.account_name}
          </Typography>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Account Number
          </Typography>
          <Typography variant="body2" fontWeight="medium" fontFamily="monospace">
            {paymentInfo.account_number}
          </Typography>
        </Box>

        {paymentInfo.swift_code && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              SWIFT Code
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {paymentInfo.swift_code}
            </Typography>
          </Box>
        )}

        {paymentInfo.routing_number && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Routing Number
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {paymentInfo.routing_number}
            </Typography>
          </Box>
        )}

        {/* QR Code */}
        {paymentInfo.qr_code_url && (
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Scan QR Code to Pay
            </Typography>
            <img
              src={paymentInfo.qr_code_url}
              alt="Payment QR Code"
              style={{ maxWidth: 200, height: 'auto' }}
            />
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Instructions */}
        <Typography variant="subtitle2" gutterBottom>
          Instructions:
        </Typography>
        {paymentInfo.instructions?.map((instruction, index) => (
          <Typography key={index} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {instruction}
          </Typography>
        ))}

        <Button
          variant="contained"
          fullWidth
          startIcon={<Upload />}
          onClick={() => navigate(`/orders/${orderId}/upload-payment`)}
          sx={{ mt: 2 }}
        >
          Upload Payment Proof
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentInfo;