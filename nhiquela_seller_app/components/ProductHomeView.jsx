import { ScrollView, StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { ArrowRightIcon } from 'react-native-heroicons/outline'
import ProductCard from './ProductCard';


const ProductHomeView = ({ title, description, categoryid, products }) => {


  const [isloading, setLoading] = useState(false);

  return (
    <View>
      <View style={styles.sellerWrapper}>
        <Text style={styles.title}>{title}</Text>
        <ArrowRightIcon color={"#7F00FF"} />
      </View>
      <View>
        <Text style={styles.text}>{description}</Text>
        <ScrollView
          horizontal
          contentContainerStyle={{
            paddingHorizontal: 1,
          }}
          showsHorizontalScrollIndicator={false}>
          {products != null && products?.map((item, index) => {
            const item2 = { item: item }
            return (
              <>
                <ProductCard
                  id={item._id}
                  name={item.brand}
                  logo={item.image}
                  description={item.description}
                  rating={item.rating}
                  numReviews={''}
                  province={item.ProviceDetails}
                  address={item.address}
                  latitude={''}
                  longitude={''}
                  countInStock={item.countInStock}
                  seller={item.sellerDetails}
                  item={item2}
                />
              </>
            )
          }

          )}

        </ScrollView>
      </View>
    </View>

  )
}

export default ProductHomeView

const styles = StyleSheet.create({

  sellerWrapper: {
    marginTop: 15,
    justifyContent: 'space-between',
    flexDirection: "row",
    marginLeft: 15,
    marginRight: 15,

  },
  title: {
    fontWeight: "500",
    fontSize: 19
  },
  text: {
    fontSize: 13,
    marginLeft: 15,
    letterSpacing: 1.2
  },
  container: {
    shadowColor: 'rgba(0,0,0, .2)',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0, //default is 1
    shadowRadius: 0//default is 1
  }

})
