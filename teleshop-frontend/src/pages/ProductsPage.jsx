// src/pages/ProductsPage.jsx - Update the product rendering part
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  MenuItem,
  Drawer,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import { FilterList } from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import ProductGrid from '../components/products/ProductGrid';
import api from '../api/axios';

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category_id: searchParams.get('category_id') || '',
    min_price: '',
    max_price: '',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, sortBy, filters]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 12,
        sort: sortBy,
        ...filters,
      };
      // Remove empty params
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      
      const response = await api.get('/products', { params });
      console.log('📦 Products response:', response.data);
      console.log('📸 First product images:', response.data.items?.[0]?.images);
      
      setProducts(response.data.items || []);
      setTotalPages(Math.ceil((response.data.total || 0) / (response.data.limit || 12)));
      setTotalProducts(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again.');
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

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setPage(1);
  };

  const handleApplyFilters = () => {
    setPage(1);
    setDrawerOpen(false);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      category_id: '',
      min_price: '',
      max_price: '',
    });
    setPage(1);
    setDrawerOpen(false);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Products
          </Typography>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setDrawerOpen(true)}
          >
            Filters
            {(filters.search || filters.category_id || filters.min_price || filters.max_price) && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  bgcolor: 'primary.main',
                  color: 'white',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                }}
              >
                {Object.values(filters).filter(v => v !== '' && v !== null).length}
              </Box>
            )}
          </Button>
        </Box>
        
        {/* Active Filters */}
        {Object.values(filters).some(v => v !== '' && v !== null) && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            {filters.search && (
              <Chip label={`Search: ${filters.search}`} onDelete={() => setFilters({ ...filters, search: '' })} />
            )}
            {filters.category_id && (
              <Chip
                label={`Category: ${categories.find(c => c.id === parseInt(filters.category_id))?.name || filters.category_id}`}
                onDelete={() => setFilters({ ...filters, category_id: '' })}
              />
            )}
            {filters.min_price && (
              <Chip label={`Min: $${filters.min_price}`} onDelete={() => setFilters({ ...filters, min_price: '' })} />
            )}
            {filters.max_price && (
              <Chip label={`Max: $${filters.max_price}`} onDelete={() => setFilters({ ...filters, max_price: '' })} />
            )}
          </Box>
        )}
      </Box>

      {/* Product Grid */}
      <ProductGrid
        products={products}
        loading={loading}
        error={error}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={handlePageChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        totalProducts={totalProducts}
      />

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 350 }, p: 3 } }}
      >
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Filters
        </Typography>
        
        <TextField
          fullWidth
          label="Search"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          sx={{ mb: 2 }}
        />
        
        <TextField
          select
          fullWidth
          label="Category"
          value={filters.category_id}
          onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
          sx={{ mb: 2 }}
        >
          <MenuItem value="">All Categories</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            type="number"
            label="Min Price"
            value={filters.min_price}
            onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            label="Max Price"
            value={filters.max_price}
            onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleApplyFilters}
          >
            Apply Filters
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleClearFilters}
          >
            Clear All
          </Button>
        </Box>
      </Drawer>

      {/* Snackbar for cart notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProductsPage;