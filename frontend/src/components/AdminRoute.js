import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Store } from '../Store';

export default function AdminRoute({ children }) {
  const { state } = useContext(Store);
  const { userInfo } = state;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return userInfo  && userInfo.isAdmin ? children : <Navigate to="/signin" />;
  
}
