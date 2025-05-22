import { Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { StarIcon } from 'react-native-heroicons/outline';
import { useNavigation } from '@react-navigation/native';

const SellerCard = ({
  id,
  name,
  logo,
  description,
  rating,
  numReviews,
  province,
  address,
  latitude,
  longitude,
  openstore
}) => {
  const navigation = useNavigation();
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState("Calculando...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permissão de localização negada');
        setDistance("Indisponível");
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
      setLoading(false);

      if (location && latitude && longitude) {
        const dist = getDistance(
          { latitude: location.coords.latitude, longitude: location.coords.longitude },
          { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
        );
        setDistance((dist / 1000).toFixed(1) + " km");
      } else {
        setDistance("Indisponível");
      }
    };

    getUserLocation();
  }, []);

  const getShortDescription = (text, wordLimit) => {
    const words = text.split(' ');
    return words.length > wordLimit ? words.slice(0, wordLimit).join(' ') + '... ' : text;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        navigation.navigate('SellerScreen', {
          id,
          name,
          logo,
          description,
          rating,
          numReviews,
          province,
          address,
          latitude,
          longitude,
          openstore
        });
      }}
    >
      <View style={styles.card_template}>
        {/* Container da Imagem com Indicador de Status */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: logo }} style={styles.image} />
          <View style={[styles.statusOverlay, { backgroundColor: openstore ? 'rgba(0, 200, 0, 0.7)' : 'rgba(200, 0, 0, 0.7)' }]}>
            <Text style={styles.statusText}>{openstore ? 'Estamos abertos' : 'Estamos fechados'}</Text>
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.description}>{getShortDescription(description, 7)}</Text>

          <View style={styles.rating}>
            <StarIcon color="darkorange" opacity={0.9} size={18} />
            <Text style={styles.ratingText}>{rating} ({numReviews} comentários)</Text>
          </View>

          {/* Exibir distância */}
          {loading ? (
            <ActivityIndicator size="small" color="gray" />
          ) : (
            <Text style={styles.distance}>📍 {distance}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default SellerCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: 'grey',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
    margin: 10,
    width: 200,
  },
  card_template: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 170,
    resizeMode: 'cover',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statusOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  textContainer: {
    padding: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#555',
  },
  distance: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    marginTop: 5,
  },
});
