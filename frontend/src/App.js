import './App.css';
import HomeScreen from './screens/HomeScreen';
import ProductScreen from './screens/ProductScreen';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Badge from 'react-bootstrap/Badge';
import { useContext, useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import { LinkContainer } from 'react-router-bootstrap';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Store } from './Store';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartShopping } from '@fortawesome/free-solid-svg-icons';
import CartScreen from './screens/CartScreen';
import SignInScreen from './screens/SignInScreen';
import AddressScreen from './screens/AddressScreen';
import SignupScreen from './screens/SignUpScreen';
import PaymentMethodScreen from './screens/PaymentMethodScreen';
import PlaceOrderScreen from './screens/PlaceOrderScreen';
import OrderScreen from './screens/OrderScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import SearchBox from './components/SearchBox';
import SearchScreen from './screens/SearchScreen';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardScreen from './screens/DashboardScreen';
import AdminRoute from './components/AdminRoute';
import ProductListScreen from './screens/ProductListScreen';
import ProductEditScreen from './screens/ProductEditScreen';
import OrderListScreen from './screens/OrderListScreen';
import OrderAdminListScreen from './screens/OrderAdminListScreen';

import UserListScreen from './screens/UserListScreen';
import UserEditScreen from './screens/UserEditScreen';
import SellerRoute from './components/SellerRoute';
import ProductSellerScreen from './screens/ProductSellerScreen';
import OrderListBySellerScreen from './screens/OrderListBySellerScreen';
import SellerScreen from './screens/SellerScreen';
import ProductCreateScreen from './screens/ProductCreateScreen';
import SupportScreen from './screens/SupportScreen';
import ChatBox from './components/ChatBox';
import CategoryListScreen from './screens/CategoryListScreen';
import CategoryCreateScreen from './screens/CategoryCreateScreen';
import CategoryEditScreen from './screens/CategoryEditScreen';
import DocumentTypeListScreen from './screens/DocumentTypeListScreen';
import DocumentTypeCreateScreen from './screens/DocumentTypeCreateScreen';
import DocumentTypeEditScreen from './screens/DocumentTypeEditScreen';
import ProvinceListScreen from './screens/ProvinceListScreen';
import ProvinceCreateScreen from './screens/ProvinceCreateScreen';
import ProvinceEditScreen from './screens/ProvinceEditScreen';
import Footer from './components/Footer';
import Help from './screens/Help';
import HowToBeSeller from './screens/HowToBeSeller';
import Terms from './screens/Terms';
import QualityTypeListScreen from './screens/QualityTypeListScreen';
import QualityTypeCreateScreen from './screens/QualityTypeCreateScreen';
import QualityTypeEditScreen from './screens/QualityTypeEditScreen';
import ConditionStatusCreateScreen from './screens/ConditionStatusCreateScreen';
import ConditionStatusEditScreen from './screens/ConditionStatusEditScreen';
import ConditionStatusListScreen from './screens/ConditionStatusListScreen';
import ColorListScreen from './screens/ColorListScreen';
import SizeListScreen from './screens/SizeListScreen';
import ColorCreateScreen from './screens/ColorCreateScreen';
import SizeCreateScreen from './screens/SizeCreateScreen';
import SizeEditScreen from './screens/SizeEditScreen';
import ColorEditScreen from './screens/ColorEditScreen';
import ForgetPasswordScreen from './screens/ForgetPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import DeliveryOptionScreen from './screens/DeliveryOptionScreen';
import axios from 'axios';
import PaybackInfoAndSecurity from './components/PaybackInfoAndSecurity';
import AdicionalInfoHeader from './components/AdicionalInfoHeader';
import ScrollTopButton from './components/ScrollTopButton';
import SearchSellersScreen from './screens/SearchSellersScreen';
import SearchOnSaleScreen from './screens/SearchOnSaleScreen';
import EmailSentScreen from './screens/EmailSentScreen';
import { getError } from './utils';

