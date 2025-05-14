import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Image, SafeAreaView, TouchableOpacity } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BackBtn from '../components/BackBtn';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';

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
  seller: Yup.object().shape({
    name: Yup.string().required('O nome do estabelecimento é obrigatório'),
    logo: Yup.string().required('A Logo é obrigatória'),
    description: Yup.string().required('A descrição do estabelecimento é obrigatória'),
    address: Yup.string().required('O endereço do estabelecimento é obrigatório'),
    phoneNumberAccount: Yup.string().required('O número de conta é obrigatório'),
    province: Yup.string().required('A localização do estabelecimento é obrigatória'),
  }),
});

const SignUp = () => {
  const navigation = useNavigation();
  const [image, setImage] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Estado para mostrar/ocultar senha
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Estado para mostrar/ocultar confirmação de senha

  useEffect(() => {
    const fetchProvinces = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('provinces');
        setProvinces(data.provinces);
      } catch (error) {
        console.error('Erro ao buscar províncias:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permissão de localização negada',
          text2: 'Por favor, permita o acesso à localização para continuar.',
        });
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  const handleImagePicker = async (setFieldValue) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Permissão negada',
        text2: 'Permissão para acessar a galeria é necessária!',
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      const uploadedImage = await uploadImage(uri);
      setFieldValue('seller.logo', uploadedImage);
    }
  };

  const uploadImage = async (uri) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: 'image.jpg',
      type: 'image/jpeg',
    });

    try {
      const { data } = await api.post('upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data.secure_url;
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao enviar a imagem',
        text2: 'Tente novamente mais tarde.',
      });
      return null;
    }
  };

  const handleSubmit = async (values) => {
    try {
      values.seller.latitude = location?.coords.latitude;
      values.seller.longitude = location?.coords.longitude;
      values.isSeller = true;

      const response = await api.post('users/signup', values);

      const projectId = "92c183ff-d0ca-4dc4-a4ce-e7c112be9ee0";
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await api.patch(`/users/updatePushToken/${response.data._id}`, { pushToken: token });

      Toast.show({
        type: 'success',
        text1: 'Perfil criado com sucesso',
        position: 'top',
      });
      navigation.navigate('NewProduct');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ocorreu um erro inesperado.';
      Toast.show({
        type: 'error',
        text1: errorMessage,
        position: 'top',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <BackBtn onPress={() => navigation.goBack()} />
        <Image source={require('../assets/nhiquela2.png')} style={styles.cover} />
        <Text style={styles.title}>NOVO REGISTO</Text>

        <Formik
          initialValues={{
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            phoneNumber: '',
            seller: {
              name: '',
              logo: '',
              description: '',
              address: '',
              phoneNumberAccount: '',
              province: '',
            },
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
            <>
              {/* User Details */}
              <Text style={styles.sectionTitle}>Dados do representante</Text>

              <Text style={styles.label}>Nome e apelido</Text>
              <View style={styles.inputWrapper(touched.name ? '#7F00FF' : '#7F00FF')}>
                <TextInput
                  style={styles.input}
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                />
              </View>
              {touched.name && errors.name && <Text style={styles.error}>{errors.name}</Text>}

              <Text style={styles.sectionTitle}>Dados de acesso</Text>

              <Text style={styles.label}>Número de telefone</Text>
              <View style={styles.inputWrapper(touched.phoneNumber ? '#7F00FF' : '#7F00FF')}>
                <TextInput
                  style={styles.input}
                  value={values.phoneNumber}
                  onChangeText={handleChange('phoneNumber')}
                  onBlur={handleBlur('phoneNumber')}
                  keyboardType="numeric"
                />
              </View>
              {touched.phoneNumber && errors.phoneNumber && <Text style={styles.error}>{errors.phoneNumber}</Text>}

              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper(touched.email ? '#7F00FF' : '#7F00FF')}>
                <TextInput
                  style={styles.input}
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  keyboardType="email-address"
                />
              </View>
              {touched.email && errors.email && <Text style={styles.error}>{errors.email}</Text>}

              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputWrapper(touched.password ? '#7F00FF' : '#7F00FF')}>
                <TextInput
                  style={styles.input}
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  secureTextEntry={!showPassword} // Alternar entre mostrar/ocultar senha
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#7F00FF"
                  />
                </TouchableOpacity>
              </View>
              {touched.password && errors.password && <Text style={styles.error}>{errors.password}</Text>}

              <Text style={styles.label}>Confirmar Senha</Text>
              <View style={styles.inputWrapper(touched.confirmPassword ? '#7F00FF' : '#7F00FF')}>
                <TextInput
                  style={styles.input}
                  value={values.confirmPassword}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  secureTextEntry={!showConfirmPassword} // Alternar entre mostrar/ocultar confirmação de senha
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialCommunityIcons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#7F00FF"
                  />
                </TouchableOpacity>
              </View>
              {touched.confirmPassword && errors.confirmPassword && (
                <Text style={styles.error}>{errors.confirmPassword}</Text>
              )}

              <Text style={styles.sectionTitle}>Detalhes do estabelecimento</Text>

              <Text style={styles.label}>Logo do estabelecimento</Text>
              {image ? (
                <Image source={{ uri: image }} style={styles.logo} />
              ) : (
                <Text style={{ color: 'red' }}>A logo é obrigatória</Text>
              )}
              <TouchableOpacity style={styles.button} onPress={() => handleImagePicker(setFieldValue)}>
                <Text style={styles.buttonText}>Adicionar Logo</Text>
              </TouchableOpacity>
              {touched.seller?.logo && errors.seller?.logo && (
                <Text style={styles.error}>{errors.seller.logo}</Text>
              )}

              <Text style={styles.label}>Nome da empresa</Text>
              <View style={styles.inputWrapper(touched.seller?.name ? '#7F00FF' : '#7F00FF')}>
                <TextInput
                  style={styles.input}
                  value={values.seller.name}
                  onChangeText={handleChange('seller.name')}
                  onBlur={handleBlur('seller.name')}
                />
              </View>
              {touched.seller?.name && errors.seller?.name && (
                <Text style={styles.error}>{errors.seller?.name}</Text>
              )}

              <Text style={styles.label}>Descrição do estabelecimento [Especialidade]</Text>
              <View style={styles.inputWrapper(touched.seller?.description ? '#7F00FF' : '#7F00FF')}>
                <TextInput
                  style={styles.input}
                  value={values.seller.description}
                  onChangeText={handleChange('seller.description')}
                  onBlur={handleBlur('seller.description')}
                />
              </View>
              {touched.seller?.description && errors.seller?.description && (
                <Text style={styles.error}>{errors.seller?.description}</Text>
              )}

              <Text style={styles.label}>Localização do estabelecimento</Text>
              <Picker
                selectedValue={values.seller.province}
                onValueChange={(itemValue) => setFieldValue('seller.province', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Selecione a localização" value="" />
                {provinces.map((province) => (
                  <Picker.Item key={province._id} label={province.name} value={province._id} />
                ))}
              </Picker>
              {touched.seller?.province && errors.seller?.province && (
                <Text style={styles.error}>{errors.seller?.province}</Text>
              )}

              <Text style={styles.label}>Endereço do estabelecimento [Rua/Av.]</Text>
              <View style={styles.inputWrapper(touched.seller?.address ? '#7F00FF' : '#7F00FF')}>
                <TextInput
                  style={styles.input}
                  value={values.seller.address}
                  onChangeText={handleChange('seller.address')}
                  onBlur={handleBlur('seller.address')}
                />
              </View>
              {touched.seller?.address && errors.seller?.address && (
                <Text style={styles.error}>{errors.seller?.address}</Text>
              )}

              <Text style={styles.label}>Número de telefone da empresa para pagamentos [MPESA]</Text>
              <View style={styles.inputWrapper(touched.seller?.phoneNumberAccount ? '#7F00FF' : '#7F00FF')}>
                <TextInput
                  style={styles.input}
                  value={values.seller.phoneNumberAccount}
                  onChangeText={handleChange('seller.phoneNumberAccount')}
                  onBlur={handleBlur('seller.phoneNumberAccount')}
                  keyboardType="numeric"
                />
              </View>
              {touched.seller?.phoneNumberAccount && errors.seller?.phoneNumberAccount && (
                <Text style={styles.error}>{errors.seller?.phoneNumberAccount}</Text>
              )}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Aguarde...' : 'Registar'}
                </Text>
              </TouchableOpacity>
              <View style={{ marginBottom: 210 }} />
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
    backgroundColor: 'white',
    padding: 20,
  },
  cover: {
    height: 120,
    width: '100%',
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#7F00FF',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 15,
    marginBottom: 10,
    color: '#7F00FF',
  },
  label: {
    fontSize: 14,
    color: '#7F00FF',
    marginBottom: 5,
  },
  inputWrapper: (borderColor) => ({
    borderColor: borderColor,
    backgroundColor: '#FFF',
    borderWidth: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 15,
  }),
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    borderRadius: 15,
    alignSelf: 'center',
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#7F00FF',
    borderRadius: 12,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#7F00FF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    backgroundColor: '#A9A9A9',
  },
  eyeIcon: {
    padding: 10,
  },
});

export default SignUp;