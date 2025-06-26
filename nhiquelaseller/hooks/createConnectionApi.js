import axios from 'axios'

const api = axios.create({baseURL: 'http://deliveryshop.herokuapp.com/api'})
// const api = axios.create({baseURL: 'https://192.168.0.4:5000/api'})

// const api = axios.create({baseURL: 'http://localhost:5000/api'})

export default api;