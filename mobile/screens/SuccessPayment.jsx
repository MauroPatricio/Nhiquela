import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SuccessPayment = () => {
  const navigation = useNavigation();
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons 
          name='check-circle'
          size={200}
          color={'#4CAF50'} // Green color for success
          style={styles.iconStyle}
        />
      </View>
      <View style={styles.messageContainer}>
        <Text style={styles.title}>Pagamento efectuado com sucesso</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.buttonText}>Página principal</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default SuccessPayment;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8', // Light background for contrast
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  messageContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333', // Darker color for text
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4CAF50', // Green background for button
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    elevation: 3, // Adds shadow on Android
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  iconStyle: {
    color: '#4CAF50', // Consistent icon color
  },
});
