import React, { useEffect, useState } from 'react';
import { Box, Chip, Avatar, Tooltip, CircularProgress } from '@mui/material';
import { styled } from '@mui/system';
import axios from 'axios';

// Glassmorphism container for the badge
const BadgeContainer = styled(Box)({
  backdropFilter: 'blur(12px)',
  background: 'rgba(255, 255, 255, 0.15)',
  borderRadius: '12px',
  padding: '8px 12px',
  display: 'inline-flex',
  alignItems: 'center',
  boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.03)'
  }
});

/**
 * ReputationBadge – displays a user's reputation score with a subtle glass‑morphism look.
 *
 * Props:
 *   - userId (string|number): identifier of the user whose reputation we want to show.
 *
 * The component fetches reputation data from the backend endpoint `/api/reputation/:userId`.
 * If the request fails or the endpoint does not exist yet, a fallback placeholder is shown.
 */
const ReputationBadge = ({ userId }) => {
  const [rep, setRep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const fetchRep = async () => {
      try {
        const response = await axios.get(`/api/reputation/${userId}`);
        setRep(response.data?.reputation ?? 0);
      } catch (err) {
        // If the endpoint is not yet implemented, we fallback to a static value.
        console.warn('Reputation endpoint unavailable, using fallback.', err);
        setRep(0);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRep();
  }, [userId]);

  if (loading) {
    return (
      <BadgeContainer>
        <CircularProgress size={18} color="inherit" />
      </BadgeContainer>
    );
  }

  return (
    <Tooltip title={error ? 'Reputation data unavailable' : 'User reputation'} arrow>
      <BadgeContainer>
        <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: '#4caf50' }}>⭐</Avatar>
        <Chip
          label={`Rep: ${rep}`}
          size="small"
          sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
        />
      </BadgeContainer>
    </Tooltip>
  );
};

export default ReputationBadge;
