import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { StarIcon } from 'react-native-heroicons/outline';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge } from 'react-native-paper';
import { selectBasketItemsWithId } from '../features/basketSlice';
import { useDispatch, useSelector } from 'react-redux';

const ProductCard = ({
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
  countInStock,
  seller,
  item
}) => {
  const navigation = useNavigation();

  const items = useSelector((state) =>selectBasketItemsWithId(state, item._id));

  const getShortDescription = (text, wordLimit) => {
    const words = text.split(' ');
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(' ') + '... ';
    }
    return text;
  };

  const dispatch = useDispatch();

  const _id = id

  return (
   <TouchableOpacity
  style={styles.card}
  onPress={() => navigation.navigate("ProductDetail", { item })}>
  <View style={styles.card_template}>
    <Image source={{ uri: logo }} style={styles.image} />

    {/* Se o item estiver em promoção, exibe o badge e a percentagem */}
    {item.item.onSale && (
      <>
       <View style={styles.statusOverlay}>
          <Text style={styles.badgeTextOnSale}>
            Promoção
          </Text>
          <Text style={styles.badgeTextOnSale}>
            {item.item.onSalePercentage}%
          </Text>
        </View>
      </>
    )}

    <View style={styles.details}>
      {/* Agora o nome do item */}
      <Text style={styles.title} numberOfLines={1}>
        {item.item.name}
      </Text>

      {/* Vendedor */}
      <Text style={styles.supplier} numberOfLines={1}>
        {seller.seller.name}
      </Text>
                    {/* Estoque ou pedido */}
      <Text>
        {item.item.isOrdered ? (
          <Badge style={styles.badgeOrdered}>
            Por encomenda
          </Badge>
        ) : item.item.countInStock !== 0 ? (
          <Text style={styles.badgeInStock}>
            {item.item.countInStock} unidade(s)
          </Text>
        ) : (
          <Badge style={styles.badgeOutOfStock}>
            Sem estoque
          </Badge>
        )}

      </Text>

      {/* Agora o valor exibe o discount se estiver em promoção */}
                  <View style={styles.priceContainer}>
                {item.item.onSale ? (
                  <>
                    {/* Preço com desconto */}
                    <Text style={styles.discountPrice}>
                      {item.item.discount} MT
                    </Text>

                    {/* Preço original, riscado e menor */}
                    <Text style={styles.originalPrice}>
                      {item.item.price} MT
                    </Text>
                  </>
                ) : (
                  <Text style={styles.discountPrice}>
                    {item.item.price} MT
                  </Text>
                )}

              </View>
    
    </View>

    {/* Botão de comprar */}
    <TouchableOpacity style={styles.addBtn}>
      <Ionicons name='cart' size={25} color={'#7F00FF'} />
    </TouchableOpacity>
  </View>
</TouchableOpacity>

  );
};

export default ProductCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: 'grey',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
    margin: 5,
    width: 160,
  },
  card_template: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  textContainer: {
    padding: 2,
  },
  details: {
    padding: 12
},
title: {
    fontSize: 15,
    fontWeight: '500'
},
supplier: {
    fontSize: 12,
    fontWeight: '600'

},
countInStock:{
    fontSize: 14,
    // fontWeight: '700'
},
price: {
    fontSize: 14,
    fontWeight: '700'
},
addBtn: {
    position: "absolute",
    bottom: 10,
    right: 12
},
badgeOrdered: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 13,
  },
  badgeInStock: {
    backgroundColor: '#E0F7FA',
    color: '#00796B',
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 13,
    overflow: 'hidden',
  },
  badgeOutOfStock: {
    backgroundColor: '#FFCDD2',
    color: '#C62828',
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 13,
  },
   badgeOnSale: {
    backgroundColor: 'green',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeTextOnSale: {
        backgroundColor: 'green',
        paddingHorizontal: 1,
    paddingVertical: 2,
    borderRadius:4,
    alignSelf: 'flex-start',
    marginBottom: 4,
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
    statusOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  width: '90%' // faz o badge usar toda a largura do card
  },
  priceContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},


originalPrice: {
  fontSize: 12,
  color: 'grey',
  textDecorationLine: 'line-through',
},priceContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

discountPrice: {
  fontSize: 14,
  fontWeight: 'bold',
  color: 'black',
},

originalPrice: {
  fontSize: 12,
  color: 'grey',
  textDecorationLine: 'line-through',
},
});
