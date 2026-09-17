import { createSlice, createSelector } from '@reduxjs/toolkit';

function calculateValues(item) {
  if (!item) return { price: 0, discount: 0, earnings: 0 };

  const price = item?.onSale ? item?.discount || 0 : item?.price || 0;
  const discount = item?.onSale ? item?.discount || 0 : 0;
  const earnings = item?.onSale ? item?.sellerEarningsAfterDiscount || 0 : item?.priceFromSeller || 0;

  return { price, discount, earnings };
}

// Em web, preferimos inicializar do localStorage se quisermos persistência avançada
// Mas para manter a lógica igual ao mobile, começamos vazio e podemos sincronizar no App.
const initialState = {
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
};

const basketSlice = createSlice({
  name: 'basket',
  initialState,
  reducers: {
    addToBasket: (state, action) => {
      const newItem = action.payload;

      if (!newItem?._id || !newItem?.seller?._id) {
        alert('Erro: Item inválido, não pode ser adicionado.');
        return;
      }

      const { price, discount, earnings } = calculateValues(newItem);
      const newSellerId = newItem.seller._id;

      if (state.currentSellerId === null || state.currentSellerId === newSellerId) {
        // Encontrar se já existe para adicionar quantidade (simplificação para web, no mobile ele faz push repetido?)
        // O mobile faz apenas state.items.push(newItem). Vamos manter a exata lógica:
        state.items.push(newItem);
        state.totalItems++;
        // Importante: garantir parse numérico para evitar concatenação de strings
        state.price += Number(price);
        state.discount += Number(discount);
        state.totalPrice += Number(price);
        state.totalSellerEarningsAfterDiscount += Number(earnings);

        if (state.currentSellerId === null) {
          state.currentSellerId = newSellerId;
        }

        if (!state.sellers.some((seller) => seller?._id === newSellerId)) {
          state.sellers.push(newItem.seller);
        }
      } else {
        alert("Produtos de diferentes fornecedores: Só é aceitável adicionar produtos do mesmo fornecedor ao carrinho!");
      }
    },

    removeFromBasket: (state, action) => {
      const itemId = action.payload?._id;
      if (!itemId) return;

      const index = state.items.findIndex((item) => item?._id === itemId);
      if (index >= 0) {
        const removed = state.items[index];
        const { price, discount, earnings } = calculateValues(removed);

        state.totalItems = Math.max(0, state.totalItems - 1);
        state.price = Math.max(0, state.price - Number(price));
        state.discount = Math.max(0, state.discount - Number(discount));
        state.totalPrice = Math.max(0, state.totalPrice - Number(price));
        state.totalSellerEarningsAfterDiscount = Math.max(0, state.totalSellerEarningsAfterDiscount - Number(earnings));

        state.items.splice(index, 1);

        if (state.items.length === 0) {
          Object.assign(state, initialState);
        }
      }
    },

    addTotalToPay: (state, action) => { state.payment = action.payload ?? 0; },
    addIva: (state, action) => { state.iva = action.payload ?? 0; },
    addDeliverPrice: (state, action) => { state.deliverPrice = action.payload ?? 0; },
    addAddress: (state, action) => { state.address = action.payload ?? ''; },

    clearBasket: (state) => {
      Object.assign(state, initialState);
    },

    clearSellers: (state) => { state.sellers = []; },

    removeSeller: (state, action) => {
      const sellerId = action.payload;
      if (!sellerId) return;
      state.sellers = state.sellers.filter((seller) => seller?._id !== sellerId);
    },

    addSellers: (state, action) => {
      const newSeller = action.payload?.seller;
      if (!newSeller?._id) return;

      if (!state.sellers.some((seller) => seller?._id === newSeller._id)) {
        state.sellers.push(newSeller);
      }
    },
  },
});

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

export const selectBasket = (state) => state?.basket ?? {};

export const selectBasketItems = createSelector(
  selectBasket,
  (basket) => basket?.items?.filter(item => item?._id) ?? []
);

export const selectBasketTotal = createSelector(
  selectBasket,
  (basket) => basket?.totalPrice ?? 0
);

export const selectTotalItems = createSelector(
  selectBasket,
  (basket) => basket?.totalItems ?? 0
);

export default basketSlice.reducer;
