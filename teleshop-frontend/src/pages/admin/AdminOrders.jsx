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
  Phone,
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
  confirmed: ['waiting_payment', 'shipping', 'cancelled'],
  waiting_payment: ['paid', 'shipping', 'cancelled'],
  paid: ['purchasing', 'shipping', 'cancelled'],
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
  const [deliveryService, setDeliveryService] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
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
      let trackingInfo = `${deliveryService}: ${trackingNumber}`;
      if (deliveryPhone) {
        trackingInfo += ` | 📞 ${deliveryPhone}`;
      }
      if (deliveryNotes) {
        trackingInfo += ` | 📝 ${deliveryNotes}`;
      }

      await api.put(`/admin/orders/${selectedOrder.id}/status`, null, {
        params: { status: 'shipping', tracking_number: trackingInfo }
      });
      setSnackbar({ open: true, message: 'Tracking added & status updated!', severity: 'success' });
      setOpenTrackingDialog(false);
      setTrackingNumber('');
      setDeliveryService('');
      setDeliveryPhone('');
      setDeliveryNotes('');
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

  const getDeliveryLabel = (tracking) => {
    if (!tracking || !tracking.includes(':')) return tracking || 'N/A';
    const service = tracking.split(':')[0];
    const services = {
      'grab_express': 'Grab Express',
      'grab_bike': 'Grab Bike',
      'nham24': 'Nham24',
      'virak_buntham': 'Virak Buntham',
      'jnt_express': 'J&T Express',
      'dhl': 'DHL',
      'other': 'Delivery',
    };
    return services[service] || service;
  };

  const getTrackingId = (tracking) => {
    if (!tracking || !tracking.includes(':')) return tracking || '';
    const parts = tracking.split(':');
    if (parts.length < 2) return '';
    const idPart = parts[1].split('|')[0].trim();
    return idPart;
  };

  const getTrackingPhone = (tracking) => {
    if (!tracking || !tracking.includes('📞')) return '';
    const phonePart = tracking.split('📞')[1];
    if (phonePart) {
      return phonePart.split('|')[0].trim();
    }
    return '';
  };

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
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Order</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', display: { xs: 'none', lg: 'table-cell' } }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', display: { xs: 'none', md: 'table-cell' } }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Delivery</TableCell>
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
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>
                        #{String(order.id).padStart(6, '0')}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} fontSize="0.8rem">
                          {order.customer || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        {order.items?.length || 0} item(s)
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600} color="#059669" fontSize="0.8rem">
                          {formatPrice(order.total)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={formatStatus(order.status)} color={statusColors[order.status] || 'default'} size="small" sx={{ fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2" color="#64748b" fontSize="0.75rem">
                          {formatDate(order.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {order.tracking_number ? (
                          <Stack spacing={0.3}>
                            <Chip
                              icon={<LocalShipping sx={{ fontSize: 12 }} />}
                              label={getDeliveryLabel(order.tracking_number)}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ fontSize: '0.65rem', height: 22 }}
                            />
                            {getTrackingId(order.tracking_number) && (
                              <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.6rem' }}>
                                ID: {getTrackingId(order.tracking_number)}
                              </Typography>
                            )}
                            {getTrackingPhone(order.tracking_number) && (
                              <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.6rem' }}>
                                📞 {getTrackingPhone(order.tracking_number)}
                              </Typography>
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="#94a3b8" fontSize="0.7rem">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => navigate(`/orders/${order.id}`)} color="primary">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Update Status">
                          <span>
                            <IconButton
                              size="small"
                              onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedOrder(order); }}
                              disabled={!statusFlow[order.status] || statusFlow[order.status].length === 0}
                            >
                              <MoreVert fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
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
        {selectedOrder && (() => {
          // Get FRESH order data from orders array
          const freshOrder = orders.find(o => o.id === selectedOrder.id);
          if (!freshOrder) return null;

          // Get available statuses for this order
          const availableStatuses = statusFlow[freshOrder.status] || [];

          // Filter out "shipping" if tracking already exists
          const filteredStatuses = availableStatuses.filter(status => {
            if (status === 'shipping' && freshOrder.tracking_number) {
              return false; // Hide it
            }
            return true;
          });

          // If nothing to show, close the menu
          if (filteredStatuses.length === 0) {
            return (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">No actions available</Typography>
              </MenuItem>
            );
          }

          return filteredStatuses.map((status) => (
            <MenuItem key={status} onClick={() => {
              setAnchorEl(null); // Close menu first
              if (status === 'shipping') {
                setOpenTrackingDialog(true);
              } else {
                handleStatusUpdate(freshOrder.id, status);
              }
            }}>
              Mark as {formatStatus(status)}
            </MenuItem>
          ));
        })()}
      </Menu>

      {/* Tracking Dialog */}
      <Dialog open={openTrackingDialog} onClose={() => setOpenTrackingDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add Tracking Information</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Order #{selectedOrder?.id} • Total: ${Number(selectedOrder?.total || 0).toFixed(2)}
          </Typography>

          <Stack spacing={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Delivery Service</InputLabel>
              <Select value={deliveryService} onChange={(e) => setDeliveryService(e.target.value)} label="Delivery Service" sx={{ borderRadius: 2 }}>
                <MenuItem value="grab_express">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#00B14F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem' }}>Grab</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Grab Express</Typography>
                      <Typography variant="caption" color="text.secondary">Car Delivery</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="grab_bike">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#00B14F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem' }}>Grab</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Grab Bike</Typography>
                      <Typography variant="caption" color="text.secondary">Motorcycle Delivery</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="nham24">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#E94E1B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>N24</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Nham24 Delivery</Typography>
                      <Typography variant="caption" color="text.secondary">Express Delivery</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="virak_buntham">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#003D7A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.6rem' }}>VB</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Virak Buntham Express</Typography>
                      <Typography variant="caption" color="text.secondary">Nationwide Delivery</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="jnt_express">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#EE2A2F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>J&T</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>J&T Express</Typography>
                      <Typography variant="caption" color="text.secondary">Courier Service</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="dhl">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#FFCC00', color: '#D40511', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>DHL</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>DHL Express</Typography>
                      <Typography variant="caption" color="text.secondary">International Shipping</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="other">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#64748B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>?</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Other</Typography>
                      <Typography variant="caption" color="text.secondary">Custom Delivery</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField fullWidth label="Tracking Number / Booking ID" value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)} autoFocus size="small"
              placeholder="Enter tracking or booking number"
              helperText="Enter the tracking number from the delivery service"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

            <TextField fullWidth label="Driver Phone Number (Optional)" value={deliveryPhone}
              onChange={(e) => setDeliveryPhone(e.target.value)} size="small"
              placeholder="Enter driver's phone number for customer contact"
              InputProps={{
                startAdornment: <Phone sx={{ color: '#94a3b8', mr: 1, fontSize: 18 }} />,
              }}
              helperText="Customer can contact the driver directly via this number"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

            <TextField fullWidth label="Delivery Notes (Optional)" value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)} multiline rows={2} size="small"
              placeholder="E.g., Driver name, estimated delivery time, special instructions..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenTrackingDialog(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleShippingUpdate} disabled={!trackingNumber.trim() || !deliveryService}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
            Update & Mark as Shipping
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminOrders;