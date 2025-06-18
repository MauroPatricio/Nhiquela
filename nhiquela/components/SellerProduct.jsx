import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import React, { useState } from 'react';
import { MinusCircleIcon, PlusCircleIcon, ChevronDownIcon } from 'react-native-heroicons/outline';
import { useDispatch, useSelector } from 'react-redux';
import {
  addToBasket,
  removeFromBasket,
  selectBasketItemsWithId,
  addSellers,
  removeSeller,
  getItemsBySellerId,
} from '../features/basketSlice';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SellerProduct = ({
  id,
  name,
  image,
  description,
  countInStock,
  price,
  seller,
  discount,
  sellerName,
  comissionPercentage,
  sellerEarningsAfterDiscount,
  onSale
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const items = useSelector((state) => selectBasketItemsWithId(id)(state));
  const remainingItemsFromSeller = useSelector((state) =>
    getItemsBySellerId(seller._id)(state)
  );

  const dispatch = useDispatch();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const addItemToBasket = () => {
    if (items.length >= countInStock) return;
    dispatch(
      addToBasket({
        id,
        _id: id,
        name,
        image,
        description,
        countInStock,
        price,
        seller,
        sellerName,
        discount,
        onSale,
        comissionPercentage,
        sellerEarningsAfterDiscount,
        quantity: items.length + 1,
      })
    );
    dispatch(addSellers({ seller }));
  };

  const removeItem = () => {
    if (items.length === 0) return;
    dispatch(removeFromBasket({ _id: id }));
    if (remainingItemsFromSeller.length === 1) {
      dispatch(removeSeller({ sellerId: seller._id }));
    }
  };

  return (
    <TouchableOpacity onPress={toggleExpand} activeOpacity={0.9} style={styles.card}>
      <Image source={{ uri: image }} style={styles.image} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{name}</Text>
          <ChevronDownIcon
            size={20}
            color="gray"
            style={[styles.chevron, isExpanded && styles.chevronUp]}
          />
        </View>

        <Text style={styles.description}>{description}</Text>
        <Text style={styles.stock}>Quantidade disp.: {countInStock}</Text>
        {onSale ? (
              <View style={{ marginTop: 6 }}>
                {/* Badge de promoção */}
                <View style={{ backgroundColor:'green', paddingHorizontal:6, paddingVertical:2, borderRadius:4, alignSelf:'flex-start', marginBottom: 4 }}>
                  <Text style={{ color:'white', fontWeight:'bold', fontSize: 12 }}>Em promoção</Text>
                </View>

                {/* Preço original riscado */}
                <Text style={{ color:'grey', textDecorationLine:'line-through', marginBottom: 5 }}>
                  {parseFloat(price).toFixed(2)} MT
                </Text>

                {/* Preço com desconto */}
                <Text style={{ color:'green', fontWeight:'bold', fontSize: 16 }}>
                  {parseFloat(discount).toFixed(2)} MT
                </Text>

                {/* Valor do desconto */}
                <Text style={{ color:'green', marginTop: 4 }}>
                  Economiza { (parseFloat(price) - parseFloat(discount)).toFixed(2) } MT
                </Text>

              </View>
) : (
  <Text style={styles.price}>
    {parseFloat(price).toFixed(2)} MT
  </Text>
)}
      </View>

      {isExpanded && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={removeItem}>
            <MinusCircleIcon
              size={35}
              color={items.length > 0 ? 'white' : 'gray'}
              style={styles.iconButton}
            />
          </TouchableOpacity>

          <Text style={styles.quantity}>{items.length}</Text>

          <TouchableOpacity onPress={addItemToBasket}>
            <PlusCircleIcon size={35} color="white" style={styles.iconButton} />
          </TouchableOpacity>
        </View>
        
      )}

    </TouchableOpacity>
  );
};

export default SellerProduct;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  image: {
    height: 160,
    borderRadius: 10,
    width: '100%',
    resizeMode: 'cover',
  },
  content: {
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
    transition: 'transform 0.3s',
  },
  chevronUp: {
    transform: [{ rotate: '180deg' }],
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginVertical: 4,
  },
  stock: {
    fontSize: 12,
    color: '#888',
  },
  price: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 6,
    color: '#7F00FF',
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  iconButton: {
    backgroundColor: '#7F00FF',
    borderRadius: 50,
    padding: 6,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  }
});
