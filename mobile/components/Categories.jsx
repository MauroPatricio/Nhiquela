import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import CategoryCard from './CategoryCard'

const Categories = ({ categories, onCategorySelect }) => {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.wrapper}
      contentContainerStyle={{
        paddingHorizontal: 15,
      }}
    >
       {categories?.map((category, index) => (
        <TouchableOpacity
          key={category._id}
          onPress={() => onCategorySelect(index)}
        >
          <CategoryCard
            title={category.nome}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

export default Categories

const styles = StyleSheet.create({
  image: {
    aspectRatio: 1,
    resizeMode: 'cover'
  },
  cover: {
    height: 50,
    width: 50,
    resizeMode: "contain",
    marginBottom: 0,
    backgroundColor: 'white'
  },
  wrapper: {
    // marginBottom: 122
  }
})
