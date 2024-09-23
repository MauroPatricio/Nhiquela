import { createSlice, configureStore } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

// Basket slice
const basketSlice = createSlice({
  name: 'basket',
  initialState: {
    items: [],
    payment: 0,
    iva: 0,
    deliverPrice: 0,
    sellers:[]
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

    clearBasket: (state, action) => {
      state.items = [];
    },

    clearSellers: (state, action) => {
      state.sellers = [];
    },

    removeSeller: (state, action) => {
      // Filter out the seller by their sellerId
      state.sellers = state.sellers.filter(seller => seller.sellerId !== action.payload);
    },
    
    addSellers: (state, action) => {
      // Check if the seller already exists in the sellers array
      const sellerExists = state.sellers.find(seller => seller.sellerId === action.payload.sellerId);
      
      if (!sellerExists) {
        // Add the seller if they do not exist in the array
        state.sellers = [...state.sellers, action.payload];
      }
    }
    
    
  },
});

export const { addToBasket, removeFromBasket, addTotalToPay, addIva, addDeliverPrice, addSellers, removeSeller, clearBasket, clearSellers } = basketSlice.actions;

// Selectors
export const selectBasketItems = (state) => state.basket.items || [];

export const selectBasketItemsWithId = (state, id) =>
  state.basket.items.filter((item) => item.id === id);

export const selectBasketTotal = (state) =>
  state.basket.items.reduce((total, item) => total + item.price, 0);

export const selectTotalToPay = (state) => state.basket.payment;

export const selectIva = (state) => state.basket.iva;

export const selectDeliverPrice = (state) => state.basket.deliverPrice;

export const selectSellers = (state) => state.basket.sellers || [];


export const checkIfSellerExists = (sellerId) => {
  return (state) => state.basket.sellers.some(seller => seller.sellerId === sellerId);
};

export const getItemsBySellerId = (sellerId) => {
  return (state) => state.basket.items.filter(item => item.seller._id === sellerId);
};





// Basket reducer
export default basketSlice.reducer;

// Store configuration
const store = configureStore({
  reducer: {
    basket: basketSlice.reducer
  },
});

export { store };
