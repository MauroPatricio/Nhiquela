import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';

const { width } = Dimensions.get('window');

const SellersList = () => {
  const route = useRoute();
  const { sellers } = route.params || [];

  const [currentPage, setCurrentPage] = useState(0);

  // Handle pagination by setting the current page
  const handlePageChange = (event) => {
    const { position } = event.nativeEvent;
    setCurrentPage(position);
  };

  return (
    <SafeAreaView style={styles.container}>
      <PagerView 
        style={styles.pagerView} 
        initialPage={0} 
        onPageSelected={handlePageChange}
      >
        {sellers && sellers.map((seller, index) => (
          <View style={styles.sellerCard} key={index}>
            <Text style={styles.sellerName}>{seller.name}</Text>
            <Text style={styles.sellerDescription}>{seller.description}</Text>
            {/* Add more seller details here */}
          </View>
        ))}
      </PagerView>

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {sellers.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.paginationDot,
              currentPage === index && styles.activeDot,
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

export default SellersList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pagerView: {
    flex: 1,
    width: '100%',
  },
  sellerCard: {
    width: width * 0.9,
    padding: 20,
    margin: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sellerDescription: {
    fontSize: 14,
    color: '#666',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#007BFF',
  },
});
