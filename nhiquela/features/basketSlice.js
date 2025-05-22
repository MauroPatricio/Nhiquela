import { createSlice, configureStore, createSelector } from '@reduxjs/toolkit';
import {  Alert } from 'react-native';


// Basket slice
const basketSlice = createSlice({
  name: 'basket',
  initialState: {
    items: [],
    payment: 0,
    iva: 0,
    deliverPrice: 0,
    sellers: [],
    address: '',
    totalItems: 0,
    totalPriceFromSeller: 0,
    totalPrice: 0,
    currentSellerId: null, // Track the current seller ID
  },
  reducers: {
    addToBasket: (state, action) => {
      const newItem = action.payload;
      const newSellerId = newItem.seller._id;

      // Se o carrinho estiver vazio ou o novo item pertencer ao mesmo fornecedor
      if (state.currentSellerId === null || state.currentSellerId === newSellerId) {
        state.items.push(newItem);
        state.totalItems += 1;
        state.totalPriceFromSeller += newItem.priceFromSeller;
        state.totalPrice += newItem.price;

        // Atualiza o ID do fornecedor se o carrinho estava vazio
        if (state.currentSellerId === null) {
          state.currentSellerId = newSellerId;
        }

        // Adiciona o fornecedor à lista se ainda não estiver presente
        if (!state.sellers.some((seller) => seller._id === newSellerId)) {
          state.sellers.push(newItem.seller);
        }
      } else {
        // Se o novo item for de outro fornecedor, exibe um aviso

        Alert.alert("Produtos do mesmo fornecedor", 'Só é aceitável adicionar produtos do mesmo fornecedor ao carrinho!')
        // setTimeout(() => {
        //   Toast.show({
        //     type: 'error',
        //     text1: 'Só é aceitável adicionar produtos do mesmo fornecedor ao carrinho!',
        //     position: 'top',
        //   });
        // }, 0);
        
        return;
      }
     
      
    },
    removeFromBasket: (state, action) => {
      const index = state.items.findIndex((item) => item._id === action.payload._id);
      if (index >= 0) {
        const removedItem = state.items[index];
        state.totalItems = Math.max(0, state.totalItems - 1);
        state.totalPriceFromSeller = Math.max(0, state.totalPriceFromSeller - removedItem.priceFromSeller);
        state.totalPrice = Math.max(0, state.totalPrice - removedItem.price);
        state.items.splice(index, 1);

        // Se o carrinho estiver vazio, reseta o ID do fornecedor
        if (state.items.length === 0) {
          state.currentSellerId = null;
          state.sellers = [];
        }
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
    addAddress: (state, action) => {
      state.address = action.payload;
    },
    clearBasket: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.totalPriceFromSeller = 0;
      state.totalPrice = 0;
      state.currentSellerId = null;
      state.sellers = [];
    },
    clearSellers: (state) => {
      state.sellers = [];
    },
    removeSeller: (state, action) => {
      state.sellers = state.sellers.filter((seller) => seller._id !== action.payload);
    },
    addSellers: (state, action) => {
      if (!state.sellers.some((seller) => seller._id === action.payload.seller._id)) {
        state.sellers.push(action.payload.seller);
      }
    },
  },
});

// Export actions
export const {
  addToBasket,
  removeFromBasket,
  addTotalToPay,
  addIva,
  addDeliverPrice,
  addSellers,
  removeSeller,
  clearBasket,
  clearSellers,
  addAddress,
} = basketSlice.actions;

// Selectors
export const selectBasket = (state) => state?.basket ?? {};

export const selectBasketItems = createSelector(
  selectBasket,
  (basket) => basket?.items ?? []
);

export const selectBasketTotal = createSelector(
  selectBasketItems,
  (items) => items.reduce((total, item) => total + (item?.price || 0), 0)
);

export const selectTotalToPay = createSelector(
  selectBasket,
  (basket) => basket?.payment ?? 0
);

export const selectIva = createSelector(
  selectBasket,
  (basket) => basket?.iva ?? 0
);

export const selectDeliverPrice = createSelector(
  selectBasket,
  (basket) => basket?.deliverPrice ?? 0
);

export const selectSellers = createSelector(
  selectBasket,
  (basket) => basket?.sellers ?? []
);

export const selectAddress = createSelector(
  selectBasket,
  (basket) => basket?.address ?? ''
);

export const checkIfSellerExists = (sellerId) =>
  createSelector(selectSellers, (sellers) =>
    sellers.some((seller) => seller?._id === sellerId)
  );

export const getItemsBySellerId = (sellerId) =>
  createSelector(selectBasketItems, (items) =>
    items.filter((item) => item?.seller?._id === sellerId)
  );

export const selectTotalItems = createSelector(
  selectBasket,
  (basket) => basket?.totalItems ?? 0
);

export const selectTotalPriceFromSeller = createSelector(
  selectBasket,
  (basket) => basket?.totalPriceFromSeller ?? 0
);

export const selectTotalPrice = createSelector(
  selectBasket,
  (basket) => basket?.totalPrice ?? 0
);

export const selectBasketItemsWithId = (id) =>
  createSelector(selectBasketItems, (items) =>
    items.filter((item) => item?.id === id)
  );

// Basket reducer
export default basketSlice.reducer;

// Store configuration
const store = configureStore({
  reducer: { basket: basketSlice.reducer },
});

export { store };