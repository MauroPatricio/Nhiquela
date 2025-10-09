import { Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { StarIcon } from 'react-native-heroicons/outline';
import { useNavigation } from '@react-navigation/native';

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
        {/* Container da Imagem com Indicador de Status */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: img }} style={styles.image} />
        </View>
      </View>
          <Text style={{textAlign: 'center', fontWeight:'500'}}>{nome}</Text>
    </TouchableOpacity>
  );
};

export default EstablishmentCard;

const styles = StyleSheet.create({
  card: {
    // backgroundColor: '#ffffff',
    // borderRadius: 12,
    // shadowColor: 'grey',
    // shadowOffset: { width: 0, height: 5 },
    // shadowOpacity: 1,
    // shadowRadius: 8,
    // elevation: 10,
    margin: 5,
    width: 90,
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
    height: 60,
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
