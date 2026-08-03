import { TouchableOpacity, View, Text, StyleSheet, Image } from 'react-native'
import React from 'react'
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { Badge } from 'react-native-paper';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../../constants/theme';


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
                        <View style={{ marginTop: 6 }}>
                            {item.item.isOrdered ? <Badge style={{ color: 'white', backgroundColor: COLORS.success }}> Por encomenda </Badge> : item.item.countInStock !== 0 ? <Text style={styles.stockText}>{item.item.countInStock} unidade(s)</Text> : <Badge style={{ color: 'white', backgroundColor: COLORS.error }}>Sem stock</Badge>}
                        </View>

                    </View>
                    <TouchableOpacity style={styles.addBtn}>
                        <Ionicons name='cart' size={25}
                            color={COLORS.primary}
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
    },
    imageContainer: {
        flex: 1,
        width: 170,
        marginLeft: 6,
        marginTop: 5,
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        backgroundColor: COLORS.surfaceCard,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        ...SHADOWS.sm,
    },
    image: {
        aspectRatio: 1,
        resizeMode: 'cover'
    },
    details: {
        padding: 12
    },
    title: {
        fontSize: SIZES.sm,
        fontWeight: '800',
        color: COLORS.text,
    },
    supplier: {
        fontSize: SIZES.xs,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    price: {
        fontSize: SIZES.sm,
        fontWeight: '700',
        color: COLORS.primaryLight,
        marginTop: 4,
    },
    stockText: {
        fontSize: SIZES.xs,
        color: COLORS.textSecondary,
    },
    addBtn: {
        position: "absolute",
        bottom: 10,
        right: 12,
        backgroundColor: COLORS.primaryGlow,
        borderRadius: RADIUS.full,
        padding: 6,
    }
})