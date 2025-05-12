import * as React from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import {
  TabView,
  SceneMap,
  TabBar,
  TabBarIndicator,
} from "react-native-tab-view";
import { COLORS, SIZES } from "../constants/theme";
import Pending from "../screens/orders/Pending";
import Picked from "../screens/orders/Picked";
import Delivered from "../screens/orders/Delivered";

const renderScene = SceneMap({
  first: Pending,
  second: Picked,
  third: Delivered,
});
const renderTabBar = (props) => (
  <TabBar
    {...props}
    indicatorStyle={{
      backgroundColor: COLORS.secondary,
      width: 20,
      left: (100 - 20) / 2,
    }}
    style={{ backgroundColor: COLORS.primary, borderRadius: 30, marginBottom: 10 }}
  />
);

const TabViews = () => {
  const layout = useWindowDimensions();

  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: "first", title: "Orders" },
    { key: "second", title: "Picked" },
    { key: "third", title: "Delivered" },
    
  ]);

  return (
    <View style={{ flex: 1, marginHorizontal: 12, marginTop: 20 }}>
      <TabView
        renderTabBar={renderTabBar}
        style={{ borderRadius: 12 }}
        navigationState={{ index, routes }}
        renderScene={renderScene}
        sceneContainerStyle={{ borderRadius: 30, height: SIZES.height /1.8 }}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
      />
    </View>
  );
};

export default TabViews;

const styles = StyleSheet.create({
  pagerView: {
    width: "100%",
    height: "100%",
  },
});
