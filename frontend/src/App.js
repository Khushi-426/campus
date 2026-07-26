import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SellItem from './pages/SellItem';
import ProductDetail from './pages/ProductDetail';
import MyListings from './pages/MyListings';
import Chat from './pages/Chat';

import Saved from './pages/Saved';
import AdminDashboard from './pages/AdminDashboard';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user && user.role === 'admin' ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <div className="app-layout-root">
        {/* Left Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="app-main-viewport">
          <Header />
          <main className="main-content-scroll">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/saved"
                element={
                  <PrivateRoute>
                    <Saved />
                  </PrivateRoute>
                }
              />
              <Route
                path="/sell"
                element={
                  <PrivateRoute>
                    <SellItem />
                  </PrivateRoute>
                }
              />
              <Route
                path="/my-listings"
                element={
                  <PrivateRoute>
                    <MyListings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <PrivateRoute>
                    <Chat />
                  </PrivateRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
