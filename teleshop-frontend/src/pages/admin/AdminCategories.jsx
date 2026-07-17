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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ArrowBack,
  CloudUpload,
  Refresh,
  Image as ImageIcon,
} from '@mui/icons-material';
import api from '../../api/axios';
import { getImageUrl } from '../../utils/imageHelper';

const AdminCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, category: null });
  const [formData, setFormData] = useState({ name: '', parent_id: '' });
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setDialog({ open: true, category: null });
    setFormData({ name: '', parent_id: '' });
    setImage(null);
  };

  const handleOpenEdit = (category) => {
    setDialog({ open: true, category });
    setFormData({
      name: category.name || '',
      parent_id: category.parent_id || '',
    });
    setImage(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    if (formData.parent_id) formDataToSend.append('parent_id', formData.parent_id);
    if (image) formDataToSend.append('image', image);

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
      fetchCategories();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save category', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/admin/categories/${categoryId}`);
      setSnackbar({ open: true, message: 'Category deleted', severity: 'success' });
      fetchCategories();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' });
    }
  };

  const mainCategories = categories.filter(c => !c.parent_id);

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin')} sx={{ mb: 2, textTransform: 'none' }}>
          Back to Dashboard
        </Button>

        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight={700}>Categories</Typography>
              <Typography variant="body2" color="text.secondary">{categories.length} categories</Typography>
            </Box>
            <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate} sx={{ borderRadius: 2, textTransform: 'none' }}>
              Add Category
            </Button>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell>Image</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Parent</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
                ) : categories.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center">No categories</TableCell></TableRow>
                ) : (
                  categories.map(cat => (
                    <TableRow key={cat.id} hover>
                      <TableCell>
                        <Avatar variant="rounded" src={getImageUrl(cat.image_url)} sx={{ width: 48, height: 48, bgcolor: '#f1f5f9' }}>
                          <ImageIcon />
                        </Avatar>
                      </TableCell>
                      <TableCell><Typography fontWeight={600}>{cat.name}</Typography></TableCell>
                      <TableCell><code>{cat.slug}</code></TableCell>
                      <TableCell>
                        {cat.parent_id ? categories.find(c => c.id === cat.parent_id)?.name || 'N/A' : <Chip label="Main" size="small" color="primary" />}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => handleOpenEdit(cat)} color="primary"><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(cat.id)} color="error"><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, category: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.category ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Category Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} fullWidth size="small" />
            <TextField select label="Parent Category" value={formData.parent_id} onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })} fullWidth size="small" SelectProps={{ native: true }}>
              <option value="">None (Main Category)</option>
              {mainCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </TextField>
            <Button variant="outlined" component="label" startIcon={<CloudUpload />}>
              Upload Image
              <input type="file" hidden accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
            </Button>
            {image && <Typography variant="caption">{image.name}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setDialog({ open: false, category: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!formData.name || saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminCategories;