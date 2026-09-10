// Para bulk SMS
const axios = require('axios');

// Defina os números de telefone e as mensagens que deseja enviar
const tell1 = 'NUMERO1'; // Substitua "NUMERO1" pelo número de telefone 1
const tell2 = 'NUMERO2'; // Substitua "NUMERO2" pelo número de telefone 2
const tell3 = 'NUMERO3'; // Substitua "NUMERO3" pelo número de telefone 3

const messages = [
  {
    number: tell1,
    text: 'Esta é a sua mensagem'
  },
  {
    number: tell2,
    text: 'Esta é outra mensagem'
  },
  {
    number: tell3,
    text: 'Esta é outra mensagem'
  }
];

const apiUrl = 'http://api.mozesms.com/bulk_json/v2/';
const bearerToken = 'Bearer Seu token'; // Substitua pelo seu token de autorização

// Envia a solicitação HTTP POST usando axios
axios.post(apiUrl, { messages }, { headers: { Authorization: bearerToken } })
  .then(response => {
    console.log('Resposta da API:', response.data);
  })
  .catch(error => {
    console.error('Ocorreu um erro ao enviar as mensagens:', error.message);
  });
