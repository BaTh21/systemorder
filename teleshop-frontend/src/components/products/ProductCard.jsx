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
  useMediaQuery,
  useTheme,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isFavorite, setIsFavorite] = useState(false);

  const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0];
  const imageUrl = primaryImage?.image_url || null;

  const discountedPrice = product.discount_percent > 0
    ? (parseFloat(product.base_price) * (1 - product.discount_percent / 100)).toFixed(2)
    : null;

  const isOutOfStock = product.stock === 0;

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try { await addToCart(product.id); } catch (error) { console.error('Error:', error); }
  };

  const handleToggleFavorite = (e) => { e.stopPropagation(); setIsFavorite(!isFavorite); };
  const handleViewDetails = () => { navigate(`/products/${product.slug}`); };

  const truncateText = (text, maxLength = 120) => {
    if (!text) return 'No description available';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <Card
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        mb: 2,
        transition: 'all 0.3s ease',
        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
      }}
    >
      {/* Image Section */}
      <Box
        sx={{
          width: { xs: '100%', sm: 200, md: 250 },
          height: { xs: 200, sm: 'auto' },
          minHeight: { xs: 180, sm: 180, md: 200 },
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
          overflow: 'hidden',
        }}
        onClick={handleViewDetails}
      >
        <ImageWithFallback
          src={imageUrl}
          alt={product.name}
          width="100%"
          height="100%"
          objectFit="cover"
        />
        {product.discount_percent > 0 && (
          <Chip icon={<LocalOffer />} label={`-${product.discount_percent}%`} color="error" size="small"
            sx={{ position: 'absolute', top: 8, left: 8, fontSize: '0.7rem', zIndex: 1 }} />
        )}
        {isOutOfStock && (
          <Chip label="Out of Stock" size="small"
            sx={{ position: 'absolute', top: 8, right: 8, fontSize: '0.7rem', zIndex: 1 }} />
        )}
      </Box>

      {/* Content Section - Always visible */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
        <CardContent sx={{ flex: '1 0 auto', pb: { xs: 0.5, sm: 1 }, px: { xs: 0.5, sm: 1 }, '&:last-child': { pb: { xs: 0.5, sm: 1 } } }}>
          
          {/* Product Name */}
          <Typography
            variant="h6"
            component="div"
            onClick={handleViewDetails}
            sx={{ 
              cursor: 'pointer', 
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
              fontWeight: 600,
              mb: 0.5,
              '&:hover': { color: 'primary.main' },
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.name}
          </Typography>

          {/* Description - Hidden on small mobile, shown on larger */}
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 1.5, 
              fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {truncateText(product.description, isMobile ? 60 : 150)}
          </Typography>

          {/* Price */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            {discountedPrice ? (
              <>
                <Typography variant="h6" color="primary" sx={{ fontSize: { xs: '0.85rem', sm: '1rem', md: '1.15rem' }, fontWeight: 700 }}>
                  ${discountedPrice}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  ${product.base_price}
                </Typography>
              </>
            ) : (
              <Typography variant="h6" color="primary" sx={{ fontSize: { xs: '0.85rem', sm: '1rem', md: '1.15rem' }, fontWeight: 700 }}>
                ${parseFloat(product.base_price).toFixed(2)}
              </Typography>
            )}
          </Box>

          {/* Rating & Supplier */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Rating value={4} readOnly size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.85rem' } }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
              (24)
            </Typography>
            {product.supplier && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                By: {product.supplier}
              </Typography>
            )}
          </Box>

          {/* Category */}
          {product.category && (
            <Chip 
              label={typeof product.category === 'object' ? product.category.name : 'Unknown'}
              size="small" 
              variant="outlined" 
              sx={{ mt: 1, fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: 22 }} 
            />
          )}
        </CardContent>

        {/* Action Buttons */}
        <CardActions sx={{ 
          justifyContent: 'space-between', 
          px: { xs: 0.5, sm: 1 }, 
          pt: 0,
          flexWrap: 'wrap', 
          gap: 0.5 
        }}>
          <Button 
            size="small" 
            variant="outlined" 
            startIcon={<Visibility sx={{ fontSize: { xs: 16, sm: 18 } }} />} 
            onClick={handleViewDetails}
            sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, px: { xs: 1, sm: 1.5 }, textTransform: 'none' }}
          >
            Details
          </Button>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
              <IconButton size="small" onClick={handleToggleFavorite} color={isFavorite ? 'error' : 'default'}
                sx={{ p: { xs: 0.5, sm: 0.75 } }}>
                {isFavorite ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              variant="contained"
              startIcon={!isMobile && <ShoppingCart sx={{ fontSize: { xs: 16, sm: 18 } }} />}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, px: { xs: 1, sm: 1.5 }, textTransform: 'none' }}
            >
              {isOutOfStock ? 'Out' : 'Cart'}
            </Button>
          </Box>
        </CardActions>
      </Box>
    </Card>
  );
};

export default ProductCard;