import axios from 'axios'

const instance = axios.create({baseURL: 'http://deliveryshop.herokuapp.com/api'})

export default instance;