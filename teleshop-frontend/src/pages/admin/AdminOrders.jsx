// src/pages/admin/AdminOrders.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
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
  useTheme,
  useMediaQuery,
  Avatar,
  Card,
  CardContent,
} from '@mui/material';
import {
  MoreVert,
  Refresh,
  ArrowBack,
  Visibility,
  LocalShipping,
  Phone,
  CheckCircle,
  Cancel,
  Pending,
  Schedule,
  Paid,
  ShoppingCart,
  DeliveryDining,
  Person,
  AttachMoney,
  QrCodeScanner,
  Image as ImageIcon,
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

const statusIcons = {
  pending: <Pending sx={{ fontSize: 14 }} />,
  confirmed: <CheckCircle sx={{ fontSize: 14 }} />,
  waiting_payment: <Schedule sx={{ fontSize: 14 }} />,
  paid: <Paid sx={{ fontSize: 14 }} />,
  purchasing: <ShoppingCart sx={{ fontSize: 14 }} />,
  shipping: <DeliveryDining sx={{ fontSize: 14 }} />,
  completed: <CheckCircle sx={{ fontSize: 14 }} />,
  cancelled: <Cancel sx={{ fontSize: 14 }} />,
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

  // ✅ Payment Dialog State
  const [paymentDialog, setPaymentDialog] = useState({ open: false, order: null });

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
      let totalCount = 0;
      let pagesCount = 1;

      if (Array.isArray(response.data)) {
        ordersData = response.data;
        totalCount = response.data.length;
        pagesCount = Math.ceil(totalCount / 50);
      } else if (response.data?.items) {
        ordersData = response.data.items;
        totalCount = response.data.total || 0;
        pagesCount = response.data.total_pages || Math.ceil(totalCount / 50);
      }

      ordersData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setOrders(ordersData);
      setTotalOrders(totalCount);
      setTotalPages(pagesCount);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setSnackbar({ open: true, message: 'Failed to load orders', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, null, {
        params: { status: newStatus }
      });
      setSnackbar({
        open: true,
        message: `Order #${orderId} → ${formatStatus(newStatus)}`,
        severity: 'success'
      });
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
      if (deliveryPhone) {
        trackingInfo += ` | 📞 ${deliveryPhone}`;
      }
      if (deliveryNotes) {
        trackingInfo += ` | 📝 ${deliveryNotes}`;
      }

      await api.put(`/admin/orders/${selectedOrder.id}/status`, null, {
        params: { status: 'shipping', tracking_number: trackingInfo }
      });
      setSnackbar({
        open: true,
        message: `📦 Order #${selectedOrder.id} marked as shipping!`,
        severity: 'success'
      });
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

  // ✅ Handle Payment Verification (Bank/QR)
  const handleVerifyPayment = async (orderId) => {
    try {
      await api.post(`/payment/mark-paid/${orderId}`);
      setSnackbar({
        open: true,
        message: '✅ Payment verified! Order marked as paid.',
        severity: 'success'
      });
      setPaymentDialog({ open: false, order: null });
      fetchOrders();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to verify payment',
        severity: 'error'
      });
    }
  };

  // ✅ Handle Cash Payment
  const handleCashPayment = async (orderId) => {
    try {
      await api.post(`/payment/mark-cash-payment/${orderId}`);
      setSnackbar({
        open: true,
        message: '✅ Cash payment recorded!',
        severity: 'success'
      });
      setPaymentDialog({ open: false, order: null });
      fetchOrders();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to record cash payment',
        severity: 'error'
      });
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return String(status).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const getStatusCount = (status) => {
    return orders.filter(o => o.status === status).length;
  };

  // ✅ Columns for responsive table - WITH Payment Proof Column
  const columns = [
    {
      key: 'id',
      label: 'Order',
      render: (value) => (
        <Typography sx={{
          fontFamily: 'monospace',
          fontWeight: 600,
          fontSize: { xs: '0.7rem', sm: '0.8rem' }
        }}>
          #{String(value).padStart(6, '0')}
        </Typography>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (value) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{
            width: { xs: 28, sm: 32 },
            height: { xs: 28, sm: 32 },
            bgcolor: '#2563eb',
            fontSize: { xs: '0.7rem', sm: '0.8rem' },
            fontWeight: 700
          }}>
            {value?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>
          <Typography variant="body2" fontWeight={500} fontSize={{ xs: '0.7rem', sm: '0.8rem' }}>
            {value || 'N/A'}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'items',
      label: 'Items',
      render: (value) => (
        <Typography variant="body2" fontSize={{ xs: '0.65rem', sm: '0.75rem' }}>
          {value?.length || 0} item(s)
        </Typography>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      render: (value) => (
        <Typography fontWeight={600} color="#059669" fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>
          {formatPrice(value)}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => (
        <Chip
          icon={statusIcons[value]}
          label={formatStatus(value)}
          color={statusColors[value] || 'default'}
          size="small"
          sx={{
            fontSize: { xs: '0.55rem', sm: '0.65rem' },
            height: { xs: 20, sm: 24 },
            '& .MuiChip-icon': { fontSize: { xs: 12, sm: 14 } }
          }}
        />
      ),
    },
    // ✅ NEW COLUMN: Payment Proof
    {
      key: 'payment_receipt_url',
      label: 'Proof',
      render: (value, row) => (
        value ? (
          <Tooltip title="View Payment Proof">
            <IconButton
              size="small"
              onClick={() => window.open(value, '_blank')}
              sx={{ color: '#2563eb', p: 0.5 }}
            >
              <ImageIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Typography variant="caption" color="#94a3b8" fontSize="0.6rem">
            -
          </Typography>
        )
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (value) => (
        <Typography variant="body2" color="#64748b" fontSize={{ xs: '0.6rem', sm: '0.7rem' }}>
          {formatDate(value)}
        </Typography>
      ),
    },
    {
      key: 'tracking_number',
      label: 'Delivery',
      render: (value, row) => (
        value ? (
          <Stack spacing={0.3}>
            <Chip
              icon={<LocalShipping sx={{ fontSize: { xs: 10, sm: 12 } }} />}
              label={getDeliveryLabel(value)}
              size="small"
              variant="outlined"
              color="primary"
              sx={{
                fontSize: { xs: '0.5rem', sm: '0.65rem' },
                height: { xs: 16, sm: 22 }
              }}
            />
            {getTrackingId(value) && (
              <Typography variant="caption" color="#64748b" fontSize={{ xs: '0.45rem', sm: '0.6rem' }}>
                ID: {getTrackingId(value)}
              </Typography>
            )}
            {getTrackingPhone(value) && (
              <Typography variant="caption" color="#64748b" fontSize={{ xs: '0.45rem', sm: '0.6rem' }}>
                📞 {getTrackingPhone(value)}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="caption" color="#94a3b8" fontSize={{ xs: '0.6rem', sm: '0.7rem' }}>
            Not shipped
          </Typography>
        )
      ),
    },
  ];

  // ✅ Actions for each row
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

      {/* ✅ Payment Verification Button - Shows only for waiting_payment */}
      {row.status === 'waiting_payment' && (
        <Tooltip title="Verify Payment">
          <IconButton
            size="small"
            onClick={() => setPaymentDialog({ open: true, order: row })}
            color="success"
            sx={{ p: { xs: 0.5, sm: 1 } }}
          >
            <Paid fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Update Status">
        <span>
          <IconButton
            size="small"
            onClick={(e) => {
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

  // ✅ Mobile Card View for Orders
  const MobileOrderCard = ({ order }) => (
    <Card sx={{ mb: 1.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          {/* Order ID & Status */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
              #{String(order.id).padStart(6, '0')}
            </Typography>
            <Chip
              icon={statusIcons[order.status]}
              label={formatStatus(order.status)}
              color={statusColors[order.status] || 'default'}
              size="small"
              sx={{ fontSize: '0.6rem', height: 24 }}
            />
          </Stack>

          {/* Customer */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#2563eb', fontSize: '0.8rem', fontWeight: 700 }}>
              {order.customer?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600} fontSize="0.8rem">
                {order.customer || 'N/A'}
              </Typography>
              <Typography variant="caption" color="#94a3b8" fontSize="0.6rem">
                {order.items?.length || 0} item(s)
              </Typography>
            </Box>
          </Stack>

          {/* Total & Date */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="#94a3b8" fontSize="0.6rem">
              {formatDate(order.created_at)}
            </Typography>
            <Typography fontWeight={700} color="#059669" fontSize="1rem">
              {formatPrice(order.total)}
            </Typography>
          </Stack>

          {/* ✅ Payment Proof on Mobile */}
          {order.payment_receipt_url && (
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="#94a3b8">Payment Proof</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ImageIcon sx={{ fontSize: 16 }} />}
                onClick={() => window.open(order.payment_receipt_url, '_blank')}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.6rem', py: 0.3, px: 1 }}
              >
                View
              </Button>
            </Stack>
          )}

          {/* Delivery Info */}
          {order.tracking_number ? (
            <Stack spacing={0.3}>
              <Chip
                icon={<LocalShipping sx={{ fontSize: 12 }} />}
                label={getDeliveryLabel(order.tracking_number)}
                size="small"
                variant="outlined"
                color="primary"
                sx={{ fontSize: '0.6rem', height: 22 }}
              />
              {getTrackingId(order.tracking_number) && (
                <Typography variant="caption" color="#64748b" fontSize="0.55rem">
                  ID: {getTrackingId(order.tracking_number)}
                </Typography>
              )}
            </Stack>
          ) : (
            <Typography variant="caption" color="#94a3b8" fontSize="0.6rem">
              Not shipped yet
            </Typography>
          )}

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

            {/* ✅ Payment Verification Button on Mobile */}
            {order.status === 'waiting_payment' && (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<Paid sx={{ fontSize: 16 }} />}
                onClick={() => setPaymentDialog({ open: true, order })}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.65rem', py: 0.5, px: 1.5 }}
              >
                Verify
              </Button>
            )}

            {statusFlow[order.status] && statusFlow[order.status].filter(s => {
              if (s === 'shipping' && order.tracking_number) return false;
              return true;
            }).length > 0 && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<MoreVert sx={{ fontSize: 16 }} />}
                  onClick={(e) => {
                    setAnchorEl(e.currentTarget);
                    setSelectedOrder(order);
                  }}
                  sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.7rem', py: 0.5, px: 1.5 }}
                >
                  Update
                </Button>
              )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 3, md: 4 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>

        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin')}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            color: '#475569',
            mb: 2,
            fontSize: { xs: '0.75rem', sm: '0.85rem' }
          }}
        >
          Back to Dashboard
        </Button>

        {/* Header */}
        <Paper elevation={0} sx={{
          p: { xs: 1.5, sm: 2, md: 3 },
          mb: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          border: '1px solid #e2e8f0',
          bgcolor: 'white'
        }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h5" fontWeight={700} color="#0f172a" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' } }}>
                Orders Management
              </Typography>
              <Typography variant="body2" color="#94a3b8" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                {totalOrders} total orders
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 150 } }}>
                <InputLabel sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  sx={{
                    borderRadius: 2,
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    '& .MuiSelect-select': { py: { xs: 0.8, sm: 1 } }
                  }}
                >
                  <MenuItem value="all">All Orders ({totalOrders})</MenuItem>
                  <MenuItem value="pending">Pending ({getStatusCount('pending')})</MenuItem>
                  <MenuItem value="confirmed">Confirmed ({getStatusCount('confirmed')})</MenuItem>
                  <MenuItem value="waiting_payment">Waiting Payment ({getStatusCount('waiting_payment')})</MenuItem>
                  <MenuItem value="paid">Paid ({getStatusCount('paid')})</MenuItem>
                  <MenuItem value="purchasing">Purchasing ({getStatusCount('purchasing')})</MenuItem>
                  <MenuItem value="shipping">Shipping ({getStatusCount('shipping')})</MenuItem>
                  <MenuItem value="completed">Completed ({getStatusCount('completed')})</MenuItem>
                  <MenuItem value="cancelled">Cancelled ({getStatusCount('cancelled')})</MenuItem>
                </Select>
              </FormControl>
              <Button
                startIcon={<Refresh />}
                onClick={fetchOrders}
                size="small"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  px: { xs: 1.5, sm: 2 }
                }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Orders Table - Responsive */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Paper elevation={0} sx={{
            borderRadius: { xs: 2, sm: 3 },
            border: '1px solid #e2e8f0',
            bgcolor: 'white',
            p: 6,
            textAlign: 'center'
          }}>
            <Typography variant="h6" color="#94a3b8">No orders found</Typography>
          </Paper>
        ) : isMobile ? (
          // Mobile View - Cards
          <Box>
            {orders.map((order) => (
              <MobileOrderCard key={order.id} order={order} />
            ))}
          </Box>
        ) : (
          // Tablet/Desktop View - Table
          <Paper elevation={0} sx={{
            borderRadius: { xs: 2, sm: 3 },
            border: '1px solid #e2e8f0',
            bgcolor: 'white',
            overflow: 'hidden'
          }}>
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

      {/* ✅ Payment Verification Dialog */}
      <Dialog
        open={paymentDialog.open}
        onClose={() => setPaymentDialog({ open: false, order: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Paid sx={{ mr: 1, verticalAlign: 'middle', color: '#22c55e' }} />
          Verify Payment
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>

            {/* Order Summary */}
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Order #{paymentDialog.order?.id}</strong>
              </Typography>
              <Typography variant="body2">
                Total: {formatPrice(paymentDialog.order?.total)}
              </Typography>
              <Typography variant="body2">
                Customer: {paymentDialog.order?.customer}
              </Typography>
            </Alert>

            {/* ✅ Show uploaded payment proof - FIXED */}
            {paymentDialog.order?.payment_receipt_url ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Payment Proof (Uploaded by Customer):
                </Typography>
                <Box
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.9 },
                    transition: 'opacity 0.2s',
                    display: 'inline-block',
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    overflow: 'hidden',
                    maxWidth: '100%',
                    width: '100%',
                    bgcolor: '#f8fafc',
                    p: 1,
                  }}
                  onClick={() => {
                    window.open(paymentDialog.order.payment_receipt_url, '_blank');
                  }}
                >
                  <Box
                    component="img"
                    src={paymentDialog.order.payment_receipt_url}
                    alt="Payment Proof"
                    sx={{
                      width: '100%',
                      maxWidth: '100%',
                      maxHeight: 250,
                      height: 'auto',
                      display: 'block',
                      objectFit: 'contain',
                      borderRadius: 1,
                      mx: 'auto',
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: #94a3b8;">
                      <span style="font-size: 48px;">🖼️</span>
                      <p style="margin: 8px 0;">Image not available</p>
                      <a href="${paymentDialog.order.payment_receipt_url}" target="_blank" style="color: #2563eb; text-decoration: underline;">
                        Click to view directly
                      </a>
                    </div>
                  `;
                      }
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Click image to view full size
                </Typography>
              </Box>
            ) : (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                ⚠️ No payment proof uploaded yet
              </Alert>
            )}

            {/* Admin chooses payment method */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Confirm Payment Method:
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<QrCodeScanner />}
                  onClick={() => handleVerifyPayment(paymentDialog.order?.id)}
                  sx={{ borderRadius: 2, textTransform: 'none', flex: 1 }}
                >
                  Bank/QR Payment
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<AttachMoney />}
                  onClick={() => handleCashPayment(paymentDialog.order?.id)}
                  sx={{ borderRadius: 2, textTransform: 'none', flex: 1 }}
                >
                  Cash Payment
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setPaymentDialog({ open: false, order: null })}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: { borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 180 }
        }}
      >
        {selectedOrder && (() => {
          const freshOrder = orders.find(o => o.id === selectedOrder.id);
          if (!freshOrder) return null;

          const availableStatuses = statusFlow[freshOrder.status] || [];
          const filteredStatuses = availableStatuses.filter(status => {
            if (status === 'shipping' && freshOrder.tracking_number) {
              return false;
            }
            return true;
          });

          if (filteredStatuses.length === 0) {
            return (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">No actions available</Typography>
              </MenuItem>
            );
          }

          return filteredStatuses.map((status) => (
            <MenuItem
              key={status}
              onClick={() => {
                setAnchorEl(null);
                if (status === 'shipping') {
                  setOpenTrackingDialog(true);
                } else {
                  handleStatusUpdate(freshOrder.id, status);
                }
              }}
              sx={{ py: 1.2 }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                {statusIcons[status]}
                <Typography variant="body2">
                  Mark as {formatStatus(status)}
                </Typography>
              </Stack>
            </MenuItem>
          ));
        })()}
      </Menu>

      {/* Tracking Dialog */}
      <Dialog
        open={openTrackingDialog}
        onClose={() => setOpenTrackingDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: { xs: 2, sm: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          <LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />
          Add Tracking Information
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2.5} fontSize={{ xs: '0.8rem', sm: '0.9rem' }}>
            Order #{selectedOrder?.id} • Total: {formatPrice(selectedOrder?.total)}
          </Typography>

          <Stack spacing={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>Delivery Service</InputLabel>
              <Select
                value={deliveryService}
                onChange={(e) => setDeliveryService(e.target.value)}
                label="Delivery Service"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="grab_express">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: { xs: 24, sm: 28 },
                      height: { xs: 24, sm: 28 },
                      borderRadius: 1,
                      bgcolor: '#00B14F',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: { xs: '0.6rem', sm: '0.7rem' }
                    }}>Grab</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>Grab Express</Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={{ xs: '0.6rem', sm: '0.65rem' }}>Car Delivery</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="grab_bike">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: { xs: 24, sm: 28 },
                      height: { xs: 24, sm: 28 },
                      borderRadius: 1,
                      bgcolor: '#00B14F',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: { xs: '0.6rem', sm: '0.7rem' }
                    }}>Grab</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>Grab Bike</Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={{ xs: '0.6rem', sm: '0.65rem' }}>Motorcycle Delivery</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="nham24">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: { xs: 24, sm: 28 },
                      height: { xs: 24, sm: 28 },
                      borderRadius: 1,
                      bgcolor: '#E94E1B',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: { xs: '0.5rem', sm: '0.6rem' }
                    }}>N24</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>Nham24 Delivery</Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={{ xs: '0.6rem', sm: '0.65rem' }}>Express Delivery</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="virak_buntham">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: { xs: 24, sm: 28 },
                      height: { xs: 24, sm: 28 },
                      borderRadius: 1,
                      bgcolor: '#003D7A',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: { xs: '0.5rem', sm: '0.6rem' }
                    }}>VB</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>Virak Buntham Express</Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={{ xs: '0.6rem', sm: '0.65rem' }}>Nationwide Delivery</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="jnt_express">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: { xs: 24, sm: 28 },
                      height: { xs: 24, sm: 28 },
                      borderRadius: 1,
                      bgcolor: '#EE2A2F',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: { xs: '0.5rem', sm: '0.6rem' }
                    }}>J&T</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>J&T Express</Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={{ xs: '0.6rem', sm: '0.65rem' }}>Courier Service</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="dhl">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: { xs: 24, sm: 28 },
                      height: { xs: 24, sm: 28 },
                      borderRadius: 1,
                      bgcolor: '#FFCC00',
                      color: '#D40511',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: { xs: '0.5rem', sm: '0.6rem' }
                    }}>DHL</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>DHL Express</Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={{ xs: '0.6rem', sm: '0.65rem' }}>International Shipping</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="other">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: { xs: 24, sm: 28 },
                      height: { xs: 24, sm: 28 },
                      borderRadius: 1,
                      bgcolor: '#64748B',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: { xs: '0.6rem', sm: '0.7rem' }
                    }}>?</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>Other</Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={{ xs: '0.6rem', sm: '0.65rem' }}>Custom Delivery</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Tracking Number / Booking ID"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              autoFocus
              size="small"
              placeholder="Enter tracking or booking number"
              helperText="Enter the tracking number from the delivery service"
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2 },
                '& .MuiFormHelperText-root': { fontSize: { xs: '0.65rem', sm: '0.75rem' } }
              }}
            />

            <TextField
              fullWidth
              label="Driver Phone Number (Optional)"
              value={deliveryPhone}
              onChange={(e) => setDeliveryPhone(e.target.value)}
              size="small"
              placeholder="Enter driver's phone number for customer contact"
              InputProps={{
                startAdornment: <Phone sx={{ color: '#94a3b8', mr: 1, fontSize: 18 }} />,
              }}
              helperText="Customer can contact the driver directly via this number"
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2 },
                '& .MuiFormHelperText-root': { fontSize: { xs: '0.65rem', sm: '0.75rem' } }
              }}
            />

            <TextField
              fullWidth
              label="Delivery Notes (Optional)"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              multiline
              rows={2}
              size="small"
              placeholder="E.g., Driver name, estimated delivery time, special instructions..."
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2 },
                '& .MuiFormHelperText-root': { fontSize: { xs: '0.65rem', sm: '0.75rem' } }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{
          p: { xs: 2, sm: 3 },
          pt: 0,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 }
        }}>
          <Button
            onClick={() => setOpenTrackingDialog(false)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleShippingUpdate}
            disabled={!trackingNumber.trim() || !deliveryService}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Update & Mark as Shipping
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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