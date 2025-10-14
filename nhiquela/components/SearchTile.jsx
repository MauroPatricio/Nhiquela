import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { useNavigation } from '@react-navigation/native';

const SearchTile = ({ item }) => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('ProductDetail', { item })}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image || item.item.image }}
          style={styles.productImg}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.productTitle}>
          {item.nome
            ? item.nome.length < 30
              ? item.nome
              : item.nome.substring(0, 30) + '...'
            : item.name.length < 30
            ? item.name
            : item.name.substring(0, 30) + '...'}
        </Text>

        <Text style={styles.price}>{item.price} MT</Text>
        {item.seller && (
           
          <Text style={styles.seller}>
             Fornecedor: {item.seller.seller.name.length < 20
              ? item.seller.seller.name
              : item.seller.seller.name.substring(0, 25) + '...'}
          </Text>
        )}

      </View>
    </TouchableOpacity>
  );
};

export default SearchTile;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 16,
    padding: 12,
    marginHorizontal: 16,
  },
  imageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  seller: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7F00FF', // Roxo para destacar o preço
  },
});