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
} from '@mui/material';
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
      console.log('Orders response:', response.data);
      
      // Handle both array and object responses
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

  // Helper function to safely display order ID
  const getOrderDisplayId = (orderId) => {
    if (!orderId) return 'N/A';
    // Convert to string first, then take first 8 characters
    const idStr = String(orderId);
    return idStr.length > 8 ? idStr.substring(0, 8) + '...' : idStr;
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    return statusColors[status] || 'default';
  };

  // Helper function to format status text
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Helper function to format price
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
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={fetchOrders}>
          Try Again
        </Button>
      </Container>
    );
  }

  if (orders.length === 0) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          No orders yet
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Start shopping and your orders will appear here
        </Typography>
        <Button 
          variant="contained" 
          component={RouterLink} 
          to="/products"
          size="large"
        >
          Start Shopping
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Orders
      </Typography>
      
      <Grid container spacing={3}>
        {orders.map((order) => (
          <Grid item xs={12} key={order.id}>
            <Card sx={{ 
              transition: 'box-shadow 0.3s',
              '&:hover': { boxShadow: 4 } 
            }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  {/* Order ID */}
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Order ID
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      #{getOrderDisplayId(order.id)}
                    </Typography>
                  </Grid>
                  
                  {/* Date */}
                  <Grid item xs={6} sm={2}>
                    <Typography variant="caption" color="text.secondary">
                      Date
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(order.created_at)}
                    </Typography>
                  </Grid>
                  
                  {/* Items Count */}
                  <Grid item xs={6} sm={2}>
                    <Typography variant="caption" color="text.secondary">
                      Items
                    </Typography>
                    <Typography variant="body2">
                      {order.items?.length || 0} item(s)
                    </Typography>
                  </Grid>
                  
                  {/* Total */}
                  <Grid item xs={6} sm={2}>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {formatPrice(order.total)}
                    </Typography>
                  </Grid>
                  
                  {/* Status */}
                  <Grid item xs={6} sm={2}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={formatStatus(order.status)}
                      color={getStatusColor(order.status)}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                  
                  {/* Action */}
                  <Grid item xs={12} sm={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      component={RouterLink}
                      to={`/orders/${order.id}`}
                      fullWidth
                    >
                      View
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default OrdersPage;