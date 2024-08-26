import { useState, useEffect } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const fetchPicked = (status) => {
    const [orders, setOrders] = useState(null);
    const [isOrdersLoading, setOrderLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        const token = await AsyncStorage.getItem('token');
        const data = await AsyncStorage.getItem('driver');
        const driver = JSON.parse(data);
        const accessToken = JSON.parse(token)
        setOrderLoading(true);
        console.log(status);
        const endpoint = `http://localhost:6002/api/orders/picked/${status}/${driver._id}`

        console.log(endpoint);
        try {
            const response = await axios.get(endpoint,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            setOrders(response.data.data);
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

export default fetchPicked