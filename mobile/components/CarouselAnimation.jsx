import { View, Text, Dimensions, FlatList, ScrollView, VirtualizedList} from 'react-native'
import React from 'react'
import ImgItem from '../screens/ImgItem';

const CarouselAnimation = () => {
    const width = Dimensions.get('window').width;

    const imgSlides =[
        "https://source.unsplash.com/1024x768/?nature",
        "https://source.unsplash.com/1024x768/?water",
        "https://source.unsplash.com/1024x768/?girl",
        "https://source.unsplash.com/1024x768/?tree",
  
  
      ]

      
  return (
    <ScrollView>

      <FlatList 
      data={imgSlides}
      renderItem={({item})=><ImgItem item={item}
     
      horizontal
      />}
      />
    </ScrollView>

  )
}

export default CarouselAnimation