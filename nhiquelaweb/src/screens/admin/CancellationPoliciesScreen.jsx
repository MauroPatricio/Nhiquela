import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { styled } from '@mui/system';
import axios from 'axios';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Glass-morphism container
const GlassContainer = styled(Box)({
  backdropFilter: 'blur(16px)',
  background: 'rgba(255,255,255,0.12)',
  borderRadius: '16px',
  padding: '24px',
  margin: '24px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  transition: 'transform 0.2s',
  '&:hover': { transform: 'scale(1.01)' },
});

/**
 * CancellationPoliciesScreen – admin UI to manage cancellation-policy records.
 * Shows stage, fee flag and custom message. Uses MUI DataGrid with premium styling.
 */
const CancellationPoliciesScreen = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formValues, setFormValues] = useState({ stage: '', chargeProcessingFee: false, message: '' });

  const fetchPolicies = async () => {
    try {
      const res = await axios.get('/api/admin/cancellation-policies');
      setPolicies(res.data || []);
    } catch (err) {
      console.error('Failed to load policies', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleOpen = (item = null) => {
    setEditingItem(item);
    setFormValues(item ? { stage: item.stage, chargeProcessingFee: item.chargeProcessingFee, message: item.message } : { stage: '', chargeProcessingFee: false, message: '' });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues({ ...formValues, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await axios.put(`/api/admin/cancellation-policies/${editingItem._id}`, formValues);
      } else {
        await axios.post('/api/admin/cancellation-policies', formValues);
      }
      await fetchPolicies();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      handleClose();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this policy?')) return;
    try {
      await axios.delete(`/api/admin/cancellation-policies/${id}`);
      await fetchPolicies();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const columns = [
    { field: '_id', headerName: 'ID', width: 220, hide: true },
    { field: 'stage', headerName: 'Stage', flex: 1 },
    { field: 'chargeProcessingFee', headerName: 'Charge Fee', width: 130, type: 'boolean' },
    { field: 'message', headerName: 'Message', flex: 2 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleOpen(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => handleDelete(params.row._id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <GlassContainer>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <h2>Cancellation Policies</h2>
        <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={() => handleOpen()}>New</Button>
      </Box>
      {loading ? (
        <CircularProgress />
      ) : (
        <DataGrid
          rows={policies}
          columns={columns}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          getRowId={(row) => row._id}
        />
      )}

      {/* Dialog for create / edit */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Policy' : 'New Policy'}</DialogTitle>
        <DialogContent dividers>
          <TextField label="Stage" name="stage" fullWidth margin="normal" value={formValues.stage} onChange={handleChange} />
          <TextField
            label="Message"
            name="message"
            fullWidth
            multiline
            rows={3}
            margin="normal"
            value={formValues.message}
            onChange={handleChange}
          />
          <Box display="flex" alignItems="center" mt={2}>
            <input type="checkbox" name="chargeProcessingFee" checked={formValues.chargeProcessingFee} onChange={handleChange} />
            <Box ml={1}>Charge processing fee on cancellation</Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Save</Button>
        </DialogActions>
      </Dialog>
    </GlassContainer>
  );
};

export default CancellationPoliciesScreen;
