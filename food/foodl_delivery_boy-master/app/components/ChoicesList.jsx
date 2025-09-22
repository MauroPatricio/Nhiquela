import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useState } from "react";
import { COLORS } from "../constants/theme";
import uidata from "../constants/uidata";

const ChoicesList = ({setSelectedChoice}) => {
  const [selected, setSelected] = useState(null);

    const handlePress =(item) => {
        if(selected === item.value){
            setSelected(null)
            setSelectedChoice(null)
        }else{
            setSelected(item.value)
            setSelectedChoice(item.value)
        }
    }

  return (
    <View>
      <Text
        style={{
          marginVertical: 10,
          fontSize: 18,
          fontFamily: "bold",
        }}
      >
        Pick Vehicle Type
      </Text>

      <FlatList
        data={uidata.choicesList}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        scrollEnabled
        style={{ marginTop: 5 }}
        renderItem={({ item }) => (
          <TouchableOpacity
          onPress={()=>handlePress(item)}
            style={{
              backgroundColor:
                selected === item.value ? COLORS.secondary : COLORS.lightWhite,
                height: 36,
                paddingRight: 10,
                left: -5,
                paddingLeft: 10,
                marginBottom: 25,
                marginHorizontal: 5,
                borderRadius: 14,
                justifyContent: "center"
            }}
          >
            <Text style={{
                marginHorizontal: 10,
                fontFamily: 'regular',
                fontSize: 13,
                color: item.value === selected ? COLORS.lightWhite: COLORS.gray
            }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default ChoicesList;


