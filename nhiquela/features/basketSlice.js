import { createSlice, configureStore, createSelector } from '@reduxjs/toolkit';
import { Alert } from 'react-native';


function calculateValues(item) {
  const price = item?.onSale ? item?.discount || 0 : item?.price || 0;
  const discount = item?.onSale ? item?.discount || 0 : 0;
  const earnings = item?.onSale ? item?.sellerEarningsAfterDiscount: item?.priceFromSeller || 0;
  
  return { price, discount, earnings };
}

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
    sellerEarningsAfterDiscount: 0,
    totalSellerEarningsAfterDiscount: 0,
    totalPrice: 0,
    currentSellerId: null,
    onSale: false,
    discount: 0,
    price: 0,
  },
  reducers: {
    addToBasket: (state, action) => {
      const newItem = action.payload;
      const { price, discount, earnings } = calculateValues(newItem);
      const newSellerId = newItem?.seller?._id;

      if (state.currentSellerId === null || state.currentSellerId === newSellerId) {
        state.items.push(newItem);
        state.totalItems++;
        state.price += price;
        state.discount += discount;
        state.totalPrice += price;
        state.totalSellerEarningsAfterDiscount += earnings;

        if (state.currentSellerId === null) {
          state.currentSellerId = newSellerId;
        }
  
        if (!state.sellers.some((seller) => seller._id === newSellerId)) {
          state.sellers.push(newItem.seller);
        }
      } else {
        Alert.alert(
          "Produtos do mesmo fornecedor",
          "Só é aceitável adicionar produtos do mesmo fornecedor ao carrinho!"
        );
      }
    },
    removeFromBasket: (state, action) => {
      const itemId = action.payload._id;
      const index = state.items.findIndex((item) => item._id === itemId);
  
      if (index >= 0) {
        const removed = state.items[index];
        const { price, discount, earnings } = calculateValues(removed);
  
        state.totalItems = Math.max(0, state.totalItems - 1);
        state.price = Math.max(0, state.price - price);
        state.discount = Math.max(0, state.discount - discount);
        state.totalPrice = Math.max(0, state.totalPrice - price);
        state.totalSellerEarningsAfterDiscount = Math.max(0, state.totalSellerEarningsAfterDiscount - earnings);
  
        state.items.splice(index, 1);
  
        if (state.items.length === 0) {
          state = Object.assign(state, {
            items: [],
            totalItems: 0,
            totalPriceFromSeller: 0,
            totalPrice: 0,
            currentSellerId: null,
            sellers: [],
            discount: 0,
            price: 0,
            totalSellerEarningsAfterDiscount: 0,
          });
        }
      }
    },
    addTotalToPay: (state, action) => { state.payment = action.payload },
    addIva: (state, action) => { state.iva = action.payload },
    addDeliverPrice: (state, action) => { state.deliverPrice = action.payload },
    addAddress: (state, action) => { state.address = action.payload },
    clearBasket: (state) => {
      state.items = [];

      state.totalItems = 0;
      state.totalPriceFromSeller = 0;
      state.totalPrice = 0;
      state.currentSellerId = null;
      state.sellers = [];

      state.discount = 0;
      state.price = 0;
      state.totalSellerEarningsAfterDiscount = 0;
    },
    clearSellers: (state) => { state.sellers = []; },
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

// Actions
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

export const selectBasketItems = createSelector(selectBasket, (basket) => basket?.items ?? []);

export const selectBasketTotal = createSelector(selectBasket, (basket) => basket?.totalPrice ?? 0);
export const selectDiscount = createSelector(selectBasket, (basket) => basket?.discount ?? 0);
export const selectTotalToPay = createSelector(selectBasket, (basket) => basket?.payment ?? 0);
export const selectIva = createSelector(selectBasket, (basket) => basket?.iva ?? 0);
export const selectDeliverPrice = createSelector(selectBasket, (basket) => basket?.deliverPrice ?? 0);
export const selectSellers = createSelector(selectBasket, (basket) => basket?.sellers ?? []);
export const selectAddress = createSelector(selectBasket, (basket) => basket?.address ?? '');
export const selectPriceFromSeller = createSelector(selectBasket, (basket) => basket?.totalPriceFromSeller ?? 0);

export const selectSellerEarningsAfterDiscount = createSelector(selectBasket, (basket) => basket?.totalSellerEarningsAfterDiscount ?? 0);


export const checkIfSellerExists = (sellerId) =>
  createSelector(selectSellers, (sellers) =>
    sellers.some((seller) => seller?._id === sellerId)
  );

export const getItemsBySellerId = (sellerId) =>
  createSelector(selectBasketItems, (items) =>
    items.filter((item) => item?.seller?._id === sellerId)
  );

export const selectTotalItems = createSelector(selectBasket, (basket) => basket?.totalItems ?? 0);

export const selectBasketItemsWithId = (id) =>
  createSelector(selectBasketItems, (items) =>
    items.filter((item) => item?.id === id)
  );

// Reducer
export default basketSlice.reducer;

// Store configuration
export const store = configureStore({ reducer: { basket: basketSlice.reducer } });