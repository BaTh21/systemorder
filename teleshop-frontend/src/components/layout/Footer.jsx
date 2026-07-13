// src/components/layout/Footer.jsx
import { Box, Container, Grid, Typography, Link } from '@mui/material';

const Footer = () => {
  return (
    <Box sx={{ bgcolor: 'grey.900', color: 'white', py: 6, mt: 'auto' }}>
      <Container>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              TeleShop
            </Typography>
            <Typography variant="body2" color="grey.400">
              Your one-stop shop for quality products with fast delivery.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Link href="/products" color="grey.400" display="block" sx={{ mb: 1 }}>
              Products
            </Link>
            <Link href="/categories" color="grey.400" display="block" sx={{ mb: 1 }}>
              Categories
            </Link>
            <Link href="/contact" color="grey.400" display="block">
              Contact Us
            </Link>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Contact
            </Typography>
            <Typography variant="body2" color="grey.400">
              Email: support@teleshop.com
            </Typography>
            <Typography variant="body2" color="grey.400">
              Phone: +1 234 567 8900
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Footer;