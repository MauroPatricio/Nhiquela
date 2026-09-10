import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runSimulation() {
  console.log('🚀 Iniciando Simulação E2E: NhiquelaSeller -> Nhiquela -> Driver');

  try {
    const randomSuffix = Math.floor(Math.random() * 10000000);
    // 1. Criar utilizador Vendedor
    console.log('\n[1/11] A criar utilizador Vendedor...');
    const sellerRes = await axios.post(`${BASE_URL}/users/signup`, {
      name: 'Vendedor Teste ' + randomSuffix,
      phoneNumber: '25884' + randomSuffix, 
      email: 'vendedor' + randomSuffix + '@example.com',
      password: 'password123',
      isSeller: true,
      seller: { name: 'Vendedor Teste ' + randomSuffix },
      nuit: '123456789' 
    });
    const sellerToken = sellerRes.data.token;
    console.log('✅ Vendedor criado! Token:', sellerToken.substring(0, 15) + '...');

    // 2. Criar um Produto
    console.log('\n[2/11] O Vendedor a criar um Produto...');
    const productRes = await axios.post(`${BASE_URL}/products`, {
        name: 'Smartphone X',
        nome: 'Smartphone X',
        slug: 'smartphone-x-' + Date.now(),
        price: 15000,
        countInStock: 10,
        brand: 'TechBrand',
        description: 'Smartphone de última geração',
        image: 'http://example.com/image.png'
      }, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    const productId = productRes.data.product._id;
    const providerId = productRes.data.product.seller;
    console.log(`✅ Produto criado! ID: ${productId}`);

    // 3. Criar utilizador Cliente
    console.log('\n[3/11] A criar utilizador Cliente...');
    const clientRes = await axios.post(`${BASE_URL}/users/signup`, {
      name: 'Cliente Teste ' + randomSuffix,
      phoneNumber: '25885' + randomSuffix,
      email: 'cliente' + randomSuffix + '@example.com',
      password: 'password123',
    });
    const clientToken = clientRes.data.token;
    console.log('✅ Cliente criado!');

    // 4. Criar utilizador Driver
    console.log('\n[4/11] A criar utilizador Driver...');
    const driverRes = await axios.post(`${BASE_URL}/users/signup`, {
      name: 'Driver Teste ' + randomSuffix,
      phoneNumber: '25886' + randomSuffix,
      password: 'password123',
      email: 'driver' + randomSuffix + '@example.com',
      photo: 'http://example.com/photo.png',
      isDeliveryMan: true,
      transport_type: 'Motorcycle',
      transport_color: 'Black',
      transport_registration: 'ABC-123',
      vehicle_type_id: '64f1c9d2e4b0000000000001',
      vihicle_picture: 'url',
      vihicle_picture_front: 'url',
      vihicle_picture_back: 'url',
      vihicle_inspection: 'url',
      vihicle_Insurance: 'url',
      vihicle_logbook: 'url',
      license_front: 'url',
      license_back: 'url',
      document_front: 'url',
      document_back: 'url',
      Proof_of_Address: 'url'
    });
    const driverLoginRes = await axios.post(`${BASE_URL}/users/signin`, {
      phoneNumber: '25886' + randomSuffix,
      password: 'password123',
    });
    const driverToken = driverLoginRes.data.token;
    console.log('✅ Driver criado!');

    // 5. Cliente compra o produto
    console.log('\n[5/11] O Cliente a comprar o produto...');
    const orderRes = await axios.post(`${BASE_URL}/orders`, {
        orderItems: [
          {
            _id: productId,
            name: 'Smartphone X',
            quantity: 1,
            seller: providerId,
            price: 15000,
            image: 'http://example.com/image.png'
          }
        ],
        address: {
          fullName: 'Cliente Teste',
          address: 'Rua Principal',
          city: 'Maputo',
          phoneNumber: '258859998888'
        },
        paymentMethod: 'mpesa',
        itemsPrice: 15000,
        deliveryPrice: 100,
        taxPrice: 0,
        totalPrice: 15100,
        itemsPriceForSeller: 15000,
        isUserWantDelivery: true,
        isPaid: false
    }, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    const orderId = orderRes.data.order._id;
    console.log(`✅ Encomenda criada! Pedido ID: ${orderId}`);

    // 6. Pagamento
    console.log('\n[6/11] Pagamento...');
    await axios.put(`${BASE_URL}/orders/${orderId}/pay`, {
      id: 'TRANS_' + Date.now(),
      status: 'COMPLETED',
      update_time: new Date().toISOString(),
      email_address: 'mpesa@test.com'
    }, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    console.log('✅ Pagamento M-Pesa aprovado!');

    // 7. Seller accepts
    console.log('\n[7/11] Vendedor aceita a encomenda...');
    await axios.put(`${BASE_URL}/orders/${orderId}/accept`, {}, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    console.log('✅ Encomenda aceite pelo vendedor!');

    // 8. Seller marks as available to deliver
    console.log('\n[8/11] Vendedor marca para entrega...');
    await axios.put(`${BASE_URL}/orders/${orderId}/availableToDeliver`, {}, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    console.log('✅ Marcada como disponível para entrega!');

    // 9. Driver accepts delivery
    console.log('\n[9/11] Driver aceita a entrega...');
    await axios.put(`${BASE_URL}/orders/${orderId}/acceptedByDeliveryman`, {}, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    console.log('✅ Entrega aceite pelo driver!');

    // 10. Driver picks up (in transit)
    console.log('\n[10/11] Driver recolhe a encomenda (em trânsito)...');
    await axios.put(`${BASE_URL}/orders/${orderId}/intransit`, {}, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    console.log('✅ Encomenda em trânsito!');

    // 11. Driver delivers
    console.log('\n[11/11] Driver entrega a encomenda...');
    await axios.put(`${BASE_URL}/orders/${orderId}/deliver`, {}, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    console.log('✅ Encomenda entregue!');

    // Validate final order state
    const validateRes = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    const finalOrder = validateRes.data;
    if (finalOrder.status === 'Entregue' && finalOrder.isDelivered) {
       console.log('\n🎉 SIMULAÇÃO COMPLETA COM SUCESSO! A encomenda foi entregue. 🎉');
    } else {
       console.log('\n⚠️ Simulação terminou, mas o estado não está como esperado:', finalOrder.status, finalOrder.isDelivered);
    }

  } catch (error) {
    console.error('❌ Ocorreu um erro na simulação:');
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runSimulation();
