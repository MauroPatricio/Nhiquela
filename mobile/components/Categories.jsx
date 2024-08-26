import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import CategoryCard from './CategoryCard'
import api from '../hooks/createConnectionApi';

const Categories = () => {

  const [categories, setCategories] = useState(null);
  const [loading, setLoading] = useState(null);

  const [error, setError] = useState(null);



  const fechtData = async () => {

    try {
      setLoading(true);

      const response = await api.get('/categories');

      if (response.status == 200) {
        setLoading(false);
        setCategories(response.data.categories)
      }
    } catch (error) {
      setLoading(false);
    }
  }

  useEffect(() => {

    fechtData()

  }, [])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.wrapper}
      contentContainerStyle={{
        paddingHorizontal: 15,
        // paddingTop: 10,
        // marginBottom: 5
      }}>

      {categories?.map(categorie => (
        <CategoryCard key={categorie._id} title={categorie.nome} />
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