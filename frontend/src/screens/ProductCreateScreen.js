import React, { useContext, useEffect, useReducer, useState } from 'react';
import { Store } from '../Store';
import axios from 'axios';
import ListGroup from 'react-bootstrap/ListGroup';
import { useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';


const reducer = (state, action) => {
  switch (action.type) {
    case 'CREATE_REQUEST':
      return { ...state, loadingCreate: true };

    case 'CREATE_SUCCESS':
      return { ...state, loadingCreate: false };

    case 'CREATE_FAIL':
      return { ...state, error: action.payload, loadingCreate: false };



      case 'CONDITION_STATUS_REQUEST':
        return { ...state, loadingConditionStatus: true };
  
      case 'CONDITION_STATUS_SUCCESS':
        return { ...state, loadingConditionStatus: false, conditionStatus: action.payload.conditionStatus };
  
      case 'CONDITION_STATUS_FAIL':
        return { ...state, error: action.payload, loadingConditionStatus: false };


        case 'QUALITY_TYPE_REQUEST':
          return { ...state, loadingQuality: true };
    
        case 'QUALITY_TYPE_SUCCESS':
          return { ...state, loadingQuality: false, qualityTypes: action.payload.qualityTypes };
    
        case 'QUALITY_TYPE_FAIL':
          return { ...state, error: action.payload, loadingQuality: false };
  


    case 'UPLOAD_REQUEST':
      return { ...state, loadingUpload: true };

    case 'UPLOAD_SUCCESS':
      return { ...state, loadingUpload: false, errorUpload: '' };

    case 'UPLOAD_FAIL':
      return { ...state, errorUpload: action.payload, loadingUpload: false };

    case 'CATEGORIES_REQUEST':
      return { ...state, loadingCategories: true };

    case 'CATEGORIES_SUCCESS':
      return {
        ...state,
        loadingCategories: false,
        categories: action.payload.categories,
      };

    case 'CATEGORIES_FAIL':
      return { ...state, loadingCategories: false };

      case 'PROVINCES_REQUEST':
        return { ...state, loadingProvinces: true };
  
      case 'PROVINCES_SUCCESS':
        return {
          ...state,
          loadingProvinces: false,
          provinces: action.payload.provinces,
        };
  
      case 'PROVINCES_FAIL':
        return { ...state, loadingProvinces: false };


        case 'COLORS_REQUEST':
          return { ...state, loadColor: true };
    
        case 'COLORS_SUCCESS':
          return { ...state, loadColor: false, colors: action.payload.colors };
    
        case 'COLORS_FAIL':
          return { ...state, error: action.payload, loadColor: false };


          case 'SIZES_REQUEST':
            return { ...state, loadSize: true };
      
          case 'SIZES_SUCCESS':
            return { ...state, loadSize: false, sizes: action.payload.sizes };
      
          case 'SIZES_FAIL':
            return { ...state, error: action.payload, loadSize: false };

    default:
      return state;
  }
};
export default function ProductCreateScreen() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;
  const [
    { loading, error, loadingCreate, loadingUpload, categories, colors,sizes, loadingQuality,conditionStatus, qualityTypes, provinces },
    dispatch,
  ] = useReducer(reducer, { loading: false, error: '' });

  const { t } = useTranslation();


  const [nome, setNome] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [images, setImages] = useState([]);
  const [rating] = useState(0);
  const [numReviews] = useState(0);

  const [category, setCategory] = useState('');
  const [province, setProvince] = useState('');

  const [countInStock, setCountInStock] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');

  const [conditionStatu, setConditionStatu] = useState('');
  const [qualityTyp, setQualityTyp] = useState('');

  const [selectedColors, setSelectedColors] =useState([]);
  const [selectedSizes, setSelectedSizes] =useState([]);

  const [onSale, setOnSale] = useState(false);
  const [onSalePercentage, setOnSalePercentage] = useState(0);

  useEffect(() => {
    dispatch({ type: 'CATEGORIES_REQUEST' });

    const fetchData = async () => {
      try {
        const { data } = await axios.get('/api/categories');
        dispatch({ type: 'CATEGORIES_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'CATEGORIES_FAIL', payload: getError(err) });
      }
    };
    fetchData();
  }, [categories]);


  useEffect(() => {
    dispatch({ type: 'PROVINCES_REQUEST' });
    const fetchData = async () => {
      try {
        const { data } = await axios.get('/api/provinces');
        dispatch({ type: 'PROVINCES_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'PROVINCES_FAIL', payload: getError(err) });
      }
    };
    fetchData();
  }, [provinces]);


  useEffect(() => {
    dispatch({ type: 'CONDITION_STATUS_REQUEST' });

    const fetchData = async () => {
      try {
        const { data } = await axios.get('/api/conditionstatus');
        dispatch({ type: 'CONDITION_STATUS_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'CONDITION_STATUS_FAIL', payload: getError(err) });
      }
    };
    fetchData();
  }, [conditionStatus]);


  useEffect(() => {
    dispatch({ type: 'QUALITY_TYPE_REQUEST' });
    const fetchData = async () => {
      try {
        const { data } = await axios.get('/api/qualitytype');
        dispatch({ type: 'QUALITY_TYPE_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'QUALITY_TYPE_FAIL', payload: getError(err) });
      }
    };
    if(loadingQuality){

      fetchData();
    }
    
  }, [loadingQuality]);


  useEffect(() => {
    dispatch({ type: 'SIZES_REQUEST' });

    const fetchData = async () => {
      try {
        const { data } = await axios.get('/api/sizes');
        dispatch({ type: 'SIZES_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'SIZES_FAIL', payload: getError(err) });
      }
    };
    fetchData();
  }, [sizes]);


  useEffect(() => {
    dispatch({ type: 'COLORS_REQUEST' });

    const fetchData = async () => {
      try {
        const { data } = await axios.get('/api/colors');
        dispatch({ type: 'COLORS_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'COLORS_FAIL', payload: getError(err) });
      }
    };
    fetchData();
  }, [colors]);



  const addColor= (colorId) => {
    if(colorId){
      const selected = colors.find((color) => color._id === colorId);

      const objectExists = selectedColors.some((color) => color._id === selected._id);
    if (!objectExists) {
      setSelectedColors([...selectedColors, selected]); // Add the new item to the items list
    }
    
    }
  };


  const addSize= (sizeId) => {
    if(sizeId){
      const selected = sizes.find((size) => size._id === sizeId);

      const objectExists = selectedSizes.some((color) => color._id === selected._id);
      if (!objectExists) {
        setSelectedSizes([...selectedSizes, selected]); // Add the new item to the items list
      }
    }
  };

  // Function to remove an item from the list
  const removeColor = (index) => {
    const updatedItems = [...selectedColors];
    updatedItems.splice(index, 1); // Remove the item at the specified index
    setSelectedColors(updatedItems); // Update the items list
  };

  const removeSize = (index) => {
    const updatedItems = [...selectedSizes];
    updatedItems.splice(index, 1); // Remove the item at the specified index
    setSelectedSizes(updatedItems); // Update the items list
  };



  const submitHandler = async (e) => {
    e.preventDefault();


    if(selectedColors.length === 0){
      toast.error('Por favor, Adicione a cor')
      return 
    }

    if(selectedSizes.length === 0){
      toast.error('Por favor, Adicione o tamanho')
      return 
    }


    try {
      dispatch({ type: 'CREATE_REQUEST' });
      await axios.post(
        `/api/products/`,
        {
          name,
          nome,
          slug,
          price,
          image,
          images,
          category,
          province,
          countInStock,
          brand,
          description,
          rating,
          numReviews,
          conditionStatu,
          qualityTyp,
          onSale,
          onSalePercentage,
          selectedColors,
          selectedSizes
        },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );
      dispatch({ type: 'CREATE_SUCCESS' });
      toast.success('Produto Criado com Sucesso');
      navigate('/productlist/seller');
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'CREATE_FAIL' });
    }
  };

  const uploadFileHandler = async (e, forImages) => {
    const file = e.target.files[0];
    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
    try {
      dispatch({ type: 'UPLOAD_REQUEST' });
      const { data } = await axios.post('/api/upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${userInfo.token}`,
        },
      });
      dispatch({ type: 'UPLOAD_SUCCESS', payload: data });
      if (forImages) {
        setImages([...images, data.secure_url]);
      } else {
        setImage(data.secure_url);
      }
      toast.success('Upload de Imagem com Sucesso. Clique em Registar');
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'UPLOAD_FAIL', payload: getError(err) });
    }
  };

  // const setHandleColors = (color) => {
  //   setColors(color); 
  // };


  const deleteImageHandler = async (fileName) => {
    setImages(images.filter((x) => x !== fileName));

    toast.success('Imagem removida ');
  };

  return (
    <Container className="small-container">
      <Helmet>
        <title>{t('createproduct')} </title>
      </Helmet>
      <h1>{t('createproduct')} </h1>

      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox>{error}</MessageBox>
      ) : (
        <>

          <Form onSubmit={submitHandler}>
            <Form.Group className="mb-3" controlId="nome">
              <Form.Label>Nome (Português)</Form.Label>
              <Form.Control
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </Form.Group>


            <Form.Group className="mb-3" controlId="name">
              <Form.Label>Nome do produto (english)</Form.Label>
              <Form.Control
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="slug">
              <Form.Label>Nome alternativo</Form.Label>
              <Form.Control
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="brand">
              <Form.Label>Marca/Sabor</Form.Label>
              <Form.Control
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="description">
              <Form.Label>Detalhes do produto</Form.Label>
              <Form.Control
                required
                as="textarea"
                placeholder=""
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></Form.Control>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Categoria</Form.Label>
              <Form.Select
                required
                aria-label="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">{t('select')}</option>
                {categories &&
                  categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Localização do produto</Form.Label>
              <Form.Select
                required
                aria-label="location"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              >
                <option value="">Seleccione</option>
                {provinces &&
                  provinces.map((province) => (
                    <option key={province._id} value={province._id}>
                      {province.name}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>


            <Form.Group className="mb-3" controlId="countInStock">
              <Form.Label>Quantidade disponível</Form.Label>
              <Form.Control
                type="number"
                value={countInStock}
                onChange={(e) => setCountInStock(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="price">
              <Form.Label>{t('price')} [MT]</Form.Label>
              <Form.Control
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </Form.Group>


            <Form.Group className="mb-3" controlId="countInStock">
              <Form.Label>Cores disponíveis</Form.Label>
              <Form.Select
                aria-label="Cores"
                // value={colors}
                onChange={(e)=>addColor(e.target.value)}
              >
                <option value="">{t('select')}</option>
                {colors &&
                  colors.map((color) => (
                    <option key={color._id} value={color._id}>
                      {color.name}
                    </option>
                  ))}
              </Form.Select>
           </Form.Group>
           {/* <button onClick={addItem}>Adicionar Cor </button> */}
                    {/* {console.log(items)} */}
           <ul>
              {selectedColors.map((item, index) => (
                <li key={index}>
                  {item.name}
                  <Button
                        variant="light"
                        onClick={() => removeColor(index)}
                      >
                        {' '}
                        <FontAwesomeIcon icon={faTimesCircle}></FontAwesomeIcon>
                      </Button>
                </li>
              ))}
            </ul>

           <Form.Group className="mb-3" controlId="countInStock">
              <Form.Label>Tamanhos disponíveis</Form.Label>
              <Form.Select
                aria-label="Tamanho"
                // value={selectedSizes}
                onChange={(e) => addSize(e.target.value)}
              >
                <option value="">{t('select')}</option>
                {sizes &&
                  sizes.map((size) => (
                    <option key={size._id} value={size._id}>
                      {size.name}
                    </option>
                  ))}
              </Form.Select>
           </Form.Group>

           <ul>
              {selectedSizes.map((item, index) => (
                <li key={index}>
                  {item.name}
                  <Button
                        variant="light"
                        onClick={() => removeSize(index)}
                      >
                        {' '}
                        <FontAwesomeIcon icon={faTimesCircle}></FontAwesomeIcon>
                      </Button>
                </li>
              ))}
            </ul>




            <Form.Group className="mb-3">
              <Form.Label>Qualidade</Form.Label>
              <Form.Select
                required
                aria-label="Qualidade"
                value={qualityTyp}
                onChange={(e) => setQualityTyp(e.target.value)}
              >
                <option value="">{t('select')}</option>
                {qualityTypes &&
                  qualityTypes.map((quality) => (
                    <option key={quality._id} value={quality._id}>
                      {quality.name}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>


            <Form.Group className="mb-3">
              <Form.Label>Estado de uso</Form.Label>
              <Form.Select
                required
                aria-label="Estado de Uso"
                value={conditionStatu}
                onChange={(e) => setConditionStatu(e.target.value)}
              >
                <option value="">{t('select')}</option>
                {conditionStatus &&
                  conditionStatus.map((condition) => (
                    <option key={condition._id} value={condition._id}>
                      {condition.name}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>



            <Form.Check
              className="mb-3"
              type="checkbox"
              id="isOnSale"
              label="Em Promoção?"
              checked={onSale}
              onChange={(e) => setOnSale(e.target.checked)}
            ></Form.Check>

            {onSale && (
              <Form.Group className="mb-3" controlId="percentagem">
                <Form.Label>Percentagem de desconto</Form.Label>
                <Form.Select
                  aria-label="percentagem"
                  value={onSalePercentage}
                  onChange={(e) => setOnSalePercentage(e.target.value)}
                  required
                >
                  <option value="">{t('select')}</option>
                  <option value="0.05">5%</option>
                  <option value="0.1">10%</option>
                  <option value="0.15">15%</option>
                  <option value="0.2">20%</option>
                  <option value="0.25">25%</option>
                  <option value="0.3">30%</option>
                  <option value="0.35">35%</option>
                  <option value="0.4">40%</option>
                  <option value="0.45">45%</option>
                  <option value="0.5">50%</option>
                  <option value="0.55">55%</option>
                  <option value="0.6">60%</option>
                  <option value="0.6">65%</option>
                  <option value="0.7">70%</option>
                  <option value="0.75">75%</option>
                  <option value="0.80">80%</option>
                  <option value="0.85">85%</option>
                  <option value="0.9">90%</option>
                </Form.Select>
              </Form.Group>
            )}

            {image && (
              <img
                style={{
                  width: '6rem',
                  height: '6rem',
                  alignItems: 'center',
                  alignContent: 'center',
                }}
                src={image}
                className="card-img-top"
                alt={name}
              ></img>
            )}

            <Form.Group className="mb-3" controlId="imageFile">
              <Form.Label>Upload imagem</Form.Label>
              <Form.Control type="file" onChange={uploadFileHandler} />
              {loadingUpload && <LoadingBox></LoadingBox>}
            </Form.Group>

            <Form.Group className="mb-3" controlId="additionalImage">
              <Form.Label>Mais imagens</Form.Label>
              {images.length === 0 && <MessageBox>Sem imagens</MessageBox>}
              <ListGroup variant="flush">
                {images.map((x) => (
                  <ListGroup.Item key={x}>
                    <Button
                      variant="light"
                      onClick={() => deleteImageHandler(x)}
                    >
                      {
                        <img
                          style={{
                            width: '6rem',
                            height: '6rem',
                            alignItems: 'center',
                            alignContent: 'center',
                          }}
                          src={x}
                          className="card-img-top"
                          alt={x}
                        ></img>
                      }
                      <FontAwesomeIcon icon={faTimesCircle}> </FontAwesomeIcon>
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Form.Group>
            <Form.Group className="mb-3" controlId="additionalImageFile">
              <Form.Label>Upload imagens adicionais</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => uploadFileHandler(e, true)}
              ></Form.Control>
              {loadingUpload && <LoadingBox></LoadingBox>}
            </Form.Group>

            {/* <Form.Group className='mb-3' controlId='category'>
        <Form.Label>Categoria</Form.Label>
        <Form.Control value={category} onChange={(e)=>setCategory(e.target.value)} required/>
        </Form.Group> */}



            <div className='"mb-3'>
              <Button
                className="customButtom"
                variant="light"
                type="submit"
                disabled={loadingCreate}
              >
                Criar
              </Button>
              {loadingCreate && <LoadingBox />}
            </div>
          </Form>
        </>
      )}
    </Container>
  );
}
