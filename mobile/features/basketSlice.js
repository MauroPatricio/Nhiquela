import { createSlice, configureStore } from '@reduxjs/toolkit'

const basketSlice = createSlice({
  name: 'basket',
  initialState: {
    items: [],
    payment:0
  },
  reducers: {
    addToBasket: (state, action) => {
      state.items = [...state.items, action.payload]
    },
    removeFromBasket: (state, action) => {
        
        const index = state.items.findIndex((item)=> item.id === action.payload.id);

        let newBasket = [...state.items];

        if(index >= 0){
            newBasket.splice(index, 1)
        }

        state.items = newBasket;
    },
    addTotalToPay: (state, action) => {

      state.payment = action.payload
    },
  }
})

export const { addToBasket, removeFromBasket, addTotalToPay } = basketSlice.actions

export const selectBasketItems = (state) => state.basket.items;

export const selectBasketItemsWithId = (state, id) => state.basket.items.filter(item => item.id === id);

export const selectBasketTotal = (state) =>
    state.basket.items.reduce((total, item) => (total += item.price), 0)

export const selectTotalToPay = (state) => state.basket.payment;




export default basketSlice.reducer;
// const store = configureStore({
//   reducer: basketSlice.reducer
// })

// Can still subscribe to the store
// store.subscribe(() => console.log(store.getState()))


// store.dispatch(addToBasket())
// // {value: 2}
// store.dispatch(removeFromBasket())
// // {value: 1}