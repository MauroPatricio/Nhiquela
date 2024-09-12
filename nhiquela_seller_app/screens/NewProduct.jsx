import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { Formik } from 'formik';
import api from '../hooks/createConnectionApi';

import { launchImageLibrary } from 'react-native-image-picker';

const NewProduct = () => {
  const handleSubmit = async (values) => {
    try {
      const response = await api.post('products/', values);
      if (response.status === 200) {
        alert('Product created successfully');
      }
    } catch (error) {
      console.error(error);
      alert('Error creating product');
    }
  };

  const handleImagePick = (setFieldValue) => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.error('ImagePicker Error: ', response.error);
      } else {
        // Assuming the first asset is the one we want
        const source = response.assets[0].uri;
        setFieldValue('image', source); // Set the image URI to the form state
      }
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Criar novo produto</Text>

      <Formik
        initialValues={{
          nome: '',
          name: '',
          slug: '',
          image: '',
          price: '',
          category: '',
          province: '',
          brand: '',
          countInStock: '',
          description: '',
          onSale: false,
          onSalePercentage: 0,
          qualityType: '',
          conditionStatus: '',
          selectedColors: '',
          selectedSizes: '',
          isOrdered: false,
          orderPeriod: '',
          isGuaranteed: false,
          guaranteedPeriod: '',
        }}
        onSubmit={handleSubmit}
      >
        {({ handleChange, handleBlur, handleSubmit, values, setFieldValue }) => (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              onChangeText={handleChange('nome')}
              onBlur={handleBlur('nome')}
              value={values.nome}
            />

            <TextInput
              style={styles.input}
              placeholder="Name"
              onChangeText={handleChange('name')}
              onBlur={handleBlur('name')}
              value={values.name}
            />

            <TextInput
              style={styles.input}
              placeholder="Slug"
              onChangeText={handleChange('slug')}
              onBlur={handleBlur('slug')}
              value={values.slug}
            />

            <TouchableOpacity
              style={styles.imagePicker}
              onPress={() => handleImagePick(setFieldValue)}
            >
              <Text style={styles.imagePickerText}>
                {values.image ? 'Change Image' : 'Upload Image'}
              </Text>
            </TouchableOpacity>

            {values.image ? (
              <Image
                source={{ uri: values.image }}
                style={styles.imagePreview}
              />
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Price"
              onChangeText={handleChange('price')}
              onBlur={handleBlur('price')}
              value={values.price}
            />

            <TextInput
              style={styles.input}
              placeholder="Category"
              onChangeText={handleChange('category')}
              onBlur={handleBlur('category')}
              value={values.category}
            />

            <TextInput
              style={styles.input}
              placeholder="Province"
              onChangeText={handleChange('province')}
              onBlur={handleBlur('province')}
              value={values.province}
            />

            <TextInput
              style={styles.input}
              placeholder="Brand"
              onChangeText={handleChange('brand')}
              onBlur={handleBlur('brand')}
              value={values.brand}
            />

            <TextInput
              style={styles.input}
              placeholder="Count In Stock"
              onChangeText={handleChange('countInStock')}
              onBlur={handleBlur('countInStock')}
              value={values.countInStock}
            />

            <TextInput
              style={styles.input}
              placeholder="Description"
              onChangeText={handleChange('description')}
              onBlur={handleBlur('description')}
              value={values.description}
            />

            <View style={styles.switchRow}>
              <Text>On Sale?</Text>
              <TouchableOpacity
                onPress={() => handleChange('onSale')(!values.onSale)}
                style={[styles.switchButton, values.onSale ? styles.active : styles.inactive]}
              >
                <Text style={styles.switchText}>{values.onSale ? 'Yes' : 'No'}</Text>
              </TouchableOpacity>
            </View>

            {values.onSale && (
              <TextInput
                style={styles.input}
                placeholder="Sale Percentage"
                onChangeText={handleChange('onSalePercentage')}
                onBlur={handleBlur('onSalePercentage')}
                value={String(values.onSalePercentage)}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Quality Type"
              onChangeText={handleChange('qualityType')}
              onBlur={handleBlur('qualityType')}
              value={values.qualityType}
            />

            <TextInput
              style={styles.input}
              placeholder="Condition Status"
              onChangeText={handleChange('conditionStatus')}
              onBlur={handleBlur('conditionStatus')}
              value={values.conditionStatus}
            />

            <TextInput
              style={styles.input}
              placeholder="Selected Colors"
              onChangeText={handleChange('selectedColors')}
              onBlur={handleBlur('selectedColors')}
              value={values.selectedColors}
            />

            <TextInput
              style={styles.input}
              placeholder="Selected Sizes"
              onChangeText={handleChange('selectedSizes')}
              onBlur={handleBlur('selectedSizes')}
              value={values.selectedSizes}
            />

            <View style={styles.switchRow}>
              <Text>Ordered?</Text>
              <TouchableOpacity
                onPress={() => handleChange('isOrdered')(!values.isOrdered)}
                style={[styles.switchButton, values.isOrdered ? styles.active : styles.inactive]}
              >
                <Text style={styles.switchText}>{values.isOrdered ? 'Yes' : 'No'}</Text>
              </TouchableOpacity>
            </View>

            {values.isOrdered && (
              <TextInput
                style={styles.input}
                placeholder="Order Period"
                onChangeText={handleChange('orderPeriod')}
                onBlur={handleBlur('orderPeriod')}
                value={values.orderPeriod}
              />
            )}

            <View style={styles.switchRow}>
              <Text>Guaranteed?</Text>
              <TouchableOpacity
                onPress={() => handleChange('isGuaranteed')(!values.isGuaranteed)}
                style={[styles.switchButton, values.isGuaranteed ? styles.active : styles.inactive]}
              >
                <Text style={styles.switchText}>{values.isGuaranteed ? 'Yes' : 'No'}</Text>
              </TouchableOpacity>
            </View>

            {values.isGuaranteed && (
              <TextInput
                style={styles.input}
                placeholder="Guaranteed Period"
                onChangeText={handleChange('guaranteedPeriod')}
                onBlur={handleBlur('guaranteedPeriod')}
                value={values.guaranteedPeriod}
              />
            )}

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Create Product</Text>
            </TouchableOpacity>

            <View style={{ marginBottom: 250 }} />
          </>
        )}
      </Formik>
    </ScrollView>
  );
};

export default NewProduct;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  imagePicker: {
    backgroundColor: '#007BFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  imagePreview: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchButton: {
    padding: 8,
    borderRadius: 4,
  },
  active: {
    backgroundColor: '#007BFF',
  },
  inactive: {
    backgroundColor: '#ccc',
  },
  switchText: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007BFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
