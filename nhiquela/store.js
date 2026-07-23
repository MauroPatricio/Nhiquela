import { configureStore } from "@reduxjs/toolkit";
import basketReducer from "./features/basketSlice";
import sellerReducer from "./features/sellerSlice";
import navReducer from "./features/navSlice";
import locationReducer from "./features/locationSlice";

export const store = configureStore({
  reducer: {
    basket: basketReducer,
    seller: sellerReducer,
    nav: navReducer,
    location: locationReducer,
  }
})