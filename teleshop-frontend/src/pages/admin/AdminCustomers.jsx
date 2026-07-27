// src/pages/admin/AdminCustomers.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  CircularProgress,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Tooltip,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search,
  Edit,
  Delete,
  Person,
  Email,
  Phone,
  Refresh,
  Clear,
  Block,
  CheckCircle,
  Telegram,
  ArrowBack,
} from '@mui/icons-material';
import api from '../../api/axios';
import ResponsiveTable from '../../components/ResponsiveTable';

const AdminCustomers = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editDialog, setEditDialog] = useState({ open: false, customer: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, customer: null });
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [page, debouncedSearch]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/customers', {
        params: { page, limit: 20, search: debouncedSearch || undefined }
      });

      let customersData = [];
      let totalCount = 0;
      let pagesCount = 1;

      if (Array.isArray(response.data)) {
        customersData = response.data;
        totalCount = response.data.length;
      } else if (response.data?.items) {
        customersData = response.data.items;
        totalCount = response.data.total || response.data.items.length;
        pagesCount = response.data.total_pages || Math.ceil(totalCount / 20);
      } else {
        customersData = [];
      }

      setCustomers(customersData);
      setTotal(totalCount);
      setTotalPages(pagesCount);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (customer) => {
    setEditDialog({ open: true, customer });
    setEditForm({
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/customers/${editDialog.customer.id}`, editForm);
      setSnackbar({ open: true, message: 'Customer updated!', severity: 'success' });
      setEditDialog({ open: false, customer: null });
      fetchCustomers();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update customer', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (customer) => {
    setDeleteDialog({ open: true, customer });
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/admin/customers/${deleteDialog.customer.id}`);
      setSnackbar({ open: true, message: 'Customer deleted', severity: 'success' });
      setDeleteDialog({ open: false, customer: null });
      fetchCustomers();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete customer', severity: 'error' });
    }
  };

  const handleToggleActive = async (customerId) => {
    try {
      await api.put(`/admin/customers/${customerId}/toggle-active`);
      fetchCustomers();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Columns for responsive table
  const columns = [
    {
      key: 'full_name',
      label: 'Customer',
      render: (value, row) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#2563eb', fontSize: '0.8rem', fontWeight: 700 }}>
            {value?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600} color="#0f172a">
              {value || 'N/A'}
            </Typography>
            <Typography variant="caption" color="#94a3b8">
              ID: #{row.id}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Email sx={{ fontSize: 14, color: '#94a3b8' }} />
          <Typography variant="body2" color="#334155">{value || 'N/A'}</Typography>
        </Stack>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Phone sx={{ fontSize: 14, color: '#94a3b8' }} />
          <Typography variant="body2" color="#334155">{value || 'N/A'}</Typography>
        </Stack>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <Chip
          icon={value ? <CheckCircle /> : <Block />}
          label={value ? 'Active' : 'Inactive'}
          color={value ? 'success' : 'default'}
          size="small"
          variant={value ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      key: 'telegram_chat_id',
      label: 'Telegram',
      render: (value) => (
        value ? (
          <Chip icon={<Telegram sx={{ fontSize: 14 }} />} label="Connected" color="primary" size="small" variant="outlined" />
        ) : (
          <Chip label="Not Connected" size="small" variant="outlined" sx={{ color: '#94a3b8' }} />
        )
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (value) => (
        <Typography variant="body2" color="#64748b">{formatDate(value)}</Typography>
      ),
    },
  ];

  // Actions for each row
  const rowActions = (row) => (
    <>
      <Tooltip title="Toggle Active">
        <IconButton size="small" onClick={() => handleToggleActive(row.id)} color={row.is_active ? 'success' : 'default'}>
          {row.is_active ? <CheckCircle fontSize="small" /> : <Block fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => handleEditClick(row)} color="primary">
          <Edit fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" onClick={() => handleDeleteClick(row)} color="error">
          <Delete fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin')}
          sx={{ textTransform: 'none', fontWeight: 500, color: '#475569', mb: 2 }}
        >
          Back to Dashboard
        </Button>

        {/* Header */}
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h5" fontWeight={700} color="#0f172a" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' } }}>
                Customers
              </Typography>
              <Typography variant="body2" color="#94a3b8" mt={0.5}>
                {total} total customer{total !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Button startIcon={<Refresh />} onClick={fetchCustomers} size="small" sx={{ borderRadius: 2, textTransform: 'none' }}>
              Refresh
            </Button>
          </Stack>
          
          {/* Search */}
          <Stack direction="row" spacing={2} mt={2} flexWrap="wrap" useFlexGap>
            <TextField
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ 
                flex: 1, 
                minWidth: { xs: '100%', sm: 250, md: 400 },
                maxWidth: { xs: '100%', sm: 400 },
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8' }} /></InputAdornment>,
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}><Clear fontSize="small" /></IconButton>
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 },
              }}
            />
            {debouncedSearch && (
              <Chip 
                label={`"${debouncedSearch}"`} 
                size="small" 
                onDelete={handleClearSearch} 
                sx={{ bgcolor: '#eff6ff', color: '#2563eb' }} 
              />
            )}
          </Stack>
        </Paper>

        {/* Customers Table - Responsive */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white', overflow: 'hidden' }}>
            <ResponsiveTable
              columns={columns}
              data={customers}
              actions={rowActions}
              emptyMessage="No customers found"
            />
          </Paper>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, mt: 2 }}>
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, customer: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField 
              label="Full Name" 
              value={editForm.full_name} 
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} 
              fullWidth 
              size="small" 
              InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment> }} 
            />
            <TextField 
              label="Email" 
              value={editForm.email} 
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
              fullWidth 
              size="small" 
              InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment> }} 
            />
            <TextField 
              label="Phone" 
              value={editForm.phone} 
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} 
              fullWidth 
              size="small" 
              InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }} 
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setEditDialog({ open: false, customer: null })} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            {saving ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, customer: null })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Customer</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteDialog.customer?.full_name}</strong>?</Typography>
          <Typography variant="body2" color="error" mt={1}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setDeleteDialog({ open: false, customer: null })} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminCustomers;