// src/pages/OrdersPage.jsx
import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Box,
  CircularProgress,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import {
  ShoppingBag,
  Receipt,
  LocalShipping,
  Payments,
} from '@mui/icons-material';
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

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/orders');
      let ordersData = [];
      if (Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (response.data && Array.isArray(response.data.items)) {
        ordersData = response.data.items;
      }
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
      setOrders([]);
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
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return 'Invalid Date'; }
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

  if (error) {
    return (
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <Container sx={{ py: 8, textAlign: 'center' }}>
          <Receipt sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" color="error" gutterBottom>{error}</Typography>
          <Button variant="contained" onClick={fetchOrders} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Try Again
          </Button>
        </Container>
      </Box>
    );
  }

  if (orders.length === 0) {
    return (
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <Container sx={{ py: 8, textAlign: 'center' }}>
          <ShoppingBag sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} color="#0f172a" gutterBottom>
            No orders yet
          </Typography>
          <Typography variant="body1" color="#94a3b8" sx={{ mb: 3 }}>
            Start shopping and your orders will appear here
          </Typography>
          <Button variant="contained" component={RouterLink} to="/products" size="large"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 4, py: 1.2 }}>
            Start Shopping
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="lg">
        
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} color="#0f172a" gutterBottom>
            My Orders
          </Typography>
          <Typography variant="body2" color="#94a3b8">
            {orders.length} order{orders.length !== 1 ? 's' : ''} total
          </Typography>
        </Box>

        {/* Orders List */}
        <Stack spacing={2}>
          {orders.map((order) => (
            <Paper
              key={order.id}
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                bgcolor: 'white',
                transition: 'all 0.2s',
                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
              >
                {/* Order Info */}
                <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
                  {/* Order ID */}
                  <Box>
                    <Typography variant="caption" color="#94a3b8">Order ID</Typography>
                    <Typography variant="body2" fontWeight={700} fontFamily="monospace" color="#0f172a">
                      #{String(order.id).padStart(6, '0')}
                    </Typography>
                  </Box>

                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

                  {/* Date */}
                  <Box>
                    <Typography variant="caption" color="#94a3b8">Date</Typography>
                    <Typography variant="body2" fontWeight={500} color="#475569">
                      {formatDate(order.created_at)}
                    </Typography>
                  </Box>

                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

                  {/* Items */}
                  <Box>
                    <Typography variant="caption" color="#94a3b8">Items</Typography>
                    <Typography variant="body2" fontWeight={500} color="#475569">
                      {order.items?.length || 0} item(s)
                    </Typography>
                  </Box>

                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

                  {/* Total */}
                  <Box>
                    <Typography variant="caption" color="#94a3b8">Total</Typography>
                    <Typography variant="body2" fontWeight={700} color="#059669" fontSize="1rem">
                      {formatPrice(order.total)}
                    </Typography>
                  </Box>
                </Stack>

                {/* Status & Actions */}
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={1.5} 
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  width={{ xs: '100%', sm: 'auto' }}
                >
                  <Chip
                    label={formatStatus(order.status)}
                    color={statusColors[order.status] || 'default'}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />

                  {/* Pay Now Button for Waiting Payment */}
                  {order.status === 'waiting_payment' && (
                    <Button
                      variant="contained"
                      size="small"
                      component={RouterLink}
                      to={`/orders/${order.id}`}
                      startIcon={<Payments />}
                      sx={{
                        bgcolor: '#f59e0b',
                        color: '#0f172a',
                        fontWeight: 700,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        '&:hover': { bgcolor: '#eab308' },
                      }}
                    >
                      Pay Now
                    </Button>
                  )}

                  {/* Track Button for Shipping */}
                  {order.status === 'shipping' && (
                    <Button
                      variant="contained"
                      size="small"
                      component={RouterLink}
                      to={`/orders/${order.id}`}
                      startIcon={<LocalShipping />}
                      sx={{
                        bgcolor: '#2563eb',
                        color: 'white',
                        fontWeight: 600,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        '&:hover': { bgcolor: '#1d4ed8' },
                      }}
                    >
                      Track
                    </Button>
                  )}

                  {/* View Button */}
                  <Button
                    variant="outlined"
                    size="small"
                    component={RouterLink}
                    to={`/orders/${order.id}`}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      borderColor: '#e2e8f0',
                      color: '#475569',
                      '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                    }}
                  >
                    View Details
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Container>
    </Box>
  );
};

export default OrdersPage;