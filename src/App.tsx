import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import OrderCalendar from './components/OrderCalendar';
import OrderForm from './components/OrderForm';
import KanbanBoard from './components/KanbanBoard';
import AdminPanel from './components/AdminPanel';
import MyOrders from './components/MyOrders';
import Dashboard from './components/Dashboard';
import { User } from './types';
import { Toaster } from 'sonner';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('maquila_token'));
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Handle default tab routing based on user role
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'tienda') {
        setActiveTab('dashboard');
      } else if (user.role === 'taller') {
        setActiveTab('kanban');
      } else if (user.role === 'cliente') {
        setActiveTab('my-orders');
      }
    }
  }, [user]);

  const verifyToken = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
        } else {
          handleLogout();
        }
      } else {
        console.warn('Response is not JSON or not OK, ignoring to prevent clearing credentials:', res.status, contentType);
        // If it's HTML (like AI Studio cookie check or temporary gateway/dev proxy redirect),
        // we should NOT clear the token from localStorage, to avoid logging out the user.
        if (!contentType || !contentType.includes('text/html')) {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Error verifying credentials:', err);
      // Do not clear token if it's a network or JSON parse error to avoid aggressive logout
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    localStorage.setItem('maquila_token', newToken);
    setToken(newToken);
    setUser(loggedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('maquila_token');
    setToken(null);
    setUser(null);
    setActiveTab('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Sincronizando con Maquila ERP...</p>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Active section renderer
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            token={token} 
            user={user} 
            setActiveTab={setActiveTab} 
          />
        );
      case 'calendar':
        return (
          <OrderCalendar 
            token={token} 
            onCreateNewOrder={() => setActiveTab('create-order')} 
          />
        );
      case 'create-order':
        return (
          <OrderForm 
            token={token} 
            onSuccess={() => setActiveTab('calendar')} 
            onCancel={() => setActiveTab('calendar')} 
          />
        );
      case 'kanban':
        return <KanbanBoard token={token} user={user!} />;
      case 'admin-panel':
        return <AdminPanel token={token} />;
      case 'my-orders':
        return <MyOrders token={token} />;
      default:
        return (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">
            <p className="font-semibold text-sm">Sección no encontrada o sin permisos de acceso</p>
          </div>
        );
    }
  };

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 h-screen overflow-hidden">

      {/* Sonner - estilo elegante */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-white dark:bg-slate-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-slate-700 shadow-md rounded-xl',
          descriptionClassName: 'text-zinc-500 dark:text-zinc-400',
        }}
      />

      {/* Dynamic RBAC Navigation Sidebar */}
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      {/* Main Panel Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
