// src/components/products/ProductGrid.jsx
import {
  Box,
  Typography,
  Pagination,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { FilterList } from '@mui/icons-material';
import ProductCard from './ProductCard';

const ProductGrid = ({
  products = [],
  loading = false,
  error = null,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  totalProducts = 0,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: { xs: 4, md: 8 } }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: { xs: 2, md: 4 } }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Box>
    );
  }

  if (products.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: { xs: 4, md: 8 } }}>
        <FilterList sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
        <Typography variant="h6" color="#94a3b8" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
          No products found
        </Typography>
        <Typography variant="body2" color="#cbd5e1" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          Try adjusting your search or filter criteria
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Products List */}
      <Stack spacing={{ xs: 1, sm: 1.5 }}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </Stack>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 3, md: 4 } }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(event, page) => onPageChange?.(page)}
            color="primary"
            size="small"
            showFirstButton
            showLastButton
            siblingCount={0}
            boundaryCount={1}
            sx={{
              '& .MuiPaginationItem-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default ProductGrid;