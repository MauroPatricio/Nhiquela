import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import PublicLayout from './components/Layout/PublicLayout';
import AdminLayout from './components/Layout/AdminLayout';
import SupplierLayout from './components/Layout/SupplierLayout';
import LandingPage from './screens/LandingPage';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import DashboardScreen from './screens/admin/DashboardScreen';
import SuppliersScreen from './screens/admin/SuppliersScreen';
import ProductsScreen from './screens/admin/ProductsScreen';
import CategoriesScreen from './screens/admin/CategoriesScreen';
import DriversScreen from './screens/admin/DriversScreen';
import ServicesScreen from './screens/admin/ServicesScreen';
import IncidentsScreen from './screens/admin/IncidentsScreen';
import SubscriptionsScreen from './screens/admin/SubscriptionsScreen';
import FinanceScreen from './screens/admin/FinanceScreen';
import SupplierDashboardScreen from './screens/supplier/SupplierDashboardScreen';
import SupplierProductsScreen from './screens/supplier/SupplierProductsScreen';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="bottom-center" limit={1} />
      <Routes>
        {/* Telas Autônomas */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />

        <Route path="/" element={<LandingPage />} />

        {/* Rotas Públicas (Marketplace) */}
        <Route path="/shop" element={<PublicLayout />}>
          <Route index element={<HomeScreen />} />
          <Route path="product/:id" element={<ProductDetailScreen />} />

          <Route path="cart" element={<CartScreen />} />
          <Route path="checkout" element={<CheckoutScreen />} />
        </Route>

        {/* Rotas do Fornecedor */}
        <Route path="/supplier" element={<SupplierLayout />}>
          <Route path="dashboard" element={<SupplierDashboardScreen />} />
          <Route path="products" element={<SupplierProductsScreen />} />
          {/* Outras rotas pendentes (orders, profile) usariam o mesmo placeholder */}
        </Route>

        {/* Rotas Administrativas */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<DashboardScreen />} />
          <Route path="suppliers" element={<SuppliersScreen />} />
          <Route path="products" element={<ProductsScreen />} />
          <Route path="categories" element={<CategoriesScreen />} />
          <Route path="drivers" element={<DriversScreen />} />
          <Route path="services" element={<ServicesScreen />} />
          <Route path="incidents" element={<IncidentsScreen />} />
          <Route path="subscriptions" element={<SubscriptionsScreen />} />
          <Route path="finance" element={<FinanceScreen />} />
          {/* Outras rotas entrarão aqui depois */}
          <Route path="*" element={<h2>Em construção...</h2>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
