import React, { useState } from 'react';
import { Shield, Key, Mail, AlertTriangle, Sun, Moon, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [view, setView] = useState<'login' | 'recover'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [recoverStatus, setRecoverStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('El servidor no devolvió una respuesta válida de JSON');
      }
      
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Credenciales incorrectas');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('El servidor no devolvió una respuesta válida de JSON');
      }
      
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al procesar la solicitud');
      }

      if (data.status === 'rejected') {
        setError('Tu solicitud fue rechazada. Comunícate con la administración para apelar esta decisión.');
        setSuccessMessage('');
        setRecoverStatus('none');
        setTimeout(() => {
            setView('login');
        }, 5000);
      } else {
        setSuccessMessage(data.message);
        if (data.status) {
          setRecoverStatus(data.status);
        } else {
          setRecoverStatus('none');
          setTimeout(() => {
              setView('login');
              setRecoverStatus('none');
          }, 5000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });
      
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al procesar la solicitud');
      }

      setSuccessMessage(data.message);
      setTimeout(() => {
        setView('login');
        setRecoverStatus('none');
        setNewPassword('');
        setPassword('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-indigo-200 shadow-lg dark:shadow-indigo-900/30">
            <Shield className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Maquila ERP Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Control de producción, capacidad y pedidos textiles
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-xl shadow-slate-100 dark:shadow-slate-900/50 rounded-3xl sm:px-10 border border-slate-100 dark:border-slate-700 overflow-hidden">
          {/* Theme Toggle in top-right of card */}
          <button
            onClick={toggleTheme}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition z-10"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5" />}
          </button>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl flex items-start gap-3 relative z-10"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{error}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-4 rounded-xl flex items-start gap-3 relative z-10"
            >
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{successMessage}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {view === 'login' ? (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <form className="space-y-6" onSubmit={handleLoginSubmit}>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Correo electrónico
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 text-sm bg-slate-50/50 dark:bg-slate-800/50"
                        placeholder="admin@maquila.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Contraseña
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 text-sm bg-slate-50/50 dark:bg-slate-800/50"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <button 
                        type="button" 
                        onClick={() => { setView('recover'); setError(''); setSuccessMessage(''); setRecoverStatus('none'); }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                    >
                      {loading ? 'Iniciando sesión...' : 'Ingresar al sistema'}
                    </button>
                  </div>
                </form>

                <div className="mt-8 border-t border-slate-100 dark:border-slate-700 pt-6">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">
                    Acceso Rápido de Prueba (Demo Roles)
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => quickLogin('mario.marroquin.2007@gmail.com', 'admin123')}
                      className="text-left px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex flex-col justify-center transition"
                    >
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Admin</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">mario.marroquin.2007@gmail</span>
                    </button>
                    <button
                      onClick={() => quickLogin('tienda@maquila.com', 'tienda123')}
                      className="text-left px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex flex-col justify-center transition"
                    >
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Tienda / Ventas</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">tienda@maquila.com</span>
                    </button>
                    <button
                      onClick={() => quickLogin('taller@maquila.com', 'taller123')}
                      className="text-left px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex flex-col justify-center transition"
                    >
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Taller / Supervisor</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">taller@maquila.com</span>
                    </button>
                    <button
                      onClick={() => quickLogin('cliente@maquila.com', 'cliente123')}
                      className="text-left px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex flex-col justify-center transition"
                    >
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Cliente</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">cliente@maquila.com</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="recover-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="pt-2"
              >
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recuperar contraseña</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Ingresa el correo electrónico asociado a tu cuenta y te enviaremos instrucciones para restablecer tu contraseña.
                  </p>
                </div>

                <form className="space-y-6" onSubmit={recoverStatus === 'approved' ? handleResetSubmit : handleRecoverSubmit}>
                  <div>
                    <label htmlFor="recover-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Correo electrónico
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        id="recover-email"
                        type="email"
                        required
                        disabled={recoverStatus === 'approved'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 text-sm bg-slate-50/50 dark:bg-slate-800/50 disabled:opacity-50"
                        placeholder="tu@correo.com"
                      />
                    </div>
                  </div>

                  {recoverStatus === 'approved' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Nueva Contraseña
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <input
                          id="new-password"
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 text-sm bg-slate-50/50 dark:bg-slate-800/50"
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                    >
                      {loading ? 'Procesando...' : recoverStatus === 'approved' ? 'Cambiar Contraseña' : 'Enviar / Verificar Estado'}
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => { setView('login'); setError(''); setSuccessMessage(''); setRecoverStatus('none'); }}
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver al inicio de sesión
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
