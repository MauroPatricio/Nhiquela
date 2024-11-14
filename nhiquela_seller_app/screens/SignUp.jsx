

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, Image, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Formik, FieldArray } from 'formik';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import {MaterialCommunityIcons} from '@expo/vector-icons'
import BackBtn from '../components/BackBtn';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';


// Validation schema
const validationSchema = Yup.object().shape({
  name: Yup.string().required('O nome é obrigatório'),
  email: Yup.string().email('Email invalido').required('O email é obrigatório'),
  password: Yup.string().min(6, 'A senha deve conter no minimo 6 digitos').required('A senha é obrigatória'),
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
    province: Yup.string().required('Informe a localização do estabelecimento'),

    // workDayAndTime: Yup.array().of(
    //     Yup.object().shape({
    //       dayNumber: Yup.number().required('O número do dia é obrigatório'),
    //       dayOfWeek: Yup.string().required('O dia da semana é obrigatório'),
    //       opentime: Yup.string().required('Horário de funcionamento e obrigação'),
    //       closetime: Yup.string().required('Os horários de encerramento são obrigatórios'),
    //     })
    //   )
  }),
});

const SignUp = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [workDaysWithTime, setWorkDaysWithTime] = useState([]);
  const [image, setImage] = useState(null);
  const [sellerLogo, setSellerLogo] = useState(null);
  const [fieldValue, setFieldValue] = useState(null);
  const [location, setLocation] = useState(null);
  const [provinces, setProvinces] = useState(null);
  const [loading, setLoading] = useState(null);

  const [errorMsg, setErrorMsg] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);



  const updatePushToken = async (userId, newPushToken) => {
    
    try {
      if (!userId) return;
      await api.patch(`/users/updatePushToken/${userId}`, { pushToken: newPushToken });
    } catch (error) {
      console.error('Erro ao atualizar o PushToken:', error.message);
    }
  };
  


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
    const fetchData = async () => {
      setLoading(true); // Start loading before the fetch
      try {
        const { data } = await api.get('provinces');
        setProvinces(data.provinces); // Update the provinces state
        setLoading(false); // End loading after successful fetch
      } catch (err) {
        setError(err.message); // Set error message
        setLoading(false); // End loading even after error
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    (async () => {
      // Request permission to access location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão para acessar localização negada');
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
      // console.error(error);
      Alert.alert('Erro', 'Falha ao enviar a imagem.');
    }
  };


  useEffect(() => {
    (async () => {
      // Pedir permissão para acessar a localização
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão para acessar a localização foi negada.');
        return;
      }

      // Obter a localização atual
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []); // O array vazio significa que o useEffect será chamado apenas uma vez quando o componente for montado


  return (
    <SafeAreaView style={styles.container}>
        <ScrollView >
        <BackBtn onPress={()=>navigation.goBack()}/>
            <Image
            source={require('../assets/nhiquela2.png')}
            style={styles.cover}
            />
            <Text style={styles.title}>NOVO REGISTO</Text>
      <Formik
        initialValues={{
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          phoneNumber: '',
          location: '',
          isSeller: true,
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
            latitude: '',
            longitude: '',
            checkedTerms: false,
            province: '',


            // workDayAndTime: [
            //     { dayNumber: '', dayOfWeek: '', opentime: '', closetime: '' },
            //   ]
          },
        }}
        validationSchema={validationSchema}
        onSubmit={async (values) => {

          values.seller.latitude = location?.coords.latitude;
          values.seller.longitude = location?.coords.longitude

          try {
            const userSeller = await api.post('users/signup', values);


            const projectId = "92c183ff-d0ca-4dc4-a4ce-e7c112be9ee0";
            let token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            await updatePushToken(userSeller._id, token);
            setExpoPushToken(token);

            Toast.show({
                type: 'success',
                text1: 'Perfil criado com sucesso',
                position: 'top',
                visibilityTime: 4000, // Time for how long the toast will show
                autoHide: true,
                topOffset: 30,
                bottomOffset: 40,
                style: {
                    
                backgroundColor: '#4CAF50', // Green background for success
                borderLeftWidth: 10,
                borderLeftColor: '#00C851', // Left border accent for success
                },
                text1Style: {
                fontSize: 18,
                fontWeight: 'bold',
                color: 'black', // Text color
                
                },
              });
              navigation.navigate('NewProduct')
          } catch (error) {
          
            const errorMessage = error?.response?.data?.message || 'Ocorreu um erro inesperado.';
            // Alert.alert('Erro', errorMessage);

            Toast.show({
                type: 'error',
                text1: errorMessage,
                // text2: 'Clique em Registar',
                position: 'top',
              });
          }
          // Submit logic goes here
        }}

        
      >
        {({ handleChange, handleBlur, handleSubmit,setFieldValue,values, errors, touched }) => (
          
          <>
            {/* User Details */}
            <Text style={{fontSize: 18, fontWeight: '500', paddingTop:15, paddingBottom: 5}}>Dados do representante</Text>

            <Text style={styles.label}>Nome e apelido</Text>
          

                 <View style={styles.inputWrapper(touched.name? '#7F00FF':'#7F00FF')}>
             
                <TextInput 
                autoCapitalize='none'
                autoCorrect={false}
                style={{flex:1}}
                value={values.name}
                onChangeText={(text) => {
                  const filteredText = text.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''); // Permitir apenas letras e espaços
                  setFieldValue('name', filteredText); // Atualiza o campo de nome com o texto filtrado
                }}
                />
            </View>
                {touched.name && errors.name && <Text style={styles.error}>{errors.name}</Text>}

            <Text style={{fontSize: 18, fontWeight: '500', paddingTop:15, paddingBottom: 5}}>Dados de acesso</Text>

            <Text style={styles.label}>Número de telefone</Text>
            <View style={styles.inputWrapper(touched.phoneNumber? '#7F00FF':'#7F00FF')}>
            <TextInput
              onChangeText={handleChange('phoneNumber')}
              onBlur={handleBlur('phoneNumber')}
              value={values.phoneNumber}
              keyboardType="numeric"
              style={{flex:1}}

            />
            </View>
            {touched.phoneNumber && errors.phoneNumber && <Text style={styles.error}>{errors.phoneNumber}</Text>}



            <Text  style={styles.label}>Email</Text>

            <View style={styles.inputWrapper(touched.email? '#7F00FF':'#7F00FF')}>

            <TextInput
                            style={{flex:1}}

              onChangeText={handleChange('email')}
              onBlur={handleBlur('email')}
              value={values.email}
              keyboardType="email-address"
            />
            </View>
            {touched.email && errors.email && <Text style={styles.error}>{errors.email}</Text>}

            <Text  style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper(touched.password? '#7F00FF':'#7F00FF')}>
            <TextInput
                            style={{flex:1}}

              onChangeText={handleChange('password')}
              onBlur={handleBlur('password')}
              value={values.password}
              secureTextEntry
            />
            </View>
            {touched.password && errors.password && <Text style={styles.error}>{errors.password}</Text>}

   
            <Text  style={styles.label}>Confirmar Senha</Text>
            <View style={styles.inputWrapper(touched.password? '#7F00FF':'#7F00FF')}>
            <TextInput
                            style={{flex:1}}
                placeholder="Confirmar Senha"
                secureTextEntry
                value={values.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
              />
              </View>
              {touched.confirmPassword && errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword}</Text>}


           

            <Text style={{fontSize: 18, fontWeight: '500', paddingTop:15, paddingBottom: 5}}>Detalhes do estabelecimento</Text>

            

              {/* Upload da Logo */}
              {image ? (
  <Image source={{ uri: image }} style={styles.logo} />
) : (
  <Text style={{color: 'red'}}>É obrigatório a imagem</Text>
)}
          <TouchableOpacity style={styles.button} onPress={() => handleImagePicker(setFieldValue)}>
            <Text style={styles.buttonText}>Adicionar a logo da empresa</Text>
          </TouchableOpacity>

            {/* Seller Details */}
            <Text  style={styles.label}>Nome da empresa</Text>
            <View style={styles.inputWrapper(touched.location? '#7F00FF':'#7F00FF')}>
            <TextInput
             style={{flex:1}}
             onChangeText={(text) => {
              const filteredText = text.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''); // Permitir apenas letras e espaços
              setFieldValue('seller.name', filteredText); // Atualiza o campo de nome com o texto filtrado
            }}
             onBlur={handleBlur('seller.name')}
              value={values.seller.name}
            />
            </View>
            {touched.seller?.name && errors.seller?.name && <Text style={styles.error}>{errors.seller?.name}</Text>}

            <Text  style={styles.label}>Descrição do estabelecimento [Especialidade]</Text>
            <View style={styles.inputWrapper(touched.location? '#7F00FF':'#7F00FF')}>

            <TextInput
              style={{flex:1}}
              onChangeText={handleChange('seller.description')}
              onBlur={handleBlur('seller.description')}
              value={values.seller.description}
            />
            </View>

            {touched.seller?.description && errors.seller?.description && (
              <Text style={styles.error}>{errors.seller?.description}</Text>
            )}


           

{/* <Text  style={styles.label}>Localização</Text> */}

{/* <View style={styles.inputWrapper(touched.location? '#7F00FF':'#7F00FF')}> */}
          <Picker
            selectedValue={values.province}
            onValueChange={(itemValue) => setFieldValue('seller.province', itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Localização do estabelecimento" value="" />
            {provinces && provinces.map((province) => (
              <Picker.Item key={province._id} label={province.name} value={province._id} />
            ))}
          </Picker>
{/* </View> */}
{touched.seller?.province && errors.seller?.province && (
            <Text style={styles.error}>{errors.seller.province}</Text> // Mensagem de erro
          )}

            <Text  style={styles.label}>Endereço do estabelecimento [Rua/Av.]</Text>
            <View style={styles.inputWrapper(touched.location? '#7F00FF':'#7F00FF')}>
            <TextInput
                            style={{flex:1}}
              onChangeText={handleChange('seller.address')}
              onBlur={handleBlur('seller.address')}
              value={values.seller.address}
            />
            </View>
            {touched.seller?.address && errors.seller?.address && (
              <Text style={styles.error}>{errors.seller?.address}</Text>
            )}

            <Text  style={styles.label}>Número de conta da empresa [MPESA]</Text>
            <View style={styles.inputWrapper(touched.location? '#7F00FF':'#7F00FF')}>
            <TextInput
               style={{flex:1}}
              onChangeText={handleChange('seller.phoneNumberAccount')}
              onBlur={handleBlur('seller.phoneNumberAccount')}
              value={values.seller.phoneNumberAccount}
              keyboardType="numeric"
            />
            {touched.seller?.phoneNumberAccount && errors.seller?.phoneNumberAccount && (
              <Text style={styles.error}>{errors.seller?.phoneNumberAccount}</Text>
            )}
            </View>

              {/* Work Day and Time Fields */}
              {/* <FieldArray name="seller.workDayAndTime">
              {({ remove, push }) => (
                <View>
                  <Text style={styles.sectionTitle}>Work Days and Time</Text>
                  {values.seller.workDayAndTime.map((day, index) => (
                    <View key={index} style={styles.dayContainer}>
                      <Text>Day Number</Text>
                      <TextInput
                        style={styles.input}
                        onChangeText={handleChange(`seller.workDayAndTime.${index}.dayNumber`)}
                        onBlur={handleBlur(`seller.workDayAndTime.${index}.dayNumber`)}
                        value={values.seller.workDayAndTime[index].dayNumber}
                        keyboardType="numeric"
                      />
                      {touched.seller?.workDayAndTime?.[index]?.dayNumber && errors.seller?.workDayAndTime?.[index]?.dayNumber && (
                        <Text style={styles.error}>{errors.seller.workDayAndTime[index].dayNumber}</Text>
                      )}

                      <Text>Day of the Week</Text>
                      <TextInput
                        style={styles.input}
                        onChangeText={handleChange(`seller.workDayAndTime.${index}.dayOfWeek`)}
                        onBlur={handleBlur(`seller.workDayAndTime.${index}.dayOfWeek`)}
                        value={values.seller.workDayAndTime[index].dayOfWeek}
                      />
                      {touched.seller?.workDayAndTime?.[index]?.dayOfWeek && errors.seller?.workDayAndTime?.[index]?.dayOfWeek && (
                        <Text style={styles.error}>{errors.seller.workDayAndTime[index].dayOfWeek}</Text>
                      )}

                      <Text>Open Time</Text>
                      <TextInput
                        style={styles.input}
                        onChangeText={handleChange(`seller.workDayAndTime.${index}.opentime`)}
                        onBlur={handleBlur(`seller.workDayAndTime.${index}.opentime`)}
                        value={values.seller.workDayAndTime[index].opentime}
                      />
                      {touched.seller?.workDayAndTime?.[index]?.opentime && errors.seller?.workDayAndTime?.[index]?.opentime && (
                        <Text style={styles.error}>{errors.seller.workDayAndTime[index].opentime}</Text>
                      )}

                      <Text>Close Time</Text>
                      <TextInput
                        style={styles.input}
                        onChangeText={handleChange(`seller.workDayAndTime.${index}.closetime`)}
                        onBlur={handleBlur(`seller.workDayAndTime.${index}.closetime`)}
                        value={values.seller.workDayAndTime[index].closetime}
                      />
                      {touched.seller?.workDayAndTime?.[index]?.closetime && errors.seller?.workDayAndTime?.[index]?.closetime && (
                        <Text style={styles.error}>{errors.seller.workDayAndTime[index].closetime}</Text>
                      )}

                      <TouchableOpacity onPress={() => remove(index)} style={styles.removeButton}>
                        <Text style={styles.removeText}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  <Button title="Adicionar dias de trabalho" onPress={() => push({ dayNumber: '', dayOfWeek: '', opentime: '', closetime: '' })} />
                </View>
              )}
            </FieldArray> */}

{/* <Text>Sua posição actual:</Text>
                {errorMsg ? (
                    <Text>{errorMsg}</Text>
                ) : (
                    location && (
                    <Text>
                        Latitude: {location.coords.latitude}, Longitude: {location.coords.longitude}
                    </Text>
                    )
                )} */}
                {/* <Button
                    title="Actualizar localizacao"
                    onPress={async () => {
                    let currentLocation = await Location.getCurrentPositionAsync({});
                    setLocation(currentLocation);
                    }}
            /> */}

            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Registar</Text>
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
    padding: 20,
    flex: 1,
    backgroundColor: 'white', // Softer light background for modern feel
  },
  cover: {
    height: 120,
    width: '100%',
    resizeMode: 'contain',
    marginBottom: 20,
  },
   label: {
    color: '#7F00FF'
   },
  title: {
    fontWeight: '800',
    fontSize: 26, // Slightly larger, stronger font for prominence
    textAlign: 'center',
    color: '#7F00FF', // Sleek dark violet for branding
    marginBottom: 25,
  },
  inputWrapper: (borderColor) => ({
    borderColor: borderColor || '#7F00FF',
    backgroundColor: '#FFF',
    borderWidth: 1,
    height: 55,
    borderRadius: 15, // Smoother corners for a modern feel
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'center',
    // marginBottom: 20, // Additional spacing for cleaner layout
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4, // Softer shadow for more depth
    elevation: 3,
  }),
  input: {
    flex: 1,
    fontSize: 17,
    color: '#333', // Darker text for better contrast
    paddingLeft: 10,
  },
  error: {
    color: 'red',
    fontSize: 13,
    marginBottom: 12,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 20,
    color: '#7F00FF', // Modern purple accent
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#FF4500', // Vibrant orange-red for emphasis
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginTop: 15,
  },
  removeText: {
    color: '#FFF',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 15,
  },
  dayContainer: {
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5, // Elevated effect for modern, card-like design
  },
  button: {
    backgroundColor: '#4CAF50', // Fresh green for action buttons
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.8, // Spacing for elegance
  },
    button: {
      backgroundColor: '#7F00FF', // Vibrant purple color
      paddingVertical: 15,
      paddingHorizontal: 30, // Added horizontal padding for a wider button
      borderRadius: 12, // Rounded corners for a modern look
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 10, // Spacing from other elements
      shadowColor: '#7F00FF', // Subtle shadow with the same color for depth
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5, // Shadow effect for Android
    },
    buttonText: {
      color: '#FFF', // White text for contrast
      fontSize: 18, // Slightly larger text for emphasis
      fontWeight: '700', // Bold for strong CTA
      letterSpacing: 1, // Spaced letters for elegance
    },

  
});

export default SignUp;
