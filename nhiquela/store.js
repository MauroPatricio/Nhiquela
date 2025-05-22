import { configureStore } from "@reduxjs/toolkit";
import basketReducer from "./features/basketSlice";
import sellerReducer from "./features/sellerSlice";
import navReducer from "./features/navSlice";

export const store = configureStore({
  reducer: {
    basket: basketReducer,
    seller: sellerReducer,
    nav: navReducer
  }
})