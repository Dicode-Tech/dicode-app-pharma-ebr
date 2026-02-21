import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { BatchList } from './pages/BatchList';
import { BatchCreate } from './pages/BatchCreate';
import { BatchDetail } from './pages/BatchDetail';
import { RecipeList } from './pages/RecipeList';
import { RecipeDetail } from './pages/RecipeDetail';
import { RecipeForm } from './pages/RecipeForm';
import { AuditTrail } from './pages/AuditTrail';
import { IntegrationStatus } from './pages/IntegrationStatus';
import { AdminPanel } from './pages/AdminPanel';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/batches" element={<ProtectedRoute><BatchList /></ProtectedRoute>} />
          <Route path="/batches/new" element={<ProtectedRoute><BatchCreate /></ProtectedRoute>} />
          <Route path="/batches/:id" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
          <Route path="/recipes" element={<ProtectedRoute><RecipeList /></ProtectedRoute>} />
          <Route path="/recipes/new" element={<ProtectedRoute roles={['admin', 'batch_manager']}><RecipeForm /></ProtectedRoute>} />
          <Route path="/recipes/:id/edit" element={<ProtectedRoute roles={['admin', 'batch_manager']}><RecipeForm /></ProtectedRoute>} />
          <Route path="/recipes/:id" element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
          <Route path="/integrations" element={<ProtectedRoute><IntegrationStatus /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />
          </Routes>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
