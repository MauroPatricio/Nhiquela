import { StyleSheet, Text, View } from 'react-native'
import React, {useRef} from 'react'
import LottieView from "lottie-react-native";
import { SIZES } from '../constants/theme';

const LoadingScreen = () => {
    const animation = useRef(null);
  return (
    <View style={{height: SIZES.height, backgroundColor: "#ffffff", alignItems: 'center', justifyContent: 'center'}}>
       <LottieView
          autoPlay
          ref={animation}
          style={{ width: "100%", height: SIZES.height / 3.2 }}
          source={require("../../assets/anime/delivery.json")}
        />
      </View>
  )
}

export default LoadingScreen

const styles = StyleSheet.create({})