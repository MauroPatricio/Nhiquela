import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const OrderDetailsScreen = (item) => {
  // const { item } = route.params;

  const order = item.item

  return (
    <ScrollView style={styles.container}>
      {/* <Text style={styles.header}>Order Details</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Customer Info</Text>
        <Text style={styles.label}>Name: <Text style={styles.value}>{item.deliveryAddress.fullName}</Text></Text>
        <Text style={styles.label}>Phone: <Text style={styles.value}>{item.deliveryAddress.phoneNumber}</Text></Text>
        <Text style={styles.label}>City: <Text style={styles.value}>{item.deliveryAddress.city}</Text></Text>
        <Text style={styles.label}>Address: <Text style={styles.value}>{item.deliveryAddress.address}</Text></Text>
        <Text style={styles.label}>Reference: <Text style={styles.value}>{item.deliveryAddress.referenceAddress}</Text></Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Order Info</Text>
        <Text style={styles.label}>Order Code: <Text style={styles.value}>{item.code}</Text></Text>
        <Text style={styles.label}>Payment Method: <Text style={styles.value}>{item.paymentMethod}</Text></Text>
        <Text style={styles.label}>Status: <Text style={styles.value}>{item.status}</Text></Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Pricing</Text>
        <Text style={styles.label}>Items Price: <Text style={styles.value}>{item.itemsPrice}</Text></Text>
        <Text style={styles.label}>IVA Tax: <Text style={styles.value}>{item.ivaTax}</Text></Text>
        <Text style={styles.label}>Delivery Price: <Text style={styles.value}>{item.addressPrice}</Text></Text>
        <Text style={styles.label}>Site Tax: <Text style={styles.value}>{item.siteTax}</Text></Text>
        <Text style={styles.label}>Total Price: <Text style={styles.value}>{item.totalPrice}</Text></Text>
      </View> */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  value: {
    fontWeight: 'bold',
  },
});

export default OrderDetailsScreen;
