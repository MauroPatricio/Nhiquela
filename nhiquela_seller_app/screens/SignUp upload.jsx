import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, Image, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Formik, FieldArray } from 'formik';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BackBtn from '../components/BackBtn';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

// Validation schema
const validationSchema = Yup.object().shape({
  name: Yup.string().required('O nome é obrigatório'),
  email: Yup.string().email('Email inválido').required('O email é obrigatório'),
  password: Yup.string().min(6, 'A senha deve conter no mínimo 6 dígitos').required('A senha é obrigatória'),
  phoneNumber: Yup.string()
    .required('Número de telefone é obrigatório')
    .min(9, 'O número de telefone não pode ser inferior a 9 dígitos')
    .max(9, 'O número de telefone não pode ser superior a 9 dígitos')
    .matches(/^[0-9]{9}$/, 'Número de telefone inválido'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'As senhas não coincidem')
    .required('A confirmação da senha é obrigatória'),
  checkedTerms: Yup.boolean().oneOf([true], 'Você deve aceitar os termos e condições'),
  location: Yup.string().nullable(),
  seller: Yup.object().shape({
    name: Yup.string(),
    logo: Yup.string().nullable(),
    description: Yup.string(),
    address: Yup.string(),
    phoneNumberAccount: Yup.number().nullable(),
    alternativePhoneNumberAccount: Yup.number().nullable(),
    accountType: Yup.string().nullable(),
    accountNumber: Yup.number().nullable(),
    alternativeAccountType: Yup.string().nullable(),
    alternativeAccountNumber: Yup.number().nullable(),
    workDayAndTime: Yup.array().of(
      Yup.object().shape({
        dayNumber: Yup.number().required('O número do dia é obrigatório'),
        dayOfWeek: Yup.string().required('O dia da semana é obrigatório'),
        opentime: Yup.string().required('Horário de funcionamento é obrigatório'),
        closetime: Yup.string().required('Os horários de encerramento são obrigatórios'),
      })
    ),
  }),
});

const SignUp = ({ navigation }) => {
  const route = useRoute();
  const [image, setImage] = useState(null);
  const [sellerLogo, setSellerLogo] = useState(null);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleImagePicker = async (setFieldValue) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão para acessar a galeria é necessária!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      const uploadedImage = await uploadImage(uri);
      setFieldValue('seller.logo', uploadedImage); // Update the seller's logo in Formik state
    }
  };

  useEffect(() => {
    (async () => {
      // Request permission to access location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      // Get the current location
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  const uploadImage = async (uri) => {
    const bodyFormData = new FormData();
    bodyFormData.append('file', {
      uri,
      name: 'image.jpg', // You can set the actual file name here
      type: 'image/jpeg' // Adjust the MIME type if necessary
    });

    try {
      const { data } = await api.post('upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSellerLogo(data.secure_url);
      return data.secure_url; // Return the uploaded image URL
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao enviar a imagem.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <BackBtn onPress={() => navigation.goBack()} />
        <Image source={require('../assets/nhiquela.png')} style={styles.cover} />
        <Text style={styles.title}>NOVO REGISTO</Text>
        <Formik
          initialValues={{
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            phoneNumber: '',
            location: '',
            seller: {
              name: '',
              logo: '',
              description: '',
              address: '',
              phoneNumberAccount: '',
              alternativePhoneNumberAccount: '',
              accountType: '',
              accountNumber: '',
              alternativeAccountType: '',
              alternativeAccountNumber: '',
              workDayAndTime: [
                { dayNumber: '', dayOfWeek: '', opentime: '', closetime: '' },
              ]
            },
          }}
          validationSchema={validationSchema}
          onSubmit={async (values) => {
            try {
              values.location = `${location.coords.latitude}, ${location.coords.longitude}`; // Set location coordinates
              const { data } = await api.post('users/signup', values);
              navigation.navigate('Home');
            } catch (error) {
              Alert.alert('Erro', error.message);
            }
          }}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
            <>
              {/* User Details */}
              <Text style={styles.sectionHeader}>Dados do representante</Text>
              <Text>Nome e Apelido</Text>
              <View style={styles.inputWrapper(touched.name ? '#7F00FF' : 'black')}>
                <TextInput
                  autoCapitalize='none'
                  autoCorrect={false}
                  style={{ flex: 1 }}
                  value={values.name}
                  onChangeText={handleChange('name')}
                />
              </View>
              {touched.name && errors.name && <Text style={styles.error}>{errors.name}</Text>}

              <Text>Número de telefone</Text>
              <View style={styles.inputWrapper(touched.phoneNumber ? '#7F00FF' : 'black')}>
                <TextInput
                  onChangeText={handleChange('phoneNumber')}
                  onBlur={handleBlur('phoneNumber')}
                  value={values.phoneNumber}
                  keyboardType="numeric"
                />
              </View>
              {touched.phoneNumber && errors.phoneNumber && <Text style={styles.error}>{errors.phoneNumber}</Text>}

              <Text>Email</Text>
              <View style={styles.inputWrapper(touched.email ? '#7F00FF' : 'black')}>
                <TextInput
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  value={values.email}
                  keyboardType="email-address"
                />
              </View>
              {touched.email && errors.email && <Text style={styles.error}>{errors.email}</Text>}

              <Text>Senha</Text>
              <View style={styles.inputWrapper(touched.password ? '#7F00FF' : 'black')}>
                <TextInput
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  value={values.password}
                  secureTextEntry
                />
              </View>
              {touched.password && errors.password && <Text style={styles.error}>{errors.password}</Text>}

              <Text>Confirmar Senha</Text>
              <View style={styles.inputWrapper(touched.confirmPassword ? '#7F00FF' : 'black')}>
                <TextInput
                  placeholder="Confirmar Senha"
                  secureTextEntry
                  value={values.confirmPassword}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                />
              </View>
              {touched.confirmPassword && errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword}</Text>}

              <Text>Localização</Text>
              <View style={styles.inputWrapper(touched.location ? '#7F00FF' : 'black')}>
                <TextInput
                  editable={false}
                  value={location ? `${location.coords.latitude}, ${location.coords.longitude}` : ''}
                />
              </View>
              {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

              <Button title="Atualizar localização" onPress={async () => {
                let currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);
              }} />

              {/* Upload da Logo */}

              {image && <Image source={{ uri: image }} style={styles.logo} />}
              <Button title="Adicionar a Logo da Loja" onPress={() => handleImagePicker(setFieldValue)} />
              {touched.seller && errors.seller && <Text style={styles.error}>{errors.seller.logo}</Text>}

              {/* Terms and Conditions */}
              {/* <View style={styles.checkboxWrapper}>
                <TouchableOpacity onPress={() => setFieldValue('checkedTerms', !values.checkedTerms)}>
                  <MaterialCommunityIcons name={values.checkedTerms ? 'check-box' : 'check-box-outline-blank'} size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Aceito os termos e condições</Text>
              </View>
              {touched.checkedTerms && errors.checkedTerms && <Text style={styles.error}>{errors.checkedTerms}</Text>} */}

              {/* Submit Button */}
              <Button title="Registar" onPress={handleSubmit} />
            </>
          )}
        </Formik>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  cover: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputWrapper: (borderColor) => ({
    borderWidth: 1,
    borderColor,
    borderRadius: 8,
    marginBottom: 8,
    padding: 10,
  }),
  error: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    marginLeft: 8,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
});

export default SignUp;
