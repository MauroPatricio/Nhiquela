import { View, Text,Dimensions, StyleSheet } from 'react-native'
import React from 'react'
import Carousel from 'react-native-reanimated-carousel';

const CarouselPage = () => {
  const width = Dimensions.get('window').width;

    const imgSlides =[
      "https://source.unsplash.com/1024x768/?nature",
      "https://source.unsplash.com/1024x768/?water",
      "https://source.unsplash.com/1024x768/?girl",
      "https://source.unsplash.com/1024x768/?tree",


    ]
  return (
    <View style={styles.carouselContainer}>
      {/* <SliderBox
                images={imgSlides}
                sliderBoxHeight={200}
                dotColor={"red"}
                inactiveDotColor = {"grey"}
                ImageComponentStyle ={{borderRadius: 15}}
               
            /> */}
             {/* <Carousel
                loop
                width={width}
                height={width / 2}
                autoPlay={true}
                data={imgSlides}/> */}
                <Text>Carousel</Text>
    </View>
  )
}

export default CarouselPage


const styles = StyleSheet.create({
  carouselContainer: {
    marginTop:10,
    flex: 1,
    alignItems: "center"
  
  }
})