// src/pages/HomePage.jsx - Fully Responsive
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  Chip, Stack, useMediaQuery, useTheme,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  LocalOffer, Star, ArrowForward,
  ShoppingBag, LocalShipping, VerifiedUser, CreditCard,
} from '@mui/icons-material';

const HomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await api.get('/products', { params: { limit: 6 } });
      setFeaturedProducts(response.data.items || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  return (
    <Box sx={{ bgcolor: '#ffffff' }}>

      {/* Hero Section */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1a365d 100%)',
        color: 'white',
        py: { xs: 5, sm: 7, md: 10, lg: 12 },
        px: { xs: 2, sm: 3 },
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -100, right: -100, width: { xs: 250, md: 500 }, height: { xs: 250, md: 500 }, borderRadius: '50%', bgcolor: 'rgba(37, 99, 235, 0.08)' }} />
        <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: { xs: 150, md: 300 }, height: { xs: 150, md: 300 }, borderRadius: '50%', bgcolor: 'rgba(245, 158, 11, 0.06)' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Chip
            label={isMobile ? "🔥 New Arrivals" : "🔥 New Arrivals Daily"}
            size="small"
            sx={{ 
              mb: 2, 
              bgcolor: 'rgba(245,158,11,0.2)', 
              color: '#fbbf24', 
              border: '1px solid rgba(245,158,11,0.3)', 
              fontWeight: 600,
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              height: { xs: 22, sm: 24 },
            }}
          />
          <Typography fontWeight={800} mb={1.5} sx={{ 
            fontSize: { xs: '1.3rem', sm: '1.8rem', md: '2.5rem', lg: '3.2rem' }, 
            lineHeight: 1.2,
            px: { xs: 0, sm: 2 },
          }}>
            Discover Amazing<br />Products at Best Prices
          </Typography>
          <Typography sx={{ 
            opacity: 0.7, 
            mb: { xs: 2.5, sm: 3, md: 5 }, 
            fontSize: { xs: '0.75rem', sm: '0.9rem', md: '1rem', lg: '1.15rem' }, 
            maxWidth: 500, 
            mx: 'auto', 
            lineHeight: 1.6,
            px: { xs: 1, sm: 2 },
          }}>
            Shop from thousands of quality products with fast delivery across Cambodia.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            <Button variant="contained" size="large" onClick={() => navigate('/products')}
              sx={{ 
                bgcolor: '#f59e0b', color: '#0f172a', fontWeight: 700, 
                px: { xs: 2.5, sm: 3, md: 5 }, py: { xs: 1.2, sm: 1.5 }, 
                borderRadius: 2, 
                fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' }, 
                width: { xs: '100%', sm: 'auto' }, 
                boxShadow: '0 4px 20px rgba(245,158,11,0.4)', 
                '&:hover': { bgcolor: '#eab308' } 
              }}>
              🛍️ Shop Now
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/products?sort=price_asc')}
              sx={{ 
                color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontWeight: 600, 
                px: { xs: 2.5, sm: 3, md: 5 }, py: { xs: 1.2, sm: 1.5 }, 
                borderRadius: 2, 
                fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' }, 
                width: { xs: '100%', sm: 'auto' }, 
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' } 
              }}>
              <LocalOffer sx={{ mr: 0.8, fontSize: { xs: 16, sm: 18 } }} /> Best Deals
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Features Strip */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #f1f5f9', py: { xs: 1.5, sm: 2, md: 3 } }}>
        <Container>
          <Grid container spacing={1.5} justifyContent="center">
            {[
              { icon: <LocalShipping />, title: 'Fast Delivery', desc: 'PP $2, Prov $3' },
              { icon: <VerifiedUser />, title: 'Secure Payment', desc: 'ABA & Bakong' },
              { icon: <Star />, title: 'Quality', desc: '100% Authentic' },
              { icon: <CreditCard />, title: 'Best Prices', desc: 'Price Match' },
            ].map((f, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  <Box sx={{ 
                    color: '#2563eb', bgcolor: '#eff6ff', 
                    p: { xs: 0.6, sm: 0.8, md: 1 }, 
                    borderRadius: 1.5, 
                    display: 'flex',
                    '& svg': { fontSize: { xs: 16, sm: 18, md: 22 } }
                  }}>
                    {f.icon}
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="#0f172a" 
                      fontSize={{ xs: '0.65rem', sm: '0.7rem', md: '0.8rem' }}>
                      {f.title}
                    </Typography>
                    <Typography variant="caption" color="#64748b" 
                      fontSize={{ xs: '0.55rem', sm: '0.6rem', md: '0.7rem' }}>
                      {f.desc}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Featured Products */}
      <Container sx={{ py: { xs: 3, sm: 5, md: 8 }, px: { xs: 1, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" 
          mb={{ xs: 2, sm: 3, md: 4 }}>
          <Box>
            <Typography fontWeight={800} color="#0f172a" 
              sx={{ fontSize: { xs: '1rem', sm: '1.3rem', md: '1.5rem', lg: '2rem' } }}>
              Featured Products
            </Typography>
            {!isMobile && (
              <Typography variant="body2" color="#64748b" mt={0.5} fontSize={{ sm: '0.75rem', md: '0.85rem' }}>
                Handpicked just for you
              </Typography>
            )}
          </Box>
          <Button component={RouterLink} to="/products" endIcon={<ArrowForward />}
            sx={{ 
              textTransform: 'none', fontWeight: 600, color: '#2563eb', 
              fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.85rem' },
              '&:hover': { textDecoration: 'underline' } 
            }}>
            View All
          </Button>
        </Stack>

        <Grid container spacing={{ xs: 1, sm: 1.5, md: 2.5, lg: 3 }}>
          {featuredProducts.map((product) => {
            const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0];
            const imageUrl = primaryImage?.image_url || null;
            const discountedPrice = product.discount_percent > 0
              ? (parseFloat(product.base_price) * (1 - product.discount_percent / 100)).toFixed(2)
              : null;

            return (
              <Grid item xs={6} sm={4} md={4} key={product.id}>
                <Card
                  component={RouterLink}
                  to={`/products/${product.slug}`}
                  sx={{
                    textDecoration: 'none', height: '100%', 
                    borderRadius: { xs: 1.5, sm: 2, md: 3 },
                    transition: 'all 0.3s', overflow: 'hidden', position: 'relative',
                    bgcolor: 'white', border: '1px solid #f1f5f9',
                    '&:hover': {
                      transform: 'translateY(-6px)', 
                      boxShadow: '0 12px 30px rgba(0,0,0,0.1)', 
                      borderColor: '#e2e8f0',
                      '& .product-image': { transform: 'scale(1.08)' }
                    },
                  }}>
                  
                  {/* Discount Badge */}
                  {product.discount_percent > 0 && (
                    <Chip label={`-${product.discount_percent}%`} color="error" size="small"
                      sx={{ 
                        position: 'absolute', top: { xs: 6, sm: 10, md: 12 }, 
                        left: { xs: 6, sm: 10, md: 12 }, zIndex: 2, 
                        fontWeight: 700, fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' }, 
                        height: { xs: 18, sm: 22, md: 24 }, 
                        boxShadow: '0 2px 8px rgba(239,68,68,0.3)' 
                      }} />
                  )}

                  {/* Image */}
                  <Box sx={{ 
                    height: { xs: 130, sm: 160, md: 200, lg: 240 }, 
                    bgcolor: '#f8fafc', overflow: 'hidden', 
                    position: 'relative', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center' 
                  }}>
                    {imageUrl ? (
                      <Box component="img" src={imageUrl} alt={product.name} className="product-image"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <Box sx={{ textAlign: 'center', color: '#cbd5e1' }}>
                        <ShoppingBag sx={{ fontSize: { xs: 28, sm: 32, md: 40 }, mb: 0.5 }} />
                        <Typography variant="caption" color="#94a3b8" fontSize={{ xs: '0.6rem', sm: '0.7rem' }}>
                          No Image
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Content */}
                  <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}>
                    {product.category && !isMobile && (
                      <Typography variant="caption" color="#2563eb" fontWeight={600} 
                        textTransform="uppercase" letterSpacing={0.5} fontSize="0.6rem">
                        {typeof product.category === 'object' ? product.category.name : ''}
                      </Typography>
                    )}

                    <Typography fontWeight={600} noWrap color="#0f172a" 
                      mt={isMobile ? 0 : 0.3} mb={0.3}
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem', lg: '0.95rem' } }}>
                      {product.name}
                    </Typography>

                    <Stack direction="row" spacing={0.8} alignItems="baseline">
                      <Typography fontWeight={700} color="#059669" 
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.9rem', md: '1rem', lg: '1.15rem' } }}>
                        ${discountedPrice || parseFloat(product.base_price).toFixed(2)}
                      </Typography>
                      {discountedPrice && (
                        <Typography sx={{ 
                          textDecoration: 'line-through', color: '#94a3b8', 
                          fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' } 
                        }}>
                          ${product.base_price}
                        </Typography>
                      )}
                    </Stack>

                    {/* Only show supplier on tablet+ */}
                    {!isMobile && (
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.3}>
                        {product.supplier && (
                          <Typography variant="caption" color="#94a3b8" fontSize="0.6rem">{product.supplier}</Typography>
                        )}
                        <Chip
                          label={product.stock > 0 ? 'In Stock' : 'Out'}
                          size="small"
                          sx={{
                            height: 16, fontSize: '0.55rem', fontWeight: 600,
                            bgcolor: product.stock > 0 ? '#f0fdf4' : '#fef2f2',
                            color: product.stock > 0 ? '#15803d' : '#dc2626',
                          }}
                        />
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {featuredProducts.length === 0 && (
          <Box textAlign="center" py={{ xs: 4, md: 8 }}>
            <ShoppingBag sx={{ fontSize: { xs: 32, md: 48 }, color: '#cbd5e1', mb: 1 }} />
            <Typography color="#94a3b8" fontSize={{ xs: '0.8rem', md: '1rem' }}>
              No featured products yet
            </Typography>
          </Box>
        )}
      </Container>

      {/* CTA */}
      <Box sx={{ 
        bgcolor: '#0f172a', color: 'white', 
        py: { xs: 4, sm: 5, md: 7, lg: 9 }, 
        px: { xs: 2, sm: 3 },
        textAlign: 'center', position: 'relative', overflow: 'hidden' 
      }}>
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: { xs: 150, md: 300 }, height: { xs: 150, md: 300 }, borderRadius: '50%', bgcolor: 'rgba(37,99,235,0.1)' }} />
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography fontWeight={800} mb={1} 
            sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem', md: '1.6rem', lg: '2rem' } }}>
            Ready to Start Shopping?
          </Typography>
          <Typography sx={{ 
            opacity: 0.7, mb: { xs: 2, sm: 3, md: 4 }, 
            fontSize: { xs: '0.75rem', sm: '0.85rem', md: '1rem' }, 
            maxWidth: 450, mx: 'auto' 
          }}>
            Join thousands of happy customers. Sign up today!
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            <Button variant="contained" size="large" component={RouterLink} to="/register"
              sx={{ 
                bgcolor: '#f59e0b', color: '#0f172a', fontWeight: 700, 
                px: { xs: 2.5, sm: 3, md: 5 }, py: { xs: 1.2, md: 1.5 }, 
                borderRadius: 2, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' }, 
                width: { xs: '100%', sm: 'auto' }, 
                boxShadow: '0 4px 20px rgba(245,158,11,0.4)', 
                '&:hover': { bgcolor: '#eab308' } 
              }}>
              Create Free Account
            </Button>
            <Button variant="outlined" size="large" component={RouterLink} to="/products"
              sx={{ 
                color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontWeight: 600, 
                px: { xs: 2.5, sm: 3, md: 5 }, py: { xs: 1.2, md: 1.5 }, 
                borderRadius: 2, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' }, 
                width: { xs: '100%', sm: 'auto' }, 
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' } 
              }}>
              Browse Products
            </Button>
          </Stack>
        </Container>
      </Box>

    </Box>
  );
};

export default HomePage;