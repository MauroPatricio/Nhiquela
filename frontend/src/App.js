import './App.css';
import HomeScreen from './screens/HomeScreen';
import ProductScreen from './screens/ProductScreen';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Badge from 'react-bootstrap/Badge';
import { useContext, useState } from 'react';
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
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { faClock } from '@fortawesome/free-solid-svg-icons';
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

function App() {
  const { state, dispatch: ctxDispatch } = useContext(Store);

  const { cart, userInfo } = state;
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const signOutHandler = () => {
    ctxDispatch({ type: 'USER_SIGNOUT' });
  };

  return (
    <BrowserRouter>
      <div className="d-flex flex-column site-background">
        <Helmet>
          <title>Delivery Shop</title>
        </Helmet>
        <ToastContainer position="top-right" autoClose={1000} />

        <header>
          <Navbar
             expanded={expanded}
             bg="light"
            variant="light"
            expand="lg"
            fixed="top"
          >
            <Container>
              <LinkContainer to="/">
                <Navbar.Brand className="Navbar-Brand">
                Delivery Shop
                </Navbar.Brand>
              </LinkContainer>
              <SearchBox />
              <Navbar.Toggle
                 onClick={toggleExpanded}
                aria-controls="basic-navbar-nav"
              />
              <Navbar.Collapse  id="collapse basic-navbar-nav">
                <Nav  className="mr-auto nav-cart w-100 justify-content-end">
                  {userInfo ? (
                    <NavDropdown title={userInfo.name} id="basic-nav-dropdown">
                      <LinkContainer to="/profile">
                        <NavDropdown.Item>Perfil</NavDropdown.Item>
                      </LinkContainer>
                      {userInfo && !userInfo.isDeliveryMan && (
                        <LinkContainer to="/orderHistory">
                          <NavDropdown.Item>Meus Pedidos</NavDropdown.Item>
                        </LinkContainer>
                      )}
                      {userInfo && userInfo.isDeliveryMan && (
                        <LinkContainer to="/delivery/orderlist">
                          <NavDropdown.Item>
                            Pedidos por Entregar
                          </NavDropdown.Item>
                        </LinkContainer>
                      )}
                      <LinkContainer to="/signout">
                        <NavDropdown.Item onClick={signOutHandler}>
                          <b>Sair</b>
                        </NavDropdown.Item>
                      </LinkContainer>
                    </NavDropdown>
                  ) : (
                    <Link className="nav-link" to="/signin">
                      Fazer Login
                    </Link>
                  )}
                  {userInfo && userInfo.isSeller && (
                    <NavDropdown title="Vendedor" id="admin-nav-dropdown">
                      <LinkContainer to="/productlist/seller">
                        <NavDropdown.Item>Produtos</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/orderlist/seller">
                        <NavDropdown.Item>Pedidos</NavDropdown.Item>
                      </LinkContainer>
                    </NavDropdown>
                  )}

                  {userInfo && userInfo.isAdmin && (
                    <NavDropdown title="Admin" id="admin-nav-dropdown">
                      <LinkContainer to="/admin/dashboard">
                        <NavDropdown.Item>Dashboard</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/provinceList">
                        <NavDropdown.Item>Provincias</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/documentTypeList">
                        <NavDropdown.Item>Tipos de Documentos</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/categoryList">
                        <NavDropdown.Item>Categorias</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/productlist">
                        <NavDropdown.Item>Produtos</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/orderlist">
                        <NavDropdown.Item>Pedidos</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/userlist">
                        <NavDropdown.Item>Lista de usuários</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/support">
                        <NavDropdown.Item>Suporte</NavDropdown.Item>
                      </LinkContainer>
                    </NavDropdown>
                  )}

                  <Link to="/cart" className="nav-link">
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
        <main style={{ marginTop: '30px' }}>
          <Row>
            <Col className="bg-color-row">

        <p className='delivery-info' style={{textAlign: 'center'}}><b>Entregas disponíveis para Maputo Cidade e Província a partir das <FontAwesomeIcon icon={faClock}/> 7:30 as 18:00</b></p>
            </Col>

          </Row>
          <Container className={expanded ? 'collapse-open' : ''}>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/product/:slug" element={<ProductScreen />} />
              <Route path="/cart" element={<CartScreen />} />
              <Route path="/signin" element={<SignInScreen />} />
              <Route path="/signup" element={<SignupScreen />} />
          

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
                  <ProtectedRoute>
                    <AddressScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment"
                element={
                  <ProtectedRoute>
                    <PaymentMethodScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/placeorder"
                element={
                  <ProtectedRoute>
                    <PlaceOrderScreen />
                  </ProtectedRoute>
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

              <Route
                path="/categoryList/"
                element={
                  <ProtectedRoute>
                    <CategoryListScreen />
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
                path="/api/users/:id"
                element={
                  <AdminRoute>
                    <UserEditScreen />
                  </AdminRoute>
                }
              />
            </Routes>        

            {userInfo&&<ChatBox  userInfo={userInfo}/>}
      
          </Container>
        </main>
        <footer className='row center'>
       <Footer></Footer>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
