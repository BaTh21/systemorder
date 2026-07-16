// src/pages/admin/AdminProducts.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Grid,
  Card,
  CardMedia,
  Stack,
  Avatar,
  Tooltip,
  Pagination,
  InputAdornment,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Image as ImageIcon,
  Search,
  Refresh,
  Inventory,
  AttachMoney,
  Category,
  LocalOffer,
  CloudUpload,
  Close,
  ArrowBack,
} from '@mui/icons-material';
import { getImageUrl, getPlaceholderImage } from '../../utils/imageHelper';
import api from '../../api/axios';

const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    stock: '',
    category_id: '',
    supplier: '',
    supplier_url: '',
    discount_percent: '0',
    is_active: true,
  });
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteImageConfirm, setDeleteImageConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/products', {
        params: { page, limit: 20, search: search || undefined }
      });
      setProducts(response.data.items || []);
      setTotalPages(Math.ceil((response.data.total || 0) / 20));
      setTotalProducts(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/admin/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '', description: '', base_price: '', stock: '',
      category_id: '', supplier: '', supplier_url: '', discount_percent: '0', is_active: true,
    });
    setImages([]);
    setVariants([]);
    setTabValue(0);
    setOpenDialog(true);
  };

  const handleOpenEdit = async (productId) => {
    try {
      const response = await api.get(`/admin/products/${productId}`);
      const product = response.data;
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        base_price: product.base_price,
        stock: product.stock,
        category_id: product.category_id,
        supplier: product.supplier,
        supplier_url: product.supplier_url || '',
        discount_percent: product.discount_percent || '0',
        is_active: product.is_active,
      });
      setImages(product.images || []);
      setVariants(product.variants || []);
      setTabValue(0);
      setOpenDialog(true);
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      if (key !== 'images' && key !== 'variants') {
        formDataToSend.append(key, formData[key]);
      }
    });
    formDataToSend.append('variants', JSON.stringify(variants));
    images.forEach((image) => {
      if (image instanceof File) {
        formDataToSend.append('images', image);
      }
    });

    try {
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSnackbar({ open: true, message: 'Product updated successfully!', severity: 'success' });
      } else {
        await api.post('/admin/products', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSnackbar({ open: true, message: 'Product created successfully!', severity: 'success' });
      }
      setOpenDialog(false);
      fetchProducts();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save product', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (productId) => {
    try {
      await api.put(`/admin/products/${productId}/toggle-active`);
      fetchProducts();
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/admin/products/${deleteConfirm}`);
      setSnackbar({ open: true, message: 'Product deleted', severity: 'success' });
      fetchProducts();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete product', severity: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteImage = async () => {
    if (!deleteImageConfirm) return;
    try {
      await api.delete(`/admin/products/images/${deleteImageConfirm.imageId}`);
      setImages(images.filter((_, i) => i !== deleteImageConfirm.index));
      setSnackbar({ open: true, message: 'Image deleted', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete image', severity: 'error' });
    } finally {
      setDeleteImageConfirm(null);
    }
  };

  const handleAddVariant = () => {
    setVariants([...variants, { name: '', price_modifier: 0, stock: 0 }]);
  };

  const handleUpdateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const handleRemoveVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages([...images, ...files]);
  };

  const handleRemoveNewImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const formatPrice = (price) => {
    return `$${parseFloat(price || 0).toFixed(2)}`;
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        
        {/* Header */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/admin')}
              sx={{ textTransform: 'none', fontWeight: 500, color: '#475569' }}
            >
              Back to Dashboard
            </Button>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h5" fontWeight={700} color="#0f172a">
                Products Management
              </Typography>
              <Typography variant="body2" color="#94a3b8" mt={0.5}>
                {totalProducts} total product{totalProducts !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <TextField
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                onKeyPress={(e) => e.key === 'Enter' && fetchProducts()}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8' }} /></InputAdornment>,
                  sx: { borderRadius: 2, fontSize: '0.85rem' },
                }}
                sx={{ width: 220 }}
              />
              <Button onClick={fetchProducts} size="small" sx={{ borderRadius: 2, textTransform: 'none' }}>
                <Refresh fontSize="small" />
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenCreate}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Add Product
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Products Table */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Stock</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Inventory sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="h6" color="#94a3b8">No products found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          {product.images?.[0]?.image_url ? (
                            <Avatar
                              variant="rounded"
                              src={getImageUrl(product.images[0].image_url)}
                              alt={product.name}
                              sx={{ width: 48, height: 48, bgcolor: '#f1f5f9' }}
                              onError={(e) => { e.target.src = getPlaceholderImage(); }}
                            >
                              <ImageIcon />
                            </Avatar>
                          ) : (
                            <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: '#f1f5f9' }}>
                              <ImageIcon sx={{ color: '#94a3b8' }} />
                            </Avatar>
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="#0f172a">
                              {product.name}
                            </Typography>
                            {product.discount_percent > 0 && (
                              <Chip icon={<LocalOffer sx={{ fontSize: 12 }} />} label={`-${product.discount_percent}%`} color="error" size="small" sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip label={product.category?.name || 'N/A'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="#059669">
                          {formatPrice(product.base_price)}
                        </Typography>
                        {product.variants?.length > 0 && (
                          <Typography variant="caption" color="#94a3b8">
                            +{product.variants.length} variants
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<Inventory sx={{ fontSize: 14 }} />}
                          label={product.stock > 0 ? `${product.stock}` : 'Out'}
                          color={product.stock > 10 ? 'success' : product.stock > 0 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={product.is_active}
                          onChange={() => handleToggleActive(product.id)}
                          size="small"
                          color="success"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenEdit(product.id)} color="primary">
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setDeleteConfirm(product.id)} color="error">
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #e2e8f0' }}>
              <Pagination count={totalPages} page={page} onChange={(e, p) => setPage(p)} color="primary" />
            </Box>
          )}
        </Paper>
      </Container>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
          <IconButton onClick={() => setOpenDialog(false)} sx={{ position: 'absolute', right: 16, top: 12 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: '1px solid #e2e8f0' }}>
            <Tab label="Basic Info" />
            <Tab label={`Images (${images.length})`} />
            <Tab label={`Variants (${variants.length})`} />
          </Tabs>

          {tabValue === 0 && (
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField fullWidth label="Product Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Description" multiline rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Base Price ($)" type="number" value={formData.base_price} onChange={(e) => setFormData({ ...formData, base_price: e.target.value })} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><AttachMoney sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><Inventory sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth label="Category" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><Category sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Discount %" type="number" value={formData.discount_percent} onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><LocalOffer sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Supplier" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Supplier URL" value={formData.supplier_url} onChange={(e) => setFormData({ ...formData, supplier_url: e.target.value })} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel control={<Switch checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />} label="Active (visible to customers)" />
              </Grid>
            </Grid>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>Product Images</Typography>
              <Button variant="outlined" component="label" startIcon={<CloudUpload />} sx={{ borderRadius: 2, textTransform: 'none', mb: 2 }}>
                Upload Images
                <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
              </Button>
              
              {images.length === 0 ? (
                <Box textAlign="center" py={4} bgcolor="#f8fafc" borderRadius={2}>
                  <ImageIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                  <Typography variant="body2" color="#94a3b8">No images uploaded</Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {images.map((image, index) => (
                    <Grid item xs={4} key={index}>
                      <Card sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <CardMedia
                          component="img"
                          height="130"
                          image={image instanceof File ? URL.createObjectURL(image) : getImageUrl(image.image_url)}
                          alt={`Image ${index + 1}`}
                          sx={{ objectFit: 'cover' }}
                          onError={(e) => { e.target.src = getPlaceholderImage(); }}
                        />
                        <Button
                          fullWidth
                          size="small"
                          color="error"
                          onClick={() => {
                            if (image instanceof File) {
                              handleRemoveNewImage(index);
                            } else {
                              setDeleteImageConfirm({ imageId: image.id, index });
                            }
                          }}
                          sx={{ borderRadius: 0, textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Remove
                        </Button>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2" fontWeight={600}>Product Variants</Typography>
                <Button variant="outlined" onClick={handleAddVariant} startIcon={<Add />} size="small" sx={{ borderRadius: 2, textTransform: 'none' }}>
                  Add Variant
                </Button>
              </Stack>
              
              {variants.length === 0 ? (
                <Box textAlign="center" py={4} bgcolor="#f8fafc" borderRadius={2}>
                  <Inventory sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                  <Typography variant="body2" color="#94a3b8">No variants added</Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {variants.map((variant, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: '#e2e8f0' }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={4}>
                          <TextField fullWidth size="small" label="Name" value={variant.name} onChange={(e) => handleUpdateVariant(index, 'name', e.target.value)} />
                        </Grid>
                        <Grid item xs={3}>
                          <TextField fullWidth size="small" label="Price (+$)" type="number" value={variant.price_modifier} onChange={(e) => handleUpdateVariant(index, 'price_modifier', parseFloat(e.target.value) || 0)} />
                        </Grid>
                        <Grid item xs={3}>
                          <TextField fullWidth size="small" label="Stock" type="number" value={variant.stock} onChange={(e) => handleUpdateVariant(index, 'stock', parseInt(e.target.value) || 0)} />
                        </Grid>
                        <Grid item xs={2}>
                          <IconButton color="error" onClick={() => handleRemoveVariant(index)}><Close /></IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!formData.name || !formData.base_price || !formData.category_id || saving} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            {saving ? <CircularProgress size={20} /> : editingProduct ? 'Update Product' : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Product Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this product?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setDeleteConfirm(null)} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteProduct} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Image Confirmation */}
      <Dialog open={!!deleteImageConfirm} onClose={() => setDeleteImageConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Image</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to remove this image?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setDeleteImageConfirm(null)} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteImage} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminProducts;