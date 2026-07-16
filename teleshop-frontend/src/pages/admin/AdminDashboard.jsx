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
} from '@mui/material';
import {
  ShoppingCart,
  AttachMoney,
  People,
  Inventory,
  TrendingUp,
  Refresh,
  Circle,
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

// Status colors mapping - DEFINE IT HERE
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

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get('/admin/dashboard/live');
      setDashboardData(response.data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboard();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboard]);

  const handleRefresh = () => {
    setLoading(true);
    fetchDashboard();
  };

  if (loading && !dashboardData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const stats = dashboardData?.stats || {};

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${(stats.total_revenue || 0).toLocaleString()}`,
      subtitle: `✅ $${(stats.completed_revenue || 0).toLocaleString()} completed | 🔄 $${(stats.active_revenue || 0).toLocaleString()} active`,
      icon: <AttachMoney sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      bgColor: '#e8f5e9',
      link: '/admin/orders',
    },
    {
      title: 'Orders',
      value: stats.total_orders || 0,
      subtitle: `✅ ${stats.completed_orders || 0} done | ❌ ${stats.cancelled_orders || 0} cancelled | ⏳ ${stats.pending_orders || 0} pending`,
      icon: <ShoppingCart sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      bgColor: '#e3f2fd',
      link: '/admin/orders',
    },
    {
      title: 'Products',
      value: stats.active_products || 0,
      subtitle: `⚠️ ${stats.low_stock || 0} low stock | 🚫 ${stats.out_of_stock || 0} out of stock`,
      icon: <Inventory sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
      bgColor: '#fff3e0',
      link: '/admin/products',
    },
    {
      title: 'Customers',
      value: stats.total_customers || 0,
      subtitle: `+${stats.new_customers_today || 0} today`,
      icon: <People sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      bgColor: '#f3e5f5',
      link: '/admin/customers',
    },
  ];

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Sort recent orders ASC (oldest first)
  const sortedRecentOrders = [...(dashboardData?.recent_orders || [])].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Circle sx={{ fontSize: 8, color: autoRefresh ? 'success.main' : 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              {autoRefresh ? 'Auto-refreshing every 30s' : 'Auto-refresh paused'} • 
              Last update: {lastUpdate?.toLocaleTimeString() || 'Never'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            color={autoRefresh ? 'success' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="small"
          />
          <IconButton onClick={handleRefresh} color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : <Refresh />}
          </IconButton>
        </Box>
      </Box>

      {/* Stat Cards - NOW CLICKABLE */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card
              component={RouterLink}
              to={stat.link}
              sx={{
                textDecoration: 'none',
                height: '100%',
                transition: 'all 0.3s',
                bgcolor: stat.bgColor,
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: stat.color }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.subtitle}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color, opacity: 0.7 }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                Revenue (Last 7 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData?.revenue_chart || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#1976d2" radius={[4, 4, 0, 0]} name="All Revenue" />
                  <Bar dataKey="completed" fill="#4caf50" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏆 Top Selling Products
              </Typography>
              {(dashboardData?.top_products || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No sales data yet
                </Typography>
              ) : (
                (dashboardData?.top_products || []).map((product, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        ${product.revenue?.toLocaleString()}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(10, 100 - index * 20)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {product.quantity} units sold
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders - ASC */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Recent Orders <Chip label="ASC" size="small" color="primary" sx={{ ml: 1 }} />
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRecentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No orders yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRecentOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace' }}>
                        #{String(order.id).padStart(6, '0')}
                      </TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        ${Number(order.total || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatStatus(order.status)}
                          color={statusColors[order.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {order.created_at 
                          ? new Date(order.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Loading overlay */}
      {loading && dashboardData && (
        <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
          <Chip
            icon={<CircularProgress size={16} />}
            label="Refreshing..."
            color="primary"
            variant="outlined"
          />
        </Box>
      )}
    </Container>
  );
};

export default AdminDashboard;