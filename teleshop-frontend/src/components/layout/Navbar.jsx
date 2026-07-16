// src/components/layout/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Badge,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Stack,
  Container,
  Avatar,
} from '@mui/material';
import {
  ShoppingCart,
  Person,
  KeyboardArrowDown,
  Smartphone,
  Laptop,
  Headphones,
  CameraAlt,
  SportsEsports,
  Checkroom,
  Chair,
  FitnessCenter,
  ShoppingBag,
  Dashboard,
  Receipt,
  Logout,
  Login,
  PersonAdd,
  LocalOffer,
  Settings,
  Favorite,
  LocationOn,
  Support,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import api from '../../api/axios';

const categoryIcons = {
  'electronics': <Smartphone fontSize="small" />,
  'fashion': <Checkroom fontSize="small" />,
  'home-garden': <Chair fontSize="small" />,
  'sports-outdoors': <FitnessCenter fontSize="small" />,
  'sports': <FitnessCenter fontSize="small" />,
  'smartphones-tablets': <Smartphone fontSize="small" />,
  'laptops-computers': <Laptop fontSize="small" />,
  'audio-headphones': <Headphones fontSize="small" />,
  'cameras-photography': <CameraAlt fontSize="small" />,
  'gaming-entertainment': <SportsEsports fontSize="small" />,
};

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [userMenu, setUserMenu] = useState(null);
  const [categoryMenu, setCategoryMenu] = useState(null);
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const mainCategories = categories.filter(cat => !cat.parent_id);

  const handleCategoryClick = (categoryId) => {
    setCategoryMenu(null);
    setHoveredCategory(null);
    navigate(`/products?category_id=${categoryId}`);
  };

  return (
    <AppBar position="sticky" sx={{ bgcolor: '#0f172a', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ gap: 1 }}>
          {/* Logo */}
          <Typography
            variant="h5"
            component={RouterLink}
            to="/"
            sx={{
              textDecoration: 'none',
              color: 'white',
              fontWeight: 800,
              mr: 3,
              letterSpacing: -0.5,
              '&:hover': { opacity: 0.9 },
            }}
          >
            Tele<span style={{ color: '#f59e0b' }}>Shop</span>
          </Typography>

          {/* Category Dropdown */}
          <Button
            onClick={(e) => setCategoryMenu(e.currentTarget)}
            endIcon={<KeyboardArrowDown />}
            sx={{
              color: 'white',
              fontWeight: 600,
              textTransform: 'none',
              px: 2,
              py: 1,
              borderRadius: 2,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Categories
          </Button>

          {/* Category Mega Menu */}
          <Menu
            anchorEl={categoryMenu}
            open={Boolean(categoryMenu)}
            onClose={() => { setCategoryMenu(null); setHoveredCategory(null); }}
            PaperProps={{
              sx: {
                mt: 1,
                borderRadius: 2,
                minWidth: 650,
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                overflow: 'visible',
              },
            }}
            MenuListProps={{ sx: { p: 0 } }}
          >
            <Box sx={{ display: 'flex', p: 1 }}>
              <Box sx={{ width: 220, borderRight: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Departments
                </Typography>
                {mainCategories.map((cat) => (
                  <MenuItem
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    onMouseEnter={() => setHoveredCategory(cat)}
                    sx={{
                      borderRadius: 1,
                      mx: 0.5,
                      mb: 0.5,
                      bgcolor: hoveredCategory?.id === cat.id ? '#f1f5f9' : 'transparent',
                      fontWeight: hoveredCategory?.id === cat.id ? 600 : 400,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {categoryIcons[cat.slug] || <ShoppingBag fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText primary={cat.name} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                  </MenuItem>
                ))}
                <Divider sx={{ my: 1 }} />
                <MenuItem onClick={() => { setCategoryMenu(null); navigate('/products'); }} sx={{ borderRadius: 1, mx: 0.5 }}>
                  <ListItemText primary="All Categories →" primaryTypographyProps={{ fontWeight: 600, color: '#2563eb', fontSize: '0.9rem' }} />
                </MenuItem>
              </Box>
              <Box sx={{ flex: 1, p: 2, minHeight: 200 }}>
                {hoveredCategory ? (
                  <>
                    <Typography variant="subtitle2" fontWeight={600} color="#0f172a" mb={2}>
                      {hoveredCategory.name}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {categories
                        .filter(cat => cat.parent_id === hoveredCategory.id)
                        .map(subCat => (
                          <Chip
                            key={subCat.id}
                            label={subCat.name}
                            onClick={() => handleCategoryClick(subCat.id)}
                            variant="outlined"
                            size="small"
                            sx={{
                              borderRadius: 2,
                              cursor: 'pointer',
                              borderColor: '#e2e8f0',
                              '&:hover': { bgcolor: '#2563eb', color: 'white', borderColor: '#2563eb' },
                            }}
                          />
                        ))}
                    </Box>
                    <Button size="small" onClick={() => handleCategoryClick(hoveredCategory.id)} sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}>
                      Shop All {hoveredCategory.name} →
                    </Button>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                    <Typography variant="body2">Hover over a category</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Menu>

          {/* Navigation Links */}
          <Button component={RouterLink} to="/products" sx={{ color: 'white', textTransform: 'none', fontWeight: 500, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
            All Products
          </Button>
          <Button component={RouterLink} to="/products?sort=price_asc" sx={{ color: '#f59e0b', textTransform: 'none', fontWeight: 500, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
            <LocalOffer sx={{ mr: 0.5, fontSize: 18 }} />
            Deals
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          {/* Cart */}
          <IconButton color="inherit" component={RouterLink} to="/cart" sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
            <Badge badgeContent={totalItems} color="error">
              <ShoppingCart />
            </Badge>
          </IconButton>

          {/* User Menu */}
          {user ? (
            <>
              <Button
                onClick={(e) => setUserMenu(e.currentTarget)}
                endIcon={<KeyboardArrowDown />}
                sx={{
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 500,
                  ml: 1,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    mr: 1,
                    bgcolor: '#2563eb',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                  }}
                >
                  {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                {user.full_name?.split(' ')[0]}
              </Button>
              <Menu
                anchorEl={userMenu}
                open={Boolean(userMenu)}
                onClose={() => setUserMenu(null)}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    borderRadius: 2,
                    minWidth: 220,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                {/* User Info Header */}
                <Box sx={{ px: 2, py: 2, borderBottom: '1px solid #e2e8f0' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: '#2563eb', fontWeight: 700, width: 40, height: 40 }}>
                      {user.full_name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} color="#0f172a">
                        {user.full_name}
                      </Typography>
                      <Typography variant="caption" color="#94a3b8">
                        {user.email}
                      </Typography>
                    </Box>
                  </Stack>
                  {isAdmin && (
                    <Chip label="Admin" size="small" color="primary" sx={{ mt: 1, height: 20, fontSize: '0.65rem' }} />
                  )}
                </Box>

                {/* Menu Items */}
                <Box sx={{ py: 1 }}>
                  <MenuItem onClick={() => { setUserMenu(null); navigate('/profile'); }} sx={{ py: 1.2 }}>
                    <ListItemIcon>
                      <Person fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="My Profile" />
                  </MenuItem>

                  <MenuItem onClick={() => { setUserMenu(null); navigate('/orders'); }} sx={{ py: 1.2 }}>
                    <ListItemIcon>
                      <Receipt fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="My Orders" />
                  </MenuItem>
                </Box>

                {/* Admin Link */}
                {isAdmin && (
                  <Box sx={{ borderTop: '1px solid #e2e8f0', py: 1 }}>
                    <MenuItem onClick={() => { setUserMenu(null); navigate('/admin'); }} sx={{ py: 1.2 }}>
                      <ListItemIcon>
                        <Dashboard fontSize="small" sx={{ color: '#2563eb' }} />
                      </ListItemIcon>
                      <ListItemText primary="Admin Dashboard" primaryTypographyProps={{ fontWeight: 600, color: '#2563eb' }} />
                    </MenuItem>
                  </Box>
                )}

                {/* Logout */}
                <Box sx={{ borderTop: '1px solid #e2e8f0', py: 1 }}>
                  <MenuItem onClick={() => { logout(); setUserMenu(null); navigate('/'); }} sx={{ py: 1.2 }}>
                    <ListItemIcon>
                      <Logout fontSize="small" sx={{ color: '#ef4444' }} />
                    </ListItemIcon>
                    <ListItemText primary="Logout" primaryTypographyProps={{ color: '#ef4444' }} />
                  </MenuItem>
                </Box>
              </Menu>
            </>
          ) : (
            <Stack direction="row" spacing={0.5}>
              <Button
                component={RouterLink}
                to="/login"
                startIcon={<Login />}
                sx={{ color: 'white', textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
              >
                Login
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                startIcon={<PersonAdd />}
                sx={{ bgcolor: '#f59e0b', color: '#0f172a', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#eab308' } }}
              >
                Sign Up
              </Button>
            </Stack>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;