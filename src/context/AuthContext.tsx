// contexts/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interfaces completas
export interface Deliveryman {
  _id?: string;
  name?: string;
  phoneNumber?: string;
  register_conformance?: string;
  todayEarnings?: string;
  totalTrips?: number;
  balance?: string;
  rating?: number;
  photo?: String,


  transport_type?: string,
  transport_color?: string,
  transport_registration?: string,
  // Adicione outros campos que você precisa
}

export interface User {
  _id?: string;
  name?: string;
  photo?: string;
  email?: string;
  phoneNumber?: string;
  isDeliveryMan?: boolean;
  token?: string;
  deliveryman?: Deliveryman;
}

interface AuthContextData {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateDeliveryman: (deliverymanData: Partial<Deliveryman>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  updateDeliveryman: () => {},
  isAuthenticated: false
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Recupera sessão ao iniciar a app
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@app:user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = useCallback(async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem('@app:user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem('@app:user');
    await AsyncStorage.removeItem('authToken');
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser(prevUser => {
      const updatedUser = prevUser ? { ...prevUser, ...userData } : null;
      if (updatedUser) {
        AsyncStorage.setItem('@app:user', JSON.stringify(updatedUser));
      }
      return updatedUser;
    });
  }, []);

  const updateDeliveryman = useCallback((deliverymanData: Partial<Deliveryman>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      
      const updatedUser = {
        ...prevUser,
        deliveryman: {
          ...prevUser.deliveryman,
          ...deliverymanData
        }
      };
      AsyncStorage.setItem('@app:user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const isAuthenticated = !!user;

  const value = { 
    user, 
    login, 
    logout, 
    updateUser, 
    updateDeliveryman, 
    isAuthenticated 
  };

  if (loading) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};