import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import PublicLayout from './components/Layout/PublicLayout';
import AdminLayout from './components/Layout/AdminLayout';
import SupplierLayout from './components/Layout/SupplierLayout';
import DocumentOrderScreen from './screens/DocumentOrder/DocumentOrderScreen';
import LandingPage from './screens/LandingPage';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import TermsScreen from './screens/TermsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import ReturnPolicyScreen from './screens/ReturnPolicyScreen';
import DashboardScreen from './screens/admin/DashboardScreen';
import SuppliersScreen from './screens/admin/SuppliersScreen';
import ProductsScreen from './screens/ProductsScreen';
import CategoriesScreen from './screens/admin/CategoriesScreen';
import DriversScreen from './screens/admin/DriversScreen';
import ServicesScreen from './screens/admin/ServicesScreen';
import IncidentsScreen from './screens/admin/IncidentsScreen';
import SubscriptionsScreen from './screens/admin/SubscriptionsScreen';
import FinanceScreen from './screens/admin/FinanceScreen';
import OrdersScreen from './screens/admin/OrdersScreen';
import DocumentOrdersValidationScreen from './screens/admin/DocumentOrdersValidationScreen';
import CustomersScreen from './screens/admin/CustomersScreen';
import ProvidersScreen from './screens/admin/ProvidersScreen';
import ProviderClassificationsScreen from './screens/admin/ProviderClassificationsScreen.jsx';
import MarketingScreen from './screens/admin/MarketingScreen';
import SettingsScreen from './screens/admin/SettingsScreen';
import ProductAttributesScreen from './screens/admin/ProductAttributesScreen';
import EstablishmentTypesScreen from './screens/admin/EstablishmentTypesScreen';
import ProviderTypesScreen from './screens/admin/ProviderTypesScreen';
import EstablishmentsScreen from './screens/admin/EstablishmentsScreen';
import PaymentMethodsScreen from './screens/admin/PaymentMethodsScreen';
import CancellationPoliciesScreen from './screens/admin/CancellationPoliciesScreen';
import ProcessingFeesScreen from './screens/admin/ProcessingFeesScreen';
import ProvincesScreen from './screens/admin/ProvincesScreen';
import PriceRequestsPanel from './screens/admin/PriceRequestsPanel';
import DocRequestsPanel from './screens/admin/DocRequestsPanel';
import VehicleTypesScreen from './screens/admin/VehicleTypesScreen';
import VehicleColorsScreen from './screens/admin/VehicleColorsScreen';
import PushNotificationsScreen from './screens/admin/PushNotificationsScreen';
import UsersScreen from './screens/admin/UsersScreen';
import RolesScreen from './screens/admin/RolesScreen';
import DeliveryTariffsScreen from './screens/admin/DeliveryTariffsScreen';
import SupplierDashboardScreen from './screens/supplier/SupplierDashboardScreen';
import SupplierProductsScreen from './screens/supplier/SupplierProductsScreen';
import ProviderSubcategoriesScreen from './screens/admin/ProviderSubcategoriesScreen.jsx';
import StatsScreen from './screens/admin/StatsScreen';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="bottom-center" limit={1} />
      <Routes>
        {/* Telas Autônomas */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/terms" element={<TermsScreen />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyScreen />} />
        <Route path="/return-policy" element={<ReturnPolicyScreen />} />

        <Route path="/" element={<LandingPage />} />

        {/* Rotas Públicas (Marketplace) */}
        <Route path="/shop" element={<PublicLayout />}>
          <Route index element={<HomeScreen />} />
          <Route path="product/:id" element={<ProductDetailScreen />} />
          <Route path="cart" element={<CartScreen />} />
          <Route path="checkout" element={<CheckoutScreen />} />
          <Route path="document-order" element={<DocumentOrderScreen />} />
        </Route>
        <Route path="/products" element={<PublicLayout />}>\n          <Route index element={<ProductsScreen />} />\n        </Route>

        {/* Rotas do Fornecedor */}
        <Route path="/supplier" element={<SupplierLayout />}>
          <Route path="dashboard" element={<SupplierDashboardScreen />} />
          <Route path="products" element={<SupplierProductsScreen />} />
          {/* Outras rotas pendentes (orders, profile) usariam o mesmo placeholder */}
        </Route>

        {/* Rotas Administrativas */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardScreen />} />
          <Route path="suppliers" element={<SuppliersScreen />} />
          <Route path="products" element={<ProductsScreen />} />
          <Route path="categories" element={<CategoriesScreen />} />
          <Route path="drivers" element={<DriversScreen />} />
            <Route path="price-requests" element={<PriceRequestsPanel />} />
            <Route path="doc-requests" element={<DocRequestsPanel />} />
          <Route path="services" element={<ServicesScreen />} />
          <Route path="incidents" element={<IncidentsScreen />} />
          <Route path="subscriptions" element={<SubscriptionsScreen />} />
          <Route path="finance" element={<FinanceScreen />} />
          <Route path="orders" element={<OrdersScreen />} />
          <Route path="document-validation" element={<DocumentOrdersValidationScreen />} />
          <Route path="customers" element={<CustomersScreen />} />
          <Route path="providers" element={<ProvidersScreen />} />
          <Route path="attributes" element={<ProductAttributesScreen />} />
          <Route path="establishment-types" element={<EstablishmentTypesScreen />} />
          <Route path="provider-types" element={<ProviderTypesScreen />} />
          <Route path="provider-classifications" element={<ProviderClassificationsScreen />} />
          <Route path="establishments" element={<EstablishmentsScreen />} />
          <Route path="payment-methods" element={<PaymentMethodsScreen />} />
          <Route path="fees" element={<ProcessingFeesScreen />} />
          <Route path="delivery-tariffs" element={<DeliveryTariffsScreen />} />
          <Route path="cancellation-policies" element={<CancellationPoliciesScreen />} />
          <Route path="provinces" element={<ProvincesScreen />} />
          <Route path="vehicle-types" element={<VehicleTypesScreen />} />
          <Route path="vehicle-colors" element={<VehicleColorsScreen />} />
          <Route path="push-notifications" element={<PushNotificationsScreen />} />
          <Route path="marketing" element={<MarketingScreen />} />
          <Route path="stats" element={<StatsScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="provider-subcategories" element={<ProviderSubcategoriesScreen />} />
          <Route path="users" element={<UsersScreen />} />
          <Route path="roles" element={<RolesScreen />} />
          {/* Outras rotas entrarão aqui depois */}
          <Route path="*" element={<h2>Em construção...</h2>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
