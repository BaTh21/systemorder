// src/pages/admin/AdminPendingUsers.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Chip,
  Button,
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
  useTheme,
  useMediaQuery,
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
import ResponsiveTable from '../../components/ResponsiveTable';

const AdminPendingUsers = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
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

  // ✅ Columns for ResponsiveTable
  const columns = [
    {
      key: 'full_name',
      label: 'User',
      render: (value, row) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ 
            width: { xs: 28, sm: 32, md: 36 }, 
            height: { xs: 28, sm: 32, md: 36 }, 
            bgcolor: '#f59e0b', 
            fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' } 
          }}>
            {value?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600} color="#0f172a" fontSize={{ xs: '0.75rem', sm: '0.85rem' }}>
              {value}
            </Typography>
            <Typography variant="caption" color="#94a3b8" fontSize={{ xs: '0.55rem', sm: '0.6rem' }}>
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
          <Email sx={{ fontSize: { xs: 12, sm: 14 }, color: '#94a3b8' }} />
          <Typography variant="body2" color="#334155" fontSize={{ xs: '0.7rem', sm: '0.8rem' }}>
            {value}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Phone sx={{ fontSize: { xs: 12, sm: 14 }, color: '#94a3b8' }} />
          <Typography variant="body2" color="#334155" fontSize={{ xs: '0.7rem', sm: '0.8rem' }}>
            {value}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (value) => (
        <Typography variant="body2" color="#64748b" fontSize={{ xs: '0.6rem', sm: '0.75rem' }}>
          {formatDate(value)}
        </Typography>
      ),
    },
  ];

  // ✅ Actions for each row
  const rowActions = (row) => (
    <>
      <Button
        variant="contained"
        size="small"
        color="success"
        startIcon={<CheckCircle sx={{ fontSize: { xs: 14, sm: 16 } }} />}
        onClick={(e) => { e.stopPropagation(); handleApprove(row.id); }}
        disabled={processing}
        sx={{ 
          borderRadius: 2, 
          textTransform: 'none',
          fontSize: { xs: '0.6rem', sm: '0.75rem' },
          px: { xs: 1, sm: 2 },
          py: { xs: 0.4, sm: 0.8 },
          minWidth: { xs: 50, sm: 80 },
        }}
      >
        Approve
      </Button>
      <Button
        variant="outlined"
        size="small"
        color="error"
        startIcon={<Cancel sx={{ fontSize: { xs: 14, sm: 16 } }} />}
        onClick={(e) => { e.stopPropagation(); setRejectDialog({ open: true, user: row }); }}
        disabled={processing}
        sx={{ 
          borderRadius: 2, 
          textTransform: 'none',
          fontSize: { xs: '0.6rem', sm: '0.75rem' },
          px: { xs: 1, sm: 2 },
          py: { xs: 0.4, sm: 0.8 },
          minWidth: { xs: 50, sm: 80 },
        }}
      >
        Reject
      </Button>
    </>
  );

  // ✅ Mobile Card View
  const MobilePendingCard = ({ user }) => (
    <Card sx={{ mb: 1.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ width: 40, height: 40, bgcolor: '#f59e0b', fontSize: '1rem' }}>
              {user.full_name?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>
            <Box flex={1}>
              <Typography variant="body2" fontWeight={600} color="#0f172a" fontSize="0.85rem">
                {user.full_name}
              </Typography>
              <Typography variant="caption" color="#94a3b8" fontSize="0.6rem">
                ID: #{user.id}
              </Typography>
            </Box>
            <Chip 
              label="Pending" 
              color="warning" 
              size="small"
              sx={{ fontSize: '0.55rem', height: 20 }}
            />
          </Stack>

          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Email sx={{ fontSize: 14, color: '#94a3b8' }} />
              <Typography variant="body2" color="#334155" fontSize="0.75rem">
                {user.email}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Phone sx={{ fontSize: 14, color: '#94a3b8' }} />
              <Typography variant="body2" color="#334155" fontSize="0.75rem">
                {user.phone}
              </Typography>
            </Stack>
            <Typography variant="caption" color="#94a3b8" fontSize="0.6rem">
              Registered: {formatDate(user.created_at)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1, borderTop: '1px solid #e2e8f0' }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
              onClick={() => handleApprove(user.id)}
              disabled={processing}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.65rem', py: 0.5, px: 1.5 }}
            >
              Approve
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Cancel sx={{ fontSize: 16 }} />}
              onClick={() => setRejectDialog({ open: true, user })}
              disabled={processing}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.65rem', py: 0.5, px: 1.5 }}
            >
              Reject
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: { xs: 2, sm: 3, md: 4 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin')}
          sx={{ 
            textTransform: 'none', 
            fontWeight: 500, 
            color: '#475569', 
            mb: 2,
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
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h5" fontWeight={700} color="#0f172a" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' } }}>
                  Pending Approvals
                </Typography>
                <Chip 
                  label={`${total} pending`} 
                  color="warning" 
                  size="medium"
                  icon={<Pending />}
                  sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 24, sm: 28 } }}
                />
              </Stack>
              <Typography variant="body2" color="#94a3b8" mt={0.5} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                Review and approve new user registrations
              </Typography>
            </Box>
            <Button 
              startIcon={<Refresh />} 
              onClick={() => { fetchPendingUsers(); fetchStats(); }} 
              size="small" 
              sx={{ 
                borderRadius: 2, 
                textTransform: 'none',
                fontSize: { xs: '0.7rem', sm: '0.8rem' }
              }}
            >
              Refresh
            </Button>
          </Stack>
        </Paper>

        {/* Stats Cards - Responsive */}
        <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
          <Grid item xs={4}>
            <Card sx={{ bgcolor: '#fef3c7', border: '1px solid #f59e0b' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography variant="body2" color="#92400e" fontSize={{ xs: '0.6rem', sm: '0.75rem' }}>
                  Pending
                </Typography>
                <Typography variant="h4" fontWeight={700} color="#92400e" fontSize={{ xs: '1.2rem', sm: '2rem' }}>
                  {stats.pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ bgcolor: '#dcfce7', border: '1px solid #22c55e' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography variant="body2" color="#166534" fontSize={{ xs: '0.6rem', sm: '0.75rem' }}>
                  Approved
                </Typography>
                <Typography variant="h4" fontWeight={700} color="#166534" fontSize={{ xs: '1.2rem', sm: '2rem' }}>
                  {stats.approved}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ bgcolor: '#fee2e2', border: '1px solid #ef4444' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography variant="body2" color="#991b1b" fontSize={{ xs: '0.6rem', sm: '0.75rem' }}>
                  Rejected
                </Typography>
                <Typography variant="h4" fontWeight={700} color="#991b1b" fontSize={{ xs: '1.2rem', sm: '2rem' }}>
                  {stats.rejected}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Pending Users - Responsive */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Paper elevation={0} sx={{ 
            borderRadius: { xs: 2, sm: 3 }, 
            border: '1px solid #e2e8f0', 
            bgcolor: 'white', 
            p: 6, 
            textAlign: 'center' 
          }}>
            <Verified sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
            <Typography variant="h6" color="#94a3b8">No pending users</Typography>
            <Typography variant="body2" color="#94a3b8">All users have been reviewed</Typography>
          </Paper>
        ) : isMobile ? (
          // ✅ Mobile Card View
          <Box>
            {users.map((user) => (
              <MobilePendingCard key={user.id} user={user} />
            ))}
          </Box>
        ) : (
          // ✅ Tablet/Desktop Table View
          <Paper elevation={0} sx={{ 
            borderRadius: { xs: 2, sm: 3 }, 
            border: '1px solid #e2e8f0', 
            bgcolor: 'white', 
            overflow: 'hidden' 
          }}>
            <ResponsiveTable
              columns={columns}
              data={users}
              actions={rowActions}
              emptyMessage="No pending users"
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

      {/* Reject Dialog */}
      <Dialog 
        open={rejectDialog.open} 
        onClose={() => setRejectDialog({ open: false, user: null })} 
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
          color: '#dc2626',
          fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' }
        }}>
          <Cancel sx={{ mr: 1, verticalAlign: 'middle' }} />
          Reject User
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
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
            sx={{ 
              mt: 1,
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
              '& .MuiInputBase-input': { fontSize: { xs: '0.8rem', sm: '0.9rem' } }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 2, sm: 3 }, 
          pt: 0, 
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: { xs: 1, sm: 0 } 
        }}>
          <Button 
            onClick={() => setRejectDialog({ open: false, user: null })} 
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
            color="error"
            onClick={handleRejectSubmit}
            disabled={processing || !rejectionReason.trim()}
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none', 
              fontWeight: 600,
              width: { xs: '100%', sm: 'auto' },
              fontSize: { xs: '0.75rem', sm: '0.85rem' }
            }}
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
    </Box>
  );
};

export default AdminPendingUsers;