import { TouchableOpacity, View, Text, StyleSheet, Image } from 'react-native'
import React from 'react'
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { Badge } from 'react-native-paper';



const ProductCardView = ({ item }) => {

    const navigation = useNavigation();
    const productDetail = item.item
    return (
        <TouchableOpacity onPress={() => navigation.navigate("ProductDetail", { item })}>
            <View style={styles.container}>
                <View style={styles.imageContainer}>
                    <Image source={{
                        uri: item.item.image,

                    }}
                        style={styles.image} />
                    <View style={styles.details}>
                        <Text style={styles.title} numberOfLines={1}>{item.item.nome}</Text>
                        <Text style={styles.supplier} numberOfLines={1}>{item.item.seller.seller.name}</Text>

                        <Text style={styles.price} numberOfLines={1}>{item.item.price} MT</Text>
                        <Text>
                            {item.item.isOrdered ? <Badge style={{ color: 'white', backgroundColor: 'green' }}> Por encomenda </Badge> : item.item.countInStock !== 0 ? item.item.countInStock + ` unidade(s)` : <Badge bg='danger'>Sem stock</Badge>}
                        </Text>

                    </View>
                    <TouchableOpacity style={styles.addBtn}>
                        <Ionicons name='cart' size={25}
                            color={'#3e2465'}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    )
}

export default ProductCardView

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',

    },
    imageContainer: {
        flex: 1,
        width: 170,
        marginLeft: 12 / 2,
        marginTop: 5,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "white"
    },
    image: {
        aspectRatio: 1,
        resizeMode: 'cover'
    },
    details: {
        padding: 12
    },
    title: {
        fontSize: 12,
        fontWeight: '800'
    },
    supplier: {
        fontSize: 12,
        fontWeight: '600'

    },
    price: {
        fontSize: 12,
        fontWeight: '400'
    },
    addBtn: {
        position: "absolute",
        bottom: 10,
        right: 12
    }
})