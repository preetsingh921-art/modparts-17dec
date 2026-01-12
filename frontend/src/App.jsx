import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'
import { ToastProvider } from './context/ToastContext'
import { LogoProvider } from './context/LogoContext'
import { checkCacheReload } from './utils/cache'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import AdminLayout from './components/layout/AdminLayout'
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import OrderDetail from './pages/OrderDetail'
import MyOrders from './pages/MyOrders'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ResendVerification from './pages/ResendVerification'
import AuthCallback from './pages/AuthCallback'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminDashboard from './pages/admin/Dashboard'
import AdminProducts from './pages/admin/Products'
import AdminOrders from './pages/admin/Orders'
import AdminUsers from './pages/admin/Users'
import UserApproval from './pages/admin/UserApproval'
import AdminProductForm from './pages/admin/ProductForm'
import AdminProductDetail from './pages/admin/AdminProductDetail'
import BarcodeGeneratorPage from './pages/admin/BarcodeGeneratorPage'
import AdminAnalytics from './pages/admin/Analytics'
import AdminReviews from './pages/admin/Reviews'
import LogoManagement from './pages/admin/LogoManagement'
import Inventory from './pages/admin/Inventory'
import SiteSettings from './pages/admin/SiteSettings'
import QueryLogs from './pages/admin/QueryLogs'
import LoadingDemo from './pages/LoadingDemo'
import Wishlist from './pages/Wishlist'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'

function App() {
  // Check if the page was reloaded with cache busting
  useEffect(() => {
    checkCacheReload();
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <LogoProvider>
          <CartProvider>
            <WishlistProvider>
              <Router>
                <div className="flex flex-col min-h-screen paper-texture-bg text-[#1a1a1a]">
                  <Header />
                  <main className="flex-grow container mx-auto px-4 py-8">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/products" element={<ProductList />} />
                      <Route path="/products/category/:categoryId" element={<ProductList />} />
                      <Route path="/products/:id" element={<ProductDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={
                        <ProtectedRoute>
                          <Checkout />
                        </ProtectedRoute>
                      } />
                      <Route path="/order-confirmation/:id" element={
                        <ProtectedRoute>
                          <OrderConfirmation />
                        </ProtectedRoute>
                      } />
                      <Route path="/orders" element={
                        <ProtectedRoute>
                          <MyOrders />
                        </ProtectedRoute>
                      } />
                      <Route path="/orders/:id" element={
                        <ProtectedRoute>
                          <OrderDetail />
                        </ProtectedRoute>
                      } />
                      <Route path="/order/:id" element={
                        <ProtectedRoute>
                          <OrderDetail />
                        </ProtectedRoute>
                      } />
                      <Route path="/profile" element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } />
                      <Route path="/wishlist" element={
                        <ProtectedRoute>
                          <Wishlist />
                        </ProtectedRoute>
                      } />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                      <Route path="/resend-verification" element={<ResendVerification />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/loading-demo" element={<LoadingDemo />} />

                      {/* Admin Routes */}
                      <Route path="/admin" element={
                        <AdminRoute>
                          <AdminLayout />
                        </AdminRoute>
                      }>
                        <Route index element={<AdminDashboard />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="products/add" element={<AdminProductForm />} />
                        <Route path="products/edit/:id" element={<AdminProductForm />} />
                        <Route path="products/view/:id" element={<AdminProductDetail />} />
                        <Route path="barcode-generator" element={<BarcodeGeneratorPage />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="user-approval" element={<UserApproval />} />
                        <Route path="analytics" element={<AdminAnalytics />} />
                        <Route path="logs" element={<QueryLogs />} />
                        <Route path="reviews" element={<AdminReviews />} />
                        <Route path="logo" element={<LogoManagement />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="settings" element={<SiteSettings />} />
                      </Route>


                      <Route path="/404" element={<NotFound />} />
                      <Route path="*" element={<Navigate to="/404" replace />} />
                    </Routes>
                  </main>
                  <Footer />
                </div>
              </Router>
            </WishlistProvider>
          </CartProvider>
        </LogoProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App;
