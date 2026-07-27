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
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  LocalShipping,
  Person,
  Phone,
  Home,
  Receipt,
  CalendarToday,
  ShoppingBag,
  AttachMoney,
} from '@mui/icons-material';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
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

const statusIcons = {
  pending: '⏳',
  confirmed: '✅',
  waiting_payment: '💰',
  paid: '💳',
  purchasing: '🛒',
  shipping: '🚚',
  completed: '📦',
  cancelled: '❌',
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
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
      else if (error.response?.status === 403) setError('You do not have permission');
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
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '$0.00';
    return `$${Number(price).toFixed(2)}`;
  };

  const getTrackingInfo = (tracking) => {
    if (!tracking) return null;
    if (tracking.includes(':')) {
      const parts = tracking.split(':');
      const service = parts[0].trim();
      const id = parts.slice(1).join(':').trim();
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
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 8 }}>
        <Container sx={{ textAlign: 'center' }}>
          <Receipt sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} color="#0f172a" gutterBottom>
            {error || 'Order not found'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate(isAdmin ? '/admin/orders' : '/orders')}
            startIcon={<ArrowBack />}
            sx={{ mt: 2, borderRadius: 2, textTransform: 'none' }}
          >
            Back to {isAdmin ? 'Orders Management' : 'My Orders'}
          </Button>
        </Container>
      </Box>
    );
  }

  // Mobile Summary Card
  const MobileSummary = () => (
    <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem' }}>
              #{String(order.id).padStart(6, '0')}
            </Typography>
            <Chip
              label={`${statusIcons[order.status] || ''} ${formatStatus(order.status)}`}
              color={statusColors[order.status] || 'default'}
              size="small"
            />
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="#94a3b8">Total</Typography>
            <Typography fontWeight={700} color="#059669" fontSize="1.1rem">
              {formatPrice(order.total)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="#94a3b8">Items</Typography>
            <Typography variant="body2">{order.items?.length || 0} item(s)</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="#94a3b8">Date</Typography>
            <Typography variant="body2" color="#64748b">{formatDate(order.created_at)}</Typography>
          </Stack>
          {order.customer_notes && (
            <Box sx={{ p: 1.5, bgcolor: '#fef3c7', borderRadius: 2 }}>
              <Typography variant="caption" color="#92400e" fontWeight={600}>📝 Notes</Typography>
              <Typography variant="body2" color="#92400e" mt={0.5}>{order.customer_notes}</Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 3, md: 4 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              onClick={() => navigate(isAdmin ? '/admin/orders' : '/orders')}
              startIcon={<ArrowBack />}
              sx={{ textTransform: 'none', fontWeight: 500, color: '#475569' }}
            >
              Back
            </Button>
            {!isMobile && (
              <>
                <Typography variant="h5" fontWeight={700} color="#0f172a">
                  Order #{order.id}
                </Typography>
                <Chip
                  label={`${statusIcons[order.status] || ''} ${formatStatus(order.status)}`}
                  color={statusColors[order.status] || 'default'}
                  size="small"
                />
              </>
            )}
          </Stack>
          {!isMobile && (
            <Typography variant="body2" color="#94a3b8">
              {formatDate(order.created_at)}
            </Typography>
          )}
        </Box>

        {/* Mobile Summary */}
        {isMobile && <MobileSummary />}

        <Grid container spacing={3}>

          {/* Left - Order Items */}
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
              <Typography variant="h6" fontWeight={700} color="#0f172a" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' } }}>
                <ShoppingBag sx={{ mr: 1, verticalAlign: 'middle', color: '#2563eb', fontSize: { xs: 20, sm: 24 } }} />
                Order Items
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mt: 2, overflowX: 'auto' }}>
                <Table size={isMobile ? 'small' : 'medium'}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Product</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar
                                variant="rounded"
                                src={item.product_image || ''}
                                alt={item.product_name_snapshot}
                                sx={{
                                  width: { xs: 32, sm: 40 },
                                  height: { xs: 32, sm: 40 },
                                  bgcolor: '#f1f5f9',
                                  flexShrink: 0,
                                }}
                              >
                                {!item.product_image && <ShoppingBag sx={{ color: '#94a3b8', fontSize: { xs: 14, sm: 18 } }} />}
                              </Avatar>
                              <Typography variant="body2" fontWeight={500} fontSize={{ xs: '0.7rem', sm: '0.8rem' }}>
                                {item.product_name_snapshot || 'Unknown Product'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="#475569" fontSize={{ xs: '0.7rem', sm: '0.8rem' }}>
                              {formatPrice(item.unit_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`x${item.quantity}`}
                              size="small"
                              variant="outlined"
                              sx={{ minWidth: 30, fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 20, sm: 24 } }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} color="#059669" fontSize={{ xs: '0.7rem', sm: '0.8rem' }}>
                              {formatPrice(item.total_price)}
                            </Typography>
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
              <Box sx={{ mt: 3, p: { xs: 2, sm: 2.5 }, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                {[
                  { label: 'Subtotal', value: formatPrice(order.subtotal) },
                  { label: 'Shipping Fee', value: formatPrice(order.shipping_fee) },
                  { label: 'Service Fee', value: formatPrice(order.service_fee) },
                ].map((row) => (
                  <Stack key={row.label} direction="row" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="#64748b" fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>
                      {row.label}
                    </Typography>
                    <Typography variant="body2" fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>
                      {row.value}
                    </Typography>
                  </Stack>
                ))}
                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={700} color="#0f172a" fontSize={{ xs: '0.9rem', sm: '1rem' }}>
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#059669" fontSize={{ xs: '1rem', sm: '1.1rem', md: '1.25rem' }}>
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
              <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                  <CalendarToday sx={{ mr: 1, verticalAlign: 'middle', fontSize: { xs: 16, sm: 18 }, color: '#2563eb' }} />
                  Order Info
                </Typography>
                <Stack spacing={1.5} mt={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="#94a3b8" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>Order ID</Typography>
                    <Typography variant="body2" fontWeight={600} fontFamily="monospace" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>
                      #{order.id}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="#94a3b8" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>Status</Typography>
                    <Chip
                      label={`${statusIcons[order.status] || ''} ${formatStatus(order.status)}`}
                      color={statusColors[order.status] || 'default'}
                      size="small"
                      sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' }, height: { xs: 20, sm: 24 } }}
                    />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="#94a3b8" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>Date</Typography>
                    <Typography variant="body2" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>
                      {formatDate(order.created_at)}
                    </Typography>
                  </Stack>
                  {order.payment_method && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="#94a3b8" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>Payment</Typography>
                      <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }} fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>
                        {order.payment_method.replace('_', ' ')}
                      </Typography>
                    </Stack>
                  )}
                  {order.customer_notes && (
                    <Box sx={{ mt: 1, p: 1.5, bgcolor: '#fef3c7', borderRadius: 2 }}>
                      <Typography variant="caption" color="#92400e" fontWeight={600}>📝 Notes</Typography>
                      <Typography variant="body2" color="#92400e" mt={0.5} fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>
                        {order.customer_notes}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>

              {/* Delivery Tracking */}
              {trackingInfo && (
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid #bbf7d0', bgcolor: '#f0fdf4' }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#0f172a" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                    <LocalShipping sx={{ mr: 1, verticalAlign: 'middle', fontSize: { xs: 16, sm: 18 }, color: '#22c55e' }} />
                    Delivery Tracking
                  </Typography>
                  <Stack spacing={1.5} mt={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 }, bgcolor: '#f0fdf4', fontSize: { xs: '1rem', sm: '1.2rem' } }}>
                        {trackingInfo.service.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="#0f172a" fontSize={{ xs: '0.8rem', sm: '0.85rem' }}>
                          {trackingInfo.service.label}
                        </Typography>
                        <Typography variant="caption" color="#64748b" fontSize={{ xs: '0.6rem', sm: '0.65rem' }}>
                          Delivery Service
                        </Typography>
                      </Box>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="#94a3b8" fontSize={{ xs: '0.6rem', sm: '0.65rem' }}>Tracking ID</Typography>
                      <Typography variant="body2" fontWeight={700} fontFamily="monospace" color="#0f172a" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>
                        {trackingInfo.id}
                      </Typography>
                    </Box>
                    {trackingPhone && (
                      <Box>
                        <Typography variant="caption" color="#94a3b8" fontSize={{ xs: '0.6rem', sm: '0.65rem' }}>Driver Contact</Typography>
                        <Typography variant="body2" fontWeight={600} color="#0f172a" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>
                          📞 {trackingPhone}
                        </Typography>
                      </Box>
                    )}
                    {trackingNotes && (
                      <Box sx={{ p: 1.5, bgcolor: '#fef3c7', borderRadius: 2 }}>
                        <Typography variant="caption" color="#92400e" fontWeight={600}>📝 Notes</Typography>
                        <Typography variant="body2" color="#92400e" mt={0.5} fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>
                          {trackingNotes}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}

              {/* Shipping Address */}
              <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                  <Home sx={{ mr: 1, verticalAlign: 'middle', fontSize: { xs: 16, sm: 18 }, color: '#2563eb' }} />
                  Shipping Address
                </Typography>
                {order.shipping_address ? (
                  <Stack spacing={1.5} mt={2}>
                    <Stack direction="row" spacing={1.5}>
                      <Person sx={{ fontSize: { xs: 16, sm: 18 }, color: '#94a3b8', mt: 0.2 }} />
                      <Typography variant="body2" fontWeight={600} fontSize={{ xs: '0.8rem', sm: '0.85rem' }}>
                        {order.shipping_address.full_name || 'N/A'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5}>
                      <Home sx={{ fontSize: { xs: 16, sm: 18 }, color: '#94a3b8', mt: 0.2 }} />
                      <Typography variant="body2" color="#475569" fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>
                        {order.shipping_address.address_line1 || order.shipping_address.address || 'N/A'}
                      </Typography>
                    </Stack>
                    {order.shipping_address.phone && (
                      <Stack direction="row" spacing={1.5}>
                        <Phone sx={{ fontSize: { xs: 16, sm: 18 }, color: '#94a3b8', mt: 0.2 }} />
                        <Typography variant="body2" color="#475569" fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>
                          {order.shipping_address.phone}
                        </Typography>
                      </Stack>
                    )}
                    {order.shipping_address.city && (
                      <Typography variant="body2" color="#64748b" fontSize={{ xs: '0.7rem', sm: '0.8rem' }}>
                        {[order.shipping_address.city, order.shipping_address.state, order.shipping_address.postal_code]
                          .filter(Boolean).join(', ')}
                      </Typography>
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