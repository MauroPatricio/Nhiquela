import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, SimpleLineIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import BackBtn from '../BackBtn';

const ProductSellerDetail = () => {
    const {
        params: { product }
    } = useRoute();


    const navigation = useNavigation()

    if (!product) {
        return <Text>Processando...</Text>;
    }

    return (
      <>
      
      {product && (
        <ScrollView style={styles.container}>
      {/* <BackBtn onPress={()=>navigation.goBack()}/> */}

              <Image
                  source={{ uri: product.image }}
                  style={styles.image}
                  resizeMode="contain"
              />
                <View style={styles.icons}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name='chevron-back-circle' size={40} style={styles.back} />
            </TouchableOpacity>
          </View>
              <View style={styles.details}>

              <Text style={styles.name}>{product?.nome}</Text>
              <Text style={styles.price}>Valor do fornecedor: {product.priceFromSeller} MT</Text>
              <Text style={styles.price}>Preço de Venda: {product.price} MT</Text>

              {product.onSale && (
                  <Text style={styles.onSale}>Em promoção: {product.onSalePercentage}% </Text>
              )}
              <Text style={styles.brand}>Marca/sabor: {product.brand}</Text>
              <Text style={styles.description}>{product.description}</Text>
              <Text
                  style={[
                      styles.stock,
                      { color: product.countInStock > 0 ? '#7F00FF' : 'red' }
                  ]}
              >
                  {product.countInStock > 0 ? `Quantidade disponível: ${product.countInStock} unidade(s)` : 'Fora de estoque'}
              </Text>
              <Text style={styles.category}>
                  Categoria: {product.category?.nome || 'Sem categoria'}
              </Text>
              <Text style={styles.province}>
              Localização do produto: {product.province?.name || 'Sem provincia'}
              </Text>
              {/* <Text style={styles.qualityType}>
                  Quality: {product.qualityType?.name || 'Unknown Quality'}
              </Text>
              <Text style={styles.conditionStatus}>
                  Condition: {product.conditionStatus?.name || 'Unknown Condition'}
              </Text> */}
              {/* <Text style={styles.rating}>
                  Pontuação: {product.rating ? product.rating : 'Sem pontuacao'}
              </Text> */}
              </View>
              <View style={{ marginBottom: 210 }} />

          </ScrollView>
      )}
      </>
    );
};

export default ProductSellerDetail;
const styles = StyleSheet.create({
  back: {
    top:40,
    color: '#7F00FF',
  },
  icons: {
    position: 'absolute',
    // top: 40,
    // left: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
  },
  container: {
      flex: 1,
      backgroundColor: '#F9F9F9', // Light background for contrast
      padding: 16,                // Padding around the content
  },
  button: {
      backgroundColor: '#007BFF',        // Blue background for the back button
      paddingVertical: 12,               // Vertical padding for button height
      paddingHorizontal: 20,             // Horizontal padding for button width
      borderRadius: 30,                  // Fully rounded corners
      alignItems: 'center',              // Center button text
      justifyContent: 'center',          // Vertically align text
      alignSelf: 'flex-start',           // Align button to the left
      marginBottom: 20,                  // Space between button and content
      shadowColor: '#000',               // Shadow for depth
      shadowOffset: { width: 0, height: 3 }, // Shadow spread
      shadowOpacity: 0.2,                // Subtle shadow
      shadowRadius: 5,                   // Shadow size
      elevation: 4,                      // Elevation for Android shadow
  },
  buttonText: {
      fontSize: 16,                      // Font size for the button text
      color: '#fff',                     // White text color
      fontWeight: '600',                 // Semi-bold for emphasis
  },
  image: {
      width: '100%',
      height: 300,
      borderRadius: 10,                  // Rounded image corners
      // marginBottom: 20,                  // Space below the image
      backgroundColor: 'white',        // Placeholder color before image loads
  },
  details: {
      backgroundColor: '#fff',           // White background for card effect
      borderRadius: 20,                  // Rounded corners for card
      padding: 20,                       // Padding inside the card
      shadowColor: '#000',               // Shadow for depth
      shadowOffset: { width: 0, height: 2 }, // Subtle shadow
      shadowOpacity: 0.1,                // Light shadow
      shadowRadius: 5,                   // Soft shadow edges
      elevation: 3,                      // Elevation for Android
      marginBottom: 20,                  // Space below the details card
  },
  name: {
      fontSize: 24,                      // Product name font size
      fontWeight: '700',                 // Bold for emphasis
      color: '#333',                     // Dark grey for readability
      textAlign: 'center',               // Center the name
      marginBottom: 10,                  // Spacing below the name
  },
  price: {
      fontSize: 18,                      // Font size for price
      color: '#7F00FF',                  // Green for pricing
      fontWeight: '600',                 // Semi-bold for emphasis
      marginBottom: 10,                  // Spacing below the price
      textAlign: 'center',               // Centered text
  },
  onSale: {
      fontSize: 16,                      // Smaller font for sale info
      color: '#FF6347',                  // Red color for promotions
      fontWeight: '500',                 // Medium font weight for emphasis
      marginBottom: 10,                  // Spacing below sale info
      textAlign: 'center',               // Center the text
  },
  brand: {
      fontSize: 16,                      // Standard font size for brand
      color: '#888',                     // Light grey color for less emphasis
      marginBottom: 10,                  // Spacing below brand info
      textAlign: 'center',               // Center the text
  },
  description: {
      fontSize: 16,                      // Font size for the description
      color: '#555',                     // Medium grey for better readability
      textAlign: 'justify',              // Justify the text for a neat look
      marginBottom: 20,                  // Space below description
  },
  stock: {
      fontSize: 16,                      // Standard font size for stock status
      fontWeight: '600',                 // Semi-bold for emphasis
      textAlign: 'center',               // Center the text
      marginBottom: 10,  
                      // Spacing below stock info
  },
  category: {
      fontSize: 16,                      // Standard font size for category
      color: '#888',                     // Light grey for less emphasis
      textAlign: 'center',               // Center the text
      marginBottom: 10,                  // Spacing below category info
  },
  province: {
      fontSize: 16,                      // Standard font size for province
      color: '#888',                     // Light grey for consistency
      textAlign: 'center',               // Center the text
      marginBottom: 10,                  // Spacing below province info
  },
});
