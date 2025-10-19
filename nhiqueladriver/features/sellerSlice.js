import { createSlice, configureStore } from '@reduxjs/toolkit'

const sellerSlice = createSlice({
  name: 'seller',
  initialState: {
    seller: {
      id: null,
      name: null,
      logo: null,
      description: null,
      rating: null,
      numReviews: null,
      province: null,
      address: null,
      latitude: null,
      longitude: null,
      items: null
    }
  },
  reducers: {
    setSeller: (state, action) => {
      state.seller = action.payload
    }
  }
})

export const { setSeller } = sellerSlice.actions;

export const selectSeller = (state) => state.seller.seller;


export default sellerSlice.reducer;
