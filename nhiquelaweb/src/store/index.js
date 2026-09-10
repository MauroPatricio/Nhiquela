import { configureStore } from "@reduxjs/toolkit";
import basketReducer from "./features/basketSlice";
import userReducer from "./features/userSlice";

export const store = configureStore({
  reducer: {
    basket: basketReducer,
    user: userReducer,
  }
});
