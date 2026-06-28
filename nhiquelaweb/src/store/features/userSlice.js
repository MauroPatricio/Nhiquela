import { createSlice } from '@reduxjs/toolkit';

// Carrega initial state do localStorage se existir
const getUserFromStorage = () => {
  try {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  } catch (error) {
    return null;
  }
};

const initialState = {
  userInfo: getUserFromStorage(),
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserLogin: (state, action) => {
      state.userInfo = action.payload;
      localStorage.setItem('userInfo', JSON.stringify(action.payload));
    },
    setUserLogout: (state) => {
      state.userInfo = null;
      localStorage.removeItem('userInfo');
    }
  }
});

export const { setUserLogin, setUserLogout } = userSlice.actions;
export const selectUser = (state) => state.user.userInfo;

export default userSlice.reducer;
