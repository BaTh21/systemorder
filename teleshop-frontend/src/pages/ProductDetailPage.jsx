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
} from '@mui/material';
import { ShoppingCart } from '@mui/icons-material';
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
    let price = parseFloat(product.base_price);
    if (selectedVariant) {
      const variant = product.variants.find(v => v.id === selectedVariant);
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
    <Container sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box
            component="img"
            src={product.images?.[selectedImage]?.image_url || 'https://via.placeholder.com/500x500?text=Product'}
            alt={product.name}
            sx={{ width: '100%', borderRadius: 2, mb: 2 }}
          />
          {product.images && product.images.length > 1 && (
            <Grid container spacing={1}>
              {product.images.map((image, index) => (
                <Grid item xs={3} key={image.id}>
                  <Box
                    component="img"
                    src={image.image_url}
                    alt={`${product.name} ${index + 1}`}
                    onClick={() => setSelectedImage(index)}
                    sx={{
                      width: '100%',
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: selectedImage === index ? '2px solid #1976d2' : '2px solid transparent',
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h4" gutterBottom>
            {product.name}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h5" color="primary">
              ${getPrice()}
            </Typography>
            {product.discount_percent > 0 && (
              <>
                <Typography variant="h6" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                  ${product.base_price}
                </Typography>
                <Chip label={`-${product.discount_percent}% OFF`} color="error" />
              </>
            )}
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {product.description}
          </Typography>

          {product.variants && product.variants.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Variants
              </Typography>
              <RadioGroup
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(parseInt(e.target.value))}
              >
                {product.variants.map((variant) => (
                  <FormControlLabel
                    key={variant.id}
                    value={variant.id}
                    control={<Radio />}
                    label={`${variant.name} ${variant.price_modifier > 0 ? `(+$${variant.price_modifier})` : ''} - Stock: ${variant.stock}`}
                  />
                ))}
              </RadioGroup>
            </Box>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Stock: {product.stock}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Supplier: {product.supplier}
            </Typography>
            {product.category && (
              <Typography variant="body2" color="text.secondary">
                Category: {product.category.name}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField
              type="number"
              label="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1 }}
              sx={{ width: 100 }}
            />
            <Button
              variant="contained"
              size="large"
              startIcon={<ShoppingCart />}
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              sx={{ flexGrow: 1 }}
            >
              Add to Cart
            </Button>
          </Box>

          {product.stock === 0 && (
            <Alert severity="warning">This product is currently out of stock.</Alert>
          )}
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProductDetailPage;