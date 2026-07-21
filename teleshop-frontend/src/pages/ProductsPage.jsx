// src/pages/ProductsPage.jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Snackbar,
  Alert,
  Chip,
  Stack,
  Slider,
  Divider,
  Paper,
  InputAdornment,
  Grid,
  FormControlLabel,
  Checkbox,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  Drawer,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search,
  ExpandLess,
  ExpandMore,
  Star,
  FilterList,
  Close,
} from '@mui/icons-material';
import ProductGrid from '../components/products/ProductGrid';
import api from '../api/axios';

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category_id: searchParams.get('category_id') || '',
    min_price: '',
    max_price: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, filters]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 12, sort: 'newest', ...filters };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      const response = await api.get('/products', { params });
      setProducts(response.data.items || []);
      setTotalPages(Math.ceil((response.data.total || 0) / 12));
      setTotalProducts(response.data.total || 0);
    } catch (error) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryClick = (categoryId) => {
    setFilters(f => ({ ...f, category_id: f.category_id === categoryId.toString() ? '' : categoryId.toString() }));
    setPage(1);
    if (isMobile) setMobileDrawerOpen(false);
  };

  const handlePriceApply = () => {
    setFilters(f => ({
      ...f,
      min_price: priceRange[0] > 0 ? priceRange[0].toString() : '',
      max_price: priceRange[1] < 5000 ? priceRange[1].toString() : '',
    }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ search: '', category_id: '', min_price: '', max_price: '' });
    setPriceRange([0, 5000]);
    setPage(1);
  };

  const toggleCategory = (slug) => {
    setExpandedCategories(prev => ({ ...prev, [slug]: !prev[slug] }));
  };

  const mainCategories = categories.filter(c => !c.parent_id);
  const activeFilterCount = Object.values(filters).filter(v => v).length;

  const FilterContent = () => (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={700} color="#0f172a">Filters</Typography>
        {activeFilterCount > 0 && (
          <Button size="small" onClick={handleClearFilters} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
            Clear All
          </Button>
        )}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Search */}
      <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} mb={1} display="block">
        Search
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder="Search products..."
        value={filters.search}
        onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment>,
        }}
        sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' } }}
      />

      {/* Categories */}
      <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} mb={1} display="block">
        Categories
      </Typography>
      <List dense disablePadding sx={{ mb: 2.5 }}>
        {mainCategories.map(cat => (
          <Box key={cat.id}>
            <ListItemButton onClick={() => toggleCategory(cat.slug)} sx={{ borderRadius: 1, mb: 0.5, py: 0.5 }}>
              <ListItemText primary={cat.name} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }} />
              {expandedCategories[cat.slug] ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
            </ListItemButton>
            <Collapse in={expandedCategories[cat.slug]}>
              <List dense disablePadding sx={{ pl: 2 }}>
                {categories.filter(sub => sub.parent_id === cat.id).map(sub => (
                  <ListItemButton
                    key={sub.id}
                    onClick={() => handleCategoryClick(sub.id)}
                    sx={{ borderRadius: 1, py: 0.3, bgcolor: filters.category_id === sub.id.toString() ? '#eff6ff' : 'transparent' }}
                  >
                    <ListItemText 
                      primary={sub.name} 
                      primaryTypographyProps={{ 
                        fontSize: '0.8rem', 
                        color: filters.category_id === sub.id.toString() ? '#2563eb' : '#64748b',
                        fontWeight: filters.category_id === sub.id.toString() ? 600 : 400,
                      }} 
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </Box>
        ))}
      </List>

      <Divider sx={{ mb: 2 }} />

      {/* Price Range */}
      <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} mb={1} display="block">
        Price Range
      </Typography>
      <Slider
        value={priceRange}
        onChange={(e, v) => setPriceRange(v)}
        onChangeCommitted={handlePriceApply}
        min={0}
        max={5000}
        step={10}
        size="small"
        sx={{ color: '#2563eb', mb: 1 }}
      />
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="caption" color="#94a3b8">$0</Typography>
        <Typography variant="caption" fontWeight={600} color="#2563eb">${priceRange[0]} - ${priceRange[1]}</Typography>
        <Typography variant="caption" color="#94a3b8">$5000</Typography>
      </Stack>

      {/* Rating */}
      <Divider sx={{ mb: 2 }} />
      <Typography variant="caption" fontWeight={600} color="#94a3b8" textTransform="uppercase" letterSpacing={1} mb={1} display="block">
        Rating
      </Typography>
      {[4, 3, 2, 1].map(rating => (
        <FormControlLabel
          key={rating}
          control={<Checkbox size="small" sx={{ py: 0.3 }} />}
          label={
            <Stack direction="row" spacing={0.5} alignItems="center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} sx={{ fontSize: 14, color: i < rating ? '#f59e0b' : '#e2e8f0' }} />
              ))}
              <Typography variant="caption" color="#64748b">& up</Typography>
            </Stack>
          }
          sx={{ display: 'flex', mb: -0.5 }}
        />
      ))}
    </>
  );

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
        
        {/* Top Bar */}
        <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>

            {isMobile && (
              <Button variant="outlined" size="small" startIcon={<FilterList />} onClick={() => setMobileDrawerOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.8rem' }}>
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
            )}
          </Stack>
        </Paper>

        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
          
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Grid item md={3}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: 'white', position: 'sticky', top: 80 }}>
                <FilterContent />
              </Paper>
            </Grid>
          )}

          {/* Products */}
          <Grid item xs={12} md={isMobile ? 12 : 9}>
            <ProductGrid
              products={products}
              loading={loading}
              error={error}
              totalPages={totalPages}
              currentPage={page}
              onPageChange={handlePageChange}
              totalProducts={totalProducts}
            />
          </Grid>
        </Grid>

        {/* Mobile Filter Drawer */}
        <Drawer anchor="left" open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{ sx: { width: { xs: '100%', sm: 350 }, p: 2.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>Filters</Typography>
            <IconButton onClick={() => setMobileDrawerOpen(false)}><Close /></IconButton>
          </Stack>
          <FilterContent />
        </Drawer>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default ProductsPage;