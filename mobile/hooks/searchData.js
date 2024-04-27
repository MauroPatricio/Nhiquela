import { View, Text } from 'react-native'
import React from 'react'
import { useState, useEffect } from 'react'
import api from './createConnectionApi';

const searchData = (query) => {

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fechtData = async () => {
        try{
            setIsLoading(true);
             const result = await api.get(`/search?query=${query}`);
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

export default searchData