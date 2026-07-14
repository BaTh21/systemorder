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

const ProductCard = ({ product, variant = 'grid' }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Get primary image URL directly
  const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0];
  const imageUrl = primaryImage?.image_url || null;

  // Calculate discounted price
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

  // ========== LIST VARIANT ==========
  if (variant === 'list') {
    return (
      <Card
        sx={{
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
  }

  // ========== GRID VARIANT (Default) ==========
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 0.3s ease',
        '&:hover': { boxShadow: 6, transform: 'translateY(-4px)' },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <Box 
        sx={{ 
          position: 'relative', 
          cursor: 'pointer', 
          overflow: 'hidden',
          height: 220,
        }} 
        onClick={handleViewDetails}
      >
        <ImageWithFallback
          src={imageUrl}
          alt={product.name}
          height={220}
          sx={{
            transition: 'transform 0.3s ease',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          }}
        />

        {/* Hover Actions */}
        {isHovered && !isOutOfStock && (
          <Box sx={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 1, bgcolor: 'rgba(255,255,255,0.95)',
            borderRadius: 2, p: 0.5, boxShadow: 2, zIndex: 1,
          }}>
            <Tooltip title="Add to Cart">
              <IconButton size="small" color="primary" onClick={handleAddToCart}>
                <ShoppingCart />
              </IconButton>
            </Tooltip>
            <Tooltip title="Quick View">
              <IconButton size="small" color="primary" onClick={handleViewDetails}>
                <Visibility />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
              <IconButton size="small" color={isFavorite ? 'error' : 'default'} onClick={handleToggleFavorite}>
                {isFavorite ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Discount Badge */}
        {product.discount_percent > 0 && (
          <Chip
            icon={<LocalOffer />}
            label={`-${product.discount_percent}%`}
            color="error"
            size="small"
            sx={{ position: 'absolute', top: 10, left: 10, fontWeight: 'bold', zIndex: 1 }}
          />
        )}

        {/* Low Stock Badge */}
        {product.stock <= 5 && product.stock > 0 && (
          <Chip
            label={`Only ${product.stock} left`}
            color="warning"
            size="small"
            sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
          />
        )}

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
          }}>
            <Chip label="Out of Stock" color="error" size="medium" sx={{ fontWeight: 'bold' }} />
          </Box>
        )}
      </Box>

      {/* Content */}
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography
          variant="subtitle1"
          gutterBottom
          noWrap
          sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { color: 'primary.main' } }}
          onClick={handleViewDetails}
        >
          {product.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2, display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40,
          }}
        >
          {product.description || 'No description available'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
          {discountedPrice ? (
            <>
              <Typography variant="h6" color="primary" fontWeight="bold">${discountedPrice}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                ${product.base_price}
              </Typography>
            </>
          ) : (
            <Typography variant="h6" color="primary" fontWeight="bold">${product.base_price}</Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Rating value={4} readOnly size="small" />
          <Typography variant="caption" color="text.secondary">(24)</Typography>
        </Box>
        {product.category && (
          <Chip
            label={typeof product.category === 'object' ? product.category.name : 'Unknown'}
            size="small"
            variant="outlined"
            sx={{ mt: 1, fontSize: '0.7rem' }}
          />
        )}
      </CardContent>

      {/* Add to Cart Button */}
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<ShoppingCart />}
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProductCard;