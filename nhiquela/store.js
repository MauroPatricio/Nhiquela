import { configureStore } from "@reduxjs/toolkit";
import basketReducer from "./features/basketSlice";
import sellerReducer from "./features/sellerSlice";
import navReducer from "./features/navSlice";
import locationReducer from "./features/locationSlice";

const loggerMiddleware = storeAPI => next => action => {
  if (typeof action === 'undefined' || action === undefined) {
    console.error("🚨 ERRO CRÍTICO: DISPATCH DE ACTION UNDEFINED 🚨 (bloqueado)");
    return; // Block the undefined action from propagating
  }
  return next(action);
};

export const store = configureStore({
  reducer: {
    basket: basketReducer,
    seller: sellerReducer,
    nav: navReducer,
    location: locationReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(loggerMiddleware)
});