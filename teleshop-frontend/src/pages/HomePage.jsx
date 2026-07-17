// src/pages/HomePage.jsx
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  LocalOffer,
  Star,
  TrendingUp,
  ArrowForward,
} from '@mui/icons-material';

const HomePage = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await api.get('/products', { params: { limit: 8 } });
      setFeaturedProducts(response.data.items || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  return (
    <Box sx={{ bgcolor: '#fafafa' }}>
      
      {/* Hero Section */}
      <Box sx={{ 
        bgcolor: '#0f172a', 
        color: 'white', 
        py: { xs: 6, sm: 8, md: 12 },
        px: { xs: 1, sm: 2, md: 3 },
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -100,
          right: -100,
          width: { xs: 200, md: 400 },
          height: { xs: 200, md: 400 },
          borderRadius: '50%',
          bgcolor: 'rgba(37, 99, 235, 0.15)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          bgcolor: 'rgba(245, 158, 11, 0.1)',
        },
      }}>
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography 
            variant="h2" 
            fontWeight={800} 
            mb={2}
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem', lg: '3.2rem' } }}
          >
            Discover Amazing Products
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ opacity: 0.7, mb: { xs: 3, md: 5 }, fontWeight: 400, fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' } }}
          >
            Shop from thousands of products at the best prices. Fast delivery guaranteed.
          </Typography>
          
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            justifyContent="center" 
            flexWrap="wrap"
            sx={{ width: { xs: '100%', sm: '80%', md: 'auto' }, mx: 'auto' }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/products')}
              sx={{ 
                bgcolor: '#f59e0b', 
                color: '#0f172a',
                fontWeight: 700,
                px: { xs: 3, md: 5 },
                py: { xs: 1.2, md: 1.5 },
                borderRadius: 2,
                fontSize: { xs: '0.85rem', md: '1rem' },
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { bgcolor: '#eab308' }
              }}
            >
              Shop Now
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/products?sort=price_asc')}
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255,255,255,0.4)',
                fontWeight: 600,
                px: { xs: 3, md: 5 },
                py: { xs: 1.2, md: 1.5 },
                borderRadius: 2,
                fontSize: { xs: '0.85rem', md: '1rem' },
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <LocalOffer sx={{ mr: 1 }} />
              Best Deals
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Trust Strip */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e2e8f0', py: { xs: 2, sm: 3 } }}>
        <Container>
          <Grid container spacing={2} justifyContent="center">
            {[
              { icon: <Star sx={{ color: '#f59e0b' }} />, text: 'Quality Products' },
              { icon: <TrendingUp sx={{ color: '#22c55e' }} />, text: 'Best Prices' },
              { icon: <LocalOffer sx={{ color: '#3b82f6' }} />, text: 'Daily Deals' },
              { icon: <Star sx={{ color: '#ec4899' }} />, text: 'Fast Shipping' },
            ].map((feature, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  {feature.icon}
                  <Typography variant="body2" fontWeight={600} color="#475569" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' } }}>
                    {feature.text}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Featured Products */}
      <Container sx={{ py: { xs: 4, sm: 6, md: 8 } }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }} 
          mb={{ xs: 2, md: 4 }}
          spacing={1}
        >
          <Box>
            <Typography variant="h4" fontWeight={700} color="#0f172a" sx={{ fontSize: { xs: '1.3rem', sm: '1.8rem', md: '2.125rem' } }}>
              Featured Products
            </Typography>
            <Typography variant="body2" color="#94a3b8" mt={0.5} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Handpicked just for you
            </Typography>
          </Box>
          <Button 
            component={RouterLink} 
            to="/products"
            endIcon={<ArrowForward />}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#2563eb', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            View All
          </Button>
        </Stack>

        <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
          {featuredProducts.map((product) => {
            const imageUrl = product.images?.[0]?.image_url;
            const discountedPrice = product.discount_percent > 0
              ? (parseFloat(product.base_price) * (1 - product.discount_percent / 100)).toFixed(2)
              : null;

            return (
              <Grid item xs={6} sm={4} md={3} key={product.id}>
                <Card
                  component={RouterLink}
                  to={`/products/${product.slug}`}
                  sx={{
                    textDecoration: 'none',
                    height: '100%',
                    borderRadius: 3,
                    transition: 'all 0.25s',
                    overflow: 'hidden',
                    position: 'relative',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 25px rgba(0,0,0,0.12)' },
                  }}
                >
                  {product.discount_percent > 0 && (
                    <Chip 
                      label={`-${product.discount_percent}%`} 
                      color="error" 
                      size="small"
                      sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2, fontWeight: 700, fontSize: { xs: '0.6rem', sm: '0.7rem' } }} 
                    />
                  )}

                  <Box sx={{ height: { xs: 120, sm: 160, md: 180 }, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                    <img
                      src={imageUrl || 'https://via.placeholder.com/400x200?text=Product'}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200/f1f5f9/94a3b8?text=Product'; }}
                    />
                  </Box>

                  <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                    <Typography variant="subtitle2" fontWeight={600} noWrap color="#0f172a" mb={0.5} sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                      {product.name}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} alignItems="baseline">
                      <Typography variant="h6" fontWeight={700} color="#059669" sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.25rem' } }}>
                        ${discountedPrice || parseFloat(product.base_price).toFixed(2)}
                      </Typography>
                      {discountedPrice && (
                        <Typography variant="body2" color="#94a3b8" sx={{ textDecoration: 'line-through', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                          ${product.base_price}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {featuredProducts.length === 0 && (
          <Box textAlign="center" py={6}>
            <Typography variant="body1" color="#94a3b8" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
              Loading products...
            </Typography>
          </Box>
        )}
      </Container>

      {/* CTA Banner */}
      <Box sx={{ bgcolor: '#0f172a', color: 'white', py: { xs: 5, sm: 6, md: 8 }, px: { xs: 1, sm: 2, md: 3 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Typography variant="h4" fontWeight={700} mb={1} sx={{ fontSize: { xs: '1.3rem', sm: '1.8rem', md: '2.125rem' } }}>
            Ready to Start Shopping?
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.7, mb: { xs: 3, md: 4 }, fontSize: { xs: '0.85rem', sm: '1rem' } }}>
            Join thousands of happy customers. Sign up today and get 10% off your first order!
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ width: { xs: '100%', sm: '80%', md: 'auto' }, mx: 'auto' }}>
            <Button
              variant="contained"
              size="large"
              component={RouterLink}
              to="/register"
              sx={{ 
                bgcolor: '#f59e0b', color: '#0f172a', fontWeight: 700,
                px: { xs: 3, md: 5 }, py: { xs: 1.2, md: 1.5 }, borderRadius: 2,
                fontSize: { xs: '0.85rem', md: '1rem' },
                '&:hover': { bgcolor: '#eab308' }
              }}
            >
              Create Free Account
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={RouterLink}
              to="/products"
              sx={{ 
                color: 'white', borderColor: 'rgba(255,255,255,0.4)', fontWeight: 600,
                px: { xs: 3, md: 5 }, py: { xs: 1.2, md: 1.5 }, borderRadius: 2,
                fontSize: { xs: '0.85rem', md: '1rem' },
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              Browse Products
            </Button>
          </Stack>
        </Container>
      </Box>

    </Box>
  );
};

export default HomePage;