import { useTranslation } from 'react-i18next';
import OrderHistoryBySellerScreen from './screens/OrderHistoryBySellerScreen';
import ReturnPolicy from './screens/ReturnPolicy';
import NhiquelaBenef from './screens/NhiquelaBenef';
import SellersToPayListScreen from './screens/SellersToPayListScreen';
import DeliverersToPayListScreen from './screens/DeliverersToPayListScreen';
import RequestDeliverman from './screens/RequestDelivermanScreen';
import RequestDelivermanConfirmScreen from './screens/RequestDelivermanConfirmScreen';
import RequestDelivermanProgressScreen from './screens/RequestDelivermanProgressScreen';
import RequestDelivermanHistoryByUserScreen from './screens/RequestDelivermanHistoryByUserScreen';
import RequestDelivermanHistoryByAdminScreen from './screens/RequestDelivermanHistoryByAdminScreen';


export  function App() {
  const { state, dispatch: ctxDispatch } = useContext(Store);

  const { cart, userInfo } = state;
  const [expanded, setExpanded] = useState(false);

  const { t } = useTranslation();

 
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const signOutHandler = () => {
    ctxDispatch({ type: 'USER_SIGNOUT' });
  };


  useEffect(()=>{


    const refresh = async () =>{

      if(userInfo){

        try {
          const {data} = await axios.get(`/api/orders/sellerview?seller=${userInfo._id}`, {
            headers: { authorization: `Bearer ${userInfo.token}` },
          });    
          ctxDispatch({type: 'ORDERS_BY_SELLER', payload: data.orders});
        } catch (err) {
          toast.error(getError(err));
        }
      }
    }
    refresh();


  
  },[userInfo, ctxDispatch])

  return (
    <BrowserRouter>
      <div className="d-flex flex-column site-background">
        <Helmet>
          <title>Nhiquela Shop</title>
        </Helmet>
        <ToastContainer position="top-right" autoClose={3000} />

         <header >
          <Navbar
             expanded={expanded}
             bg="light"
            variant="light"
            expand="lg"
            fixed="top"
          >
            <Container>
              <LinkContainer to="/" >
                <Navbar.Brand className="Navbar-Brand"  >
                Nhiquela Shop
                </Navbar.Brand>
              </LinkContainer>
              <SearchBox />
              <Navbar.Toggle
                 onClick={toggleExpanded}
                aria-controls="basic-navbar-nav"
              />
              <Link to="/cart" className="nav-link black-icon hide-icon-screen">
                    <FontAwesomeIcon icon={faCartShopping}></FontAwesomeIcon>
                    {cart.cartItems.length > 0 && (
                      <Badge
                        bg="danger"
                        variant="danger"
                        className="cart-number"
                      >
                        {cart.cartItems.reduce(
                          (prev, current) => prev + current.quantity,
                          0
                        )}
                      </Badge>
                    )}
                  </Link>

                 
              <Navbar.Collapse  id="collapse basic-navbar-nav">
                <Nav  className="mr-auto nav-cart w-100 justify-content-end">
                  {userInfo ? (
                    <NavDropdown title={userInfo.name} id="basic-nav-dropdown">
                      <LinkContainer to="/profile">
                        <NavDropdown.Item>{t('profile')}</NavDropdown.Item>
                      </LinkContainer>
                    
                      {userInfo && !userInfo.isDeliveryMan && (
                        <LinkContainer to="/orderHistory">
                          <NavDropdown.Item>{t('myorders')}</NavDropdown.Item>
                        </LinkContainer>
                      )}

                      {userInfo && userInfo.isDeliveryMan && (
                                              <LinkContainer to="/delivery/orderlist">
                                                <NavDropdown.Item>
                                                {t('orderstodeliver')}
                                                  
                                                </NavDropdown.Item>
                                              </LinkContainer>
                                            )}


                        <LinkContainer to="/requestdelivermanhistory">
                          <NavDropdown.Item>{t('deliveryrequesthistory')}</NavDropdown.Item>
                        </LinkContainer>


                        <LinkContainer to="/allrequestdelivermanhistory">
                          <NavDropdown.Item>{t('alldeliveryrequesthistory')}</NavDropdown.Item>
                        </LinkContainer>

                 
                    
                      <LinkContainer to="/signin">
                        <NavDropdown.Item onClick={signOutHandler}>
                          <b>{t('logout')}</b>
                        </NavDropdown.Item>
                      </LinkContainer>
                    </NavDropdown>

                    
                  ) : (<>
                  
                    { <Nav.Link as={Link} to="/requestdeliverman"><b className='link'>{t('requestdeliverman')}</b></Nav.Link>}

                    <Link className="nav-link" to="/signin">
                      {t('login')}
                    </Link>
                  </>
                  )}


                  {userInfo && userInfo.isSeller && userInfo.isApproved && (
                    <NavDropdown title={userInfo.seller.name} id="admin-nav-dropdown">
                      <LinkContainer to="/productlist/seller">
                        <NavDropdown.Item>{t('myproducts')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/orderlist/seller">
                        <NavDropdown.Item>{t('orderclients')}
                        <Badge
                        bg="danger"
                        variant="danger"
                        className="cart-number"
                      >
                        {cart.ordersBySeller && cart.ordersBySeller.length > 0 && cart.ordersBySeller.length}
                      </Badge>
                        </NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/orderhistorybycustomer/seller">
                        <NavDropdown.Item>{t('paymentfromnhiquela')}</NavDropdown.Item>
                      </LinkContainer>
                    </NavDropdown>
                  )}
                  {userInfo && userInfo.isAdmin && (
                    <NavDropdown title="Admin" id="admin-nav-dropdown">
                      <LinkContainer to="/admin/dashboard">
                        <NavDropdown.Item>{t('dashboard')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/provinceList">
                        <NavDropdown.Item>{t('provinces')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/documentTypeList">
                        <NavDropdown.Item>{t('doctypes')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/categoryList">
                        <NavDropdown.Item>{t('categories')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/colorList">
                        <NavDropdown.Item>{t('availablecolors')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/sizeList">
                        <NavDropdown.Item>{t('availablesizes')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/conditionstatusList">
                        <NavDropdown.Item>{t('productcondition')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/qualitytypeList">
                        <NavDropdown.Item>{t('productquality')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/productlist">
                        <NavDropdown.Item>{t('products')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/orderlist">
                        <NavDropdown.Item>{t('orders')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/userlist">
                        <NavDropdown.Item>{t('userslist')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/support">
                        <NavDropdown.Item>{t('Support')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/sellerstopay">
                        <NavDropdown.Item>{t('sellerstopay')}</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/deliverstopay">
                        <NavDropdown.Item>{t('deliverstopay')}</NavDropdown.Item>
                      </LinkContainer>
                  
                    </NavDropdown>
        
        )}
              {/* {userInfo && <Nav.Link as={Link} to="/requestdeliverman"><b className='link'>{t('requestdeliveryman')}</b></Nav.Link>} */}

                            

                  <Link to="/cart" className="nav-link  hide-cart">
                    <FontAwesomeIcon icon={faCartShopping}></FontAwesomeIcon>
                    {cart.cartItems.length > 0 && (
                      <Badge
                        bg="danger"
                        variant="danger"
                        className="cart-number"
                      >
                        {cart.cartItems.reduce(
                          (prev, current) => prev + current.quantity,
                          0
                        )}
                      </Badge>
                    )}
                  </Link>

                


                </Nav>
              </Navbar.Collapse>
              
            </Container>
          </Navbar>
        </header> 
         <main style={{ marginTop: '30px' }} >
      <PaybackInfoAndSecurity/>

      <AdicionalInfoHeader/>

          <Container className={expanded ? 'collapse-open' : ''}>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/product/:slug" element={<ProductScreen />} />
              <Route path="/cart" element={<CartScreen />} />
              <Route path="/signin" element={<SignInScreen />} />
              <Route path="/signup" element={<SignupScreen />} />
          
              <Route
                path="/terms"
                element={
                    <Terms />
                }
              />
<Route
                path="/howtobeseller"
                element={
                    <HowToBeSeller />
                }
              />

            <Route
                path="/help"
                element={
                    <Help />
                }
              />
              <Route
                path="/address"
                element={
                    <AddressScreen />
                }
              />

              <Route
                path="/deliveryoption"
                element={
                    <DeliveryOptionScreen />
                }
              />

<Route
                path="/requestdeliverman"
                element={
                    <RequestDeliverman />
                }
              />


<Route
                path="/requestdelivermanconfirm"
                element={
                    <RequestDelivermanConfirmScreen />
                }
              />

<Route
                path="/requestdelivermanprogress/:id"
                element={
                    <RequestDelivermanProgressScreen />
                }
              />


<Route
                path="/requestdelivermanhistory"
                element={
                    <RequestDelivermanHistoryByUserScreen />
                }
              />

<Route
                path="/allrequestdelivermanhistory"
                element={
                    <RequestDelivermanHistoryByAdminScreen />
                }
              />




              <Route
                path="/payment"
                element={
                    <PaymentMethodScreen />
                }
              />
                
              <Route
                path="/placeorder"
                element={
                    <PlaceOrderScreen />
                }
              />
              <Route
                path="/orderHistory"
                element={
                  <ProtectedRoute>
                    <OrderHistoryScreen />
                  </ProtectedRoute>
                }
              />

              <Route path="/seller/:id" element={<SellerScreen />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileScreen />
                  </ProtectedRoute>
                }
              />
              <Route path="/search" element={<SearchScreen />} />
              <Route path="/sellers" element={<SearchSellersScreen />} />
              <Route path="/onsale" element={<SearchOnSaleScreen />} />

              <Route
                path="/categoryList/"
                element={
                  <ProtectedRoute>
                    <CategoryListScreen />
                  </ProtectedRoute>
                }
              />


             <Route
                path="/colorList/"
                element={
                  <ProtectedRoute>
                    <ColorListScreen />
                  </ProtectedRoute>
                }
              />

            <Route
                path="/sizeList/"
                element={
                  <ProtectedRoute>
                    <SizeListScreen />
                  </ProtectedRoute>
                }
              />


<Route
                path="/size/:id"
                element={
                  <ProtectedRoute>
                    <SizeEditScreen />
                  </ProtectedRoute>
                }
              />


        <Route
                path="/color/create"
                element={
                  <ProtectedRoute>
                    <ColorCreateScreen/>
                  </ProtectedRoute>
                }
              />


          <Route
                path="/color/:id"
                element={
                  <ProtectedRoute>
                    <ColorEditScreen />
                  </ProtectedRoute>
                }
              />


          <Route
                path="/size/create"
                element={
                  <ProtectedRoute>
                    <SizeCreateScreen/>
                  </ProtectedRoute>
                }
              />



            <Route
                path="/qualitytypeList/"
                element={
                  <ProtectedRoute>
                    <QualityTypeListScreen />
                  </ProtectedRoute>
                }
              />

<Route
                path="/qualitytype/create"
                element={
                  <ProtectedRoute>
                    <QualityTypeCreateScreen />
                  </ProtectedRoute>
                }
              />

<Route
                path="/qualitytype/:id"
                element={
                  <ProtectedRoute>
                    <QualityTypeEditScreen />
                  </ProtectedRoute>
                }
              />


<Route
                path="/conditionstatusList/"
                element={
                  <ProtectedRoute>
                    <ConditionStatusListScreen />
                  </ProtectedRoute>
                }
              />

<Route
                path="/conditionstatus/create"
                element={
                  <ProtectedRoute>
                    <ConditionStatusCreateScreen />
                  </ProtectedRoute>
                }
              />

<Route
                path="/conditionstatus/:id"
                element={
                  <ProtectedRoute>
                    <ConditionStatusEditScreen />
                  </ProtectedRoute>
                }
              />

            <Route
                path="/documentTypeList/"
                element={
                  <ProtectedRoute>
                    <DocumentTypeListScreen />
                  </ProtectedRoute>
                }
              />

                <Route
                path="/document/create"
                element={
                  <ProtectedRoute>
                    <DocumentTypeCreateScreen />
                  </ProtectedRoute>
                }
              />

        <Route
                path="/document/:id"
                element={
                  <ProtectedRoute>
                    <DocumentTypeEditScreen />
                  </ProtectedRoute>
                }
              />




<Route
                path="/provinceList/"
                element={
                  <ProtectedRoute>
                    <ProvinceListScreen />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/forget-password"
                element={
                    <ForgetPasswordScreen />
                }
              />

            <Route
                path="/reset-password/:token"
                element={
                    <ResetPasswordScreen />
                }
              />

<Route
                path="/email-sent"
                element={
                    <EmailSentScreen />
                }
              />






                <Route
                path="/province/create"
                element={
                  <ProtectedRoute>
                    <ProvinceCreateScreen />
                  </ProtectedRoute>
                }
              />

<Route
                path="/province/:id"
                element={
                  <ProtectedRoute>
                    <ProvinceEditScreen />
                  </ProtectedRoute>
                }
              />



          <Route
                path="/category/create"
                element={
                  <ProtectedRoute>
                    <CategoryCreateScreen />
                  </ProtectedRoute>
                }
              />

<Route
                path="/category/:id"
                element={
                  <ProtectedRoute>
                    <CategoryEditScreen />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/order/:id"
                element={
                  <ProtectedRoute>
                    <OrderScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute>
                    <DashboardScreen />
                  </AdminRoute>
                }
              />


<Route
                path="/support"
                element={
                  <AdminRoute>
                    <SupportScreen />
                  </AdminRoute>
                }
              />

              <Route
                exact
                path="/productlist/seller"
                element={
                  <SellerRoute>
                    <ProductSellerScreen />
                  </SellerRoute>
                }
              />

            <Route
                path="/product/create"
                element={
                    <ProductCreateScreen />
                }
              />

              <Route
                path="/admin/productlist"
                element={
                  <AdminRoute>
                    <ProductListScreen />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/product/:id"
                element={
                    <ProductEditScreen />
                }
              />

              <Route
                exact
                path="/orderlist/seller"
                element={
                  <SellerRoute>
                    <OrderListBySellerScreen />
                  </SellerRoute>
                }
              />

            <Route
                exact
                path="/orderhistorybycustomer/seller"
                element={
                  <SellerRoute>
                    <OrderHistoryBySellerScreen />
                  </SellerRoute>
                }
              />
              <Route
                path="/delivery/orderlist"
                element={
                    <OrderListScreen />
                }
              />

          <Route
                path="/admin/orderlist"
                element={
                    <OrderAdminListScreen />
                }
              />

              <Route
                path="/admin/userlist"
                element={
                  <AdminRoute>
                    <UserListScreen />
                  </AdminRoute>
                }
              />
               <Route
                path="/admin/sellerstopay"
                element={
                  <AdminRoute>
                    <SellersToPayListScreen />
                  </AdminRoute>
                }
              />
               <Route
                path="/admin/deliverstopay"
                element={
                  <AdminRoute>
                    <DeliverersToPayListScreen />
                  </AdminRoute>
                }
              />
              <Route
                path="/api/users/:id"
                element={
                  <AdminRoute>
                    <UserEditScreen />
                  </AdminRoute>
                }
              />

<Route
                path="/benefits"
                element={
                    <NhiquelaBenef />
                }
              />  

            <Route
                path="/returnpolicy"
                element={
                    <ReturnPolicy />
                }
              />  
            </Routes>  


                  
            <ScrollTopButton />

            {userInfo&&<ChatBox  userInfo={userInfo}/>}
          </Container> 
        </main> 
      <footer className='center'>

        <Footer></Footer>
              </footer> 
      </div>
    </BrowserRouter>
  );
}

export default App;
