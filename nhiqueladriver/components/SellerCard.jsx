import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { StarIcon } from 'react-native-heroicons/outline';
import { Ionicons } from '@expo/vector-icons';
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
}) => {
  const navigation = useNavigation();

  const getShortDescription = (text, wordLimit) => {
    const words = text.split(' ');
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(' ') + '... ';
    }
    return text;
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
        });
      }}>
      <View style={styles.card_template}>
        <Image source={{ uri: logo }} style={styles.image} />

        <View style={styles.textContainer}>
          <Text style={styles.name}>{name}</Text>

          <Text style={styles.description}>
            {getShortDescription(description, 7)}
          </Text>

          {/* <View style={styles.location}>
            <Ionicons name="location-outline" color="#7F00FF" size={18} />
            <Text style={styles.locationText}>{address}</Text>
          </View> */}

          <View style={styles.rating}>
            <StarIcon color="darkorange" opacity={0.9} size={18} />
            <Text style={styles.ratingText}>{rating} ({numReviews} reviews)</Text>
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
  image: {
    width: '100%',
    height: 170,
    resizeMode: 'cover',
  },
  textContainer: {
    padding: 2,
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
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#555',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#555',
  },
});
