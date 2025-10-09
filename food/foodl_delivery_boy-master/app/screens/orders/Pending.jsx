import { View, FlatList } from "react-native";
import React from "react";
import { COLORS, SIZES } from "../../constants/theme";
import { useContext } from "react";
import { UserType } from "../../context/UserType";
import LoadingScreen from "../../components/LoadingScreen";
import CategoryFoodComp from "../../components/CategoryFoodComp";
import fetchOrders from "../../hook/fetchOrders";
import { useNavigation } from '@react-navigation/native'
import { DeliveryContext } from "../../context/DeliveryContext";
import BackGroundImage from "../../components/BackGroundImage";

const Pending = () => {
  const navigation = useNavigation();
  const { userType } = useContext(UserType);
  const { delivery, setDelivery } = useContext(DeliveryContext);
  const { orders, isOrdersLoading, error, refetch } = fetchOrders("Placed");

  if (isOrdersLoading) {
    return <LoadingScreen />;
  }

  const handlePress = (item) => {
    setDelivery('Placed');
    navigation.navigate("Notifications", item)
  }

  const renderCategoryItem = ({ item }) => (
    <View style={{marginBottom: 10}}>
      <CategoryFoodComp item={item} onPress={() => handlePress(item)} />
    </View>
  );

  return (
    <View style={{ backgroundColor: COLORS.lightWhite, flex: 1}}>
      <BackGroundImage />
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

export default Pending;
