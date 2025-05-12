import { createSlice } from '@reduxjs/toolkit'

const userSlice = createSlice({
  name: 'user',
  initialState: {
     
      id: null,
      name: null,
      image: null,
      phoneNumer: null,
      email: null,
    
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
    }
  }
})

export const { setUser } = userSlice.actions;

export const selectUser = (state) => state.user.user;


export default userSlice.reducer;
