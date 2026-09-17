import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { selectSeller } from '../features/sellerSlice';
import { removeFromBasket, selectBasketItems } from '../features/basketSlice';
import { Ionicons } from '@expo/vector-icons';
import CartDetails from '../components/CartDetails';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const Cart = () => {
  const navigation = useNavigation();
  const items = useSelector(selectBasketItems);
  const dispatch = useDispatch();
  const [groupedItems, setGroupedItems] = useState({});

  useEffect(() => {
    const grouped = items.reduce((results, item) => {
      (results[item.id] = results[item.id] || []).push(item);
      return results;
    }, {});
    setGroupedItems(grouped);
  }, [items]);

  const removeItems = (item) => {
    dispatch(removeFromBasket({ id: item.id }));
  };

  return (
    <>
      <CartDetails />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Carrinho</Text>
            <Text style={styles.subtitle}>{items.length} produto(s) no carrinho</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {Object.entries(groupedItems).map(([key, itemsGroup]) => {
            const item = itemsGroup[0];
            return (
              <View key={key} style={styles.itemCard}>
                <View style={styles.sellerHeader}>
                  <Ionicons name="storefront-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.sellerName} numberOfLines={1}>
                    {item.seller?.name || item.seller}
                  </Text>
                </View>

                <View style={styles.itemContent}>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyText}>{itemsGroup.length}x</Text>
                  </View>
                  
                  <Image source={{ uri: item.image }} style={styles.itemImage} />

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.itemPrice}>{item.price} MT</Text>
                  </View>

                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeItems(item)}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default Cart;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 250,
    gap: 16,
  },
  itemCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  sellerName: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  qtyBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  qtyText: {
    color: COLORS.primaryLight,
    fontWeight: '700',
    fontSize: SIZES.xs,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  removeBtn: {
    padding: 8,
    backgroundColor: COLORS.error + '10',
    borderRadius: RADIUS.sm,
  },
});