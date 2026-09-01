import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userCoords: null, // { latitude, longitude }
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocationStart: (state) => {
      state.status = 'loading';
    },
    setLocationSuccess: (state, action) => {
      state.status = 'succeeded';
      state.userCoords = action.payload;
      state.error = null;
    },
    setLocationFailure: (state, action) => {
      state.status = 'failed';
      state.error = action.payload;
    },
  },
});

export const { setLocationStart, setLocationSuccess, setLocationFailure } = locationSlice.actions;

export const selectUserLocation = (state) => state.location.userCoords;

export default locationSlice.reducer;
