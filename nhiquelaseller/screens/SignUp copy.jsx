

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, Image, SafeAreaView, TouchableOpacity } from 'react-native';
import { Formik, FieldArray } from 'formik';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import {MaterialCommunityIcons} from '@expo/vector-icons'
import BackBtn from '../components/BackBtn';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';


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
    workDayAndTime: Yup.array().of(
        Yup.object().shape({
          dayNumber: Yup.number().required('O número do dia é obrigatório'),
          dayOfWeek: Yup.string().required('O dia da semana é obrigatório'),
          opentime: Yup.string().required('Horário de funcionamento e obrigação'),
          closetime: Yup.string().required('Os horários de encerramento são obrigatórios'),
        })
      )
  }),
});

const SignUp = ({navigation}) => {
//   const navigation = useNavigation();
  const route = useRoute();
  const [workDaysWithTime, setWorkDaysWithTime] = useState([]);
  const [image, setImage] = useState(null);
  const [sellerLogo, setSellerLogo] = useState(null);
  const [fieldValue, setFieldValue] = useState(null);
  const [location, setLocation] = useState(null);

  const [errorMsg, setErrorMsg] = useState(null);


  const handleImagePicker = async () => {
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
      setFieldValue('sellerLogo', uploadedImage);
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


  const uploadImage = async (uri)=>{

    // let formData = new FormData();
    // formData.append('file', {
    //   uri,
    //   name: 'image.jpg',  // You can set the actual file name here
    //   type: 'image/jpeg'  // Adjust the MIME type if necessary
    // });

    const file = uri;
    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
  
    try {
  
      // Send the request to upload the image
      const { data } = await api.post('upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSellerLogo(data.secure_url);
    }catch(error){
        console.log(error)
    }
  
  
  }


  return (
    <SafeAreaView style={styles.container}>
        <ScrollView >
        <BackBtn onPress={()=>navigation.goBack()}/>
            <Image
            source={require('../assets/nhiquela.png')}
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
            checkedTerms: false,

            workDayAndTime: [
                { dayNumber: '', dayOfWeek: '', opentime: '', closetime: '' },
              ]
          },
        }}
        validationSchema={validationSchema}
        onSubmit={async (values) => {
          try {
            const { data } = await api.post('users/signup', values);
            navigation.navigate('Home');
          } catch (error) {
            Alert.alert('Erro', error.message);
          }
          // Submit logic goes here
        }}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
          <>
            {/* User Details */}
            <Text style={{fontSize: 18, fontWeight: '500', paddingTop:15, paddingBottom: 5}}>Dados do representante</Text>

            <Text>Nome e Apelido</Text>
          

                 <View style={styles.inputWrapper(touched.name? '#7F00FF':'black')}>
             
                <TextInput 
                autoCapitalize='none'
                autoCorrect={false}
                style={{flex:1}}
                value={values.name}
                onChangeText={handleChange('name')}
                />
            </View>
                {touched.name && errors.name && <Text style={styles.error}>{errors.name}</Text>}

            <Text style={{fontSize: 18, fontWeight: '500', paddingTop:15, paddingBottom: 5}}>Detalhes do estabelecimento</Text>

            <Text>Número de telefone</Text>
            <View style={styles.inputWrapper(touched.phoneNumber? '#7F00FF':'black')}>
            <TextInput
              onChangeText={handleChange('phoneNumber')}
              onBlur={handleBlur('phoneNumber')}
              value={values.phoneNumber}
              keyboardType="numeric"
            />
            </View>
            {touched.phoneNumber && errors.phoneNumber && <Text style={styles.error}>{errors.phoneNumber}</Text>}



            <Text>Email</Text>

            <View style={styles.inputWrapper(touched.email? '#7F00FF':'black')}>

            <TextInput
              onChangeText={handleChange('email')}
              onBlur={handleBlur('email')}
              value={values.email}
              keyboardType="email-address"
            />
            </View>
            {touched.email && errors.email && <Text style={styles.error}>{errors.email}</Text>}

            <Text>Senha</Text>
            <View style={styles.inputWrapper(touched.password? '#7F00FF':'black')}>
            <TextInput
              onChangeText={handleChange('password')}
              onBlur={handleBlur('password')}
              value={values.password}
              secureTextEntry
            />
            </View>
            {touched.password && errors.password && <Text style={styles.error}>{errors.password}</Text>}

   
            <Text>Confirmar Senha</Text>
            <View style={styles.inputWrapper(touched.password? '#7F00FF':'black')}>
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

            <View style={styles.inputWrapper(touched.location? '#7F00FF':'black')}>
            <TextInput
              onChangeText={handleChange('location')}
              onBlur={handleBlur('location')}
              value={values.location}
            />
            </View>
            {touched.location && errors.location && <Text style={styles.error}>{errors.location}</Text>}

              {/* Upload da Logo */}
          <Button title="Adicionar a Logo da Loja" onPress={handleImagePicker} />
          {image && <Image source={{ uri: image }} style={styles.image} />}

            {/* Seller Details */}
            <Text>Nome da empresa</Text>
            <View style={styles.inputWrapper(touched.location? '#7F00FF':'black')}>
            <TextInput
              onChangeText={handleChange('seller.name')}
              onBlur={handleBlur('seller.name')}
              value={values.seller.name}
            />
            </View>
            {touched.seller?.name && errors.seller?.name && <Text style={styles.error}>{errors.seller?.name}</Text>}

            <Text>Descrição da loja [Especialidade]</Text>
            <View style={styles.inputWrapper(touched.location? '#7F00FF':'black')}>

            <TextInput
              onChangeText={handleChange('seller.description')}
              onBlur={handleBlur('seller.description')}
              value={values.seller.description}
            />
            </View>

            {touched.seller?.description && errors.seller?.description && (
              <Text style={styles.error}>{errors.seller?.description}</Text>
            )}


            <Text>Your current location:</Text>
                {errorMsg ? (
                    <Text>{errorMsg}</Text>
                ) : (
                    location && (
                    <Text>
                        Latitude: {location.coords.latitude}, Longitude: {location.coords.longitude}
                    </Text>
                    )
                )}
                <Button
                    title="Actualizar localizacao"
                    onPress={async () => {
                    let currentLocation = await Location.getCurrentPositionAsync({});
                    setLocation(currentLocation);
                    }}
            />

            <Text>Endereço da loja [Rua/Av.]</Text>
            <View style={styles.inputWrapper(touched.location? '#7F00FF':'black')}>
            <TextInput
              onChangeText={handleChange('seller.address')}
              onBlur={handleBlur('seller.address')}
              value={values.seller.address}
            />
            </View>
            {touched.seller?.address && errors.seller?.address && (
              <Text style={styles.error}>{errors.seller?.address}</Text>
            )}

            <Text>Numero de conta da empresa</Text>
            <View style={styles.inputWrapper(touched.location? '#7F00FF':'black')}>
            <TextInput
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
              <FieldArray name="seller.workDayAndTime">
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
            </FieldArray>

            <Button onPress={handleSubmit} title="Submit" />
          </>
        )}
      </Formik>
        </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    cover: {
        height: 100,
        width: 320,
        resizeMode: "contain",
        marginBottom: 0,
        backgroundColor: 'white'
    },
  container: {
    padding: 20,
    flex:1,
    backgroundColor: 'white'
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  title:{
    alignItems: "center",
    fontWeight: "500",
     textAlign: "center",
     fontSize: 18,
      marginBottom: 15,
     color: 'grey'
    },
    wrapper:{
        marginBottom: 20,
        // marginHorizontal: 20
    },
    label:{
        fontSize: 12,
        marginBottom: 5,
        marginEnd: 2,
        // textAlign:"right",
        color: '#7F00FF'
    },
    inputWrapper:(borderColor) =>({
        borderColor: borderColor,
        backgroundColor: '#F8F8F8',
        borderWidth: 1,
        height: 50,
        borderRadius: 12,
        flexDirection: 'row',
        paddingHorizontal: 15,
        alignItems: 'center'
    }),
    errorMessage: {
        color:'red',
        marginTop: 5,
        marginLeft: 6,
        fontSize: 10
    },
    registration: {
        textAlign: "center",
        fontWeight: "500"
    }
});

export default SignUp;
