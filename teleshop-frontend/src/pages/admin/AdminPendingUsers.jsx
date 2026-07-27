import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Pagination,
  Snackbar,
  Alert,
  Avatar,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Refresh,
  ArrowBack,
  Email,
  Phone,
  Person,
  Pending,
  Verified,
  Block,
} from '@mui/icons-material';
import api from '../../api/axios';

const AdminPendingUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rejectDialog, setRejectDialog] = useState({ open: false, user: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    fetchPendingUsers();
    fetchStats();
  }, [page]);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users/pending', {
        params: { page, limit: 20 }
      });
      setUsers(response.data.items || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/users', {
        params: { limit: 1 }
      });
      // Get counts from all users
      const allUsers = await api.get('/admin/users', {
        params: { limit: 1000 }
      });
      const items = allUsers.data.items || [];
      const pending = items.filter(u => u.status === 'pending').length;
      const approved = items.filter(u => u.status === 'approved').length;
      const rejected = items.filter(u => u.status === 'rejected').length;
      setStats({ pending, approved, rejected });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (userId) => {
    setProcessing(true);
    try {
      await api.put(`/admin/users/${userId}/approve`, {
        status: 'approved'
      });
      setSnackbar({ 
        open: true, 
        message: '✅ User approved successfully!', 
        severity: 'success' 
      });
      fetchPendingUsers();
      fetchStats();
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Failed to approve user', 
        severity: 'error' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      setSnackbar({ 
        open: true, 
        message: 'Please provide a reason for rejection', 
        severity: 'warning' 
      });
      return;
    }
    
    setProcessing(true);
    try {
      await api.put(`/admin/users/${rejectDialog.user.id}/approve`, {
        status: 'rejected',
        rejection_reason: rejectionReason
      });
      setSnackbar({ 
        open: true, 
        message: '❌ User rejected', 
        severity: 'warning' 
      });
      setRejectDialog({ open: false, user: null });
      setRejectionReason('');
      fetchPendingUsers();
      fetchStats();
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Failed to reject user', 
        severity: 'error' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin')}
          sx={{ textTransform: 'none', fontWeight: 500, color: '#475569', mb: 2 }}
        >
          Back to Dashboard
        </Button>

        {/* Header */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h5" fontWeight={700} color="#0f172a">
                  Pending Approvals
                </Typography>
                <Chip 
                  label={`${total} pending`} 
                  color="warning" 
                  size="medium"
                  icon={<Pending />}
                />
              </Stack>
              <Typography variant="body2" color="#94a3b8" mt={0.5}>
                Review and approve new user registrations
              </Typography>
            </Box>
            <Button 
              startIcon={<Refresh />} 
              onClick={() => { fetchPendingUsers(); fetchStats(); }} 
              size="small" 
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Refresh
            </Button>
          </Stack>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4}>
            <Card sx={{ bgcolor: '#fef3c7', border: '1px solid #f59e0b' }}>
              <CardContent>
                <Typography variant="body2" color="#92400e">Pending</Typography>
                <Typography variant="h4" fontWeight={700} color="#92400e">{stats.pending}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ bgcolor: '#dcfce7', border: '1px solid #22c55e' }}>
              <CardContent>
                <Typography variant="body2" color="#166534">Approved</Typography>
                <Typography variant="h4" fontWeight={700} color="#166534">{stats.approved}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ bgcolor: '#fee2e2', border: '1px solid #ef4444' }}>
              <CardContent>
                <Typography variant="body2" color="#991b1b">Rejected</Typography>
                <Typography variant="h4" fontWeight={700} color="#991b1b">{stats.rejected}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Users Table */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'white', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Registered</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <Verified sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
                      <Typography variant="h6" color="#94a3b8">No pending users</Typography>
                      <Typography variant="body2" color="#94a3b8">All users have been reviewed</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 36, height: 36, bgcolor: '#f59e0b', fontSize: '0.9rem' }}>
                            {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="#0f172a">
                              {user.full_name}
                            </Typography>
                            <Typography variant="caption" color="#94a3b8">
                              ID: #{user.id}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Email sx={{ fontSize: 14, color: '#94a3b8' }} />
                          <Typography variant="body2" color="#334155">{user.email}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Phone sx={{ fontSize: 14, color: '#94a3b8' }} />
                          <Typography variant="body2" color="#334155">{user.phone}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="#64748b">{formatDate(user.created_at)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Button
                            variant="contained"
                            size="small"
                            color="success"
                            startIcon={<CheckCircle />}
                            onClick={() => handleApprove(user.id)}
                            disabled={processing}
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<Cancel />}
                            onClick={() => setRejectDialog({ open: true, user })}
                            disabled={processing}
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                          >
                            Reject
                          </Button>
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

        {/* Reject Dialog */}
        <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, user: null })} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#dc2626' }}>
            <Cancel sx={{ mr: 1, verticalAlign: 'middle' }} />
            Reject User
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              You are about to reject <strong>{rejectDialog.user?.full_name}</strong> ({rejectDialog.user?.email}).
              Please provide a reason that will be sent to the user.
            </DialogContentText>
            <TextField
              fullWidth
              label="Rejection Reason"
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why the registration was rejected..."
              required
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setRejectDialog({ open: false, user: null })} sx={{ borderRadius: 2, textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleRejectSubmit}
              disabled={processing || !rejectionReason.trim()}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              {processing ? <CircularProgress size={20} /> : 'Reject User'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
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
      </Container>
    </Box>
  );
};

export default AdminPendingUsers;