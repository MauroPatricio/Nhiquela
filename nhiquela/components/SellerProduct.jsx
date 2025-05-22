import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import React, { useState } from 'react';
import { MinusCircleIcon, PlusCircleIcon } from 'react-native-heroicons/outline';
import { useDispatch, useSelector } from 'react-redux';
import {
  addToBasket,
  removeFromBasket,
  selectBasketItemsWithId,
  addSellers,
  removeSeller,
  getItemsBySellerId,
} from '../features/basketSlice';

const SellerProduct = ({
  id,
  nome,
  name,
  image,
  images,
  description,
  rating,
  numReviews,
  province,
  address,
  priceFromSeller,
  price,
  onSale,
  countInStock,
  seller,
  sellerName,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const items = useSelector((state) => selectBasketItemsWithId(id)(state));
  const remainingItemsFromSeller = useSelector((state) =>
    getItemsBySellerId(seller._id)(state)
  );

  const dispatch = useDispatch();

  const addItemToBasket = () => {
    if (items.length >= countInStock) return; // Impede adicionar se não houver estoque

    dispatch(
      addToBasket({
        id,
        _id: id,
        nome,
        name,
        image,
        images,
        description,
        rating,
        numReviews,
        province,
        address,
        priceFromSeller,
        price,
        onSale,
        countInStock,
        seller,
        sellerName,
        quantity: items.length + 1,
      })
    );

    dispatch(addSellers({ seller })); // Adiciona o vendedor à lista de vendedores
  };

  const removeItem = () => {
      if (items.length === 0) return;
    const _id = id
    dispatch(removeFromBasket({ _id })); // Remove o item do carrinho

    if (remainingItemsFromSeller.length === 1) {
      dispatch(removeSeller({ sellerId: seller._id })); // Remove o vendedor se for o último item
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setIsPressed(!isPressed)}
      >
        <View style={styles.wrapper}>
          <View>
            <Text style={styles.productName}>{name}</Text>
            <Text style={styles.details}>{description}</Text>
            <Text>{countInStock} unidade(s)</Text>
            <Text style={styles.price}>{price} MT</Text>
          </View>
          <View>
            <Image
              source={{ uri: image }}
              style={styles.image}
            />
          </View>
        </View>
      </TouchableOpacity>

      {isPressed && (
        <View style={styles.circleIcons}>
          <TouchableOpacity onPress={removeItem}>
            <MinusCircleIcon
              size={35}
              color={items.length > 0 ? 'white' : 'grey'}
              style={styles.minusIcon}
            />
          </TouchableOpacity>
          <Text>{items.length}</Text>
          <TouchableOpacity onPress={addItemToBasket}>
            <PlusCircleIcon size={35} color="white" style={styles.plusIcon} />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

export default SellerProduct;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    marginLeft: 10,
  },
  wrapper: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    width: 240,
  },
  details: {
    fontSize: 13,
    color: 'grey',
    width: 280,
  },
  price: {
    fontWeight: '500',
  },
  image: {
    height: 70,
    width: 70,
    marginTop: 5,
    marginBottom: 5,
    borderRadius: 5,
    marginRight: 5,
  },
  minusIcon: {
    backgroundColor: '#7F00FF',
    borderRadius: 50,
    padding: 5,
    marginRight: 10,
  },
  plusIcon: {
    backgroundColor: '#7F00FF',
    borderRadius: 22,
    padding: 5,
    marginLeft: 10,
  },
  circleIcons: {
    flexDirection: 'row',
    flex: 1,
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
});
