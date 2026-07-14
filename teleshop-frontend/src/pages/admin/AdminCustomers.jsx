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
} from '@mui/material';
import { Search } from '@mui/icons-material';
import api from '../../api/axios';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/customers', {
        params: { 
          page, 
          limit: 20,
          search: search || undefined 
        }
      });
      
      console.log('Customers API Response:', response.data);
      
      // Handle different response formats
      let customersData = [];
      let totalCount = 0;
      let pagesCount = 1;
      
      if (Array.isArray(response.data)) {
        // If response is directly an array
        customersData = response.data;
        totalCount = response.data.length;
      } else if (response.data && Array.isArray(response.data.items)) {
        // If response has items array
        customersData = response.data.items;
        totalCount = response.data.total || response.data.items.length;
        pagesCount = response.data.total_pages || Math.ceil(totalCount / 20);
      } else if (response.data && Array.isArray(response.data.data)) {
        // If response has data array
        customersData = response.data.data;
        totalCount = response.data.total || response.data.data.length;
        pagesCount = response.data.total_pages || Math.ceil(totalCount / 20);
      } else {
        console.warn('Unexpected customers data format:', response.data);
        customersData = [];
      }
      
      setCustomers(customersData);
      setTotal(totalCount);
      setTotalPages(pagesCount);
      
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
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
      <Typography variant="h4" gutterBottom>
        Customers ({total})
      </Typography>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Search customers by name or email..."
          value={search}
          onChange={handleSearchChange}
          size="small"
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {customers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No customers found
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Telegram</TableCell>
                  <TableCell>Registered</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.id}</TableCell>
                    <TableCell>{customer.full_name || 'N/A'}</TableCell>
                    <TableCell>{customer.email || 'N/A'}</TableCell>
                    <TableCell>{customer.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={customer.is_active ? 'Active' : 'Inactive'}
                        color={customer.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {customer.telegram_chat_id ? (
                        <Chip label="Connected" color="primary" size="small" />
                      ) : (
                        <Chip label="Not Connected" color="default" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.created_at 
                        ? new Date(customer.created_at).toLocaleDateString() 
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
              <Button 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Typography sx={{ alignSelf: 'center' }}>
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
        </>
      )}
    </Container>
  );
};

export default AdminCustomers;