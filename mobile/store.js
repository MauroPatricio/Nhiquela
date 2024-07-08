import { configureStore } from "@reduxjs/toolkit";
import basketReducer from "./features/basketSlice";
import sellerReducer from "./features/sellerSlice";

export const store = configureStore({
  reducer: {
    basket: basketReducer,
    seller: sellerReducer
  }
})