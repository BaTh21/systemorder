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
        py: { xs: 5, sm: 7, md: 10 },
        px: { xs: 2, sm: 3 },
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -50,
          right: -50,
          width: { xs: 150, sm: 250, md: 400 },
          height: { xs: 150, sm: 250, md: 400 },
          borderRadius: '50%',
          bgcolor: 'rgba(37, 99, 235, 0.1)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -40,
          left: -40,
          width: { xs: 100, sm: 150, md: 300 },
          height: { xs: 100, sm: 150, md: 300 },
          borderRadius: '50%',
          bgcolor: 'rgba(245, 158, 11, 0.08)',
        },
      }}>
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            fontWeight={800}
            mb={1.5}
            sx={{ fontSize: { xs: '1.3rem', sm: '1.8rem', md: '2.5rem' } }}
          >
            Discover Amazing Products
          </Typography>
          <Typography
            sx={{
              opacity: 0.7,
              mb: { xs: 2.5, md: 4 },
              fontWeight: 400,
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1.1rem' },
              maxWidth: 500,
              mx: 'auto',
              lineHeight: 1.5,
            }}
          >
            Shop from thousands of products at the best prices. Fast delivery guaranteed.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="center"
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/products')}
              sx={{
                bgcolor: '#f59e0b',
                color: '#0f172a',
                fontWeight: 700,
                px: { xs: 3, md: 4 },
                py: { xs: 1.2, md: 1.4 },
                borderRadius: 2,
                fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
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
                px: { xs: 3, md: 4 },
                py: { xs: 1.2, md: 1.4 },
                borderRadius: 2,
                fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <LocalOffer sx={{ mr: 0.8, fontSize: { xs: 16, md: 20 } }} />
              Best Deals
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Trust Strip */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e2e8f0', py: { xs: 1.5, sm: 2.5 } }}>
        <Container>
          <Grid container spacing={1} justifyContent="center">
            {[
              { icon: <Star sx={{ color: '#f59e0b', fontSize: { xs: 16, sm: 20 } }} />, text: 'Quality' },
              { icon: <TrendingUp sx={{ color: '#22c55e', fontSize: { xs: 16, sm: 20 } }} />, text: 'Best Prices' },
              { icon: <LocalOffer sx={{ color: '#3b82f6', fontSize: { xs: 16, sm: 20 } }} />, text: 'Daily Deals' },
              { icon: <Star sx={{ color: '#ec4899', fontSize: { xs: 16, sm: 20 } }} />, text: 'Fast Ship' },
            ].map((feature, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="center">
                  {feature.icon}
                  <Typography variant="body2" fontWeight={600} color="#475569" sx={{ fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
                    {feature.text}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Featured Products */}
      <Container sx={{ py: { xs: 3, sm: 5, md: 7 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={{ xs: 2, sm: 3, md: 4 }}
        >
          <Box>
            <Typography fontWeight={700} color="#0f172a" sx={{ fontSize: { xs: '1rem', sm: '1.3rem', md: '1.8rem' } }}>
              Featured Products
            </Typography>
            <Typography variant="body2" color="#94a3b8" mt={0.3} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
              Handpicked just for you
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/products"
            endIcon={<ArrowForward sx={{ fontSize: { xs: 14, sm: 18 } }} />}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#2563eb', fontSize: { xs: '0.7rem', sm: '0.85rem' } }}
          >
            View All
          </Button>
        </Stack>

        <Grid container spacing={{ xs: 1, sm: 2, md: 2.5 }}>
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
                    borderRadius: { xs: 1.5, sm: 2, md: 3 },
                    transition: 'all 0.25s',
                    overflow: 'hidden',
                    position: 'relative',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 6px 20px rgba(0,0,0,0.1)' },
                  }}
                >
                  {/* Discount Badge */}
                  {product.discount_percent > 0 && (
                    <Chip
                      label={`-${product.discount_percent}%`}
                      color="error"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: { xs: 4, sm: 6 },
                        left: { xs: 4, sm: 6 },
                        zIndex: 2,
                        fontWeight: 700,
                        fontSize: { xs: '0.55rem', sm: '0.65rem' },
                        height: { xs: 18, sm: 22 },
                      }}
                    />
                  )}

                  {/* Image */}
                  <Box sx={{
                    height: { xs: 110, sm: 140, md: 180 },
                    bgcolor: '#f1f5f9',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <img
                      src={imageUrl || 'https://via.placeholder.com/400x200?text=Product'}
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                      }}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x200/f1f5f9/94a3b8?text=Product';
                      }}
                    />
                  </Box>

                  {/* Content */}
                  <CardContent sx={{
                    p: { xs: 1, sm: 1.5, md: 2 },
                    '&:last-child': { pb: { xs: 1, sm: 1.5, md: 2 } }
                  }}>
                    <Typography
                      fontWeight={600}
                      noWrap
                      color="#0f172a"
                      mb={0.3}
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' } }}
                    >
                      {product.name}
                    </Typography>

                    <Stack direction="row" spacing={0.8} alignItems="baseline">
                      <Typography fontWeight={700} color="#059669" sx={{ fontSize: { xs: '0.75rem', sm: '0.9rem', md: '1.1rem' } }}>
                        ${discountedPrice || parseFloat(product.base_price).toFixed(2)}
                      </Typography>
                      {discountedPrice && (
                        <Typography sx={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: { xs: '0.55rem', sm: '0.65rem', md: '0.75rem' } }}>
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
          <Box textAlign="center" py={{ xs: 3, md: 6 }}>
            <Typography color="#94a3b8" sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }}>
              Loading products...
            </Typography>
          </Box>
        )}
      </Container>

      {/* CTA Banner */}
      <Box sx={{
        bgcolor: '#0f172a',
        color: 'white',
        py: { xs: 4, sm: 5, md: 7 },
        px: { xs: 2, sm: 3 },
        textAlign: 'center'
      }}>
        <Container maxWidth="sm">
          <Typography fontWeight={700} mb={1} sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem', md: '1.8rem' } }}>
            Ready to Start Shopping?
          </Typography>
          <Typography sx={{ opacity: 0.7, mb: { xs: 2.5, md: 3.5 }, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' }, maxWidth: 450, mx: 'auto' }}>
            Join thousands of happy customers. Sign up today and get 10% off your first order!
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              component={RouterLink}
              to="/register"
              sx={{
                bgcolor: '#f59e0b', color: '#0f172a', fontWeight: 700,
                px: { xs: 3, md: 4 }, py: { xs: 1.2, md: 1.4 }, borderRadius: 2,
                fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                width: { xs: '100%', sm: 'auto' },
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
                px: { xs: 3, md: 4 }, py: { xs: 1.2, md: 1.4 }, borderRadius: 2,
                fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                width: { xs: '100%', sm: 'auto' },
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