// src/pages/OrderDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
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
  Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import api from '../api/axios';

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
      console.log('Order detail:', response.data);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('Failed to load order details');
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
      return new Date(dateStr).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '$0.00';
    return `$${Number(price).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          {error || 'Order not found'}
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/orders')}
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Back to Orders
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Order Details
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/orders')}
          startIcon={<ArrowBack />}
        >
          Back to Orders
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Order Items */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Items
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name_snapshot || 'Unknown Product'}</TableCell>
                          <TableCell align="right">{formatPrice(item.unit_price)}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatPrice(item.total_price)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No items found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Order Totals */}
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Subtotal</Typography>
                  <Typography>{formatPrice(order.subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Shipping Fee</Typography>
                  <Typography>{formatPrice(order.shipping_fee)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Service Fee</Typography>
                  <Typography>{formatPrice(order.service_fee)}</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    {formatPrice(order.total)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Order Info Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Order Status Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Information
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Order ID</Typography>
                <Typography variant="body2" fontFamily="monospace">
                  #{order.id}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={formatStatus(order.status)}
                    color={statusColors[order.status] || 'default'}
                    size="small"
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Date</Typography>
                <Typography variant="body2">
                  {formatDate(order.created_at)}
                </Typography>
              </Box>

              {order.tracking_number && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Tracking Number</Typography>
                  <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                    {order.tracking_number}
                  </Typography>
                </Box>
              )}

              {order.payment_method && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Payment Method</Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {order.payment_method.replace('_', ' ')}
                  </Typography>
                </Box>
              )}

              {order.customer_notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Notes</Typography>
                  <Typography variant="body2">
                    {order.customer_notes}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address Card */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shipping Address
              </Typography>

              {order.shipping_address ? (
                <>
                  <Typography variant="body2" fontWeight="medium">
                    {order.shipping_address.full_name || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    {order.shipping_address.address_line1}
                  </Typography>
                  {order.shipping_address.address_line2 && (
                    <Typography variant="body2">
                      {order.shipping_address.address_line2}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                  </Typography>
                  {order.shipping_address.phone && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      📞 {order.shipping_address.phone}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No address provided
                </Typography>
              )}
              {order.status === 'waiting_payment' && (
                <Grid item xs={12}>
                  <PaymentInfo
                    orderTotal={order.total}
                    orderId={order.id}
                  />
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default OrderDetailPage;