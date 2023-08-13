import { Link } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { truncateString } from '../utils';

function Product(props) {
  const { product, seller } = props;

  return (
    <>
      {product && (
        <Card className="product zoom-image" >
          <Link to={`/product/${product.slug}`}>
           
          <Card.Img variant="top" src={product.image} alt="Card image" />
          </Link>
          <div className="product-info small ">
            <Link className="link-none" to={`/product/${product.slug}`}>
              <b>{truncateString(product.name,30)}</b>
            </Link>
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
            {truncateString(seller.seller.description,30)}
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
