// src/pages/CheckoutPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Box,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useCart } from '../contexts/CartContext';
import api from '../api/axios';

const steps = ['Shipping Address', 'Review Order', 'Place Order'];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems, totalPrice, clearCart } = useCart();
  const [activeStep, setActiveStep] = useState(0);
  const [shippingAddress, setShippingAddress] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
  });
  const [notes, setNotes] = useState('');

  const handleAddressChange = (e) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value,
    });
  };

  const handlePlaceOrder = async () => {
    try {
      const orderData = {
        shipping_address: shippingAddress,
        customer_notes: notes,
        payment_method: 'bank_transfer',
      };
      await api.post('/orders', orderData);
      await clearCart();
      navigate('/orders');
    } catch (error) {
      console.error('Error placing order:', error);
    }
  };

  const renderStep = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                name="full_name"
                value={shippingAddress.full_name}
                onChange={handleAddressChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 1"
                name="address_line1"
                value={shippingAddress.address_line1}
                onChange={handleAddressChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 2"
                name="address_line2"
                value={shippingAddress.address_line2}
                onChange={handleAddressChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={shippingAddress.city}
                onChange={handleAddressChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={shippingAddress.state}
                onChange={handleAddressChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Postal Code"
                name="postal_code"
                value={shippingAddress.postal_code}
                onChange={handleAddressChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={shippingAddress.phone}
                onChange={handleAddressChange}
                required
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Shipping Address
            </Typography>
            <Typography>
              {shippingAddress.full_name}<br />
              {shippingAddress.address_line1}<br />
              {shippingAddress.address_line2 && `${shippingAddress.address_line2}<br />`}
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}<br />
              Phone: {shippingAddress.phone}
            </Typography>
            <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
              Order Items
            </Typography>
            {cartItems.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>
                  {item.product_name} x {item.quantity}
                </Typography>
                <Typography>${item.total_price}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" color="primary">
                ${(totalPrice + 5 + totalPrice * 0.05).toFixed(2)}
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Order Notes"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Checkout
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Card>
        <CardContent>
          {renderStep(activeStep)}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={() => setActiveStep(activeStep - 1)}
            >
              Back
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button variant="contained" onClick={handlePlaceOrder}>
                Place Order
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => setActiveStep(activeStep + 1)}
              >
                Next
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CheckoutPage;