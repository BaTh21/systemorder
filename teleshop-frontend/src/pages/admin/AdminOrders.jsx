// src/pages/admin/AdminOrders.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Stack,
  Pagination,
  Tooltip,
} from '@mui/material';
import {
  MoreVert,
  Refresh,
  ArrowBack,
  Visibility,
  LocalShipping,
} from '@mui/icons-material';
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
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openTrackingDialog, setOpenTrackingDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

      const response = await api.get('/admin/orders', { params });
      
      let ordersData = [];
      if (Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (response.data?.items) {
        ordersData = response.data.items;
        setTotalPages(Math.ceil((response.data.total || 0) / 50));
        setTotalOrders(response.data.total || 0);
      }
      
      // Sort ASC (oldest first)
      ordersData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, null, {
        params: { status: newStatus }
      });
      setSnackbar({ open: true, message: `Order #${orderId} → ${formatStatus(newStatus)}`, severity: 'success' });
      fetchOrders();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
    setAnchorEl(null);
  };

  const handleShippingUpdate = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/admin/orders/${selectedOrder.id}/status`, null, {
        params: { status: 'shipping', tracking_number: trackingNumber }
      });
      setSnackbar({ open: true, message: 'Tracking added & status updated', severity: 'success' });
      setOpenTrackingDialog(false);
      setTrackingNumber('');
      fetchOrders();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update shipping', severity: 'error' });
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return String(status).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price) => `$${Number(price || 0).toFixed(2)}`;

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">

        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin')} sx={{ textTransform: 'none', fontWeight: 500, color: '#475569', mb: 2 }}>
          Back to Dashboard
        </Button>

        {/* Header */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h5" fontWeight={700} color="#0f172a">Orders Management</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} sx={{ borderRadius: 2 }}>
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
              <Button startIcon={<Refresh />} onClick={fetchOrders} size="small" sx={{ borderRadius: 2, textTransform: 'none' }}>Refresh</Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Orders Table */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Order</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Tracking</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}><Typography color="#94a3b8">No orders found</Typography></TableCell></TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>#{String(order.id).padStart(6, '0')}</TableCell>
                      <TableCell><Typography variant="body2" fontWeight={500}>{order.customer || 'N/A'}</Typography></TableCell>
                      <TableCell>{order.items?.length || 0} item(s)</TableCell>
                      <TableCell><Typography fontWeight={600} color="#059669">{formatPrice(order.total)}</Typography></TableCell>
                      <TableCell><Chip label={formatStatus(order.status)} color={statusColors[order.status] || 'default'} size="small" /></TableCell>
                      <TableCell><Typography variant="body2" color="#64748b" fontSize="0.8rem">{formatDate(order.created_at)}</Typography></TableCell>
                      <TableCell>
                        {order.tracking_number ? (
                          <Chip icon={<LocalShipping sx={{ fontSize: 14 }} />} label={order.tracking_number} size="small" variant="outlined" color="primary" />
                        ) : (
                          <Typography variant="caption" color="#94a3b8">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="View Details"><IconButton size="small" onClick={() => navigate(`/orders/${order.id}`)} color="primary"><Visibility fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Update Status"><IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedOrder(order); }} disabled={!statusFlow[order.status] || statusFlow[order.status].length === 0}><MoreVert fontSize="small" /></IconButton></Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #e2e8f0' }}>
              <Pagination count={totalPages} page={page} onChange={(e, p) => setPage(p)} color="primary" showFirstButton showLastButton />
            </Box>
          )}
        </Paper>
      </Container>

      {/* Status Update Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {selectedOrder && statusFlow[selectedOrder.status]?.map((status) => (
          <MenuItem key={status} onClick={() => {
            if (status === 'shipping') { setOpenTrackingDialog(true); }
            else { handleStatusUpdate(selectedOrder.id, status); }
          }}>Mark as {formatStatus(status)}</MenuItem>
        ))}
      </Menu>

      {/* Tracking Dialog */}
      <Dialog open={openTrackingDialog} onClose={() => setOpenTrackingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Tracking Number</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>Order #{selectedOrder?.id}</Typography>
          <TextField fullWidth label="Tracking Number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} autoFocus size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenTrackingDialog(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleShippingUpdate} disabled={!trackingNumber.trim()} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Update & Mark as Shipping</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminOrders;