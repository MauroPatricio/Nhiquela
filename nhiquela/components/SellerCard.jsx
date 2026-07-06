import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { getDistance } from 'geolib';
import { StarIcon } from 'react-native-heroicons/solid';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectUserLocation } from '../features/locationSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from 'react-native-toast-notifications';

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
  const userLocation = useSelector(selectUserLocation);
  const [distance, setDistance] = useState("Calculando...");
  const toast = useToast();
  
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    checkFavoriteStatus();
  }, []);

  const checkFavoriteStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem('@fav_sellers');
      if (stored) {
        const favs = JSON.parse(stored);
        const exists = favs.some(item => item._id === id || item.id === id);
        setIsFavorite(exists);
      }
    } catch (e) {
      console.log('Error checking favorite:', e);
    }
  };

  const toggleFavorite = async () => {
    try {
      const stored = await AsyncStorage.getItem('@fav_sellers');
      let favs = stored ? JSON.parse(stored) : [];
      
      if (isFavorite) {
        favs = favs.filter(item => item._id !== id && item.id !== id);
        if (toast) toast.show('Removido dos favoritos', { type: 'normal', duration: 1500 });
      } else {
        const sellerData = {
          _id: id,
          id: id,
          name: name,
          logo: logo,
          description: description,
          rating: rating,
          numReviews: numReviews,
          tipoEstabelecimento: { nome: description }
        };
        favs.push(sellerData);
        if (toast) toast.show('Adicionado aos favoritos ❤️', { type: 'success', duration: 1500 });
      }
      
      await AsyncStorage.setItem('@fav_sellers', JSON.stringify(favs));
      setIsFavorite(!isFavorite);
    } catch (e) {
      console.log('Error toggling favorite:', e);
    }
  };

  useEffect(() => {
    if (userLocation && latitude && longitude) {
      const dist = getDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
      );
      setDistance((dist / 1000).toFixed(1) + " km");
    } else if (!userLocation) {
      setDistance("Indisponível");
    }
  }, [userLocation, latitude, longitude]);

  const getShortDescription = (text, wordLimit) => {
    const words = text?.split(' ') || [];
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
          
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={toggleFavorite}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={20} 
              color={isFavorite ? "#EF4444" : "#9CA3AF"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.description} numberOfLines={2}>{getShortDescription(description, 7)}</Text>
          
          <View style={styles.ratingRow}>
            <View style={styles.rating}>
              <StarIcon color="#F59E0B" size={16} />
              <Text style={styles.ratingText}>{rating}</Text>
              <Text style={styles.reviewsText}>({numReviews})</Text>
            </View>
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={12} color="#9333EA" />
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default SellerCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginHorizontal: 8,
    marginVertical: 10,
    width: 220, 
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  card_template: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 120, 
    contentFit: 'cover',
  },
  statusOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10, 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  textContainer: {
    padding: 12,
  },
  name: {
    fontSize: 16, 
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 13, 
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12, 
    fontWeight: '700',
    color: '#D97706',
  },
  reviewsText: {
    marginLeft: 2,
    fontSize: 11,
    color: '#92400E',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  distanceText: {
    marginLeft: 3,
    fontSize: 11,
    fontWeight: '600',
    color: '#9333EA',
  }
});

