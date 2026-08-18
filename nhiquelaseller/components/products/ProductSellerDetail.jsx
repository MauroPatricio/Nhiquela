import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants'; // Assuming you have a constants file, fallback to hex if not.

const { width } = Dimensions.get('window');

const ProductSellerDetail = () => {
    const {
        params: { product }
    } = useRoute();

    const navigation = useNavigation();

    if (!product) {
        return (
            <View style={styles.loader}>
                <Text style={styles.loaderText}>A carregar detalhes...</Text>
            </View>
        );
    }

    const inStock = product?.countInStock > 0;

    return (
        <View style={styles.container}>
            {/* Header / Top Image Section */}
            <View style={styles.imageContainer}>
                {product.image ? (
                    <Image 
                        source={{ uri: product.image }} 
                        style={styles.image} 
                        resizeMode="cover" 
                    />
                ) : (
                    <View style={[styles.image, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="image-outline" size={60} color="#999" />
                    </View>
                )}
                
                {/* Back Button with Glassmorphism-like background */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name='chevron-back' size={28} color="#fff" />
                </TouchableOpacity>

                {/* Stock Badge Overlay */}
                <View style={[styles.stockBadge, { backgroundColor: inStock ? 'rgba(46, 125, 50, 0.9)' : 'rgba(198, 40, 40, 0.9)' }]}>
                    <Text style={styles.stockBadgeText}>
                        {inStock ? `${product.countInStock} em Estoque` : 'Esgotado'}
                    </Text>
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Info Card */}
                <View style={styles.detailsCard}>
                    <View style={styles.titleRow}>
                        <Text style={styles.name}>{product?.nome}</Text>
                        <Text style={styles.brandBadge}>{product?.brand || 'Sem Marca'}</Text>
                    </View>
                    
                    {/* Key Attributes Row */}
                    <View style={styles.attributesRow}>
                        <View style={styles.attributeItem}>
                            <Ionicons name="pricetag-outline" size={16} color="#666" />
                            <Text style={styles.attributeText}>{product?.category?.nome || product?.category?.name || 'Categoria não definida'}</Text>
                        </View>
                        <View style={styles.attributeItem}>
                            <Ionicons name="location-outline" size={16} color="#666" />
                            <Text style={styles.attributeText}>{product?.province?.name || 'Localização não definida'}</Text>
                        </View>
                    </View>

                    {/* Additional Details (Condition, Quality, Size, Color) */}
                    <View style={styles.extraAttributesGrid}>
                        {product?.conditionStatus?.name && (
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Estado:</Text>
                                <Text style={styles.gridValue}>{product.conditionStatus.name}</Text>
                            </View>
                        )}
                        {product?.qualityType?.name && (
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Qualidade:</Text>
                                <Text style={styles.gridValue}>{product.qualityType.name}</Text>
                            </View>
                        )}
                        {product?.size?.name && (
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Tamanho:</Text>
                                <Text style={styles.gridValue}>{product.size.name}</Text>
                            </View>
                        )}
                        {product?.color?.name && (
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Cor:</Text>
                                <View style={styles.colorWrapper}>
                                    <View style={[styles.colorDot, { backgroundColor: product.color.hex || '#ccc' }]} />
                                    <Text style={styles.gridValue}>{product.color.name}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* Pricing Section (Premium Look) */}
                    <View style={styles.pricingSection}>
                        <Text style={styles.sectionTitle}>Estrutura de Preço</Text>
                        
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Preço ao Consumidor</Text>
                            <Text style={styles.priceValueConsumer}>{product?.price} MT</Text>
                        </View>

                        {product?.onSale && (
                            <View style={styles.promoBox}>
                                <View style={styles.promoHeader}>
                                    <MaterialCommunityIcons name="brightness-percent" size={20} color="#E65100" />
                                    <Text style={styles.promoTitle}>Em Promoção (-{product.onSalePercentage}%)</Text>
                                </View>
                                <View style={styles.promoDetails}>
                                    <Text style={styles.promoDetailText}>Preço Promocional: <Text style={{fontWeight: 'bold'}}>{product.discount} MT</Text></Text>
                                    <Text style={styles.promoDetailText}>Seus Ganhos (Promo): <Text style={{fontWeight: 'bold', color: '#E65100'}}>{product.sellerEarningsAfterDiscount} MT</Text></Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* Description Section */}
                    <View style={styles.descriptionSection}>
                        <Text style={styles.sectionTitle}>Descrição</Text>
                        <Text style={styles.description}>
                            {product?.description || "Nenhuma descrição detalhada disponível para este produto."}
                        </Text>
                    </View>

                    {/* Extra Info Badges */}
                    {(product?.isGuaranteed || product?.isOrdered) && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.extraInfoContainer}>
                                {product?.isGuaranteed && (
                                    <View style={styles.extraBadge}>
                                        <Ionicons name="shield-checkmark" size={18} color="#007BFF" />
                                        <Text style={styles.extraBadgeText}>{product.guaranteedPeriod} meses de Garantia</Text>
                                    </View>
                                )}
                                {product?.isOrdered && (
                                    <View style={styles.extraBadge}>
                                        <Ionicons name="cube" size={18} color="#FF8F00" />
                                        <Text style={styles.extraBadgeText}>Por encomenda: {product.orderPeriod}</Text>
                                    </View>
                                )}
                            </View>
                        </>
                    )}
                </View>
                
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

export default ProductSellerDetail;

const styles = StyleSheet.create({  
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
    },
    loaderText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    imageContainer: {
        width: '100%',
        height: 320,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stockBadge: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    stockBadgeText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    scrollContent: {
        paddingTop: 10,
    },
    detailsCard: {
        backgroundColor: '#FFFFFF',
        marginTop: -10,
        marginHorizontal: 15,
        padding: 20,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    name: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A1A1A',
        flex: 1,
        marginRight: 10,
    },
    brandBadge: {
        backgroundColor: '#F0F0F0',
        color: '#444',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: '600',
        overflow: 'hidden',
    },
    attributesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 20,
    },
    attributeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    attributeText: {
        fontSize: 13,
        color: '#555',
        marginLeft: 6,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#EAEAEA',
        marginVertical: 16,
    },
    extraAttributesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
    },
    gridItem: {
        width: '50%',
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    gridLabel: {
        fontSize: 13,
        color: '#888',
        marginRight: 6,
    },
    gridValue: {
        fontSize: 13,
        color: '#333',
        fontWeight: '600',
    },
    colorWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 4,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 15,
    },
    pricingSection: {
        backgroundColor: '#FFF',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    priceLabel: {
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
    },
    priceValueConsumer: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    priceValueSeller: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6A0DAD', // Nhiquela primary color
    },
    promoBox: {
        marginTop: 10,
        backgroundColor: '#FFF3E0',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    promoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    promoTitle: {
        color: '#E65100',
        fontWeight: 'bold',
        fontSize: 15,
        marginLeft: 8,
    },
    promoDetails: {
        paddingLeft: 28,
        gap: 4,
    },
    promoDetailText: {
        fontSize: 13,
        color: '#555',
    },
    descriptionSection: {
        marginBottom: 10,
    },
    description: {
        fontSize: 15,
        color: '#555',
        lineHeight: 24,
    },
    extraInfoContainer: {
        gap: 12,
    },
    extraBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F8FF',
        padding: 12,
        borderRadius: 12,
    },
    extraBadgeText: {
        marginLeft: 10,
        color: '#333',
        fontWeight: '600',
        fontSize: 14,
    }
});
