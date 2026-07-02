import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { styled } from '@mui/system';
import axios from 'axios';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Glass-morphism container for the whole screen
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

// Dialog styling – also glassy
const GlassDialog = styled(Dialog)({
  '& .MuiPaper-root': {
    backdropFilter: 'blur(12px)',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
  },
});

/**
 * EstablishmentsScreen – admin UI to view, create, edit and delete establishments.
 * Uses MUI DataGrid with a premium glass-morphism look.
 */
const EstablishmentsScreen = () => {
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formValues, setFormValues] = useState({ name: '', type: '' });

  // Load data from backend
  const fetchData = async () => {
    try {
      const res = await axios.get('/api/admin/establishments');
      setEstablishments(res.data || []);
    } catch (err) {
      console.error('Failed to load establishments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpen = (item = null) => {
    setEditingItem(item);
    setFormValues(item ? { name: item.name, type: item.type } : { name: '', type: '' });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleChange = (e) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await axios.put(`/api/admin/establishments/${editingItem._id}`, formValues);
      } else {
        await axios.post('/api/admin/establishments', formValues);
      }
      await fetchData();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      handleClose();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this establishment?')) return;
    try {
      await axios.delete(`/api/admin/establishments/${id}`);
      await fetchData();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const columns = [
    { field: '_id', headerName: 'ID', width: 220, hide: true },
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'type', headerName: 'Type', flex: 1 },
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
        <h2>Establishments Management</h2>
        <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={() => handleOpen()}>New</Button>
      </Box>
      {loading ? (
        <CircularProgress />
      ) : (
        <DataGrid
          rows={establishments}
          columns={columns}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          disableSelectionOnClick
          getRowId={(row) => row._id}
        />
      )}

      {/* ---------- Dialog for Create / Edit ---------- */}
      <GlassDialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Establishment' : 'New Establishment'}</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Name"
            name="name"
            fullWidth
            margin="normal"
            value={formValues.name}
            onChange={handleChange}
          />
          <TextField
            label="Type"
            name="type"
            fullWidth
            margin="normal"
            value={formValues.type}
            onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Save</Button>
        </DialogActions>
      </GlassDialog>
    </GlassContainer>
  );
};

export default EstablishmentsScreen;
