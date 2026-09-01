import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { StarIcon } from 'react-native-heroicons/outline';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EstablishmentCard = ({
  id,
  nome,
  img
}) => {
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        navigation.navigate('SellersByEstablishment', {
          id,
          img,
          nome
        });
      }}
    >
      <View style={styles.card_template}>
        {/* Container da Imagem */}
        <View style={[styles.imageContainer, { backgroundColor: img?.startsWith('http') ? 'transparent' : '#F3E8FF', justifyContent: 'center', alignItems: 'center', height: 85 }]}>
          {img && img.startsWith('http') ? (
            <Image source={{ uri: img }} style={styles.image} />
          ) : (
            <MaterialCommunityIcons name={img || 'storefront-outline'} size={40} color="#7F00FF" />
          )}
        </View>
      </View>
      <Text style={styles.titleText} numberOfLines={1}>{nome}</Text>
    </TouchableOpacity>
  );
};

export default EstablishmentCard;

const styles = StyleSheet.create({
  card: {
    marginRight: 16,
    width: 110,
    alignItems: 'center',
  },
  card_template: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    height: 85,
    contentFit: 'cover',
  },
  titleText: {
    textAlign: 'center', 
    fontWeight:'700', 
    color: '#1F2937', 
    fontSize: 14,
    marginTop: 2,
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

