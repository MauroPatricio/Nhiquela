import { useState, useEffect } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useContext } from "react";
import { UserType } from "../context/UserType";

const fetchOrders = (query) => {
    const [orders, setDriver] = useState(null);
    const [isOrdersLoading, setOrderLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        const token = await AsyncStorage.getItem('token');
        const accessToken = JSON.parse(token)
        setOrderLoading(true);

        try {
            const response = await axios.get(`http://localhost:6002/api/orders/delivery/${query}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            setDriver(response.data.data);
            setOrderLoading(false);
        } catch (error) {
            setError(error)
        } finally {
            setOrderLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, [])


    const refetch =() => {
        setOrderLoading(true);
        fetchData();
    }

    return {orders, isOrdersLoading, error, refetch}
}

export default fetchOrders