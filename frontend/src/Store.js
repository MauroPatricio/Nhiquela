import { createContext, useReducer } from 'react';

export const Store = createContext();

const initialState = {
  userInfo: localStorage.getItem('userInfo')
    ? JSON.parse(localStorage.getItem('userInfo'))
    : null,

  cart: {
    address: localStorage.getItem('address')
      ? JSON.parse(localStorage.getItem('address'))
      : {},
    cartItems: localStorage.getItem('cartItems')
      ? JSON.parse(localStorage.getItem('cartItems'))
      : [],

    paymentMethod: localStorage.getItem('paymentMethod')
      ? JSON.parse(localStorage.getItem('paymentMethod'))
      : '',
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM_ON_CART':
      // ADICIONANDO NO CARRINHO

      const newItem = action.payload;
      const stateCartItems = state.cart.cartItems;
      const existItem = stateCartItems.find((item) => item._id === newItem._id);
      const cartItems = existItem
        ? state.cart.cartItems.map((item) =>
            item._id === existItem._id ? newItem : item
          )
        : [...state.cart.cartItems, newItem];

      localStorage.setItem('cartItems', JSON.stringify(cartItems));

      return {
        ...state,
        cart: {
          ...state.cart,
          cartItems,
        },
      };
    case 'REMOVE_ITEM_ON_CART': {
      const cartItems = state.cart.cartItems.filter(
        (item) => item._id !== action.payload._id
      );
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      return {
        ...state,
        cart: {
          ...state.cart,
          cartItems,
        },
      };
    }

    case 'USER_SIGNIN': {
      localStorage.setItem('userInfo', JSON.stringify(action.payload));
      return { ...state, userInfo: action.payload };
    }
    case 'USER_SIGNUP': {
      localStorage.setItem('newUser', JSON.stringify(action.payload));
      return { ...state, newUser: action.payload };
    }

    case 'USER_SIGNOUT': {
      localStorage.removeItem('userInfo');
      localStorage.removeItem('address');
      localStorage.removeItem('paymentMethod');
      window.location.href = '/signin';

      return {
        ...state,
        userInfo: null,

        cart: { cartItems: [], address: {}, paymentMethod: '' },
      };
    }

    case 'SAVE_ADDRESS': {
      return {
        ...state,
        cart: {
          ...state.cart,
          address: action.payload,
        },
      };
    }

    case 'SAVE_PAYMENT_METHOD': {
      localStorage.setItem('paymentMethod', JSON.stringify(action.payload));

      return {
        ...state,
        cart: {
          ...state.cart,
          paymentMethod: action.payload,
        },
      };
    }

    case 'CART_CLEAR': {
      localStorage.removeItem('cartItems');
      return {
        ...state,
        cart: { ...state.cart, cartItems: [] },
      };
    }
    default:
      return state;
  }
}
export function StoreProvider(props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = { state, dispatch };
  return <Store.Provider value={value}>{props.children}</Store.Provider>;
}
