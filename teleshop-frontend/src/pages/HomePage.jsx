// src/pages/HomePage.jsx
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api/axios';

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchFeaturedProducts();
    fetchCategories();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await api.get('/products', { params: { limit: 8 } });
      setFeaturedProducts(response.data.items || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      console.log('📁 Categories from API:', response.data);
      setCategories(response.data.slice(0, 4));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 12,
          textAlign: 'center',
        }}
      >
        <Container>
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Welcome to TeleShop
          </Typography>
          <Typography variant="h5" sx={{ mb: 4 }}>
            Discover amazing products at great prices
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            component={RouterLink}
            to="/products"
            sx={{ mr: 2 }}
          >
            Shop Now
          </Button>
        </Container>
      </Box>

      {/* Categories Section */}
      <Container sx={{ py: 8 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
          Shop by Category
        </Typography>
        <Grid container spacing={3}>
          {categories.map((category) => (
            <Grid item xs={12} sm={6} md={3} key={category.id}>
              <Card
                component={RouterLink}
                to={`/products?category_id=${category.id}`}
                sx={{ 
                  textDecoration: 'none', 
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)' }
                }}
              >
                {/* Direct img tag - most reliable */}
                <Box sx={{ height: 200, overflow: 'hidden', bgcolor: '#f0f0f0' }}>
                  <img
                    src={category.image_url || 'https://via.placeholder.com/400x200?text=No+Image'}
                    alt={category.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onLoad={() => console.log('✅ Loaded:', category.name, category.image_url)}
                    onError={(e) => {
                      console.log('❌ Failed:', category.name, category.image_url);
                      e.target.src = `https://via.placeholder.com/400x200/EEE/999?text=${encodeURIComponent(category.name)}`;
                    }}
                  />
                </Box>
                <CardContent>
                  <Typography variant="h6" align="center">
                    {category.name}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Featured Products Section */}
      <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
        <Container>
          <Typography variant="h4" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
            Featured Products
          </Typography>
          <Grid container spacing={3}>
            {featuredProducts.map((product) => {
              const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0];
              const imageUrl = primaryImage?.image_url;
              
              return (
                <Grid item xs={12} sm={6} md={3} key={product.id}>
                  <Card
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-4px)' }
                    }}
                  >
                    {/* Product Image */}
                    <Box sx={{ height: 200, overflow: 'hidden', bgcolor: '#f0f0f0' }}>
                      <img
                        src={imageUrl || 'https://via.placeholder.com/400x200?text=No+Image'}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        onLoad={() => console.log('✅ Product loaded:', product.name)}
                        onError={(e) => {
                          console.log('❌ Product failed:', product.name, imageUrl);
                          e.target.src = 'https://via.placeholder.com/400x200/EEE/999?text=No+Image';
                        }}
                      />
                    </Box>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {product.name}
                      </Typography>
                      <Typography variant="h6" color="primary">
                        ${product.base_price}
                      </Typography>
                      <Button
                        variant="contained"
                        fullWidth
                        component={RouterLink}
                        to={`/products/${product.slug}`}
                        sx={{ mt: 1 }}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;