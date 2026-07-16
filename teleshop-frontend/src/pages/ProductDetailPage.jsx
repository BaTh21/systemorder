// src/pages/ProductDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Alert,
  Snackbar,
  Breadcrumbs,
  Link,
  Stack,
  Divider,
  Paper,
  IconButton,
} from '@mui/material';
import {
  ShoppingCart,
  ArrowBack,
  NavigateNext,
  Favorite,
  FavoriteBorder,
  Share,
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${slug}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await addToCart(product.id, selectedVariant, quantity);
      setSnackbar({ open: true, message: 'Added to cart!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to add to cart', severity: 'error' });
    }
  };

  const getPrice = () => {
    if (!product) return '0.00';
    let price = parseFloat(product.base_price);
    if (selectedVariant) {
      const variant = product.variants?.find(v => v.id === selectedVariant);
      if (variant) price += parseFloat(variant.price_modifier);
    }
    if (product.discount_percent > 0) {
      price = price * (1 - product.discount_percent / 100);
    }
    return price.toFixed(2);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!product) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5">Product not found</Typography>
        <Button variant="contained" onClick={() => navigate('/products')} sx={{ mt: 2 }}>
          Back to Products
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        
        {/* Back Button & Breadcrumbs */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ textTransform: 'none', fontWeight: 500, color: '#475569' }}
          >
            Back
          </Button>
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link 
              component="button" 
              onClick={() => navigate('/')}
              underline="hover" 
              color="inherit"
              sx={{ fontSize: '0.85rem' }}
            >
              Home
            </Link>
            <Link 
              component="button" 
              onClick={() => navigate('/products')}
              underline="hover" 
              color="inherit"
              sx={{ fontSize: '0.85rem' }}
            >
              Products
            </Link>
            {product.category && (
              <Link 
                component="button" 
                onClick={() => navigate(`/products?category_id=${product.category.id}`)}
                underline="hover" 
                color="inherit"
                sx={{ fontSize: '0.85rem' }}
              >
                {product.category.name}
              </Link>
            )}
            <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.85rem' }}>
              {product.name}
            </Typography>
          </Breadcrumbs>
        </Stack>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Grid container spacing={4}>
            
            {/* Left - Images */}
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src={product.images?.[selectedImage]?.image_url || 'https://via.placeholder.com/500x500?text=Product'}
                  alt={product.name}
                  sx={{ 
                    width: '100%', 
                    borderRadius: 2, 
                    mb: 2,
                    bgcolor: '#f1f5f9',
                    aspectRatio: '1/1',
                    objectFit: 'cover',
                  }}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/500x500?text=Product'; }}
                />
                
                {/* Favorite Button */}
                <IconButton 
                  onClick={() => setIsFavorite(!isFavorite)}
                  sx={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12,
                    bgcolor: 'white',
                    boxShadow: 2,
                    '&:hover': { bgcolor: 'white' },
                  }}
                >
                  {isFavorite ? <Favorite color="error" /> : <FavoriteBorder />}
                </IconButton>
              </Box>
              
              {product.images && product.images.length > 1 && (
                <Grid container spacing={1}>
                  {product.images.map((image, index) => (
                    <Grid item xs={3} key={image.id}>
                      <Box
                        component="img"
                        src={image.image_url}
                        alt={`${product.name} ${index + 1}`}
                        onClick={() => setSelectedImage(index)}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=N/A'; }}
                        sx={{
                          width: '100%',
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          border: selectedImage === index ? '2px solid #2563eb' : '2px solid #e2e8f0',
                          '&:hover': { borderColor: '#2563eb' },
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>

            {/* Right - Product Info */}
            <Grid item xs={12} md={6}>
              <Box>
                {/* Product Name */}
                <Typography variant="h4" fontWeight={700} color="#0f172a" gutterBottom>
                  {product.name}
                </Typography>
                
                {/* Price */}
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2 }}>
                  <Typography variant="h4" color="#059669" fontWeight={700}>
                    ${getPrice()}
                  </Typography>
                  {product.discount_percent > 0 && (
                    <>
                      <Typography variant="h6" color="#94a3b8" sx={{ textDecoration: 'line-through' }}>
                        ${product.base_price}
                      </Typography>
                      <Chip 
                        label={`-${product.discount_percent}% OFF`} 
                        color="error" 
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Description */}
                <Typography variant="body1" color="#475569" sx={{ mb: 3, lineHeight: 1.7 }}>
                  {product.description || 'No description available'}
                </Typography>

                {/* Variants */}
                {product.variants && product.variants.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#0f172a" gutterBottom>
                      Available Options
                    </Typography>
                    <RadioGroup
                      value={selectedVariant}
                      onChange={(e) => setSelectedVariant(parseInt(e.target.value))}
                    >
                      {product.variants.map((variant) => (
                        <FormControlLabel
                          key={variant.id}
                          value={variant.id}
                          control={<Radio size="small" />}
                          label={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2">{variant.name}</Typography>
                              {variant.price_modifier > 0 && (
                                <Chip label={`+$${variant.price_modifier}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                (Stock: {variant.stock})
                              </Typography>
                            </Stack>
                          }
                        />
                      ))}
                    </RadioGroup>
                  </Box>
                )}

                {/* Product Details */}
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="#94a3b8">Stock</Typography>
                      <Typography variant="body2" fontWeight={600} color={product.stock > 0 ? '#059669' : '#ef4444'}>
                        {product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="#94a3b8">Supplier</Typography>
                      <Typography variant="body2" fontWeight={500}>{product.supplier || 'N/A'}</Typography>
                    </Stack>
                    {product.category && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="#94a3b8">Category</Typography>
                        <Chip 
                          label={product.category.name} 
                          size="small" 
                          variant="outlined" 
                          onClick={() => navigate(`/products?category_id=${product.category.id}`)}
                          sx={{ cursor: 'pointer', height: 24, fontSize: '0.7rem' }}
                        />
                      </Stack>
                    )}
                  </Stack>
                </Box>

                {/* Add to Cart */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    inputProps={{ min: 1 }}
                    size="small"
                    sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<ShoppingCart />}
                    onClick={handleAddToCart}
                    disabled={product.stock === 0}
                    sx={{ 
                      flexGrow: 1, 
                      borderRadius: 2, 
                      textTransform: 'none', 
                      fontWeight: 600,
                      py: 1.2,
                    }}
                  >
                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                  <IconButton 
                    sx={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 2,
                      '&:hover': { bgcolor: '#f1f5f9' },
                    }}
                  >
                    <Share fontSize="small" />
                  </IconButton>
                </Box>

                {product.stock === 0 && (
                  <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                    This product is currently out of stock. Check back later!
                  </Alert>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled" 
          sx={{ borderRadius: 2 }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductDetailPage;