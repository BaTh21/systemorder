// src/pages/admin/AdminOrders.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  CircularProgress,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Tooltip,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Search,
  Refresh,
  Clear,
  ArrowBack,
  Visibility,
  MoreVert,
  LocalShipping,
  Person,
} from '@mui/icons-material';
import api from '../../api/axios';
import ResponsiveTable from '../../components/ResponsiveTable';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openTrackingDialog, setOpenTrackingDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [deliveryService, setDeliveryService] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchOrders();
  }, [page, debouncedSearch, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await api.get('/admin/orders', { params });

      let ordersData = [];
      let totalCount = 0;
      let pagesCount = 1;

      if (Array.isArray(response.data)) {
        ordersData = response.data;
        totalCount = response.data.length;
      } else if (response.data?.items) {
        ordersData = response.data.items;
        totalCount = response.data.total || response.data.items.length;
        pagesCount = response.data.total_pages || Math.ceil(totalCount / 20);
      } else {
        ordersData = [];
      }

      setOrders(ordersData);
      setTotal(totalCount);
      setTotalPages(pagesCount);
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
      setSnackbar({ open: true, message: `Order #${orderId} updated`, severity: 'success' });
      setAnchorEl(null);
      fetchOrders();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  const handleShippingUpdate = async () => {
    if (!selectedOrder) return;
    try {
      let trackingInfo = `${deliveryService}: ${trackingNumber}`;
      if (deliveryPhone) trackingInfo += ` | 📞 ${deliveryPhone}`;
      if (deliveryNotes) trackingInfo += ` | 📝 ${deliveryNotes}`;

      await api.put(`/admin/orders/${selectedOrder.id}/status`, null, {
        params: { status: 'shipping', tracking_number: trackingInfo }
      });
      setSnackbar({ open: true, message: 'Shipping updated!', severity: 'success' });
      setOpenTrackingDialog(false);
      setTrackingNumber('');
      setDeliveryService('');
      setDeliveryPhone('');
      setDeliveryNotes('');
      setAnchorEl(null);
      fetchOrders();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update shipping', severity: 'error' });
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return String(status).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
    if (!tracking || !tracking.includes(':')) return '';
    const parts = tracking.split(':');
    if (parts.length < 2) return '';
    return parts[1].split('|')[0].trim();
  };

  // Columns for ResponsiveTable
  const columns = [
    {
      key: 'id',
      label: 'Order',
      render: (value) => (
        <Typography sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>
          #{String(value).padStart(6, '0')}
        </Typography>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (value) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#2563eb', fontSize: '0.8rem', fontWeight: 700 }}>
            {value?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>
          <Typography variant="body2" fontWeight={500}>{value || 'N/A'}</Typography>
        </Stack>
      ),
    },
    {
      key: 'items',
      label: 'Items',
      render: (value) => (
        <Typography variant="body2" color="#64748b">{value?.length || 0} item(s)</Typography>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      render: (value) => (
        <Typography fontWeight={600} color="#059669">{formatPrice(value)}</Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Chip
          label={formatStatus(value)}
          color={statusColors[value] || 'default'}
          size="small"
          sx={{ fontSize: '0.65rem', height: 24 }}
        />
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (value) => (
        <Typography variant="body2" color="#64748b">{formatDate(value)}</Typography>
      ),
    },
    {
      key: 'tracking_number',
      label: 'Delivery',
      render: (value) => (
        value ? (
          <Stack spacing={0.3}>
            <Chip
              icon={<LocalShipping sx={{ fontSize: 12 }} />}
              label={getDeliveryLabel(value)}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ fontSize: '0.6rem', height: 22 }}
            />
            {getTrackingId(value) && (
              <Typography variant="caption" color="#64748b" fontSize="0.6rem">
                ID: {getTrackingId(value)}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="caption" color="#94a3b8">-</Typography>
        )
      ),
    },
  ];

  // ✅ Actions for each row - with proper event handling
  const rowActions = (row) => (
    <>
      <Tooltip title="View Details">
        <IconButton 
          size="small" 
          onClick={() => navigate(`/orders/${row.id}`)} 
          color="primary"
          sx={{ p: { xs: 0.5, sm: 1 } }}
        >
          <Visibility fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Update Status">
        <span>
          <IconButton
            size="small"
            onClick={(e) => { 
              e.stopPropagation();
              setAnchorEl(e.currentTarget); 
              setSelectedOrder(row); 
            }}
            disabled={!statusFlow[row.status] || statusFlow[row.status].length === 0}
            sx={{ p: { xs: 0.5, sm: 1 } }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </>
  );

  // ✅ Mobile Card View with working three dots
  const MobileOrderCard = ({ order }) => {
    const [cardAnchorEl, setCardAnchorEl] = useState(null);

    const handleCardMenuOpen = (event) => {
      event.stopPropagation();
      setCardAnchorEl(event.currentTarget);
      setSelectedOrder(order);
    };

    const handleCardMenuClose = () => {
      setCardAnchorEl(null);
    };

    const handleCardStatusUpdate = (status) => {
      setCardAnchorEl(null);
      if (status === 'shipping') {
        setOpenTrackingDialog(true);
      } else {
        handleStatusUpdate(order.id, status);
      }
    };

    const availableStatuses = statusFlow[order.status]?.filter(s => {
      if (s === 'shipping' && order.tracking_number) return false;
      return true;
    }) || [];

    return (
      <Card sx={{ mb: 1.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={1.5}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                #{String(order.id).padStart(6, '0')}
              </Typography>
              <Chip
                label={formatStatus(order.status)}
                color={statusColors[order.status] || 'default'}
                size="small"
                sx={{ fontSize: '0.6rem', height: 24 }}
              />
            </Stack>

            <Divider />

            {/* Customer */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#2563eb', fontSize: '0.8rem', fontWeight: 700 }}>
                {order.customer?.charAt(0)?.toUpperCase() || '?'}
              </Avatar>
              <Box flex={1}>
                <Typography variant="body2" fontWeight={600} fontSize="0.8rem">
                  {order.customer || 'N/A'}
                </Typography>
                <Typography variant="caption" color="#94a3b8" fontSize="0.65rem">
                  {order.items?.length || 0} item(s)
                </Typography>
              </Box>
              <Typography fontWeight={700} color="#059669" fontSize="1rem">
                {formatPrice(order.total)}
              </Typography>
            </Stack>

            {/* Date & Delivery */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="#94a3b8" fontSize="0.65rem">
                {formatDate(order.created_at)}
              </Typography>
              {order.tracking_number ? (
                <Chip
                  icon={<LocalShipping sx={{ fontSize: 12 }} />}
                  label={getDeliveryLabel(order.tracking_number)}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ fontSize: '0.55rem', height: 20 }}
                />
              ) : (
                <Typography variant="caption" color="#94a3b8" fontSize="0.6rem">
                  Not shipped
                </Typography>
              )}
            </Stack>

            {/* Actions */}
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1, borderTop: '1px solid #e2e8f0' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Visibility sx={{ fontSize: 16 }} />}
                onClick={() => navigate(`/orders/${order.id}`)}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.7rem', py: 0.5, px: 1.5 }}
              >
                View
              </Button>
              {availableStatuses.length > 0 && (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<MoreVert sx={{ fontSize: 16 }} />}
                    onClick={handleCardMenuOpen}
                    sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.7rem', py: 0.5, px: 1.5 }}
                  >
                    Update
                  </Button>
                  {/* ✅ Mobile Card Menu */}
                  <Menu
                    anchorEl={cardAnchorEl}
                    open={Boolean(cardAnchorEl)}
                    onClose={handleCardMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    PaperProps={{
                      sx: {
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        minWidth: 180,
                        mt: 0.5,
                      }
                    }}
                  >
                    {availableStatuses.map((status) => (
                      <MenuItem
                        key={status}
                        onClick={() => handleCardStatusUpdate(status)}
                        sx={{ py: 1.2 }}
                      >
                        Mark as {formatStatus(status)}
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin')}
          sx={{ textTransform: 'none', fontWeight: 500, color: '#475569', mb: 2 }}
        >
          Back to Dashboard
        </Button>

        {/* Header */}
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h5" fontWeight={700} color="#0f172a" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' } }}>
                Orders
              </Typography>
              <Typography variant="body2" color="#94a3b8" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                {total} total order{total !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField
                select
                size="small"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                sx={{ 
                  minWidth: { xs: 130, sm: 160 },
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                  '& .MuiSelect-select': { fontSize: { xs: '0.7rem', sm: '0.8rem' }, py: { xs: 0.8, sm: 1 } }
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
              </TextField>
              <Button 
                startIcon={<Refresh />} 
                onClick={fetchOrders} 
                size="small" 
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>

          {/* Search */}
          <Stack direction="row" spacing={2} mt={2} flexWrap="wrap" useFlexGap>
            <TextField
              placeholder="Search by order ID or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{
                flex: 1,
                minWidth: { xs: '100%', sm: 250, md: 400 },
                maxWidth: { xs: '100%', sm: 400 },
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8' }} /></InputAdornment>,
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}><Clear fontSize="small" /></IconButton>
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 },
              }}
            />
            {debouncedSearch && (
              <Chip
                label={`"${debouncedSearch}"`}
                size="small"
                onDelete={handleClearSearch}
                sx={{ bgcolor: '#eff6ff', color: '#2563eb' }}
              />
            )}
          </Stack>
        </Paper>

        {/* Orders */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white', p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="#94a3b8">No orders found</Typography>
          </Paper>
        ) : isMobile ? (
          // ✅ Mobile Card View
          <Box>
            {orders.map((order) => (
              <MobileOrderCard key={order.id} order={order} />
            ))}
          </Box>
        ) : (
          // ✅ Tablet/Desktop Table View
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white', overflow: 'hidden' }}>
            <ResponsiveTable
              columns={columns}
              data={orders}
              actions={rowActions}
              emptyMessage="No orders found"
            />
          </Paper>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, p) => setPage(p)}
              color="primary"
              showFirstButton
              showLastButton
              size={isMobile ? 'small' : 'medium'}
            />
          </Box>
        )}
      </Container>

      {/* ✅ Main Status Menu - for desktop/tablet */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            minWidth: 180,
            mt: 0.5,
          }
        }}
      >
        {selectedOrder && statusFlow[selectedOrder.status]?.filter(s => {
          if (s === 'shipping' && selectedOrder.tracking_number) return false;
          return true;
        }).map((status) => (
          <MenuItem
            key={status}
            onClick={() => {
              setAnchorEl(null);
              if (status === 'shipping') {
                setOpenTrackingDialog(true);
              } else {
                handleStatusUpdate(selectedOrder.id, status);
              }
            }}
            sx={{ py: 1.2 }}
          >
            Mark as {formatStatus(status)}
          </MenuItem>
        ))}
        {selectedOrder && (!statusFlow[selectedOrder.status] || statusFlow[selectedOrder.status].filter(s => {
          if (s === 'shipping' && selectedOrder.tracking_number) return false;
          return true;
        }).length === 0) && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">No actions available</Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Tracking Dialog */}
      <Dialog open={openTrackingDialog} onClose={() => setOpenTrackingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Tracking Information</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Order #{selectedOrder?.id} • Total: {formatPrice(selectedOrder?.total)}
          </Typography>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Delivery Service"
              value={deliveryService}
              onChange={(e) => setDeliveryService(e.target.value)}
            >
              <MenuItem value="grab_express">Grab Express</MenuItem>
              <MenuItem value="grab_bike">Grab Bike</MenuItem>
              <MenuItem value="nham24">Nham24</MenuItem>
              <MenuItem value="virak_buntham">Virak Buntham</MenuItem>
              <MenuItem value="jnt_express">J&T Express</MenuItem>
              <MenuItem value="dhl">DHL</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              label="Tracking Number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
            />
            <TextField
              fullWidth
              size="small"
              label="Driver Phone (Optional)"
              value={deliveryPhone}
              onChange={(e) => setDeliveryPhone(e.target.value)}
              placeholder="Enter driver's phone number"
            />
            <TextField
              fullWidth
              size="small"
              label="Notes (Optional)"
              multiline
              rows={2}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Special instructions..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
          <Button onClick={() => setOpenTrackingDialog(false)} sx={{ width: { xs: '100%', sm: 'auto' }, borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleShippingUpdate}
            disabled={!trackingNumber.trim() || !deliveryService}
            sx={{ width: { xs: '100%', sm: 'auto' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Update & Ship
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminOrders;