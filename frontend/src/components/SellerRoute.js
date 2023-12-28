import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Store } from '../Store';

export default function SellerRoute({ children }) {
  const { state } = useContext(Store);
  const { userInfo } = state;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return userInfo  && userInfo.isSeller ? children : <Navigate to="/signin" />;
}
