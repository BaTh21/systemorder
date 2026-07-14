// src/pages/ProfilePage.jsx
import { Container, Typography, Grid, Paper } from '@mui/material';
import TelegramConnect from '../components/telegram/TelegramConnect';

const ProfilePage = () => {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Profile Settings
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            {/* Account settings */}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <TelegramConnect />
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfilePage;