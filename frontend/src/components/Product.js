import { Link } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Rating from '../components/Rating';
import { useContext } from 'react';
import { Store } from '../Store';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartPlus } from '@fortawesome/free-solid-svg-icons';

function Product(props) {
  const { product, seller } = props;
  const { state, dispatch: ctxDispatch } = useContext(Store);

  const {
    cart: { cartItems },
  } = state;

  const addOnCartHandler = () => {
    const existItem = cartItems.find((x) => x._id === product._id);
    const quantity = existItem ? existItem.quantity + 1 : 1;
    if (product.countInStock === quantity) {
      toast.error('Desculpe, o Produto não está disponível', {
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }
    toast.info('Item adicionado ao carrinho', {
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });

    ctxDispatch({
      type: 'ADD_ITEM_ON_CART',
      payload: { ...product, quantity: quantity },
    });
  };

  return (
    <>
      {product && (
        <Card className="product zoom-image">
          <Link to={`/product/${product.slug}`}>
            {/* {product.onSale && (
              <span className="sale">
                <b>Promoção</b>
              </span>
            )} */}
            {/* {product.onSale && (
              <span className="sale-percentage">
                <b>{product.onSalePercentage * 100}%</b>
              </span>
            )} */}

            <img
              src={product.image}
              className="card-img-top "
              alt={product.name}
            ></img>
          </Link>
          <div className="product-info small ">
            <Link className="link-none" to={`/product/${product.slug}`}>
              <b>{product.name}</b>
            </Link>
            {/* <Rating rating={product.rating} numReviews={product.numReviews} /> */}
            <br/>{product.countInStock} unidade(s)<br/>
            <Link
              className="link-none"
              to={product.seller ? `/seller/${product.seller._id}` : ''}
            >
              {product.seller
                ? <b>{product.seller.seller}</b>
                  ? <b>{product.seller.seller.name}</b>
                  : ''
                : ''}
              <br></br>
            </Link>
            <div className="price">
              {product.price}Mt
              {/* {product.onSale ? (
                <>
                &nbsp;

                  <span>
                    <small>{product.price}Mt</small>
                  </span>
                </>
              ):<span>{product.price} Mt</span>} */}
            </div>

            {product.countInStock === 0 ? (
              <Button disabled variant="light">
                Sem estoque
              </Button>
            ) : (
              <Button
                className="customButtom space"
                onClick={() => addOnCartHandler(product)}
                variant="light"
              >
                <FontAwesomeIcon icon={faCartPlus} />
              </Button>
            )}
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
              <b>{seller.seller.name}</b>
            </Link>
            <br />
            {seller.seller.description}
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
