import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { BatchList } from './pages/BatchList';
import { BatchCreate } from './pages/BatchCreate';
import { BatchDetail } from './pages/BatchDetail';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/batches" element={<BatchList />} />
        <Route path="/batches/new" element={<BatchCreate />} />
        <Route path="/batches/:id" element={<BatchDetail />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
