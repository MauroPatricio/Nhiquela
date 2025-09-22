import { useState, useEffect } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useContext } from "react";
import { UserType } from "../context/UserType";

const fetchDriver = () => {
    const [driver, setDriver] = useState(null);
    const [isDriverLoading, setDriverLoading] = useState(false);
    const [error, setError] = useState(null);
    

    const fetchData = async () => {
        const token = await AsyncStorage.getItem('token');
        const accessToken = JSON.parse(token)
        setDriverLoading(true);

        try {
            const response = await axios.get(`http://localhost:6002/api/driver`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            setDriver(response.data.data[0]);
            await AsyncStorage.setItem('driver', JSON.stringify(response.data.data[0]));
            
            setDriverLoading(false);
        } catch (error) {
            setError(error)
        } finally {
            setDriverLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, [])


    const refetch =() => {
        setDriverLoading(true);
        fetchData();
    }

    return {driver, isDriverLoading, error, refetch}
}

export default fetchDriver