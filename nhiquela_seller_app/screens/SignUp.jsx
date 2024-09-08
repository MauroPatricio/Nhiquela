import React, { useState } from 'react'
import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity, Alert} from 'react-native'
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackBtn from '../components/BackBtn'
import Button from '../components/Button'
import { Formik } from 'formik';
import {MaterialCommunityIcons} from '@expo/vector-icons'
import * as Yup from 'yup'
import api from '../hooks/createConnectionApi';

const validationSchema = Yup.object().shape({
    phoneNumber: Yup.string()
      .min(9, 'O número de telefone não pode ser inferior a 9 dígitos')
      .max(9, 'O número de telefone não pode ser superior a 9 dígitos')
      .required('Obrigatório'),

    password: Yup.string()
      .min(6, 'A senha deve conter 6 dígitos')
      .required('Obrigatório'),

    email: Yup.string()
      .required('Obrigatório'),

      name: Yup.string()
      .required('Obrigatório'),

    email: Yup.string().email('Email invalido').required('Obrigatório'),
  });



const SignUp = ({navigation}) => {

    const [loader, setLoader] = useState(false);
    const [response, setResponse] = useState(null);
    const [input, setInput] = useState({
        phoneNumber: '',
        password: '',
        email: '',
        name: ''
    });
    const [hideText, setHideText] = useState(false);

  const submitRegistration = async (values) => {
    setLoader(true);
    try{
        const data = values;
        const response = await api.post('/users/signup', data);
      
        if(response.status==200){
            navigation.navigate('Login')
        }

    }catch(error){
        // console.log(error.response.data)
        Alert.alert(error.response.data.message)
    }finally{
        setLoader(false);

    }
  }

  return (
    <ScrollView  style={{backgroundColor: 'white'}}>
    <SafeAreaView style={{marginHorizontal: 20}}>
        <View>
            <BackBtn onPress={()=>navigation.goBack()}/>
            <Image
            source={require('../assets/nhiquela.png')}
            style={styles.cover}
            />
            <Text style={styles.title}>NOVO REGISTO</Text>
            <Formik
                initialValues={{phoneNumber: '', password: '', name:'', email:''}}
                validationSchema={validationSchema}
                onSubmit={(values)=>submitRegistration(values)}
                >
    {({ handleChange, handleBlur, touched,handleSubmit, values, errors, isValid, setFieldTouched  }) => (
        <View>

<View style={styles.wrapper}>
            <Text style={styles.label}>Nome e apelido</Text>
            <View style={styles.inputWrapper(touched.phoneNumber? '#7F00FF':'black')}>
                <MaterialCommunityIcons 
                name='face-man'
                size={20}
                color={'grey'}
                style={styles.iconStyle}
                />
                <TextInput placeholder='Nome e apelido' 
                onFocus={()=>{setFieldTouched('name')}}
                onBlur={()=>{setFieldTouched('name', '')}}
                autoCapitalize='none'
                autoCorrect={false}
                style={{flex:1}}
                value={values.name}
                onChangeText={handleChange('name')}
                />
            </View>
            {touched.name && errors.name && (
                <Text style={styles.errorMessage}>{errors.name}</Text>

            )}
        </View> 

        <View style={styles.wrapper}>
            <Text style={styles.label}>Número de telefone</Text>
            <View style={styles.inputWrapper(touched.phoneNumber? '#7F00FF':'black')}>
                <MaterialCommunityIcons 
                name='phone'
                size={20}
                color={'grey'}
                style={styles.iconStyle}
                />
                <TextInput placeholder='Insira o número de telefone' 
                onFocus={()=>{setFieldTouched('phoneNumber')}}
                onBlur={()=>{setFieldTouched('phoneNumber', '')}}
                autoCapitalize='none'
                autoCorrect={false}
                style={{flex:1}}
                value={values.phoneNumber}
                onChangeText={handleChange('phoneNumber')}
                maxLength={9}

               />
            </View>
            {touched.phoneNumber && errors.phoneNumber && (
                <Text style={styles.errorMessage}>{errors.phoneNumber}</Text>

            )}
        </View>   


        <View style={styles.wrapper}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper(touched.email? '#7F00FF':'black')}>
                <MaterialCommunityIcons 
                name='email'
                size={20}
                color={'grey'}
                style={styles.iconStyle}
                />
                <TextInput placeholder='@' 
                onFocus={()=>{setFieldTouched('email')}}
                onBlur={()=>{setFieldTouched('email', '')}}
                autoCapitalize='none'
                autoCorrect={false}
                style={{flex:1}}
                value={values.email}
                onChangeText={handleChange('email')}
                />
            </View>
            {touched.email && errors.email && (
                <Text style={styles.errorMessage}>{errors.email}</Text>

            )}
        </View>  


        <View style={styles.wrapper}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper(touched.phoneNumber? '#7F00FF':'black')}>
                <MaterialCommunityIcons 
                name='lock'
                size={20}
                color={'grey'}
                style={styles.iconStyle}
                />
                <TextInput placeholder='Sua senha' 
                secureTextEntry={hideText}
                onFocus={()=>{setFieldTouched('password')}}
                onBlur={()=>{setFieldTouched('password', '')}}
                autoCapitalize='none'
                autoCorrect={false}
                style={{flex:1}}
                value={values.password}
                onChangeText={handleChange('password')}
                />
            <TouchableOpacity onPress={()=>{setHideText(!hideText)}}>
                <MaterialCommunityIcons
                name={hideText? "eye-outline": "eye-off-outline"}
                size={18}/>
            </TouchableOpacity>

            </View>
            {touched.password && errors.password && (
                <Text style={styles.errorMessage}>{errors.password}</Text>
            )}
        </View>   
        <View>
        <Button title={"Registar"} onPress={isValid? handleSubmit: ()=>{}} isValid={isValid?'#7F00FF':'red'} loader={loader}/>
        
        </View>
        </View>
        
)}
                    
 
            </Formik>
        </View>
    </SafeAreaView>
</ScrollView>
  )
}

export default SignUp


const styles = StyleSheet.create({
    cover: {
        height: 480/2.4,
        width: 320,
        resizeMode: "contain",
        marginBottom: 0,
        backgroundColor: 'white'
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
})