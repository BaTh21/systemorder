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
          <TelegramConnect />
        </Grid>
        {/* Other profile settings */}
      </Grid>
    </Container>
  );
};

export default ProfilePage;