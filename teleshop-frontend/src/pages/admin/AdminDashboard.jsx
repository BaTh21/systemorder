import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  ShoppingCart,
  AttachMoney,
  People,
  Inventory,
} from '@mui/icons-material';
import api from '../../api/axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Total Orders',
      value: stats?.total_orders || 0,
      icon: <ShoppingCart sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      link: '/admin/orders',
    },
    {
      title: 'Total Revenue',
      value: `$${stats?.total_revenue || 0}`,
      icon: <AttachMoney sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      link: '/admin/orders',
    },
    {
      title: 'Products',
      value: stats?.total_products || 0,
      icon: <Inventory sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
      link: '/admin/products',
    },
    {
      title: 'Customers',
      value: stats?.total_customers || 0,
      icon: <People sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      link: '/admin/customers',
    },
  ];

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Grid container spacing={3}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card
              component={RouterLink}
              to={stat.link}
              sx={{
                textDecoration: 'none',
                height: '100%',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
            >
              <CardContent>
                <Box sx={{ color: stat.color, mb: 1 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h4" gutterBottom>
                  {stat.value}
                </Typography>
                <Typography color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default AdminDashboard;