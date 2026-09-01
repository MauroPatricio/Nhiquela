import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';

/**
 * ProcessingFeeInfo – displays processing fee details for the selected establishment.
 * Props:
 *   establishmentId: string – the _id of the selected establishment.
 */
export default function ProcessingFeeInfo({ establishmentId }) {
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!establishmentId) return;
    setLoading(true);
    setError('');
    axios
      .get(`/api/document-order/admin/fees?establishmentId=${establishmentId}`)
      .then((res) => setFee(res.data))
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load fees');
      })
      .finally(() => setLoading(false));
  }, [establishmentId]);

  if (!establishmentId) return null;
  if (loading) return <CircularProgress size={24} sx={{ mb: 2 }} />;
  if (error) return <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>;
  if (!fee) return null;

  const total = (fee.baseFee || 0) + (fee.estFee || 0);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Taxa de Processamento
      </Typography>
      <Typography>
        Base: {fee.baseFee?.toFixed(2) ?? '-'} | Estabelecimento: {fee.estFee?.toFixed(2) ?? '-'} | Total: {total.toFixed(2)}
      </Typography>
    </Box>
  );
}
