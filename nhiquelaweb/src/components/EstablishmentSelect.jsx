import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

/**
 * EstablishmentSelect – reusable dropdown for choosing an establishment.
 * Props:
 *   establishments: array of establishment objects { _id, name }
 *   value: currently selected establishment id
 *   onChange: handler to update selected value
 */
export default function EstablishmentSelect({ establishments, value, onChange }) {
  return (
    <FormControl fullWidth sx={{ mb: 2 }}>
      <InputLabel id="est-select-label">Estabelecimento</InputLabel>
      <Select labelId="est-select-label" label="Estabelecimento" value={value} onChange={onChange}>
        {establishments.map((est) => (
          <MenuItem key={est._id} value={est._id}>
            {est.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
