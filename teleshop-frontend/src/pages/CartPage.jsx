// src/pages/CartPage.jsx
import {
  Container,
  Typography,
  Grid,
  Box,
  Button,
  IconButton,
  TextField,
  Divider,
  Stack,
  Paper,
  Avatar,
  Chip,
} from '@mui/material';
import { Delete, Add, Remove, ShoppingCart, LocationOn } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const CartPage = () => {
  const { cartItems, updateCartItem, removeCartItem, totalPrice } = useCart();

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    updateCartItem(itemId, newQuantity);
  };

  if (cartItems.length === 0) {
    return (
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="sm" sx={{ textAlign: 'center', py: 8 }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <ShoppingCart sx={{ fontSize: 36, color: '#94a3b8' }} />
          </Box>
          <Typography variant="h5" fontWeight={700} color="#0f172a" gutterBottom>
            Your cart is empty
          </Typography>
          <Typography variant="body2" color="#94a3b8" mb={4}>
            Add some products to get started!
          </Typography>
          <Button variant="contained" component={RouterLink} to="/products"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 4, py: 1.2, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
            Browse Products
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="lg">

        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight={800} color="#0f172a" gutterBottom>
              Shopping Cart
            </Typography>
            <Typography variant="body2" color="#94a3b8">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your cart
            </Typography>
          </Box>
          <Button component={RouterLink} to="/products" sx={{ textTransform: 'none', fontWeight: 500 }}>
            ← Continue Shopping
          </Button>
        </Stack>

        <Grid container spacing={3}>

          {/* Cart Items */}
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              {cartItems.map((item) => (
                <Paper
                  key={item.id}
                  elevation={0}
                  sx={{
                    p: { xs: 1.5, sm: 2.5 },
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    bgcolor: 'white',
                    transition: 'all 0.2s',
                    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    {/* Product Image */}
                    <Avatar
                      variant="rounded"
                      src={item.product_image || ''}
                      alt={item.product_name}
                      sx={{ width: 80, height: 80, bgcolor: '#f1f5f9', flexShrink: 0 }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    >
                      {!item.product_image && <ShoppingCart sx={{ color: '#94a3b8' }} />}
                    </Avatar>

                    {/* Product Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={600} color="#0f172a" noWrap>
                        {item.product_name}
                      </Typography>
                      <Typography variant="body2" color="#94a3b8" sx={{ fontSize: '0.8rem' }}>
                        ${Number(item.unit_price || 0).toFixed(2)} each
                      </Typography>

                      {/* Quantity Controls */}
                      <Stack direction="row" alignItems="center" spacing={0.5} mt={1.5}>
                        <IconButton size="small" onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, width: 32, height: 32 }}>
                          <Remove fontSize="small" />
                        </IconButton>
                        <TextField
                          size="small"
                          value={item.quantity}
                          sx={{ width: 55, '& .MuiOutlinedInput-root': { borderRadius: 1.5 }, '& input': { textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', py: 0.5 } }}
                          inputProps={{ min: 1 }}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                        />
                        <IconButton size="small" onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, width: 32, height: 32 }}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>

                    {/* Price */}
                    <Stack alignItems="flex-end" spacing={1} sx={{ flexShrink: 0 }}>
                      <Typography variant="h6" fontWeight={700} color="#059669" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        ${Number(item.total_price || 0).toFixed(2)}
                      </Typography>
                      <IconButton color="error" onClick={() => removeCartItem(item.id)} size="small"
                        sx={{ border: '1px solid #fee2e2', borderRadius: 1.5, '&:hover': { bgcolor: '#fef2f2' } }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Grid>

          {/* Order Summary */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white', position: 'sticky', top: 80 }}>
              <Typography variant="h6" fontWeight={700} color="#0f172a" gutterBottom>
                Order Summary
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2.5}>
                {/* Subtotal */}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="#64748b">
                    Subtotal ({cartItems.length} items)
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a">
                    ${totalPrice.toFixed(2)}
                  </Typography>
                </Stack>

                {/* Shipping - Location Based */}
                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                    <LocationOn sx={{ color: '#2563eb', fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={600} color="#0f172a">
                      Shipping Fee
                    </Typography>
                  </Stack>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="#64748b">🏙️ Phnom Penh</Typography>
                      <Chip label="$2.00" size="small" color="success" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="#64748b">🏡 Province</Typography>
                      <Chip label="$3.00" size="small" color="primary" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="#94a3b8" mt={1} display="block">
                    Select location at checkout
                  </Typography>
                </Box>

                <Divider />

                {/* Total */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={700} color="#0f172a" fontSize="1rem">
                      Estimated Total
                    </Typography>
                    <Typography variant="caption" color="#94a3b8">
                      + shipping fee at checkout
                    </Typography>
                  </Box>
                  <Typography fontWeight={800} color="#059669" fontSize="1.3rem">
                    ${totalPrice.toFixed(2)}
                  </Typography>
                </Stack>

                {/* Checkout Button */}
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  component={RouterLink}
                  to="/checkout"
                  sx={{
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 700,
                    py: 1.5,
                    fontSize: '1rem',
                    bgcolor: '#2563eb',
                    boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                    '&:hover': { bgcolor: '#1d4ed8', boxShadow: '0 8px 25px rgba(37, 99, 235, 0.5)', transform: 'translateY(-1px)' },
                    transition: 'all 0.2s',
                  }}
                >
                  Proceed to Checkout
                </Button>

                {/* Secure Checkout Note */}
                <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                  <ShoppingCart sx={{ fontSize: 14, color: '#94a3b8' }} />
                  <Typography variant="caption" color="#94a3b8">
                    Secure checkout • No hidden fees
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default CartPage;