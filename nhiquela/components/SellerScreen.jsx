import { SafeAreaView, ScrollView, StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../hooks/createConnectionApi';
import SellerProduct from './SellerProduct';
import BasketIcon from './BasketIcon';
import { useDispatch } from 'react-redux';
import { setSeller } from '../features/sellerSlice';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const SellerScreen = () => {
  const { params: { id, name, logo, description, rating, numReviews, province, address, latitude, longitude, openstore } } = useRoute();
  const navigation = useNavigation();
  const sellerId = id;
  const [productsBySeller, setProductsBySeller] = useState(null);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState("Calculando...");
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setSeller({ id, name, logo, description, rating, numReviews, province, address, latitude, longitude }));
  }, []);

  useEffect(() => {
    const getUserLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permissão de localização negada');
        setDistance("Indisponível");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const userLat = location.coords.latitude;
      const userLon = location.coords.longitude;

      if (latitude && longitude) {
        setDistance(calculateDistance(userLat, userLon, parseFloat(latitude), parseFloat(longitude)) + " km");
      } else {
        setDistance("Indisponível");
      }
    };

    getUserLocation();
  }, [latitude, longitude]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products?seller=${sellerId}`);
      if (response.status == 200) {
        setLoading(false);
        setProductsBySeller(response.data.products);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShow: false });
  }, []);

  return (
    <>
      <BasketIcon />

      <ScrollView style={{ backgroundColor: '#F5F5F5' }}>
        <Image source={{ uri: logo, height: 300 }} style={styles.logo} />
        <View style={styles.icons}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name='chevron-back-circle' size={35} style={styles.back} />
          </TouchableOpacity>
        </View>

        <View style={styles.view}>
          <View style={styles.rating}>
            <Text style={styles.sellerName}>{name}</Text>
            {/* <View style={styles.ratingContainer}>
              <Ionicons name="star" color={'gold'} size={22} />
              <Text style={styles.ratingText}>{rating}</Text>
            </View> */}
          </View>

          {latitude && longitude ? (
            <View style={styles.mapContainer}>
              <Text style={styles.mapTitle}>Localização do Fornecedor</Text>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: parseFloat(latitude),
                  longitude: parseFloat(longitude),
                  latitudeDelta: 0.001,
                  longitudeDelta: 0.001,
                }}
              >
                <Marker coordinate={{ latitude: parseFloat(latitude), longitude: parseFloat(longitude) }} title="Localização do Vendedor" />
              </MapView>
            </View>
          ) : (
            <Text style={styles.locationText}>Localização do vendedor não disponível.</Text>
          )}

          <Text style={styles.distanceText}>Distância: {distance}</Text>

          <Text style={styles.openstore}>{openstore ? 'Estamos abertos' : 'Estamos fechados'}</Text>

          <Text style={styles.sectionTitle}>Endereço:</Text>
          <View style={styles.details}>
            {/* <View style={styles.address}> */}
              <Ionicons name='location-outline' color="#7F00FF" size={22} />
              <Text style={styles.addressText}><Text style={{ fontWeight: '500' }}>{province?.name}</Text> - {address}</Text>
            {/* </View> */}
          </View>

          <View style={styles.description}>
            <Text style={styles.sectionTitle}>Especialidade:</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.title}>Produtos</Text>
        </View>

        <View style={styles.productView}>
          {productsBySeller && productsBySeller.map((product) => (
            <SellerProduct
              key={product._id}
              id={product._id}
              nome={product.nome}
              name={product.name}
              image={product.image}
              images={product.images}
              description={product.description}
              rating={product.rating}
              numReviews={product.numReviews}
              province={product.province}
              address={product.address}
              priceFromSeller={product.priceFromSeller}
              price={product.price}
              onSale={product.onSale}
              countInStock={product.countInStock}
              seller={product.seller}
              sellerName={product.seller.seller.name}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
};

export default SellerScreen;

const styles = StyleSheet.create({
  logo: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
  },
  icons: {
    position: 'absolute',
    top: 30,
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  back: {
    color: 'black',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 22,
    padding: 5,
  },
  view: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sellerName: {
    fontSize: 30,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 5,
  },
  details: {
    flexDirection: 'column',
    marginTop: 10,
  },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  addressText: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 5,
  },
  distanceText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
    color: '#7F00FF',
  },
  openstore: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
    // color: openstore ? 'green' : 'red',
  },
  description: {
    marginTop: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666666',
  },
  mapContainer: {
    marginTop: 10,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7F00FF',
    marginBottom: 10,
  },
  map: {
    height: 150,
    width: '100%',
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  productView: {
    paddingBottom: 90,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7F00FF',
    marginBottom: 10,
  },
});