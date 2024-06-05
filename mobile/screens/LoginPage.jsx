import React, { useState } from 'react'
import { View, Text, Image, StyleSheet} from 'react-native'
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackBtn from '../components/BackBtn'
import Button from '../components/Button'
import { Formik } from 'formik';
import * as Yup from 'yup'

840575992
const validationSchema = Yup.object().shape({
    phoneNumber: Yup.string()
      .min(9, 'O número de telefone não pode ser inferior a 9')
      .required('Obrigatório'),

      phoneNumber: Yup.string()
      .min(8, 'Pass')
      .required('Obrigatório'),

    // email: Yup.string().email('Email invalido').required('Obrigatório'),
  });
  

const  LoginPage = ({navigation}) => {

    
    const [loader, setLoader] = useState(false);
    const [response, setResponse] = useState(null);
    const [input, setInput] = useState({
        phoneNumber: '',
        password: ''
    })
  
    return (
        <ScrollView  style={{backgroundColor: 'white'}}>
            <SafeAreaView style={{marginHorizontal: 20}}>
                <View>
                    <BackBtn onPress={()=>navigation.goBack()}/>
                    <Image
                    source={require('../assets/nhiquela.png')}
                    style={styles.cover}
                    />
                    <Text style={styles.title}>O seu aplicativo de entregas e loja online</Text>
                    <Formik
                        initialValues={{phoneNumber: '', password: ''}}
                        validationSchema={validationSchema}
                        >
                        <View>

                        <Button title={"Login"} onPress={()=>{}}/>
                        </View>
                    </Formik>
                </View>
            </SafeAreaView>
        </ScrollView>
  )
}

export default LoginPage


const styles = StyleSheet.create({
    cover: {
        height: 600/2.4,
        width: 320,
        resizeMode: "contain",
        marginBottom: 0,
        backgroundColor: 'white'
    },
    title:{
    alignItems: "center",
    fontWeight: "700",
     textAlign: "center",
     fontSize: 18
    }
})