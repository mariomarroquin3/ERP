import React, { useState } from 'react';
import { Shield, Key, Mail, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  const quickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-indigo-200 shadow-lg">
            <Shield className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Maquila ERP Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Control de producción, capacidad y pedidos textiles
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-100 rounded-3xl sm:px-10 border border-slate-100">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{error}</span>
            </motion.div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm bg-slate-50/50"
                  placeholder="admin@maquila.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm bg-slate-50/50"
                  placeholder="••••••••"
                />
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

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
              Acceso Rápido de Prueba (Demo Roles)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => quickLogin('mario.marroquin.2007@gmail.com', 'admin123')}
                className="text-left px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 flex flex-col justify-center"
              >
                <span className="font-semibold text-indigo-600">Admin</span>
                <span className="text-[10px] text-slate-400">mario.marroquin.2007@gmail</span>
              </button>
              <button
                onClick={() => quickLogin('tienda@maquila.com', 'tienda123')}
                className="text-left px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 flex flex-col justify-center"
              >
                <span className="font-semibold text-indigo-600">Tienda / Ventas</span>
                <span className="text-[10px] text-slate-400">tienda@maquila.com</span>
              </button>
              <button
                onClick={() => quickLogin('taller@maquila.com', 'taller123')}
                className="text-left px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 flex flex-col justify-center"
              >
                <span className="font-semibold text-indigo-600">Taller / Supervisor</span>
                <span className="text-[10px] text-slate-400">taller@maquila.com</span>
              </button>
              <button
                onClick={() => quickLogin('cliente@maquila.com', 'cliente123')}
                className="text-left px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 flex flex-col justify-center"
              >
                <span className="font-semibold text-indigo-600">Cliente</span>
                <span className="text-[10px] text-slate-400">cliente@maquila.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
