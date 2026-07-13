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
  Layers
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }: SidebarProps) {
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
    // Admin items
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
    if (user.permissions) {
      return user.permissions.includes(item.permission);
    }
    return item.roles.includes(user.role);
  });

  return (
    <div className="w-64 lg:w-72 bg-white border-r border-slate-150 h-screen flex flex-col justify-between p-5 shrink-0 shadow-sm">
      <div className="space-y-8">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">ERP Maquila</h1>
            <span className="text-xs text-slate-400 font-medium">Textil Core v4</span>
          </div>
        </div>

        {/* User Badge Info */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="bg-indigo-550/10 text-indigo-700 p-2 rounded-xl">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <h3 className="font-semibold text-slate-800 text-sm truncate leading-none mb-1">{user.full_name}</h3>
            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getBadgeColor(user.role)}`}>
              {getBadgeLabel(user.role)}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation */}
        <nav className="space-y-1.5">
          <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
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
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <IconComponent className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Footer */}
      <div className="border-t border-slate-100 pt-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition"
        >
          <LogOut className="h-5 w-5 text-red-500" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
