// contexts/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/apiConfig';
import { Alert } from 'react-native';
import websocketService from '../services/websocketService';

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


  transport_type?: string;
  transport_color?: string;
  transport_registration?: string;
  [key: string]: any;
}

export interface User {
  _id?: string;
  name?: string;
  photo?: string;
  profileImage?: string;  // Campo real na BD MongoDB
  email?: string;
  phoneNumber?: string;
  isDeliveryMan?: boolean;
  token?: string;
  deliveryman?: Deliveryman;
  isApproved?: boolean;
  isBanned: boolean;
  isSeller: boolean;
  status?: string;
  availability?: 'active' | 'paused' | 'inactive';
}

interface AuthContextData {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateDeliveryman: (deliverymanData: Partial<Deliveryman>) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  updateDeliveryman: () => {},
  refreshUser: async () => {},
  isAuthenticated: false,
  isLoadingSession: true,
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

  // Vai buscar os dados mais recentes do motorista ao servidor
  const refreshUser = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@app:user');
      if (!storedUser) return;
      const localUser = JSON.parse(storedUser);
      const token = localUser?.token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/drivers/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const freshData = await res.json();

      // Mantém o token local (o backend não devolve token no /me)
      const updatedUser = { ...freshData, token };
      setUser(updatedUser);
      await AsyncStorage.setItem('@app:user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('refreshUser falhou:', e);
    }
  }, []);

  // 🔥 TEMPO REAL: Ouve eventos do websocketService centralizado
  // Atualiza o estado do utilizador directamente a partir do payload do socket
  // SEM chamadas de rede adicionais
  useEffect(() => {
    if (!user?._id) return;

    // 🔔 Admin aprovou / rejeitou / suspendeu a conta do motorista
    const handleDriverStatusUpdated = async (data: any) => {
      console.log('🔔 [AuthContext] driver_status_updated recebido:', data);
      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = {
          ...prevUser,
          status: data.status,
          isApproved: data.isApproved ?? prevUser.isApproved,
          deliveryman: {
            ...prevUser.deliveryman,
            register_conformance: data.register_conformance ?? prevUser.deliveryman?.register_conformance
          }
        };
        AsyncStorage.setItem('@app:user', JSON.stringify(updatedUser));
        return updatedUser;
      });
    };

    // 💰 Saldo actualizado
    const handleWalletUpdated = async (data: any) => {
      Alert.alert('Saldo Atualizado', data.message || 'O seu saldo foi atualizado.');
      await refreshUser();
    };

    websocketService.on('driver_status_updated', handleDriverStatusUpdated);
    websocketService.on('walletUpdated', handleWalletUpdated);

    return () => {
      websocketService.off('driver_status_updated', handleDriverStatusUpdated);
      websocketService.off('walletUpdated', handleWalletUpdated);
    };
  }, [user?._id, refreshUser]);

  const isAuthenticated = !!user;

  const value = { 
    user, 
    login, 
    logout, 
    updateUser, 
    updateDeliveryman, 
    refreshUser,
    isAuthenticated,
    isLoadingSession: loading,
  };

  // Never block children — let AppNavigator handle the loading state
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};