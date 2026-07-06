const fs = require('fs');
const filepath = 'screens/ServicesTab.jsx';
let content = fs.readFileSync(filepath, 'utf8');

const scrollFuncs = `
  const scrollNext = () => {
    let nextIndex = (currentIndex + 1) % carouselData.length;
    if (flatListRef.current) flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const scrollPrev = () => {
    let prevIndex = currentIndex === 0 ? carouselData.length - 1 : currentIndex - 1;
    if (flatListRef.current) flatListRef.current.scrollToIndex({ index: prevIndex, animated: true });
    setCurrentIndex(prevIndex);
  };

  const renderCarouselItem =`;

content = content.replace("  const renderCarouselItem =", scrollFuncs);

const renderCarouselNew = `  const renderCarousel = () => (
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
      {/* Setas de navegação */}
      <View style={styles.carouselArrowsContainer} pointerEvents="box-none">
        <TouchableOpacity style={styles.carouselArrowButton} onPress={scrollPrev}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.carouselArrowButton} onPress={scrollNext}>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      {/* Indicadores do Slide */}
      <View style={styles.carouselDotsContainer} pointerEvents="none">
        {carouselData.map((_, idx) => (
          <View key={idx} style={[styles.carouselDot, currentIndex === idx && styles.carouselDotActive]} />
        ))}
      </View>
    </View>
  );`;

// Replace the old renderCarousel
content = content.replace(/  const renderCarousel = \(\) => \([\s\S]*?  \);/, renderCarouselNew);

const stylesToAdd = `
  carouselArrowsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    zIndex: 3,
  },
  carouselArrowButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselDotsContainer: {`;

content = content.replace("  carouselDotsContainer: {", stylesToAdd);

fs.writeFileSync(filepath, content);
console.log("Carousel navigation patched!");
