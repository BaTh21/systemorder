// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  CircularProgress,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Stack,
  Button,
} from '@mui/material';
import {
  ShoppingCart,
  AttachMoney,
  People,
  Inventory,
  TrendingUp,
  Refresh,
  Circle,
  Category,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';

const statusColors = {
  pending: 'default', confirmed: 'primary', waiting_payment: 'warning',
  paid: 'info', purchasing: 'info', shipping: 'primary',
  completed: 'success', cancelled: 'error',
};

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [orderPage, setOrderPage] = useState(1);
  const [ordersPerPage] = useState(5);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get('/admin/dashboard/live');
      setDashboardData(response.data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) { console.error('Error:', error); setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchDashboard(), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboard]);

  if (loading && !dashboardData) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress size={48} /></Box>;
  }

  const stats = dashboardData?.stats || {};

  const statCards = [
    { title: 'Total Revenue', value: `$${(stats.total_revenue || 0).toLocaleString()}`, subtitle: `✅ $${(stats.completed_revenue || 0).toLocaleString()} completed | 🔄 $${(stats.active_revenue || 0).toLocaleString()} active`, icon: <AttachMoney sx={{ fontSize: { xs: 24, sm: 40 } }} />, color: '#2e7d32', bgColor: '#e8f5e9', link: '/admin/orders' },
    { title: 'Orders', value: stats.total_orders || 0, subtitle: `✅ ${stats.completed_orders || 0} done | ❌ ${stats.cancelled_orders || 0} cancelled | ⏳ ${stats.pending_orders || 0} pending`, icon: <ShoppingCart sx={{ fontSize: { xs: 24, sm: 40 } }} />, color: '#1976d2', bgColor: '#e3f2fd', link: '/admin/orders' },
    { title: 'Products', value: stats.active_products || 0, subtitle: `⚠️ ${stats.low_stock || 0} low stock | 🚫 ${stats.out_of_stock || 0} out`, icon: <Inventory sx={{ fontSize: { xs: 24, sm: 40 } }} />, color: '#ed6c02', bgColor: '#fff3e0', link: '/admin/products' },
    { title: 'Customers', value: stats.total_customers || 0, subtitle: `+${stats.new_customers_today || 0} today`, icon: <People sx={{ fontSize: { xs: 24, sm: 40 } }} />, color: '#9c27b0', bgColor: '#f3e5f5', link: '/admin/customers' },
    { title: 'Categories', value: stats.total_categories || 0, subtitle: 'Manage categories', icon: <Category sx={{ fontSize: { xs: 24, sm: 40 } }} />, color: '#0891b2', bgColor: '#ecfeff', link: '/admin/categories' },
  ];

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const sortedRecentOrders = [...(dashboardData?.recent_orders || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const totalOrderPages = Math.ceil(sortedRecentOrders.length / ordersPerPage) || 1;
  const paginatedOrders = sortedRecentOrders.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 4 }, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' } }}>
            Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Circle sx={{ fontSize: 8, color: autoRefresh ? 'success.main' : 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              {autoRefresh ? 'Auto-refreshing every 30s' : 'Auto-refresh paused'} · {lastUpdate?.toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'} color={autoRefresh ? 'success' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)} size="small" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }} />
          <IconButton onClick={() => { setLoading(true); fetchDashboard(); }} color="primary" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
        </Box>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, md: 4 } }}>
        {statCards.map((stat) => (
          <Grid item xs={6} sm={4} md={4} lg={2.4} key={stat.title}>
            <Card component={RouterLink} to={stat.link}
              sx={{ textDecoration: 'none', height: '100%', transition: 'all 0.3s', bgcolor: stat.bgColor, '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: stat.color, fontSize: { xs: '1rem', sm: '1.3rem', md: '1.8rem' } }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}>
                      {stat.subtitle}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color, opacity: 0.7 }}>{stat.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, md: 4 } }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' } }}>
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />Revenue (Last 7 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashboardData?.revenue_chart || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#1976d2" radius={[4, 4, 0, 0]} name="All Revenue" />
                  <Bar dataKey="completed" fill="#4caf50" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' } }}>
                🏆 Top Selling Products
              </Typography>
              {(dashboardData?.top_products || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>No sales data yet</Typography>
              ) : (
                (dashboardData?.top_products || []).map((product, index) => (
                  <Box key={index} sx={{ mb: { xs: 1.5, md: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 120, sm: 200 }, fontSize: { xs: '0.7rem', sm: '0.85rem' } }}>{product.name}</Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.7rem', sm: '0.85rem' } }}>${product.revenue?.toLocaleString()}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.max(10, 100 - index * 20)} sx={{ height: { xs: 4, sm: 6 }, borderRadius: 3 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>{product.quantity} units sold</Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders with Pagination */}
      <Card>
        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' }, fontWeight: 600 }}>
              📋 Recent Orders <Chip label="ASC" size="small" color="primary" sx={{ ml: 1, fontSize: { xs: '0.6rem', sm: '0.75rem' } }} />
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Page {orderPage} of {totalOrderPages}
            </Typography>
          </Stack>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Order ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: { xs: 'none', sm: 'table-cell' } }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: { xs: 'none', md: 'table-cell' } }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>No orders yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
                        #{String(order.id).padStart(6, '0')}
                      </TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>{order.customer}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.65rem', sm: '0.8rem' }, display: { xs: 'none', sm: 'table-cell' } }}>
                        ${Number(order.total || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={formatStatus(order.status)} color={statusColors[order.status] || 'default'} size="small" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: { xs: 'none', md: 'table-cell' } }}>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {sortedRecentOrders.length > ordersPerPage && (
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} mt={2}>
              <Button size="small" disabled={orderPage === 1} onClick={() => setOrderPage(orderPage - 1)}
                sx={{ textTransform: 'none', minWidth: 50, fontSize: '0.75rem' }}>
                ← Prev
              </Button>
              {Array.from({ length: totalOrderPages }, (_, i) => i + 1).map((pageNum) => (
                <Chip key={pageNum} label={pageNum} size="small"
                  onClick={() => setOrderPage(pageNum)}
                  color={orderPage === pageNum ? 'primary' : 'default'}
                  variant={orderPage === pageNum ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer', minWidth: 28, height: 24, fontWeight: 600, fontSize: '0.7rem' }} />
              ))}
              <Button size="small" disabled={orderPage === totalOrderPages} onClick={() => setOrderPage(orderPage + 1)}
                sx={{ textTransform: 'none', minWidth: 50, fontSize: '0.75rem' }}>
                Next →
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      {loading && dashboardData && (
        <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
          <Chip icon={<CircularProgress size={16} />} label="Refreshing..." color="primary" variant="outlined" />
        </Box>
      )}
    </Container>
  );
};

export default AdminDashboard;