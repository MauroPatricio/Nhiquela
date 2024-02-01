import { createContext, useReducer } from 'react';

export const Store = createContext();

const initialState = {
  userInfo: localStorage.getItem('userInfo') 
    ? JSON.parse(localStorage.getItem('userInfo'))
    : null,

    requestDeliverman: localStorage.getItem('requestDeliverman') 
    ? JSON.parse(localStorage.getItem('requestDeliverman'))
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

      deliveryOptionValue: localStorage.getItem('deliveryOptionValue')
    ? JSON.parse(localStorage.getItem('deliveryOptionValue'))
    : '',

    ordersBySeller: localStorage.getItem('ordersBySeller') !== 'undefined'
    ? JSON.parse(localStorage.getItem('ordersBySeller'))
    : [],
  },
  changelng: localStorage.getItem('changelng') ? JSON.parse(localStorage.getItem('changelng'))
  : 'pt',
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
        error:''
      };

      case 'ADD_ITEM_FAIL':{
        return {...state, error: action.payload}
      }

  

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
      return { ...state, error: '',userInfo: action.payload };
    }
    case 'USER_SIGNUP': {
      localStorage.setItem('newUser', JSON.stringify(action.payload));
      return { ...state, error: '', newUser: action.payload };
    }

    case 'USER_SIGNOUT': {
      localStorage.removeItem('userInfo');
      localStorage.removeItem('address');
      localStorage.removeItem('paymentMethod');
      localStorage.removeItem('changelng');

      window.location.href = '/signin';

      return {
        ...state,
        error: '',
        userInfo: null,

        cart: { cartItems: [], address: {}, paymentMethod: '' },
        changelng:''
      };
    }

    case 'SAVE_ADDRESS': {
      return {
        ...state,
        error: '',
        cart: {
          ...state.cart,
          address: action.payload,
        },
      };
    }

    case 'CHANGE_LNG': {
      localStorage.setItem('changelng', JSON.stringify(action.payload));

      return {
        ...state,
        error: '',
        changelng: action.payload
      };
    }

    case 'SAVE_PAYMENT_METHOD': {
      localStorage.setItem('paymentMethod', JSON.stringify(action.payload));

      return {
        ...state,
        error: '',
        cart: {
          ...state.cart,
          paymentMethod: action.payload,
        },
      };
    }


    case 'SAVE_DELIVERY_OPTION': {
      localStorage.setItem('deliveryOptionValue', JSON.stringify(action.payload));

      return {
        ...state,
        error: '',
        cart: {
          ...state.cart,
          deliveryOptionValue: action.payload,
        },
      };
    }

    case 'CART_CLEAR': {
      localStorage.removeItem('cartItems');
      return {
        ...state,
        error: '',
        cart: { ...state.cart, cartItems: [] },
      };
    }


    case 'ADD_REQUEST_DELIVERMAN':{
      localStorage.setItem('requestDeliverman', JSON.stringify(action.payload));
      return {...state, requestDeliverman: action.payload}
    }


    case 'ORDERS_BY_SELLER': {
      localStorage.setItem('ordersBySeller', JSON.stringify(action.payload));

      return {
        ...state,
        error: '',
        cart: {
          ...state.cart,
          ordersBySeller: action.payload,
        },
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
