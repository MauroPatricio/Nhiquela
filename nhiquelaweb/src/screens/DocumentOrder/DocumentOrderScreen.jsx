import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, MenuItem, Select, FormControl, InputLabel, Button, CircularProgress, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';
import ReputationBadge from '../../components/OrderFlow/ReputationBadge';
import TermsModal from '../../components/OrderFlow/TermsModal';
import DocumentUpload from '../../components/OrderFlow/DocumentUpload';
import ProcessingFeeInfo from '../../components/OrderFlow/ProcessingFeeInfo';
// Glassmorphism card style
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.15)',
  borderRadius: '16px',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  padding: '2rem',
  maxWidth: '500px',
  margin: 'auto',
};

export default function DocumentOrderScreen() {
  const [establishments, setEstablishments] = useState([]);
  const [selectedEst, setSelectedEst] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch establishments for the dropdown (admin route)
const [termsOpen, setTermsOpen] = useState(false);
const [termsAccepted, setTermsAccepted] = useState(false);
  useEffect(() => {
    const fetchEstablishments = async () => {
      try {
        const { data } = await axios.get('/api/document-order/admin/establishments');
        setEstablishments(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load establishments');
      }
    };
    fetchEstablishments();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleTermsClose = (accepted) => {
    setTermsOpen(false);
    if (accepted) {
      setTermsAccepted(true);
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
      if (!selectedEst || !file) {
        setError('Please select an establishment and upload a file');
        return;
      }
      if (!termsAccepted) {
        setTermsOpen(true);
        return;
      }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Placeholder user & serviceType – in a real app these would come from auth/context
      formData.append('userId', 'USER_ID_PLACEHOLDER');
      formData.append('establishmentId', selectedEst);
      formData.append('serviceType', 'document_processing');

      const { data } = await axios.post('/api/document-order/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Order created successfully!');
        setTermsAccepted(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ py: 6, background: 'linear-gradient(135deg, #e0f7fa, #80deea)', minHeight: 'calc(100vh - 64px)' }}>
      <Card sx={glassStyle} elevation={0}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Criar Pedido de Documento
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
<ReputationBadge userId="USER_ID_PLACEHOLDER" />
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
<TermsModal open={termsOpen} onClose={handleTermsClose} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="est-select-label">Estabelecimento</InputLabel>
            <Select
              labelId="est-select-label"
              value={selectedEst}
              label="Estabelecimento"
              onChange={(e) => setSelectedEst(e.target.value)}
            >
              {establishments.map((est) => (
                <MenuItem key={est._id} value={est._id}>
                  {est.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ProcessingFeeInfo establishmentId={selectedEst} />
          <DocumentUpload file={file} setFile={setFile} />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? <CircularProgress size={24} /> : 'Criar Pedido'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
