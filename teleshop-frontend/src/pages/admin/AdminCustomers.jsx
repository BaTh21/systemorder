// src/pages/admin/AdminCustomers.jsx
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
  Chip,
  CircularProgress,
  Box,
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
  Switch,
  FormControlLabel,
  Pagination,
  debounce,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Search,
  Edit,
  Delete,
  Person,
  Email,
  Phone,
  FilterList,
  Clear,
  Refresh,
  Block,
  CheckCircle,
  Telegram,
} from '@mui/icons-material';
import api from '../../api/axios';

const AdminCustomers = () => {
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

  // Debounce search
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
        params: { 
          page, 
          limit: 20,
          search: debouncedSearch || undefined 
        }
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
      setEditDialog({ open: false, customer: null });
      fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
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
      setDeleteDialog({ open: false, customer: null });
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const handleToggleActive = async (customerId, currentStatus) => {
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

  if (loading && customers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        
        {/* Header */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h5" fontWeight={700} color="#0f172a">
                Customers
              </Typography>
              <Typography variant="body2" color="#94a3b8" mt={0.5}>
                {total} total customer{total !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<Refresh />}
                onClick={fetchCustomers}
                size="small"
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>

          {/* Search Bar */}
          <Stack direction="row" spacing={2} mt={2}>
            <TextField
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ flex: 1, maxWidth: 400 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 },
              }}
            />
            {debouncedSearch && (
              <Chip 
                label={`Searching: "${debouncedSearch}"`} 
                size="small" 
                onDelete={handleClearSearch}
                sx={{ bgcolor: '#eff6ff', color: '#2563eb' }}
              />
            )}
          </Stack>
        </Paper>

        {/* Customers Table */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white', overflow: 'hidden' }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }}>
              <CircularProgress size={24} sx={{ position: 'absolute', top: 16, right: 16 }} />
            </Box>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Telegram</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Joined</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Person sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="h6" color="#94a3b8">
                        No customers found
                      </Typography>
                      <Typography variant="body2" color="#cbd5e1">
                        Try adjusting your search
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 36, height: 36, bgcolor: '#2563eb', fontSize: '0.9rem', fontWeight: 700 }}>
                            {customer.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="#0f172a">
                              {customer.full_name || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="#94a3b8">
                              ID: #{customer.id}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="#334155">
                          {customer.email || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="#334155">
                          {customer.phone || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={customer.is_active ? <CheckCircle /> : <Block />}
                          label={customer.is_active ? 'Active' : 'Inactive'}
                          color={customer.is_active ? 'success' : 'default'}
                          size="small"
                          variant={customer.is_active ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        {customer.telegram_chat_id ? (
                          <Chip 
                            icon={<Telegram sx={{ fontSize: 14 }} />} 
                            label="Connected" 
                            color="primary" 
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Chip label="Not Connected" size="small" variant="outlined" sx={{ color: '#94a3b8' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="#64748b">
                          {formatDate(customer.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Toggle Active">
                            <IconButton 
                              size="small" 
                              onClick={() => handleToggleActive(customer.id, customer.is_active)}
                              color={customer.is_active ? 'success' : 'default'}
                            >
                              {customer.is_active ? <CheckCircle fontSize="small" /> : <Block fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEditClick(customer)} color="primary">
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDeleteClick(customer)} color="error">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #e2e8f0' }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, p) => setPage(p)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Paper>
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
          <Button onClick={() => setEditDialog({ open: false, customer: null })} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            {saving ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, customer: null })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Customer</DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="#475569">
            Are you sure you want to delete <strong>{deleteDialog.customer?.full_name}</strong>?
          </Typography>
          <Typography variant="body2" color="#ef4444" mt={1}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setDeleteDialog({ open: false, customer: null })} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminCustomers;