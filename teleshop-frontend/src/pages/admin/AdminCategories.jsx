// src/pages/admin/AdminCategories.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Stack,
  IconButton,
  Chip,
  CircularProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Tooltip,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Grid,
  Pagination,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ArrowBack,
  CloudUpload,
  Refresh,
  Search,
  Close,
  Image as ImageIcon,
} from '@mui/icons-material';
import api from '../../api/axios';
import { getImageUrl } from '../../utils/imageHelper';
import ResponsiveTable from '../../components/ResponsiveTable';

const AdminCategories = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [allCategories, setAllCategories] = useState([]); // ✅ All categories from API
  const [categories, setCategories] = useState([]); // ✅ Paginated categories
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, category: null });
  const [formData, setFormData] = useState({ name: '', parent_id: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // ✅ Pagination state - 5 items per page (Client-side)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 5;

  // ✅ Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ✅ Fetch all categories once
  useEffect(() => {
    fetchAllCategories();
  }, []);

  // ✅ Apply pagination and search filter when data changes
  useEffect(() => {
    applyPagination();
  }, [page, debouncedSearch, allCategories]);

  const fetchAllCategories = async () => {
    setLoading(true);
    try {
      console.log('📦 Fetching all categories...');
      const response = await api.get('/categories');
      
      let categoriesData = [];
      if (Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (response.data?.items) {
        categoriesData = response.data.items;
      } else {
        categoriesData = [];
      }
      
      console.log('✅ Categories fetched:', categoriesData.length);
      setAllCategories(categoriesData);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      setSnackbar({ open: true, message: 'Failed to load categories', severity: 'error' });
      setAllCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Apply pagination and search filter
  const applyPagination = () => {
    let filtered = [...allCategories];
    
    // Apply search filter
    if (debouncedSearch) {
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        cat.slug.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    
    setTotalCategories(filtered.length);
    setTotalPages(Math.ceil(filtered.length / limit) || 1);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = filtered.slice(startIndex, endIndex);
    setCategories(paginated);
    
    console.log('📊 Paginated:', paginated.length, 'of', filtered.length);
  };

  const handleClearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleOpenCreate = () => {
    setDialog({ open: true, category: null });
    setFormData({ name: '', parent_id: '' });
    setImage(null);
    setImagePreview('');
  };

  const handleOpenEdit = (category) => {
    setDialog({ open: true, category });
    setFormData({
      name: category.name || '',
      parent_id: category.parent_id || '',
    });
    setImage(null);
    setImagePreview(category.image_url || '');
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: 'Category name is required', severity: 'error' });
      return;
    }

    setSaving(true);
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name.trim());
    if (formData.parent_id) {
      formDataToSend.append('parent_id', formData.parent_id);
    }
    if (image) {
      formDataToSend.append('image', image);
    }

    try {
      if (dialog.category) {
        await api.put(`/admin/categories/${dialog.category.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSnackbar({ open: true, message: 'Category updated!', severity: 'success' });
      } else {
        await api.post('/admin/categories', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSnackbar({ open: true, message: 'Category created!', severity: 'success' });
      }
      setDialog({ open: false, category: null });
      fetchAllCategories(); // ✅ Refresh all categories
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to save category';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/admin/categories/${deleteConfirm}`);
      setSnackbar({ open: true, message: 'Category deleted', severity: 'success' });
      fetchAllCategories(); // ✅ Refresh all categories
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete category', severity: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ✅ Main categories for dropdown
  const mainCategories = allCategories.filter(c => !c.parent_id);

  // Columns for ResponsiveTable
  const columns = [
    {
      key: 'image_url',
      label: 'Image',
      render: (value) => (
        <Avatar 
          variant="rounded" 
          src={getImageUrl(value)} 
          sx={{ 
            width: { xs: 32, sm: 40, md: 48 }, 
            height: { xs: 32, sm: 40, md: 48 }, 
            bgcolor: '#f1f5f9' 
          }}
        >
          <ImageIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
        </Avatar>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (value, row) => (
        <Box>
          <Typography fontWeight={600} fontSize={{ xs: '0.8rem', sm: '0.9rem' }}>
            {value}
          </Typography>
          {!row.parent_id && (
            <Chip 
              label="Main" 
              size="small" 
              color="primary" 
              variant="outlined" 
              sx={{ mt: 0.3, height: { xs: 16, sm: 20 }, fontSize: { xs: '0.5rem', sm: '0.6rem' } }} 
            />
          )}
        </Box>
      ),
    },
    {
      key: 'slug',
      label: 'Slug',
      render: (value) => (
        <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize={{ xs: '0.65rem', sm: '0.75rem' }}>
          {value}
        </Typography>
      ),
    },
    {
      key: 'parent_id',
      label: 'Parent',
      render: (value) => {
        const parent = allCategories.find(c => c.id === value);
        return parent ? (
          <Chip 
            label={parent.name} 
            size="small" 
            variant="outlined"
            sx={{ fontSize: { xs: '0.55rem', sm: '0.65rem' }, height: { xs: 18, sm: 22 } }}
          />
        ) : (
          <Chip 
            label="None" 
            size="small" 
            variant="outlined"
            sx={{ fontSize: { xs: '0.55rem', sm: '0.65rem' }, height: { xs: 18, sm: 22 } }}
          />
        );
      },
    },
  ];

  // Actions for each row
  const rowActions = (row) => (
    <>
      <Tooltip title="Edit">
        <IconButton 
          size="small" 
          onClick={() => handleOpenEdit(row)} 
          color="primary"
          sx={{ p: { xs: 0.5, sm: 1 } }}
        >
          <Edit fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton 
          size="small" 
          onClick={() => setDeleteConfirm(row.id)} 
          color="error"
          sx={{ p: { xs: 0.5, sm: 1 } }}
        >
          <Delete fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );

  // Mobile Card View
  const MobileCategoryCard = ({ category }) => {
    const parent = allCategories.find(c => c.id === category.parent_id);
    
    return (
      <Card sx={{ mb: 1.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar 
                variant="rounded" 
                src={getImageUrl(category.image_url)} 
                sx={{ width: 48, height: 48, bgcolor: '#f1f5f9' }}
              >
                <ImageIcon />
              </Avatar>
              <Box flex={1}>
                <Typography fontWeight={600} fontSize="0.85rem">
                  {category.name}
                </Typography>
                {!category.parent_id && (
                  <Chip 
                    label="Main Category" 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                    sx={{ mt: 0.3, height: 18, fontSize: '0.55rem' }}
                  />
                )}
              </Box>
            </Stack>

            <Divider />

            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="#94a3b8" display="block">Slug</Typography>
                <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize="0.7rem">
                  {category.slug}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="#94a3b8" display="block">Parent</Typography>
                {parent ? (
                  <Chip 
                    label={parent.name} 
                    size="small" 
                    variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 20 }}
                  />
                ) : (
                  <Chip 
                    label="None" 
                    size="small" 
                    variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 20 }}
                  />
                )}
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1, borderTop: '1px solid #e2e8f0' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Edit sx={{ fontSize: 16 }} />}
                onClick={() => handleOpenEdit(category)}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.7rem', py: 0.5, px: 1.5 }}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Delete sx={{ fontSize: 16 }} />}
                onClick={() => setDeleteConfirm(category.id)}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.7rem', py: 0.5, px: 1.5 }}
              >
                Delete
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 3, md: 4 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/admin')} 
          sx={{ 
            mb: 2, 
            textTransform: 'none',
            fontSize: { xs: '0.75rem', sm: '0.85rem' }
          }}
        >
          Back to Dashboard
        </Button>

        {/* Header */}
        <Paper elevation={0} sx={{ 
          p: { xs: 1.5, sm: 2, md: 3 }, 
          mb: { xs: 2, sm: 3 }, 
          borderRadius: { xs: 2, sm: 3 }, 
          border: '1px solid #e2e8f0', 
          bgcolor: 'white' 
        }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h5" fontWeight={700} color="#0f172a" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' } }}>
                Categories
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                {totalCategories} total categories
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <TextField
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{
                  flex: { xs: 1, sm: 'none' },
                  minWidth: { xs: 'auto', sm: 160, md: 200 },
                  maxWidth: { xs: '100%', sm: 200 },
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                  '& .MuiInputBase-input': { fontSize: { xs: '0.7rem', sm: '0.8rem' } }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#94a3b8', fontSize: { xs: 16, sm: 20 } }} />
                    </InputAdornment>
                  ),
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={handleClearSearch}>
                        <Close fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Button 
                startIcon={<Refresh />} 
                onClick={fetchAllCategories} 
                size="small" 
                sx={{ 
                  borderRadius: 2, 
                  textTransform: 'none',
                  fontSize: { xs: '0.7rem', sm: '0.8rem' }
                }}
              >
                Refresh
              </Button>
              
              <Button 
                variant="contained" 
                startIcon={isMobile ? null : <Add />}
                onClick={handleOpenCreate} 
                sx={{ 
                  borderRadius: 2, 
                  textTransform: 'none',
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.6, sm: 1 },
                  minWidth: { xs: 40, sm: 'auto' },
                  height: { xs: 40, sm: 'auto' },
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {isMobile ? <Add sx={{ fontSize: 20 }} /> : 'Add Category'}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Categories */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : categories.length === 0 ? (
          <Paper elevation={0} sx={{ 
            borderRadius: { xs: 2, sm: 3 }, 
            border: '1px solid #e2e8f0', 
            bgcolor: 'white', 
            p: 6, 
            textAlign: 'center' 
          }}>
            <ImageIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
            <Typography variant="h6" color="#94a3b8">
              {search ? 'No categories match your search' : 'No categories found'}
            </Typography>
          </Paper>
        ) : isMobile ? (
          <Box>
            {categories.map((category) => (
              <MobileCategoryCard key={category.id} category={category} />
            ))}
          </Box>
        ) : (
          <Paper elevation={0} sx={{ 
            borderRadius: { xs: 2, sm: 3 }, 
            border: '1px solid #e2e8f0', 
            bgcolor: 'white', 
            overflow: 'hidden' 
          }}>
            <ResponsiveTable
              columns={columns}
              data={categories}
              actions={rowActions}
              emptyMessage="No categories found"
            />
          </Paper>
        )}

        {/* ✅ Pagination - Shows when more than 1 page */}
        {totalPages > 1 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            py: 2, 
            mt: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            borderTop: '1px solid #e2e8f0',
            bgcolor: 'white',
            borderRadius: 2,
            px: 2,
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              Showing {totalCategories === 0 ? 0 : ((page - 1) * limit) + 1} to {Math.min(page * limit, totalCategories)} of {totalCategories} categories
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, p) => setPage(p)}
              color="primary"
              showFirstButton
              showLastButton
              size={isMobile ? 'small' : 'medium'}
            />
          </Box>
        )}
      </Container>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialog.open} 
        onClose={() => setDialog({ open: false, category: null })} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: { xs: 2, sm: 3 },
            margin: { xs: 1, sm: 2 },
          } 
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 700, 
          fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' }
        }}>
          {dialog.category ? 'Edit Category' : 'Add Category'}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField 
              label="Category Name" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              fullWidth 
              size="small"
              required
              autoFocus
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>Parent Category</InputLabel>
              <Select
                value={formData.parent_id}
                label="Parent Category"
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">None (Main Category)</MenuItem>
                {mainCategories
                  .filter(c => !dialog.category || c.id !== dialog.category.id)
                  .map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Image Upload */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom fontSize={{ xs: '0.8rem', sm: '0.9rem' }}>
                Category Image
              </Typography>
              {imagePreview && (
                <Box sx={{ mb: 1, position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ 
                      width: 150, 
                      height: 100, 
                      objectFit: 'cover', 
                      borderRadius: 8,
                      border: '1px solid #e2e8f0'
                    }} 
                  />
                </Box>
              )}
              <Button 
                variant="outlined" 
                component="label" 
                startIcon={<CloudUpload />} 
                fullWidth
                sx={{ 
                  borderRadius: 2, 
                  textTransform: 'none',
                  fontSize: { xs: '0.7rem', sm: '0.8rem' }
                }}
              >
                {image ? image.name : 'Upload Image'}
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 2, sm: 3 }, 
          pt: 0, 
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: { xs: 1, sm: 0 } 
        }}>
          <Button 
            onClick={() => setDialog({ open: false, category: null })} 
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none',
              width: { xs: '100%', sm: 'auto' },
              fontSize: { xs: '0.75rem', sm: '0.85rem' }
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={!formData.name.trim() || saving}
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none', 
              fontWeight: 600,
              width: { xs: '100%', sm: 'auto' },
              fontSize: { xs: '0.75rem', sm: '0.85rem' }
            }}
          >
            {saving ? <CircularProgress size={20} /> : dialog.category ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog 
        open={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ sx: { borderRadius: { xs: 2, sm: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this category?</Typography>
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
          <Button 
            onClick={() => setDeleteConfirm(null)} 
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none',
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDelete}
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none',
              fontWeight: 600,
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminCategories;