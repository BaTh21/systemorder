// src/pages/OrderDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Box,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Avatar,
} from '@mui/material';
import {
  ArrowBack,
  LocalShipping,
  Person,
  Phone,
  Home,
  Receipt,
  CalendarToday,
} from '@mui/icons-material';
import api from '../api/axios';
import KHQRPayment from '../components/payment/KHQRPayment';

const statusColors = {
  pending: 'default',
  confirmed: 'primary',
  waiting_payment: 'warning',
  paid: 'info',
  purchasing: 'info',
  shipping: 'primary',
  completed: 'success',
  cancelled: 'error',
};

const deliveryServices = {
  'grab_express': { label: 'Grab Express', icon: '🚗', color: '#00B14F' },
  'grab_bike': { label: 'Grab Bike', icon: '🏍️', color: '#00B14F' },
  'nham24': { label: 'Nham24', icon: '🛵', color: '#E94E1B' },
  'virak_buntham': { label: 'Virak Buntham', icon: '🚌', color: '#003D7A' },
  'jnt_express': { label: 'J&T Express', icon: '📦', color: '#EE2A2F' },
  'dhl': { label: 'DHL Express', icon: '✈️', color: '#FFCC00' },
  'other': { label: 'Delivery Service', icon: '📋', color: '#64748B' },
};

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      if (error.response?.status === 404) setError('Order not found');
      else if (error.response?.status === 403) setError('You do not have permission to view this order');
      else setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Invalid Date'; }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '$0.00';
    return `$${Number(price).toFixed(2)}`;
  };

  const getTrackingInfo = (tracking) => {
    if (!tracking) return null;
    if (tracking.includes(':')) {
      const [service, ...rest] = tracking.split(': ');
      const id = rest.join(': ');
      return {
        service: deliveryServices[service] || deliveryServices['other'],
        id: id || tracking,
      };
    }
    return { service: deliveryServices['other'], id: tracking };
  };

  const getTrackingPhone = (tracking) => {
    if (!tracking || !tracking.includes('📞')) return '';
    const phonePart = tracking.split('📞')[1];
    if (phonePart) return phonePart.split('|')[0].trim();
    return '';
  };

  const getTrackingNotes = (tracking) => {
    if (!tracking || !tracking.includes('📝')) return '';
    const notesPart = tracking.split('📝')[1];
    if (notesPart) return notesPart.trim();
    return '';
  };

  const trackingInfo = order?.tracking_number ? getTrackingInfo(order.tracking_number) : null;
  const trackingPhone = order?.tracking_number ? getTrackingPhone(order.tracking_number) : '';
  const trackingNotes = order?.tracking_number ? getTrackingNotes(order.tracking_number) : '';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <Container sx={{ py: 8, textAlign: 'center' }}>
          <Receipt sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} color="#0f172a" gutterBottom>
            {error || 'Order not found'}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/orders')} startIcon={<ArrowBack />} sx={{ mt: 2, borderRadius: 2, textTransform: 'none' }}>
            Back to Orders
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="lg">
        
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button onClick={() => navigate('/orders')} startIcon={<ArrowBack />} sx={{ textTransform: 'none', fontWeight: 500, color: '#475569' }}>
              Back
            </Button>
            <Typography variant="h5" fontWeight={700} color="#0f172a">
              Order #{order.id}
            </Typography>
            <Chip label={formatStatus(order.status)} color={statusColors[order.status] || 'default'} size="small" />
          </Stack>
          <Typography variant="body2" color="#94a3b8">
            {formatDate(order.created_at)}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          
          {/* Left - Order Items */}
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
              <Typography variant="h6" fontWeight={700} color="#0f172a" gutterBottom>
                <Receipt sx={{ mr: 1, verticalAlign: 'middle', color: '#2563eb' }} />
                Order Items
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Product</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#475569' }}>Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#475569' }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#475569' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{item.product_name_snapshot || 'Unknown Product'}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="#475569">{formatPrice(item.unit_price)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={`x${item.quantity}`} size="small" variant="outlined" sx={{ minWidth: 40 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} color="#059669">{formatPrice(item.total_price)}</Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                          <Typography variant="body2" color="#94a3b8">No items found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals */}
              <Box sx={{ mt: 3, p: 2.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                {[
                  { label: 'Subtotal', value: formatPrice(order.subtotal) },
                  { label: 'Shipping Fee', value: formatPrice(order.shipping_fee) },
                  { label: 'Service Fee', value: formatPrice(order.service_fee) },
                ].map((row) => (
                  <Stack key={row.label} direction="row" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="#64748b">{row.label}</Typography>
                    <Typography variant="body2">{row.value}</Typography>
                  </Stack>
                ))}
                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={700} color="#0f172a">Total</Typography>
                  <Typography variant="h6" fontWeight={800} color="#059669">
                    {formatPrice(order.total)}
                  </Typography>
                </Stack>
              </Box>

              {/* KHQR Payment - Show when waiting payment */}
              {order.status === 'waiting_payment' && (
                <Box sx={{ mt: 3 }}>
                  <KHQRPayment orderId={order.id} amount={order.total} />
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Right - Sidebar */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2.5}>
              
              {/* Order Info */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a" gutterBottom>
                  <CalendarToday sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18, color: '#2563eb' }} />
                  Order Info
                </Typography>
                <Stack spacing={1.5} mt={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="#94a3b8">Order ID</Typography>
                    <Typography variant="body2" fontWeight={600} fontFamily="monospace">#{order.id}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="#94a3b8">Status</Typography>
                    <Chip label={formatStatus(order.status)} color={statusColors[order.status] || 'default'} size="small" />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="#94a3b8">Date</Typography>
                    <Typography variant="body2">{formatDate(order.created_at)}</Typography>
                  </Stack>
                  {order.payment_method && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="#94a3b8">Payment</Typography>
                      <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                        {order.payment_method.replace('_', ' ')}
                      </Typography>
                    </Stack>
                  )}
                  {order.customer_notes && (
                    <Box sx={{ mt: 1, p: 1.5, bgcolor: '#fef3c7', borderRadius: 2 }}>
                      <Typography variant="caption" color="#92400e" fontWeight={600}>📝 Notes</Typography>
                      <Typography variant="body2" color="#92400e" mt={0.5}>{order.customer_notes}</Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>

              {/* Delivery Tracking */}
              {trackingInfo && (
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #bbf7d0', bgcolor: '#f0fdf4' }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#0f172a" gutterBottom>
                    <LocalShipping sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18, color: '#22c55e' }} />
                    Delivery Tracking
                  </Typography>
                  <Stack spacing={1.5} mt={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: '#f0fdf4', fontSize: '1.2rem' }}>
                        {trackingInfo.service.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="#0f172a">
                          {trackingInfo.service.label}
                        </Typography>
                        <Typography variant="caption" color="#64748b">Delivery Service</Typography>
                      </Box>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="#94a3b8">Tracking ID</Typography>
                      <Typography variant="body2" fontWeight={700} fontFamily="monospace" color="#0f172a">
                        {trackingInfo.id}
                      </Typography>
                    </Box>
                    {trackingPhone && (
                      <Box>
                        <Typography variant="caption" color="#94a3b8">Driver Contact</Typography>
                        <Typography variant="body2" fontWeight={600} color="#0f172a">
                          📞 {trackingPhone}
                        </Typography>
                      </Box>
                    )}
                    {trackingNotes && (
                      <Box sx={{ p: 1.5, bgcolor: '#fef3c7', borderRadius: 2 }}>
                        <Typography variant="caption" color="#92400e" fontWeight={600}>📝 Notes</Typography>
                        <Typography variant="body2" color="#92400e" mt={0.5}>{trackingNotes}</Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}

              {/* Shipping Address */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a" gutterBottom>
                  <Home sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18, color: '#2563eb' }} />
                  Shipping Address
                </Typography>
                {order.shipping_address ? (
                  <Stack spacing={1} mt={2}>
                    <Stack direction="row" spacing={1.5}>
                      <Person sx={{ fontSize: 18, color: '#94a3b8', mt: 0.2 }} />
                      <Typography variant="body2" fontWeight={600}>
                        {order.shipping_address.full_name || 'N/A'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5}>
                      <Home sx={{ fontSize: 18, color: '#94a3b8', mt: 0.2 }} />
                      <Typography variant="body2" color="#475569">
                        {order.shipping_address.address_line1 || order.shipping_address.address || 'N/A'}
                      </Typography>
                    </Stack>
                    {order.shipping_address.phone && (
                      <Stack direction="row" spacing={1.5}>
                        <Phone sx={{ fontSize: 18, color: '#94a3b8', mt: 0.2 }} />
                        <Typography variant="body2" color="#475569">
                          {order.shipping_address.phone}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="#94a3b8" mt={2}>No address provided</Typography>
                )}
              </Paper>

            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default OrderDetailPage;