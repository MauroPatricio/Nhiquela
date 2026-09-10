import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runSimulation() {
  console.log('🚀 Iniciando Simulação E2E: NhiquelaSeller -> Nhiquela');

  try {
    // 1. Criar utilizador vendedor
    console.log('\n[1/6] A criar utilizador Vendedor...');
    const sellerRes = await axios.post(`${BASE_URL}/users/signup`, {
      name: 'Vendedor Teste',
      phoneNumber: '25884' + Math.floor(Math.random() * 10000000), 
      password: 'password123',
      isSeller: true,
      nuit: '123456789' 
    }).catch(async (e) => {
      if (e.response && e.response.status === 404) {
          console.log('Endpoint signup falhou, pode requerer criação manual no backend.');
      }
      throw e;
    });
    
    const sellerToken = sellerRes.data.token;
    console.log('✅ Vendedor criado! Token:', sellerToken.substring(0, 15) + '...');

    // 2. Criar um Produto no NhiquelaSeller
    console.log('\n[2/6] O Vendedor a criar um Produto...');
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
    console.log(`✅ Produto "Smartphone X" criado com sucesso! ID: ${productId}`);

    // 3. Cliente regista-se e obtém token
    console.log('\n[3/6] A criar utilizador Cliente...');
    const clientRes = await axios.post(`${BASE_URL}/users/signup`, {
      name: 'Cliente Teste',
      phoneNumber: '25884' + Math.floor(Math.random() * 10000000),
      password: 'password123',
    });
    const clientToken = clientRes.data.token;
    console.log('✅ Cliente criado! Token:', clientToken.substring(0, 15) + '...');

    // 4. Cliente consegue visualizar o produto na loja
    console.log('\n[4/6] O Cliente a listar os produtos...');
    const listRes = await axios.get(`${BASE_URL}/products?pageSize=10&page=1`);
    const foundProduct = listRes.data.products.find(p => p._id === productId);
    if (!foundProduct) throw new Error('Produto não encontrado na listagem.');
    console.log(`✅ O produto está visível na loja para o cliente! (Preço de Venda: ${foundProduct.price} MZN)`);

    // 5. Cliente compra o produto
    console.log('\n[5/6] O Cliente a comprar o produto (Checkout)...');
    const orderRes = await axios.post(`${BASE_URL}/orders`, {
        orderItems: [
          {
            _id: productId,
            name: 'Smartphone X',
            quantity: 1,
            seller: providerId,
            price: foundProduct.price,
            image: 'http://example.com/image.png'
          }
        ],
        address: {
          fullName: 'Cliente Teste',
          address: 'Rua Principal',
          city: 'Maputo',
          phoneNumber: '258849998888'
        },
        paymentMethod: 'mpesa',
        itemsPrice: foundProduct.price,
        deliveryPrice: 100,
        taxPrice: 0,
        totalPrice: foundProduct.price + 100,
        itemsPriceForSeller: 15000,
        isUserWantDelivery: true,
        isPaid: false
    }, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    const orderId = orderRes.data.order._id;
    console.log(`✅ Encomenda criada! Pedido ID: ${orderId}`);

    // Simulação de pagamento concluído (API Admin/Interna)
    console.log('\n🔄 [SIMULAÇÃO DE PAGAMENTO] Marcando pedido como pago via API...');
    await axios.put(`${BASE_URL}/orders/${orderId}/pay`, {
      id: 'TRANS_' + Date.now(),
      status: 'COMPLETED',
      update_time: new Date().toISOString(),
      email_address: 'mpesa@test.com'
    }, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    console.log('✅ Pagamento M-Pesa aprovado!');

    // 6. Verificar a lista Meus Pedidos
    console.log('\n[6/6] Verificando a lista "Meus Pedidos" do Cliente...');
    const mineRes = await axios.get(`${BASE_URL}/orders/mine`, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    const myOrder = mineRes.data.find(o => o._id === orderId);
    
    if (myOrder) {
      console.log(`✅ O pedido ${myOrder._id} consta na lista com estado de Pagamento: ${myOrder.isPaid ? 'PAGO' : 'PENDENTE'} (deleted: ${myOrder.deleted})`);
      console.log('🎉 SIMULAÇÃO COMPLETA COM SUCESSO! 🎉');
    } else {
      console.log('❌ O pedido NÃO foi encontrado na lista de "Meus Pedidos"!');
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
