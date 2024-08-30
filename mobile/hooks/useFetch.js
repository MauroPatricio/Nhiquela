import { View, Text } from 'react-native'
import React from 'react'
import { useState, useEffect } from 'react'
import api from '../hooks/createConnectionApi';

const useFetch = () => {

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fechtData = async () => {
        try{
            setIsLoading(true);
            const result = await api.get('/products');
            setData(result.data)
            setIsLoading(false);
            
        }catch(error){
            setError(error)
        }finally{
            setError(error)
        }
    }

    useEffect(()=>{
        fechtData()
    }, []);

    const refetch = () =>{
        setIsLoading(true);
        fechtData();
    }

   return {data, isLoading, error, refetch}
  
}

export default useFetch