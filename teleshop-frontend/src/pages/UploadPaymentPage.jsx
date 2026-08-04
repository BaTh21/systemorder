// src/pages/UploadPaymentPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import { CloudUpload, CheckCircle, ArrowBack } from '@mui/icons-material';
import api from '../api/axios';

const UploadPaymentPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/payment/upload-proof/${orderId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setTimeout(() => {
        navigate(`/orders/${orderId}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload payment proof');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/orders/${orderId}`)}
        sx={{ mb: 3, textTransform: 'none' }}
      >
        Back to Order
      </Button>

      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          📸 Upload Payment Proof
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Order #{orderId} - Please upload a screenshot of your bank transfer confirmation
        </Typography>

        {success ? (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            ✅ Payment proof uploaded successfully! Our team will verify your payment.
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Card variant="outlined" sx={{ mb: 3, borderColor: '#e2e8f0' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                {preview ? (
                  <Box>
                    <img
                      src={preview}
                      alt="Payment Proof Preview"
                      style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }}
                    />
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {file.name}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => { setFile(null); setPreview(null); }}
                      sx={{ mt: 1, borderRadius: 2, textTransform: 'none' }}
                    >
                      Remove
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <CloudUpload sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      Click the button below to upload your payment screenshot
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Supported formats: JPG, PNG, GIF, WebP (Max 5MB)
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUpload />}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={handleUpload}
                disabled={!file || uploading}
                startIcon={uploading ? <CircularProgress size={20} /> : <CheckCircle />}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                {uploading ? 'Uploading...' : 'Submit Proof'}
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary" display="block" mt={2}>
              ⚠️ Please ensure the screenshot clearly shows the transfer amount and reference
            </Typography>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default UploadPaymentPage;