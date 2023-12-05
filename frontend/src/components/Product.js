import { Link } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import { truncateString } from '../utils';
import Badge from 'react-bootstrap/esm/Badge';
import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
import { Store } from '../Store';

function Product(props) {
  const { product, seller } = props;
  const { t } = useTranslation();

  const { state, dispatch: ctxDispatch } = useContext(Store);

  const {changelng} = state;

  return (
    <>
      {product && (
        <Card className="product zoom-image" >
                      {product && product.onSale &&  <span className="sale"><b>{t('onsale')}</b></span>}
                      {product && product.onSale &&  <span className="sale-percentage"><b>{product.onSalePercentage*100}%</b></span>}

          <Link to={`/product/${product.slug}`}>
           
          <Card.Img variant="top" style={{height: '190px'}} src={product.image} alt="Card image" />
          </Link>
          {product.countInStock === 0 
            && (
              // <Button disabled variant="light">
                
              // </Button>
              <b className='link-none'></b>
          
            ) 
            }
          <div className="product-info small ">
            <Link className="link-none" to={`/product/${product.slug}`}>
              <b>{changelng=='pt'?truncateString(product.nome,30):truncateString(product.name,30)}</b>
              {/* <b>{truncateString(product.name,30)}</b> */}

            </Link>
            <br/>{product.countInStock !== 0 ?product.countInStock +` unidade(s)`: <Badge bg='danger'>{t('outofstock')}</Badge>}<br/>
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
              
              {product.onSale ? (
                <>
                &nbsp;

                <span style={{color: '#a435f0'}}>{product.discount} MT</span>
                  <span>
                    <small>{product.price} MT</small>
                  </span>
                  
                </>
              ):<b style={{color: '#a435f0'}}>{product.price} MT</b>}
            </div>

           
          </div>
        </Card>
      )}

      {seller && (
        <Card className="product zoom-image">
          <Link to={seller.seller ? `/seller/${seller._id}` : ''}>
            
                      <Card.Img variant="top" style={{height: '190px'}} src={seller.seller.logo} alt="Card image" />

          </Link>
          <div className="product-info small ">
            <Link
              className="link-none"
              to={seller.seller ? `/seller/${seller._id}
              ` : ''}
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
