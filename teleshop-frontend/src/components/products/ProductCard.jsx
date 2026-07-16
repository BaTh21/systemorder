// src/components/products/ProductCard.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Rating,
} from '@mui/material';
import {
  ShoppingCart,
  Favorite,
  FavoriteBorder,
  Visibility,
  LocalOffer,
} from '@mui/icons-material';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import ImageWithFallback from '../common/ImageWithFallback';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);

  const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0];
  const imageUrl = primaryImage?.image_url || null;

  const discountedPrice = product.discount_percent > 0
    ? (parseFloat(product.base_price) * (1 - product.discount_percent / 100)).toFixed(2)
    : null;

  const isOutOfStock = product.stock === 0;

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await addToCart(product.id);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleViewDetails = () => {
    navigate(`/products/${product.slug}`);
  };

  return (
    <Card
      sx={{
        width: '100%',
        display: 'flex',
        mb: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 6,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        sx={{
          width: 250,
          minHeight: 200,
          position: 'relative',
          cursor: 'pointer',
        }}
        onClick={handleViewDetails}
      >
        <ImageWithFallback
          src={imageUrl}
          alt={product.name}
          height="100%"
          objectFit="cover"
        />
        {product.discount_percent > 0 && (
          <Chip
            icon={<LocalOffer />}
            label={`-${product.discount_percent}%`}
            color="error"
            size="small"
            sx={{ position: 'absolute', top: 10, left: 10 }}
          />
        )}
        {isOutOfStock && (
          <Chip
            label="Out of Stock"
            color="default"
            size="small"
            sx={{ position: 'absolute', top: 10, right: 10 }}
          />
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 2 }}>
        <CardContent sx={{ flex: '1 0 auto', pb: 1 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
            onClick={handleViewDetails}
          >
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {product.description?.substring(0, 150)}
            {product.description?.length > 150 ? '...' : ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {discountedPrice ? (
              <>
                <Typography variant="h6" color="primary">${discountedPrice}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                  ${product.base_price}
                </Typography>
              </>
            ) : (
              <Typography variant="h6" color="primary">${product.base_price}</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating value={4} readOnly size="small" />
            <Typography variant="body2" color="text.secondary">(24 reviews)</Typography>
          </Box>
          {product.supplier && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              By: {product.supplier}
            </Typography>
          )}
        </CardContent>
        <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
          <Button size="small" variant="outlined" startIcon={<Visibility />} onClick={handleViewDetails}>
            Details
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
              <IconButton onClick={handleToggleFavorite} color={isFavorite ? 'error' : 'default'}>
                {isFavorite ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              variant="contained"
              startIcon={<ShoppingCart />}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              Add to Cart
            </Button>
          </Box>
        </CardActions>
      </Box>
    </Card>
  );
};

export default ProductCard;