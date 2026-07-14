// src/pages/admin/AdminProducts.jsx
import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Add, Edit, Delete, Image as ImageIcon } from '@mui/icons-material';
import api from '../../api/axios';

const AdminProducts = () => {
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

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/products', {
        params: { page, limit: 20 }
      });
      setProducts(response.data.items || []);
      setTotalPages(Math.ceil((response.data.total || 0) / 20));
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
    const formDataToSend = new FormData();
    
    // Append basic fields
    Object.keys(formData).forEach(key => {
      if (key !== 'images' && key !== 'variants') {
        formDataToSend.append(key, formData[key]);
      }
    });
    
    // Append variants as JSON
    formDataToSend.append('variants', JSON.stringify(variants));
    
    // Append new images
    images.forEach((image, index) => {
      if (image instanceof File) {
        formDataToSend.append('images', image);
      }
    });

    try {
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/admin/products', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setOpenDialog(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleToggleActive = async (productId, currentStatus) => {
    try {
      await api.put(`/admin/products/${productId}/toggle-active`);
      fetchProducts();
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/admin/products/${productId}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
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

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Products Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenCreate}
          size="large"
        >
          Add New Product
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.images?.[0]?.image_url ? (
                    <img
                      src={product.images[0].image_url}
                      alt={product.name}
                      style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : (
                    <Box sx={{ width: 50, height: 50, bgcolor: 'grey.200', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon color="disabled" />
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {product.name}
                  </Typography>
                  {product.discount_percent > 0 && (
                    <Chip label={`-${product.discount_percent}%`} color="error" size="small" sx={{ mt: 0.5 }} />
                  )}
                </TableCell>
                <TableCell>{product.category?.name || 'N/A'}</TableCell>
                <TableCell>
                  ${product.base_price}
                  {product.variants?.length > 0 && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      +{product.variants.length} variants
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    color={product.stock > 10 ? 'success' : product.stock > 0 ? 'warning' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={product.is_active}
                    onChange={() => handleToggleActive(product.id, product.is_active)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpenEdit(product.id)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteProduct(product.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Typography sx={{ mx: 2, alignSelf: 'center' }}>
            Page {page} of {totalPages}
          </Typography>
          <Button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="Basic Info" />
            <Tab label="Images" />
            <Tab label="Variants" />
          </Tabs>

          {tabValue === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Product Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Base Price ($)"
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Discount %"
                  type="number"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Supplier URL"
                  value={formData.supplier_url}
                  onChange={(e) => setFormData({ ...formData, supplier_url: e.target.value })}
                  placeholder="https://..."
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Active (visible to customers)"
                />
              </Grid>
            </Grid>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Product Images
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
              >
                Upload Images
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
              
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {images.map((image, index) => (
                  <Grid item xs={4} key={index}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="150"
                        image={image instanceof File ? URL.createObjectURL(image) : image.image_url}
                        alt={`Product image ${index + 1}`}
                      />
                      <Button
                        fullWidth
                        color="error"
                        onClick={() => handleRemoveImage(index)}
                      >
                        Remove
                      </Button>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  Product Variants
                </Typography>
                <Button variant="outlined" onClick={handleAddVariant}>
                  Add Variant
                </Button>
              </Box>
              
              {variants.map((variant, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Variant Name"
                      value={variant.name}
                      onChange={(e) => handleUpdateVariant(index, 'name', e.target.value)}
                      placeholder="e.g., Size L, Color Red"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Price Modifier ($)"
                      type="number"
                      value={variant.price_modifier}
                      onChange={(e) => handleUpdateVariant(index, 'price_modifier', parseFloat(e.target.value))}
                      inputProps={{ step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Stock"
                      type="number"
                      value={variant.stock}
                      onChange={(e) => handleUpdateVariant(index, 'stock', parseInt(e.target.value))}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Button
                      fullWidth
                      color="error"
                      onClick={() => handleRemoveVariant(index)}
                      sx={{ mt: 1 }}
                    >
                      Remove
                    </Button>
                  </Grid>
                </Grid>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.base_price || !formData.category_id}
          >
            {editingProduct ? 'Update' : 'Create'} Product
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminProducts;