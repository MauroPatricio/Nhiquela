import axios from 'axios'

 const instance = axios.create({baseURL: 'https://deliveryshop.herokuapp.com/api'});
// const instance = axios.create({baseURL: 'http://localhost:5000/api'})


 export  const registerNotification = async data => {
    return instance.post(`notification`, data);
  };
  
 export const updateNotification = async data => {
    return instance.patch(`notification?userid=${data?.userId}`, {
      tokenID: data?.token,
    })};




export default instance;