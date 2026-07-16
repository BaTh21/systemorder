// src/components/layout/CategoryDropdown.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import {
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
} from '@mui/icons-material';

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

const CategoryDropdown = ({ categories = [] }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCategoryClick = (categoryId) => {
    handleClose();
    navigate(`/products?category_id=${categoryId}`);
  };

  // Filter only main categories (no parent)
  const mainCategories = categories.filter(cat => !cat.parent_id);
  const subCategories = categories.filter(cat => cat.parent_id);

  return (
    <Box>
      <Button
        onClick={handleClick}
        endIcon={<KeyboardArrowDown />}
        sx={{ 
          color: 'white', 
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
        }}
      >
        Categories
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 600,
            borderRadius: 2,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            p: 1,
          }
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
          {/* Main Categories */}
          <Box sx={{ flex: 1, minWidth: 200, p: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ px: 2, py: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
              Main Categories
            </Typography>
            {mainCategories.map((cat) => (
              <MenuItem 
                key={cat.id} 
                onClick={() => handleCategoryClick(cat.id)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon>
                  {categoryIcons[cat.slug] || <ShoppingBag fontSize="small" />}
                </ListItemIcon>
                <ListItemText primary={cat.name} />
              </MenuItem>
            ))}
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          {/* Sub Categories */}
          <Box sx={{ flex: 1, minWidth: 200, p: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ px: 2, py: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
              More Categories
            </Typography>
            {subCategories.slice(0, 10).map((cat) => (
              <MenuItem 
                key={cat.id} 
                onClick={() => handleCategoryClick(cat.id)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemText primary={cat.name} inset />
              </MenuItem>
            ))}
            {subCategories.length > 10 && (
              <MenuItem onClick={() => { handleClose(); navigate('/products'); }}>
                <ListItemText primary="View All →" sx={{ color: 'primary.main', fontWeight: 600 }} />
              </MenuItem>
            )}
          </Box>
        </Box>
      </Menu>
    </Box>
  );
};

export default CategoryDropdown;