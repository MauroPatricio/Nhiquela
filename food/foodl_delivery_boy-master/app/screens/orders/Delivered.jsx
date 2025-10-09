import { StyleSheet, Text, View, FlatList } from "react-native";
import React, { useContext, useEffect } from "react";
import { COLORS, SIZES } from "../../constants/theme";
import fetchOrders from "../../hook/fetchOrders";
import LoadingScreen from "../../components/LoadingScreen";
import CategoryFoodComp from "../../components/CategoryFoodComp";
import AssetImage from "../../components/AssetImage";
import fetchPicked from "../../hook/fetchPicked";
import { DeliveryContext } from "../../context/DeliveryContext";
import { useNavigation } from '@react-navigation/native'
import BackGroundImage from "../../components/BackGroundImage";
import { TriggerContext } from "../../context/TriggerContext";

const Delivered = () => {
  const navigation = useNavigation();
  const { orders, isOrdersLoading, error, refetch } = fetchPicked("3");
  const {delivery, setDelivery} = useContext(DeliveryContext)
  const {trigger, setTrigger} = useContext(TriggerContext)

  if (isOrdersLoading) {
    return <LoadingScreen />;
  }

  const handlePress = (item) => {
    setDelivery('Delivered');
    navigation.navigate("Notifications", item)
  }

  const renderCategoryItem = ({ item }) => (
    <View style={{ marginBottom: 10 }}>
      <CategoryFoodComp item={item} onPress={() => handlePress(item)} />
    </View>
  );
  
  return (
    <View style={{ backgroundColor: COLORS.lightWhite, flex: 1 }}>
        <BackGroundImage/>

     <FlatList
          data={orders}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item._id}
          style={{ marginTop: 10 }}
          scrollEnabled={false}
          renderItem={renderCategoryItem}
        />
    </View>
  );
};

export default Delivered;

const styles = StyleSheet.create({});
