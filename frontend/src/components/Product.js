import { Link } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { useContext } from 'react';
import { Store } from '../Store';
import { truncateString } from '../utils';

function Product(props) {
  const { product, seller } = props;
  const { state, dispatch: ctxDispatch } = useContext(Store);

  const {
    cart: { cartItems },
  } = state;

  // const addOnCartHandler = () => {
  //   const existItem = cartItems.find((x) => x._id === product._id);
  //   const quantity = existItem ? existItem.quantity + 1 : 1;
  //   if (product.countInStock === quantity) {
  //     toast.error('Desculpe, o Produto não está disponível', {
  //       hideProgressBar: false,
  //       closeOnClick: true,
  //       pauseOnHover: true,
  //       draggable: true,
  //     });
  //     return;
  //   }


  //   if(cartItems.length > 0 && product.seller._id !== cartItems[0].seller._id){
  //     ctxDispatch({
  //       type: 'ADD_ITEM_FAIL',
  //       payload: `Na carrinha, só é permitido adicionar produtos pertecentes a um único fornecedor por vez ${cartItems[0].seller.seller.name}`,
  //     });

  //     toast.error(`Na carrinha, só é permitido adicionar produtos pertecentes a um único fornecedor por vez ${cartItems[0].seller.seller.name}`, {
  //       hideProgressBar: false,
  //       closeOnClick: true,
  //       pauseOnHover: true,
  //       draggable: true,
  //     });
  //   }else{

  //     ctxDispatch({
  //       type: 'ADD_ITEM_ON_CART',
  //       payload: { ...product, quantity: quantity },
  //     });

  //     toast.info('Item adicionado ao carrinho', {
  //       hideProgressBar: false,
  //       closeOnClick: true,
  //       pauseOnHover: true,
  //       draggable: true,
  //     });
  //   }

  // };

  return (
    <>
      {product && (
        <Card className="product zoom-image">
          <Link to={`/product/${product.slug}`}>
           

            <img
              className="card-img-top"
              src={product.image}
              alt={product.name}
            ></img>
          </Link>
          <div className="product-info small ">
            <Link className="link-none" to={`/product/${product.slug}`}>
              <b>{truncateString(product.name,30)}</b>
            </Link>
            {/* <Rating rating={product.rating} numReviews={product.numReviews} /> */}
            <br/>{product.countInStock} unidade(s)<br/>
            <Link
              className="link-none"
              to={product.seller ? `/seller/${product.seller._id}` : ''}
            >
              {product.seller
                ? <b>{product.seller.seller}</b>
                  ? <b>{truncateString(product.seller.seller.name,30)}</b>
                  : ''
                : ''}
              <br></br>
            </Link>
            <div className="price">
              <b style={{color: '#a435f0'}}>{product.price} MT</b>
              {/* {product.onSale ? (
                <>
                &nbsp;

                  <span>
                    <small>{product.price}Mt</small>
                  </span>
                </>
              ):<span>{product.price} Mt</span>} */}
            </div>

            {product.countInStock === 0 
            ? (
              <Button disabled variant="light">
                Sem estoque
              </Button>
            ) 
            : (
              <>&nbsp;</>
              // <Button
              //   className="customButtom space"
              //   onClick={() => addOnCartHandler(product)}
              //   variant="light"
              // >
              //   <FontAwesomeIcon icon={faCartPlus} />
              // </Button>
            )
            }
          </div>
        </Card>
      )}

      {seller && (
        <Card className="product zoom-image">
          <Link to={seller.seller ? `/seller/${seller._id}` : ''}>
            <img
              src={seller.seller.logo}
              className="card-img-top "
              alt={seller.name}
            ></img>
          </Link>
          <div className="product-info small ">
            <Link
              className="link-none"
              to={seller.seller ? `/seller/${seller._id}` : ''}
            >
              <b>{truncateString(seller.seller.name,30)}</b>
            </Link>
            <br />
            {truncateString(seller.seller.description,60)}
            {/* <Rating
              rating={seller.seller.rating}
              numReviews={seller.seller.numReviews}
            /> */}
          </div>
        </Card>
      )}
    </>
  );
}

export default Product;
