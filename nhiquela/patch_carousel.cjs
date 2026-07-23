const fs = require('fs');

const filepath = 'screens/ServicesTab.jsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Add useRef
content = content.replace("import React, { useState, useEffect, useCallback } from 'react';", "import React, { useState, useEffect, useCallback, useRef } from 'react';");

// 2. Add carousel data
const carouselDataStr = `
const carouselData = [
  {
    id: '1',
    title: 'Tem uma lista de compras ou receita?',
    subtitle: 'Faça upload e nós tratamos de tudo!',
    icon: 'file-document-outline',
    bgColor: '#9333EA',
  },
  {
    id: '2',
    title: 'Serviços ao Domicílio',
    subtitle: 'Os melhores profissionais à sua porta',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '3',
    title: 'Entregas Rápidas',
    subtitle: 'Segurança e rapidez no seu dia a dia',
    image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=600&auto=format&fit=crop',
  }
];

export default function ServicesTab`;
content = content.replace("export default function ServicesTab", carouselDataStr);

// 3. Add states and logic inside ServicesTab
const insideComponentStr = `
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = (currentIndex + 1) % carouselData.length;
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
      }
      setCurrentIndex(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const renderCarouselItem = ({ item }) => {
    return (
      <View style={[styles.carouselCard, { backgroundColor: item.bgColor || '#FFF' }]}>
        {item.image && (
          <Image source={{ uri: item.image }} style={styles.carouselImage} />
        )}
        {/* Overlay escuro para imagens */}
        {item.image && <View style={styles.carouselOverlay} />}
        
        <View style={styles.carouselContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.carouselTitle}>{item.title}</Text>
            <Text style={styles.carouselSubtitle}>{item.subtitle}</Text>
          </View>
          {item.icon && <MaterialCommunityIcons name={item.icon} size={40} color="#FFF" style={styles.carouselIcon} />}
        </View>
      </View>
    );
  };

  const renderCarousel = () => (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={carouselData}
        keyExtractor={item => item.id}
        renderItem={renderCarouselItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
          setCurrentIndex(index);
        }}
      />
      {/* Indicadores do Slide */}
      <View style={styles.carouselDotsContainer}>
        {carouselData.map((_, idx) => (
          <View key={idx} style={[styles.carouselDot, currentIndex === idx && styles.carouselDotActive]} />
        ))}
      </View>
    </View>
  );

  const fetchCatalog`;

content = content.replace("  const fetchCatalog", insideComponentStr);

// 4. Add ListHeaderComponent
content = content.replace("showsVerticalScrollIndicator={false}", "showsVerticalScrollIndicator={false}\n          ListHeaderComponent={renderCarousel}");

// 5. Add styles
const stylesStr = `
  listContainer: { padding: 20, paddingBottom: 100 },
  
  carouselContainer: {
    height: 120,
    marginBottom: 25,
    borderRadius: 16,
    overflow: 'hidden',
  },
  carouselCard: {
    width: width - 40,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    padding: 20,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  carouselTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  carouselSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  carouselIcon: {
    marginLeft: 15,
  },
  carouselDotsContainer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 3,
  },
  carouselDotActive: {
    backgroundColor: '#FFF',
    width: 12,
  },
`;
content = content.replace("  listContainer: { padding: 20, paddingBottom: 100 },", stylesStr);

fs.writeFileSync(filepath, content);
console.log('Carousel injected successfully!');
