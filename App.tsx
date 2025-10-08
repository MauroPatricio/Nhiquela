// App.tsx - APENAS AS CORREÇÕES NECESSÁRIAS
import React, { useState, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { LoadingProvider, useLoadingContext } from "./src/context/LoadingContext";
import { AuthProvider } from "./src/context/AuthContext"; // ✅ ADICIONAR AuthProvider

// Componente interno que usa o contexto
function AppContent() {
  const [loading, setLoading] = useState(true);
  const { showLoading, hideLoading } = useLoadingContext();

  useEffect(() => {
    // Simular algum carregamento inicial
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return <AppNavigator />;
}

// Componente principal
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <LoadingProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LoadingProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#FFF"
  }
});