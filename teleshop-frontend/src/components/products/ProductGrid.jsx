// src/components/products/ProductGrid.jsx
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Sort,
} from '@mui/icons-material';
import ProductCard from './ProductCard';

const ProductGrid = ({
  products = [],
  loading = false,
  error = null,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  sortBy = 'newest',
  onSortChange,
  totalProducts = 0,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (products.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          No products found
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Try adjusting your search or filter criteria
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {totalProducts} product{totalProducts !== 1 ? 's' : ''} found
        </Typography>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => onSortChange?.(e.target.value)}
            startAdornment={<Sort sx={{ mr: 1, color: 'text.secondary' }} />}
          >
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="price_asc">Price: Low to High</MenuItem>
            <MenuItem value="price_desc">Price: High to Low</MenuItem>
            <MenuItem value="name_asc">Name: A to Z</MenuItem>
            <MenuItem value="name_desc">Name: Z to A</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Products List - Full Width */}
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(event, page) => onPageChange?.(page)}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
};

export default ProductGrid;