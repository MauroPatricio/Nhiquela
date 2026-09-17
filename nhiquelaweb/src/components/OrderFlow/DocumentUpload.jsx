import React from 'react';
import { Button } from '@mui/material';
import CloudUpload from '@mui/icons-material/CloudUpload';

/**
 * DocumentUpload – UI for selecting a document file.
 * Props:
 *   file: currently selected File object (or null)
 *   onChange: handler(event) to update the selected file
 */
export default function DocumentUpload({ file, onChange }) {
  return (
    <Button
      variant="outlined"
      component="label"
      startIcon={<CloudUpload />}
      fullWidth
      sx={{ mb: 2 }}
    >
      {file ? file.name : 'Selecionar ficheiro'}
      <input hidden type="file" accept="*" onChange={onChange} />
    </Button>
  );
}
