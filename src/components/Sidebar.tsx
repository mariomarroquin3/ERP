import React from 'react';
import { 
  Calendar, 
  PlusCircle, 
  Trello, 
  Settings, 
  LogOut, 
  User as UserIcon, 
  ClipboardList,
  Activity,
  Layers,
  Sun,
  Moon,
  ScanLine,
  UsersRound,
  ClipboardCheck,
  Banknote
} from 'lucide-react';
import { User } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const getBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-50 text-red-700 border-red-200';
      case 'tienda': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'taller': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getBadgeLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'tienda': return 'Tienda / Ventas';
      case 'taller': return 'Taller / Producción';
      default: return 'Cliente';
    }
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Panel de Control',
      icon: Activity,
      roles: ['admin', 'tienda'],
      permission: 'dashboard'
    },
    // Tienda items
    {
      id: 'calendar',
      label: 'Calendario de Pedidos',
      icon: Calendar,
      roles: ['admin', 'tienda'],
      permission: 'calendar'
    },
    {
      id: 'create-order',
      label: 'Crear Pedido',
      icon: PlusCircle,
      roles: ['admin', 'tienda'],
      permission: 'create_order'
    },
    // Taller items
    {
      id: 'kanban',
      label: 'Control de Producción',
      icon: Trello,
      roles: ['admin', 'taller', 'operario'],
      permission: 'kanban'
    },
    // Asistencia y personal
    {
      id: 'attendance-register',
      label: 'Marcar Asistencia',
      icon: ScanLine,
      roles: ['admin', 'taller', 'operario'],
      permission: 'attendance.register'
    },
    {
      id: 'attendance-history',
      label: 'Historial de Asistencia',
      icon: ClipboardCheck,
      roles: ['admin', 'taller', 'operario'],
      permission: 'attendance.view'
    },
    {
      id: 'employees',
      label: 'Empleados',
      icon: UsersRound,
      roles: ['admin'],
      permission: 'employees.manage'
    },    {
      id: 'payroll',
      label: 'Nómina',
      icon: Banknote,
      roles: ['admin'],
      permission: 'payroll.view'
    },    // Admin items
    {
      id: 'admin-panel',
      label: 'Administración',
      icon: Settings,
      roles: ['admin'],
      permission: 'admin_panel'
    },
    // Cliente items
    {
      id: 'my-orders',
      label: 'Mis Pedidos',
      icon: ClipboardList,
      roles: ['cliente'],
      permission: 'my_orders'
    },
  ];

  const visibleItems = menuItems.filter((item) => {
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions.includes(item.permission);
    }
    return item.roles.includes(user.role);
  });

  return (
    <div className="w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 h-screen flex flex-col justify-between overflow-y-auto overscroll-contain p-5 shrink-0 shadow-sm">
      <div className="space-y-8">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">ERP Maquila</h1>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Textil Core v4</span>
          </div>
        </div>

        {/* User Badge Info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 p-2 rounded-xl">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate leading-none mb-1">{user.full_name}</h3>
            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getBadgeColor(user.role)}`}>
              {getBadgeLabel(user.role)}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation */}
        <nav className="space-y-1.5">
          <span className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
            Navegación
          </span>
          {visibleItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-900/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <IconComponent className={`h-5 w-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer with Theme Toggle and Logout */}
      <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-slate-500 dark:text-slate-400" />}
          <span className="capitalize">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition"
        >
          <LogOut className="h-5 w-5 text-red-500 dark:text-red-400" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
