import { createSlice, configureStore } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

// Basket slice
const basketSlice = createSlice({
  name: 'basket',
  initialState: {
    items: [],
    payment: 0,
    iva: 0,
    deliverPrice: 0
  },
  reducers: {
    addToBasket: (state, action) => {
      state.items.push(action.payload);  // Push is simpler here
    },
    removeFromBasket: (state, action) => {
      const index = state.items.findIndex((item) => item.id === action.payload.id);

      if (index >= 0) {
        state.items.splice(index, 1);  // Directly removing the item from state
      } else {
        console.warn(`Can't remove product (id: ${action.payload.id}) as it's not in the basket!`);
      }
    },
    addTotalToPay: (state, action) => {
      state.payment = action.payload;
    },

    addIva: (state, action) => {
      state.iva = action.payload;
    },

    addDeliverPrice: (state, action) => {
      state.deliverPrice = action.payload;
    },


  },
});

export const { addToBasket, removeFromBasket, addTotalToPay, addIva, addDeliverPrice } = basketSlice.actions;

// Selectors
export const selectBasketItems = (state) => state.basket.items;

export const selectBasketItemsWithId = (state, id) =>
  state.basket.items.filter((item) => item.id === id);

export const selectBasketTotal = (state) =>
  state.basket.items.reduce((total, item) => total + item.price, 0);

export const selectTotalToPay = (state) => state.basket.payment;

export const selectIva = (state) => state.basket.iva;

export const selectDeliverPrice = (state) => state.basket.deliverPrice;





// Basket reducer
export default basketSlice.reducer;

// Store configuration
const store = configureStore({
  reducer: {
    basket: basketSlice.reducer
  },
});

export { store };
