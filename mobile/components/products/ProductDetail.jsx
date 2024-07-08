import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import React, { useState } from 'react'
import {Ionicons, SimpleLineIcons, MaterialCommunityIcons, Fontisto  } from '@expo/vector-icons'
import {useNavigation} from '@react-navigation/native'
import {useRoute} from '@react-navigation/native'
import { Badge } from 'react-native-paper'
import { LogBox } from 'react-native'

// LogBox.ignoreLogs(['Non-serializable values were found in navigation state'])

const ProductDetail = ({navigation}) => {

    const route = useRoute();
    const {item} = route.params;
    // const navigation = useNavigation();
    const [count, setCount] = useState(1);
    const increment = () =>{
        setCount(count +1)
    }

    const decrement = () =>{
        if(count > 1){
            setCount(count -1)
        }
    }
  return (
      
          <ScrollView>
      <View style={styles.container}>
      {/* <View style={styles.upperRow}>
            <TouchableOpacity onPress={()=>navigation.goBack()}>
                <Ionicons name='chevron-back-circle' color={'#3e2465'} size={35} style={styles.icon} />
            </TouchableOpacity>

            <TouchableOpacity onPress={()=>navigation.goBack()}>
                <Ionicons name='heart' color={'red'} size={35}/>
            </TouchableOpacity>
      </View> */}

      <Image source={{uri:item.item.image}}
      style={styles.image}
      />
        <View style={styles.icons}>

        <TouchableOpacity onPress={()=>navigation.goBack()}>
        <Ionicons name='chevron-back-circle' size={35} style={styles.back}/>
        </TouchableOpacity>

        <TouchableOpacity onPress={()=>navigation.goBack()}>
        <Ionicons name='heart' size={35} style={styles.heart}/>
        </TouchableOpacity>
        </View>
      <View style={styles.details}>
        <View style={styles.titleRow}>
            <Text style={styles.title}>{item.item.nome}</Text>
        </View>
        <View style={styles.priceWrapper}>
            <Text style={styles.price}>{item.item.price} MT</Text>
        </View>
        <View style = {styles.ratingRow}>
        <View style={styles.rating}>
        {[1,2,3,4,5].map((index)=>(
                        
                        <Ionicons
                        key={index}
                        size={15}
                        color="gold"
                        name="star"
                        />
                    ))}
                    <Text>(4.9)</Text>
                    </View>


            <View style={styles.rating}>
              
                <TouchableOpacity onPress={()=>{decrement()}}>
                    <SimpleLineIcons
                    name='minus'
                    size={20}/>
                </TouchableOpacity>
                
                <Text style={styles.ratingText}>{count}</Text>
                
                <TouchableOpacity onPress={()=>{increment()}}>
                    <SimpleLineIcons
                    name='plus'
                    size={20}/>
                </TouchableOpacity>
            </View>
        </View>
        <Text style={{marginLeft: 20, marginTop: 10}}>
            {item.item.isOrdered?<Badge style={{color: 'white', backgroundColor: 'green'}}> Por encomenda </Badge>:item.item.countInStock !== 0 ?item.item.countInStock +` unidade(s)`: <Badge bg='danger'>Sem stock</Badge> }
        </Text>  
            <View style={styles.descriptionWraper}>
                <Text style={styles.description}>
                Descrição
                </Text>
                <Text style={styles.descText}>
                    {item.item.description}
                </Text>
            </View>

            <View style={{marginBottom: 10}}>
                <View style={styles.location}>
                    <View style={{flexDirection: "row"}}>

                            <Ionicons
                            name="location-outline"
                            size={20}
                            />
                            <Text> {item.item.province.name}</Text>
                    </View>

                    <View style={{flexDirection: "row"}}>

<MaterialCommunityIcons
name="truck-delivery-outline"
size={20}
/>
<Text> Free delivery</Text>
</View>
                </View>
            </View>

            <View style={styles.cartRow}>
                <TouchableOpacity onPress={()=>{}} style={styles.cartBtn}>
                    <Text style={styles.cartText}>Pagar</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={()=>{}} style={styles.addCart}>

                    <Ionicons name="cart-outline"
                    size={24}
                    color="white"
                    />
               </TouchableOpacity>
            </View>


      </View>
    </View>
                    </ScrollView> 
  )
}

export default ProductDetail


const styles = StyleSheet.create({
container: {
    flex:1
},


upperRow:{
    // flex:1 , 
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    top: 50,
    zIndex: 999,
},
image:{
    aspectRatio: 1,
    resizeMode: "cover"

},
details:{
    marginTop: -20,
    top:10

},
titleRow:{
    marginHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    top: 20
},
title: {
    fontWeight: "800",
    fontSize: 20
},
priceWrapper:{
    marginLeft: 10,
    marginRight: 10,
    marginTop: 15,
    backgroundColor: "#3e2465",
    borderRadius: 10,
    alignItems: "center"
},
price:{
    padding: 10,
    color: "white"
},
ratingRow:{
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    top: 5
},
rating:{
    top:9,
    justifyContent: "flex-start",
    flexDirection: "row",
    marginLeft: 20,
    marginRight: 20,
    alignItems: "center"
},
ratingText:{
    color: "grey",
    paddingHorizontal: 10,
    
},
descriptionWraper:{
    marginTop: 24,
    marginHorizontal: 22,
},
description: {
    fontSize: 19,
},
descText: {
textAlign: "justify",
marginBottom: 12,

},
location: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    padding: 5,
    borderRadius: 25,
    marginLeft: 22,
    marginRight: 25,

},
cartRow:{
    paddingBottom: 33,
    flexDirection: "row",
    // justifyContent: "space-around",
    alignItems: "center",
    width: 22,
},
cartBtn: {
    padding: 10,
    width: 250,
    backgroundColor: '#3e2465',
    borderRadius: 22,
    marginLeft:22
},
cartText: {
    color: "white",
    marginLeft: 12

},
addCart:{
        width: 37,
        height: 37,
        borderRadius: 50,
        // margin: 12,
        backgroundColor: '#3e2465',
        marginLeft:20,
        alignItems: "center",
        justifyContent: "center"
    },
    icons:{
        position: 'absolute',
        top: 30,
        // marginLeft: 10,
        flexDirection: "row",
        justifyContent: 'space-between', // Distributes space between the icons
        alignItems: 'center',
      },
    back:{
        marginLeft: 20,
        color: 'black',
        backgroundColor: 'white',
        borderRadius: 22
      },
    heart:{
        marginLeft: 240,
        color: 'red'
    
      }


})