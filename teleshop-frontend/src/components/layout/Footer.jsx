// src/components/layout/Footer.jsx
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  Stack,
  IconButton,
  Divider,
  TextField,
  Button,
  InputAdornment,
} from '@mui/material';
import {
  Facebook,
  Twitter,
  Instagram,
  YouTube,
  Telegram,
  Email,
  Phone,
  LocationOn,
  ArrowForward,
  Favorite,
  Shield,
  LocalShipping,
  SupportAgent,
} from '@mui/icons-material';

const Footer = () => {
  return (
    <Box sx={{ bgcolor: '#0f172a', color: 'white', pt: 8, pb: 3 }}>
      <Container maxWidth="lg">
        
        <Grid container spacing={5} mb={5}>
          
          {/* About */}
          <Grid item xs={12} sm={6} lg={3}>
            <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: '#f59e0b' }}>
              Tele<span style={{ color: 'white' }}>Shop</span>
            </Typography>
            <Typography variant="body2" color="#94a3b8" mb={3} lineHeight={1.8}>
              Your one-stop shop for quality products with fast delivery. We offer the best prices and excellent customer service.
            </Typography>
            
            <Stack direction="row" spacing={1}>
              {[
                { icon: <Facebook fontSize="small" />, color: '#1877f2' },
                { icon: <Twitter fontSize="small" />, color: '#1da1f2' },
                { icon: <Instagram fontSize="small" />, color: '#e4405f' },
                { icon: <YouTube fontSize="small" />, color: '#ff0000' },
                { icon: <Telegram fontSize="small" />, color: '#0088cc' },
              ].map((social, i) => (
                <IconButton
                  key={i}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                    '&:hover': { bgcolor: social.color, color: 'white' },
                    transition: 'all 0.3s',
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} sm={6} lg={2}>
            <Typography variant="subtitle2" fontWeight={700} mb={2} color="white">
              Quick Links
            </Typography>
            <Stack spacing={1.5}>
              {[
                { label: 'Home', path: '/' },
                { label: 'All Products', path: '/products' },
                { label: 'Best Deals', path: '/products?sort=price_asc' },
                { label: 'New Arrivals', path: '/products?sort=newest' },
              ].map((link) => (
                <Link
                  key={link.label}
                  component={RouterLink}
                  to={link.path}
                  underline="none"
                  sx={{
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    '&:hover': { color: '#f59e0b', pl: 0.5 },
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Customer Service */}
          <Grid item xs={12} sm={6} lg={2}>
            <Typography variant="subtitle2" fontWeight={700} mb={2} color="white">
              Customer Service
            </Typography>
            <Stack spacing={1.5}>
              {[
                { label: 'My Account', path: '/profile' },
                { label: 'My Orders', path: '/orders' },
                { label: 'Track Order', path: '/orders' },
                { label: 'Contact Us', path: '/contact' },
              ].map((link) => (
                <Link
                  key={link.label}
                  component={RouterLink}
                  to={link.path}
                  underline="none"
                  sx={{
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    '&:hover': { color: '#f59e0b', pl: 0.5 },
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Newsletter & Contact */}
          <Grid item xs={12} sm={6} lg={5}>
            <Typography variant="subtitle2" fontWeight={700} mb={2} color="white">
              Subscribe & Save
            </Typography>
            <Typography variant="body2" color="#94a3b8" mb={2}>
              Get 10% off your first order! Subscribe to our newsletter for exclusive deals.
            </Typography>
            
            <Stack direction="row" spacing={0} mb={3}>
              <TextField
                placeholder="Your email address"
                size="small"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px 0 0 8px',
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                    '&:hover fieldset': { borderColor: '#f59e0b' },
                    '& input::placeholder': { color: '#64748b' },
                  },
                }}
              />
              <Button
                variant="contained"
                sx={{
                  bgcolor: '#f59e0b',
                  color: '#0f172a',
                  fontWeight: 700,
                  borderRadius: '0 8px 8px 0',
                  px: 2,
                  '&:hover': { bgcolor: '#eab308' },
                }}
              >
                <ArrowForward />
              </Button>
            </Stack>

            <Stack spacing={1}>
              {[
                { icon: <Email sx={{ fontSize: 16, color: '#f59e0b' }} />, text: 'support@teleshop.com' },
                { icon: <Phone sx={{ fontSize: 16, color: '#f59e0b' }} />, text: '+1 234 567 8900' },
                { icon: <LocationOn sx={{ fontSize: 16, color: '#f59e0b' }} />, text: '123 Commerce St, New York, NY' },
              ].map((item, i) => (
                <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                  {item.icon}
                  <Typography variant="body2" color="#94a3b8">
                    {item.text}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 4 }} />
        <Grid container spacing={2} mb={4} justifyContent="center">
          {[
            { icon: <LocalShipping />, title: 'Free Shipping', desc: 'On orders over $50' },
            { icon: <Shield />, title: 'Secure Payment', desc: '100% protected' },
            { icon: <SupportAgent />, title: '24/7 Support', desc: 'Dedicated support' },
            { icon: <Favorite />, title: 'Satisfaction', desc: '30 days return' },
          ].map((feature, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: '#f59e0b', opacity: 0.8 }}>
                  {feature.icon}
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={600} color="white">
                    {feature.title}
                  </Typography>
                  <Typography variant="caption" color="#64748b">
                    {feature.desc}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems="center"
          spacing={1}
        >
          <Typography variant="body2" color="#64748b">
            © {new Date().getFullYear()} TeleShop. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Link component={RouterLink} to="#" underline="none" sx={{ color: '#64748b', fontSize: '0.8rem', '&:hover': { color: '#f59e0b' } }}>
              Privacy Policy
            </Link>
            <Link component={RouterLink} to="#" underline="none" sx={{ color: '#64748b', fontSize: '0.8rem', '&:hover': { color: '#f59e0b' } }}>
              Terms of Service
            </Link>
            <Link component={RouterLink} to="/contact" underline="none" sx={{ color: '#64748b', fontSize: '0.8rem', '&:hover': { color: '#f59e0b' } }}>
              Contact Us
            </Link>
          </Stack>
        </Stack>

      </Container>
    </Box>
  );
};

export default Footer;