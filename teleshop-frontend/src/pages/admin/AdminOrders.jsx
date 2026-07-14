import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from '@mui/material';
import { MoreVert, Refresh } from '@mui/icons-material';
import api from '../../api/axios';

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

const statusFlow = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['waiting_payment', 'cancelled'],
  waiting_payment: ['paid', 'cancelled'],
  paid: ['purchasing', 'cancelled'],
  purchasing: ['shipping', 'cancelled'],
  shipping: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openTrackingDialog, setOpenTrackingDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      params.page = page;
      params.limit = 50;

      const response = await api.get('/admin/orders', { params });
      console.log('Admin Orders Response:', response.data);

      // Handle different response formats
      let ordersData = [];
      if (Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (response.data && Array.isArray(response.data.items)) {
        ordersData = response.data.items;
      }

      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showSnackbar('Failed to fetch orders', 'error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, null, {
        params: { status: newStatus }
      });
      showSnackbar(`Order #${orderId} status updated to ${newStatus}`, 'success');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      showSnackbar('Failed to update order status', 'error');
    }
    setAnchorEl(null);
  };

  const handleShippingUpdate = async () => {
    if (!selectedOrder) return;
    
    try {
      await api.put(`/admin/orders/${selectedOrder.id}/status`, null, {
        params: { 
          status: 'shipping', 
          tracking_number: trackingNumber 
        }
      });
      showSnackbar('Tracking number added and status updated to shipping', 'success');
      setOpenTrackingDialog(false);
      setTrackingNumber('');
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error updating shipping:', error);
      showSnackbar('Failed to update shipping', 'error');
    }
  };

  const handleOpenTrackingDialog = (order) => {
    setSelectedOrder(order);
    setTrackingNumber(order.tracking_number || '');
    setOpenTrackingDialog(true);
    setAnchorEl(null);
  };

  // Helper functions
  const getOrderDisplayId = (orderId) => {
    if (!orderId && orderId !== 0) return 'N/A';
    const idStr = String(orderId);
    return idStr.length > 8 ? idStr.substring(0, 8) + '...' : idStr;
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    if (typeof status === 'object' && status.value) {
      status = status.value;
    }
    return String(status).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
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

  const getCustomerName = (order) => {
    if (order.user?.full_name) return order.user.full_name;
    if (order.shipping_address?.full_name) return order.shipping_address.full_name;
    return 'N/A';
  };

  const getItemCount = (order) => {
    return order.items?.length || 0;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">
          Orders Management
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter Status</InputLabel>
            <Select
              value={statusFilter}
              label="Filter Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">All Orders</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="waiting_payment">Waiting Payment</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="purchasing">Purchasing</MenuItem>
              <MenuItem value="shipping">Shipping</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          {/* Refresh Button */}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchOrders}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No orders found
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Tracking</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} hover>
                  {/* Order ID */}
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    #{getOrderDisplayId(order.id)}
                  </TableCell>

                  {/* Customer */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {getCustomerName(order)}
                    </Typography>
                    {order.user?.email && (
                      <Typography variant="caption" color="text.secondary">
                        {order.user.email}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Items Count */}
                  <TableCell>
                    {getItemCount(order)} item(s)
                  </TableCell>

                  {/* Total */}
                  <TableCell>
                    <Typography fontWeight="bold" color="primary">
                      {formatPrice(order.total)}
                    </Typography>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Chip
                      label={formatStatus(order.status)}
                      color={statusColors[order.status] || 'default'}
                      size="small"
                    />
                  </TableCell>

                  {/* Date */}
                  <TableCell>
                    <Typography variant="body2" fontSize="0.85rem">
                      {formatDate(order.created_at)}
                    </Typography>
                  </TableCell>

                  {/* Tracking */}
                  <TableCell>
                    {order.tracking_number ? (
                      <Chip
                        label={order.tracking_number}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedOrder(order);
                      }}
                      disabled={!statusFlow[order.status] || statusFlow[order.status].length === 0}
                      size="small"
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Status Update Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {selectedOrder && statusFlow[selectedOrder.status]?.map((status) => (
          <MenuItem
            key={status}
            onClick={() => {
              if (status === 'shipping') {
                handleOpenTrackingDialog(selectedOrder);
              } else {
                handleStatusUpdate(selectedOrder.id, status);
              }
            }}
          >
            Mark as {formatStatus(status)}
          </MenuItem>
        ))}
        
        {selectedOrder && (
          <MenuItem onClick={() => {
            setAnchorEl(null);
            window.open(`/orders/${selectedOrder.id}`, '_blank');
          }}>
            View Details
          </MenuItem>
        )}
      </Menu>

      {/* Tracking Number Dialog */}
      <Dialog 
        open={openTrackingDialog} 
        onClose={() => setOpenTrackingDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Tracking Number</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Order #{selectedOrder ? getOrderDisplayId(selectedOrder.id) : ''}
          </Typography>
          <TextField
            fullWidth
            label="Tracking Number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter shipping tracking number"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTrackingDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleShippingUpdate}
            disabled={!trackingNumber.trim()}
          >
            Update & Mark as Shipping
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminOrders;