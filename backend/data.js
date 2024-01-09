import bcrypt from 'bcryptjs';

const data = {
  users: [
    {
      // _id:'1',
      name: 'Mauro Patricio',
      email: 'mauro.patricio@gmail.com',
      password: bcrypt.hashSync('Patrick2019#'),
      phoneNumber: 840575992,
      isAdmin: true,
      isDeliveryMan: true,
 
    },
   
  ],

  products: [
    // {
    //   // _id:'1',
    //   name: 'Nike Slim Shirt',
    //   slug: 'nike-sli-shirt',
    //   category: 'Shirts',
    //   image: ' /images/p1.jpg',
    //   price: 120,
    //   countInStock: 0,
    //   brand: 'Nike',
    //   rating: 4.5,
    //   numReviews: 7,
    //   description: 'ejbdkbfhdsbjksdfbkdsjbfkdjsbfkjdsbfkdsbfkdsjbfkjds',
    // },
    // {
    //   // _id:'2',
    //   name: 'Adidas',
    //   slug: 'adidas',
    //   category: 'Shirts',
    //   image: ' /images/p2.jpg',
    //   price: 50,
    //   countInStock: 10,
    //   brand: 'Nike',
    //   rating: 2,
    //   numReviews: 3,
    //   description: 'knndslkndslknflsdknksdnlkdsklsdn',
    // },
    // {
    //   // _id:'3',
    //   name: 'Puma',
    //   slug: 'puma',
    //   category: 'Shirts',
    //   image: ' /images/p3.jpeg',
    //   price: 60,
    //   countInStock: 10,
    //   brand: 'Nike',
    //   rating: 3,
    //   numReviews: 5,
    //   description: 'kfsdnlkfsdnljfbsdjkfdsbkjds',
    // },

    // {
    //   // _id:'4',
    //   name: 'Gucci',
    //   slug: 'gucci',
    //   category: 'tshirt',
    //   image: ' /images/p3.jpeg',
    //   price: 60,
    //   countInStock: 10,
    //   brand: 'Nike',
    //   rating: 3.5,
    //   numReviews: 5,
    //   description: 'mkfsdlfksdlfjdsnfljdsbfk',
    // },
  ],
};

export default data;
