import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Layers, 
  Calendar, 
  Sliders, 
  CheckCircle, 
  Plus, 
  X, 
  Info, 
  AlertCircle,
  Database,
  Eye,
  SlidersHorizontal,
  DollarSign,
  Search,
  ShieldCheck,
  Users,
  Lock,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Size, WorkCalendar } from '../types';

interface AdminPanelProps {
  token: string;
}

export default function AdminPanel({ token }: AdminPanelProps) {
  const [subTab, setSubTab] = useState<'capacity' | 'products' | 'access'>('capacity');
  
  // Capacity States
  const [capacityConfigs, setCapacityConfigs] = useState<any[]>([]);
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Catalogs States
  const [products, setProducts] = useState<Product[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // New Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdType, setNewProdType] = useState('1'); // Camisa
  
  // New Product Attribute Modal
  const [showAttributeModal, setShowAttributeModal] = useState<number | null>(null); // holds productId
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrType, setNewAttrType] = useState('1'); // Select
  const [newAttrRequired, setNewAttrRequired] = useState(false);
  const [newAttrValues, setNewAttrValues] = useState(''); // comma separated

  // New Product Size Modal
  const [showSizeModal, setShowSizeModal] = useState<number | null>(null); // holds productId
  const [newSizeId, setNewSizeId] = useState('');
  const [newSizePrice, setNewSizePrice] = useState('0');

  // Edit Product Details Modal States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingProductAttrs, setEditingProductAttrs] = useState<any[]>([]);
  const [editingProductSizes, setEditingProductSizes] = useState<any[]>([]);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);

  // Edit Attribute Sub-form States
  const [editingAttrId, setEditingAttrId] = useState<number | null>(null);
  const [editingAttrName, setEditingAttrName] = useState('');
  const [editingAttrRequired, setEditingAttrRequired] = useState(false);
  const [editingAttrValues, setEditingAttrValues] = useState<any[]>([]);

  // Access Control States
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [accessSearch, setAccessSearch] = useState('');
  
  // User Creation Modal States
  const [showUserModal, setShowUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleId, setNewRoleId] = useState('4'); // Default 'cliente'
  const [newUserIsActive, setNewUserIsActive] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [accessError, setAccessError] = useState('');

  const fetchAccessData = async () => {
    setLoadingAccess(true);
    setAccessError('');
    try {
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/permissions', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      if (usersData.success) setUsers(usersData.users);
      if (rolesData.success) setRoles(rolesData.roles);
      if (permsData.success) setPermissions(permsData.permissions);
    } catch (err) {
      console.error('Error fetching access control data:', err);
      setAccessError('Error al cargar datos de control de acceso');
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setAccessError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: newFullName,
          email: newEmail,
          password: newPassword,
          role_id: parseInt(newRoleId, 10),
          is_active: newUserIsActive
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Usuario "${newFullName}" creado con éxito`);
        setShowUserModal(false);
        // Reset form
        setNewFullName('');
        setNewEmail('');
        setNewPassword('');
        setNewRoleId('4');
        setNewUserIsActive(true);
        // Refresh users list
        fetchAccessData();
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setAccessError(data.message || 'Error al crear usuario');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setAccessError('Error en el servidor al crear usuario');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      setAccessError('');
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
        setSuccessMsg('Estado del usuario actualizado exitosamente');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setAccessError(data.message || 'Error al actualizar el estado del usuario');
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
      setAccessError('Error en el servidor al cambiar estado del usuario');
    }
  };

  const handleTogglePermission = async (roleId: number, permissionKey: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      setPermissions(prev => prev.map(p => {
        if (p.role_id === roleId && p.permission_key === permissionKey) {
          return { ...p, is_enabled: !currentStatus };
        }
        return p;
      }));

      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role_id: roleId,
          permission_key: permissionKey,
          is_enabled: !currentStatus ? 1 : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Permiso actualizado con éxito`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        // Revert on error
        setPermissions(prev => prev.map(p => {
          if (p.role_id === roleId && p.permission_key === permissionKey) {
            return { ...p, is_enabled: currentStatus };
          }
          return p;
        }));
        alert(data.message || 'Error al actualizar permiso');
      }
    } catch (err) {
      console.error('Error toggling permission:', err);
      // Revert on error
      setPermissions(prev => prev.map(p => {
        if (p.role_id === roleId && p.permission_key === permissionKey) {
          return { ...p, is_enabled: currentStatus };
        }
        return p;
      }));
    }
  };

  useEffect(() => {
    if (subTab === 'capacity') {
      fetchCapacitySettings();
    } else if (subTab === 'products') {
      fetchCatalogs();
    } else if (subTab === 'access') {
      fetchAccessData();
    }
  }, [subTab]);

  const fetchCapacitySettings = async () => {
    setLoadingCatalogs(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const end = new Date();
    end.setDate(end.getDate() + 6); // next 7 days
    const endStr = end.toISOString().split('T')[0];

    try {
      const res = await fetch(`/api/capacity?start_date=${todayStr}&end_date=${endStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Group capacity definitions by date
        const grouped: Record<string, any> = {};
        
        // Ensure every day in range has all 10 stages (Corte to Despachado)
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          grouped[dateStr] = {
            date: dateStr,
            stages: { 1: 100, 2: 50, 3: 100, 4: 100, 5: 100, 6: 50, 7: 100, 8: 100, 9: 100, 10: 100 },
            isWorking: true,
            notes: ''
          };
        }

        data.calendar.forEach((cal: WorkCalendar) => {
          if (grouped[cal.work_date]) {
            grouped[cal.work_date].stages[cal.stage_id] = cal.max_capacity_points;
            grouped[cal.work_date].isWorking = cal.is_working_day;
            grouped[cal.work_date].notes = cal.notes || '';
          }
        });

        setCapacityConfigs(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
      }
    } catch (err) {
      console.error('Error fetching capacity settings:', err);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const fetchCatalogs = async () => {
    setLoadingCatalogs(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/catalogs/products', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/catalogs/sizes', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const pData = await pRes.json();
      const sData = await sRes.json();
      if (pData.success) setProducts(pData.products);
      if (sData.success) setSizes(sData.sizes);
    } catch (err) {
      console.error('Error loading catalog lists:', err);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const handleSaveCapacity = async () => {
    setSavingCapacity(true);
    setSuccessMsg('');
    
    // Flatten grouped configurations back to database records
    const configsPayload: any[] = [];
    capacityConfigs.forEach((dayConfig) => {
      Object.entries(dayConfig.stages).forEach(([stageId, points]) => {
        configsPayload.push({
          work_date: dayConfig.date,
          stage_id: parseInt(stageId, 10),
          max_capacity_points: parseInt(points as string, 10),
          is_working_day: dayConfig.isWorking,
          notes: dayConfig.notes || undefined
        });
      });
    });

    try {
      const res = await fetch('/api/capacity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ configs: configsPayload })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('¡Calendario de capacidad de taller actualizado con éxito en la Base de Datos!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Error saving capacity configs:', err);
    } finally {
      setSavingCapacity(false);
    }
  };

  const handleDayWorkingToggle = (index: number) => {
    setCapacityConfigs(prev => prev.map((c, i) => {
      if (i === index) {
        return { ...c, isWorking: !c.isWorking, notes: !c.isWorking ? '' : 'Feriado / Fin de semana' };
      }
      return c;
    }));
  };

  const handleStagePointChange = (dayIndex: number, stageId: number, val: number) => {
    setCapacityConfigs(prev => prev.map((c, i) => {
      if (i === dayIndex) {
        return {
          ...c,
          stages: {
            ...c.stages,
            [stageId]: Math.max(0, val)
          }
        };
      }
      return c;
    }));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/catalogs/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProdName,
          base_price: parseFloat(newProdPrice),
          product_type_id: parseInt(newProdType, 10)
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowProductModal(false);
        setNewProdName('');
        setNewProdPrice('');
        fetchCatalogs();
      }
    } catch (err) {
      console.error('Error creating product:', err);
    }
  };

  const handleAddAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showAttributeModal === null) return;
    try {
      const vals = newAttrValues.split(',').map(v => v.trim()).filter(v => v !== '');
      const res = await fetch(`/api/catalogs/products/${showAttributeModal}/attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attribute_name: newAttrName,
          attribute_type_id: parseInt(newAttrType, 10),
          is_required: newAttrRequired,
          values: vals
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAttributeModal(null);
        setNewAttrName('');
        setNewAttrValues('');
        setNewAttrRequired(false);
        alert('Atributo de catálogo agregado con éxito!');
      }
    } catch (err) {
      console.error('Error adding attribute template:', err);
    }
  };

  const handleAddSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showSizeModal === null) return;
    try {
      const res = await fetch(`/api/catalogs/products/${showSizeModal}/sizes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          size_id: parseInt(newSizeId, 10),
          price_modifier: parseFloat(newSizePrice || '0')
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowSizeModal(null);
        setNewSizeId('');
        setNewSizePrice('0');
        alert('Asociación de talla realizada con éxito!');
      }
    } catch (err) {
      console.error('Error linking product size:', err);
    }
  };

  const handleOpenEditProduct = async (product: Product) => {
    setEditingProduct(product);
    setLoadingProductDetails(true);
    setEditingAttrId(null);
    try {
      const res = await fetch(`/api/catalogs/products/${product.id}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEditingProductAttrs(data.attributes || []);
        
        // Map product sizes
        const productSizesMap = data.sizes || [];
        const mappedSizes = sizes.map(cs => {
          const matched = productSizesMap.find((ps: any) => ps.size_id === cs.id);
          return {
            size_id: cs.id,
            size_code: cs.code,
            size_name: cs.name,
            price_modifier: matched ? parseFloat(matched.price_modifier) : 0,
            active: matched ? !!matched.active : false
          };
        });
        setEditingProductSizes(mappedSizes);
      }
    } catch (err) {
      console.error('Error loading product details:', err);
    } finally {
      setLoadingProductDetails(false);
    }
  };

  const handleStartEditAttribute = (attr: any) => {
    setEditingAttrId(attr.id);
    setEditingAttrName(attr.attribute_name);
    setEditingAttrRequired(!!attr.is_required);
    setEditingAttrValues(attr.values ? attr.values.map((v: any) => ({
      id: v.id,
      value: v.value,
      price_modifier: v.price_modifier,
      active: !!v.active
    })) : []);
  };

  const handleAddEditAttrValue = () => {
    setEditingAttrValues(prev => [...prev, { value: '', price_modifier: 0, active: true }]);
  };

  const handleUpdateEditAttrValue = (index: number, field: string, val: any) => {
    setEditingAttrValues(prev => prev.map((v, i) => i === index ? { ...v, [field]: val } : v));
  };

  const handleSaveAttributeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingAttrId) return;
    try {
      const res = await fetch(`/api/catalogs/products/${editingProduct.id}/attributes/${editingAttrId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attribute_name: editingAttrName,
          is_required: editingAttrRequired,
          values: editingAttrValues
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingAttrId(null);
        handleOpenEditProduct(editingProduct);
        alert('Atributo de catálogo y sus valores guardados exitosamente!');
      } else {
        alert(data.message || 'Error al guardar atributo');
      }
    } catch (err) {
      console.error('Error saving attribute edit:', err);
    }
  };

  const handleUpdateProductSizeLocal = (index: number, field: string, val: any) => {
    setEditingProductSizes(prev => prev.map((ps, i) => i === index ? { ...ps, [field]: val } : ps));
  };

  const handleSaveProductSizes = async () => {
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/catalogs/products/${editingProduct.id}/sizes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sizes: editingProductSizes.map(eps => ({
            size_id: eps.size_id,
            price_modifier: parseFloat(eps.price_modifier || '0'),
            active: eps.active
          }))
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Tallas del producto actualizadas con éxito!');
        handleOpenEditProduct(editingProduct);
      } else {
        alert(data.message || 'Error al guardar tallas');
      }
    } catch (err) {
      console.error('Error saving product sizes:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-600" />
            Módulo de Administración General
          </h2>
          <p className="text-slate-500 text-sm font-medium">Parámetros de capacidad relacional y configuración inmutable de catálogos de maquila</p>
        </div>

        {/* Local tab switches */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('capacity')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              subTab === 'capacity' ? 'bg-white text-indigo-750 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Capacidad de Taller
          </button>
          <button
            onClick={() => setSubTab('products')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              subTab === 'products' ? 'bg-white text-indigo-750 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Catálogos y Tallas
          </button>
          <button
            onClick={() => setSubTab('access')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              subTab === 'access' ? 'bg-white text-indigo-750 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Control de Acceso
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex gap-2 items-center text-xs font-semibold shadow-xs">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SUB-TAB 1: CAPACIDAD CALENDAR MANAGER */}
      {subTab === 'capacity' && (
        <div className="space-y-6">
          <div className="bg-indigo-50/50 p-5 border border-indigo-150 rounded-2xl flex gap-3 items-start">
            <Info className="h-5 w-5 text-indigo-650 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-800 leading-normal font-medium">
              <strong className="text-indigo-900 font-bold">Gestión de Calendario Laboral:</strong> Defina el límite de puntos de capacidad diarios para cada una de las 10 etapas de la línea de producción. Los pedidos entrantes distribuirán y restarán estos puntos en tiempo real para evitar cuellos de botella en el taller.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {capacityConfigs.map((dayConfig, dayIdx) => (
              <div 
                key={dayConfig.date} 
                className={`bg-white border rounded-2xl p-5 shadow-xs transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                  dayConfig.isWorking ? 'border-slate-200' : 'border-slate-150 bg-slate-50/50 opacity-70'
                }`}
              >
                <div>
                  <span className="text-xs text-slate-400 font-bold block uppercase font-mono">FECHA DE CALENDARIO</span>
                  <strong className="text-slate-800 font-black text-sm">{dayConfig.date}</strong>
                  {dayConfig.notes && <span className="text-[10px] text-red-500 font-medium block mt-1">*{dayConfig.notes}</span>}
                </div>

                {/* Stages values inputs */}
                {dayConfig.isWorking ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-10 gap-2 grow max-w-4xl w-full">
                    {[
                      { id: 1, name: 'Corte' },
                      { id: 2, name: 'Estampado' },
                      { id: 3, name: 'Confeccionado' },
                      { id: 4, name: 'Acabado' },
                      { id: 5, name: 'Revisado' },
                      { id: 6, name: 'Bordado' },
                      { id: 7, name: 'Planchado' },
                      { id: 8, name: 'Empaquetado' },
                      { id: 9, name: 'Recibido en Tienda' },
                      { id: 10, name: 'Despachado' }
                    ].map((stage) => (
                      <div key={stage.id} className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block truncate" title={`${stage.name} (Pts)`}>{stage.name}</label>
                        <input
                          type="number"
                          value={dayConfig.stages[stage.id] || ''}
                          onChange={(e) => handleStagePointChange(dayIdx, stage.id, parseInt(e.target.value, 10) || 0)}
                          className="w-full border border-slate-200 rounded-xl py-1 px-1.5 text-xs font-bold text-slate-800 bg-slate-50/50"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grow flex items-center justify-center text-xs text-slate-400 font-semibold italic uppercase">
                    Día de Descanso / Feriado
                  </div>
                )}

                {/* Day working toggle */}
                <button
                  onClick={() => handleDayWorkingToggle(dayIdx)}
                  className={`text-[11px] font-bold py-1.5 px-3 rounded-xl border transition shrink-0 ${
                    dayConfig.isWorking 
                      ? 'border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100'
                      : 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {dayConfig.isWorking ? 'Habilitado' : 'Feriado'}
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveCapacity}
              disabled={savingCapacity}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50 transition"
            >
              {savingCapacity ? 'Guardando cambios transaccionales...' : 'Guardar Calendario de Capacidad'}
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CATALOG PRODUCTS & ATTRS CRUD */}
      {subTab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="h-5 w-5 text-indigo-500" />
              Catálogo de Productos Disponibles
            </h3>
            <button
              onClick={() => setShowProductModal(true)}
              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              Agregar Producto
            </button>
          </div>

          {/* Search bar for catalog products */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar producto por nombre o ID..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 text-xs font-semibold placeholder-slate-400 shadow-xs"
            />
            {catalogSearch && (
              <button
                type="button"
                onClick={() => setCatalogSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-450 hover:text-slate-605 text-xs font-bold"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {products.filter(p => {
              const term = catalogSearch.toLowerCase();
              return p.name.toLowerCase().includes(term) || p.id.toString().includes(term);
            }).length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs font-medium">
                No se encontraron productos que coincidan con la búsqueda.
              </div>
            ) : (
              products
                .filter(p => {
                  const term = catalogSearch.toLowerCase();
                  return p.name.toLowerCase().includes(term) || p.id.toString().includes(term);
                })
                .map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">PRODUCTO #{p.id}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold ${p.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {p.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <strong className="text-slate-800 font-bold text-base block leading-tight">{p.name}</strong>
                      <div className="text-xs text-indigo-600 font-bold font-mono">
                        Precio Base: ${parseFloat(p.base_price as any).toFixed(2)}
                      </div>
                    </div>

                {/* Action parameters per product */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleOpenEditProduct(p)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 transition"
                  >
                    <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                    Editar Tallas y Atributos
                  </button>
                  <button
                    onClick={() => setShowAttributeModal(p.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Sliders className="h-4 w-4 text-slate-400" />
                    + Atributo
                  </button>
                  <button
                    onClick={() => setShowSizeModal(p.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Layers className="h-4 w-4 text-slate-400" />
                    + Vincular Talla
                  </button>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CONTROL DE ACCESO (ACCESS CONTROL) */}
      {subTab === 'access' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex gap-3 items-start">
            <Lock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-normal font-medium">
              <strong className="text-slate-800 font-bold">Matriz de Control de Acceso:</strong> Como administrador de seguridad, puede ajustar dinámicamente los privilegios de cada rol en tiempo real. Los cambios afectarán la visibilidad del menú de navegación del sistema. También puede dar de alta nuevos usuarios del sistema.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles and Permissions Matrix */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" />
                Matriz de Permisos por Rol
              </h3>

              {loadingAccess ? (
                <div className="text-center py-12 text-slate-400 font-medium text-xs">
                  Cargando matriz de permisos...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map((role) => {
                    const rolePerms = [
                      { key: 'dashboard', label: 'Panel de Control / Dashboard' },
                      { key: 'calendar', label: 'Calendario de Pedidos' },
                      { key: 'create_order', label: 'Crear y Gestionar Pedidos' },
                      { key: 'kanban', label: 'Control de Producción (Kanban)' },
                      { key: 'admin_panel', label: 'Módulo de Administración' },
                      { key: 'my_orders', label: 'Módulo de Cliente' }
                    ];

                    return (
                      <div key={role.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 capitalize">{role.name === 'admin' ? 'Administrador' : role.name === 'tienda' ? 'Tienda / Ventas' : role.name === 'taller' ? 'Taller / Producción' : 'Cliente'}</h4>
                              <p className="text-[10px] text-slate-400 font-medium">{role.description}</p>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-300">ID #{role.id}</span>
                          </div>

                          <div className="space-y-3.5">
                            {rolePerms.map((perm) => {
                              const rp = permissions.find(
                                (p) => p.role_id === role.id && p.permission_key === perm.key
                              );
                              const isEnabled = rp ? !!rp.is_enabled : false;

                              return (
                                <div key={perm.key} className="flex justify-between items-center gap-4">
                                  <span className="text-xs font-semibold text-slate-600 leading-tight">
                                    {perm.label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePermission(role.id, perm.key, isEnabled)}
                                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                      isEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                                    }`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                        isEnabled ? 'translate-x-4.5' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Users Directory */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4.5 w-4.5 text-indigo-600" />
                  Directorio de Usuarios
                </h3>
                <button
                  type="button"
                  onClick={() => setShowUserModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Nuevo Usuario
                </button>
              </div>

              {/* User search bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={accessSearch}
                  onChange={(e) => setAccessSearch(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 text-xs font-semibold placeholder-slate-400 shadow-xs"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                {loadingAccess ? (
                  <div className="text-center py-12 text-slate-400 font-medium text-xs">
                    Cargando usuarios...
                  </div>
                ) : users.filter(u => {
                  const term = accessSearch.toLowerCase();
                  return u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
                }).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-medium text-xs">
                    No se encontraron usuarios.
                  </div>
                ) : (
                  users
                    .filter(u => {
                      const term = accessSearch.toLowerCase();
                      return u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
                    })
                    .map((u) => {
                      const getRoleBadgeColor = (roleName: string) => {
                        switch (roleName) {
                          case 'admin': return 'bg-rose-50 text-rose-700 border-rose-200';
                          case 'tienda': return 'bg-blue-50 text-blue-700 border-blue-200';
                          case 'taller': return 'bg-amber-50 text-amber-700 border-amber-200';
                          default: return 'bg-slate-50 text-slate-700 border-slate-200';
                        }
                      };

                      const currentUserId = (() => {
                        try {
                          const payload = JSON.parse(atob(token.split('.')[1]));
                          return payload.id;
                        } catch (e) {
                          return null;
                        }
                      })();

                      return (
                        <div key={u.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition">
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">{u.full_name}</span>
                              <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {u.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium font-mono leading-none">{u.email}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${getRoleBadgeColor(u.role_name)}`}>
                              {u.role_name === 'admin' ? 'Administrador' : u.role_name === 'tienda' ? 'Tienda / Ventas' : u.role_name === 'taller' ? 'Taller / Producción' : 'Cliente'}
                            </span>
                            
                            {currentUserId !== u.id && (
                              <button
                                onClick={() => handleToggleUserStatus(u.id, !!u.is_active)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                  u.is_active 
                                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300' 
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300'
                                }`}
                              >
                                {u.is_active ? 'Desactivar' : 'Activar'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-100 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">Crear Nuevo Producto en Catálogo</h3>
              
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Producto</label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="Ej: Playera Polo DryFit"
                    className="block w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Precio Base ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      placeholder="12.50"
                      className="block w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Maquila</label>
                    <select
                      value={newProdType}
                      onChange={(e) => setNewProdType(e.target.value)}
                      className="block w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs bg-slate-50/50 font-semibold"
                    >
                      <option value="1">Camisa / Prenda Superior</option>
                      <option value="2">Chumpa / Exterior</option>
                      <option value="3">Pantalón / Inferior</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                  >
                    Crear Producto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Attribute Modal */}
      <AnimatePresence>
        {showAttributeModal !== null && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-100 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">Agregar Atributo de Personalización</h3>
              
              <form onSubmit={handleAddAttribute} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Atributo</label>
                  <input
                    type="text"
                    required
                    value={newAttrName}
                    onChange={(e) => setNewAttrName(e.target.value)}
                    placeholder="Ej: Tipo de Cuello, Tipo de Botón"
                    className="block w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Componente</label>
                    <select
                      value={newAttrType}
                      onChange={(e) => setNewAttrType(e.target.value)}
                      className="block w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs bg-slate-50/50 font-semibold"
                    >
                      <option value="1">Menú Desplegable (Catálogo)</option>
                      <option value="2">Paleta de Colores (Catálogo)</option>
                      <option value="3">Campo Libre de Texto (No cat)</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAttrRequired}
                        onChange={(e) => setNewAttrRequired(e.target.checked)}
                        className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500"
                      />
                      ¿Es obligatorio?
                    </label>
                  </div>
                </div>

                {['1', '2'].includes(newAttrType) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Valores de Selección (Separados por coma)</label>
                    <input
                      type="text"
                      required
                      value={newAttrValues}
                      onChange={(e) => setNewAttrValues(e.target.value)}
                      placeholder="Ej: Italiano, Mao, Inglés, Polo"
                      className="block w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAttributeModal(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                  >
                    Guardar Atributo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Size Modal */}
      <AnimatePresence>
        {showSizeModal !== null && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-100 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">Vincular Talla a Producto</h3>
              
              <form onSubmit={handleAddSize} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Talla a Habilitar</label>
                  <select
                    required
                    value={newSizeId}
                    onChange={(e) => setNewSizeId(e.target.value)}
                    className="block w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs bg-slate-50/50 font-semibold"
                  >
                    <option value="">Seleccione una talla de catálogo...</option>
                    {sizes.map(s => (
                      <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Modificador de Precio Base ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newSizePrice}
                    onChange={(e) => setNewSizePrice(e.target.value)}
                    placeholder="0.00"
                    className="block w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Costo adicional agregado al precio base por escoger esta talla.</span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSizeModal(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                  >
                    Vincular Talla
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Product Details Modal */}
      <AnimatePresence>
        {editingProduct !== null && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">EDITAR PARÁMETROS RELACIONALES</span>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Database className="h-5 w-5 text-indigo-500" />
                    {editingProduct.name}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingProductDetails ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="text-xs text-slate-500 font-medium">Cargando catálogo, tallas y atributos...</span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-4">
                  
                  {/* Left Column: Manage Sizes */}
                  <div className="lg:col-span-5 space-y-4 border-r border-slate-100 pr-0 lg:pr-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        <Layers className="h-4 w-4 text-slate-400" />
                        Tallas de Producto
                      </h4>
                      <p className="text-[11px] text-slate-500">Habilita tallas de catálogo y define sus modificadores de precio.</p>
                    </div>

                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {editingProductSizes.map((ps, idx) => (
                        <div key={ps.size_id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition">
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ps.active}
                              onChange={(e) => handleUpdateProductSizeLocal(idx, 'active', e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-mono text-slate-900 font-bold">{ps.size_code}</span> - {ps.size_name}
                          </label>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              disabled={!ps.active}
                              value={ps.price_modifier}
                              onChange={(e) => handleUpdateProductSizeLocal(idx, 'price_modifier', e.target.value)}
                              placeholder="0.00"
                              className={`w-16 p-1 border rounded-lg text-xs font-semibold font-mono text-right ${
                                ps.active 
                                  ? 'border-slate-200 bg-white text-slate-800' 
                                  : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleSaveProductSizes}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Guardar Modificaciones de Tallas
                    </button>
                  </div>

                  {/* Right Column: Manage Attributes */}
                  <div className="lg:col-span-7 space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        <Sliders className="h-4 w-4 text-slate-400" />
                        Atributos de Personalización
                      </h4>
                      <p className="text-[11px] text-slate-500">Gestiona los atributos existentes, sus componentes y valores permitidos.</p>
                    </div>

                    {editingAttrId === null ? (
                      <div className="space-y-3">
                        {editingProductAttrs.length === 0 ? (
                          <div className="p-6 border border-dashed border-slate-200 rounded-2xl text-center space-y-1">
                            <Info className="h-5 w-5 text-slate-300 mx-auto" />
                            <p className="text-xs text-slate-400 font-medium">Este producto no cuenta con atributos aún.</p>
                          </div>
                        ) : (
                          editingProductAttrs.map((attr) => (
                            <div key={attr.id} className="p-3.5 border border-slate-150 rounded-2xl space-y-2 hover:border-slate-300 transition bg-white">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h5 className="text-xs font-bold text-slate-800">{attr.attribute_name}</h5>
                                    <span className={`inline-flex px-1.5 py-0.2 rounded-full text-[8px] font-bold ${
                                      attr.is_required ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {attr.is_required ? 'Obligatorio' : 'Opcional'}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-slate-400 block font-medium">
                                    Tipo: {attr.attribute_type_id === 1 ? 'Menú Desplegable' : attr.attribute_type_id === 2 ? 'Paleta de Colores' : 'Texto Libre'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleStartEditAttribute(attr)}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline px-2.5 py-1 bg-indigo-50 rounded-lg cursor-pointer"
                                >
                                  Editar Atributo
                                </button>
                              </div>

                              {attr.values && attr.values.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-50">
                                  {attr.values.map((v: any) => (
                                    <span key={v.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-medium text-slate-600 font-mono">
                                      {v.value} {parseFloat(v.price_modifier) > 0 && `(+$${parseFloat(v.price_modifier).toFixed(2)})`}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSaveAttributeEdit} className="p-4 border border-indigo-100 bg-indigo-50/20 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-indigo-50 pb-2">
                          <span className="text-xs font-bold text-indigo-900">Editando Atributo</span>
                          <button
                            type="button"
                            onClick={() => setEditingAttrId(null)}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Volver a la lista
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre del Atributo</label>
                            <input
                              type="text"
                              required
                              value={editingAttrName}
                              onChange={(e) => setEditingAttrName(e.target.value)}
                              className="block w-full p-2 border border-slate-200 bg-white rounded-lg text-xs"
                            />
                          </div>
                          <div className="flex items-center pt-5">
                            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingAttrRequired}
                                onChange={(e) => setEditingAttrRequired(e.target.checked)}
                                className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500"
                              />
                              ¿Es de selección obligatoria?
                            </label>
                          </div>
                        </div>

                        {/* List / Edit values */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold text-slate-600">Catálogo de Valores Permitidos</span>
                            <button
                              type="button"
                              onClick={handleAddEditAttrValue}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" /> Agregar Valor
                            </button>
                          </div>

                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {editingAttrValues.map((val, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  required
                                  value={val.value}
                                  onChange={(e) => handleUpdateEditAttrValue(idx, 'value', e.target.value)}
                                  placeholder="Valor (ej: Cuello Inglés)"
                                  className="flex-1 p-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={val.price_modifier}
                                    onChange={(e) => handleUpdateEditAttrValue(idx, 'price_modifier', e.target.value)}
                                    placeholder="Modificador"
                                    className="w-16 p-1.5 border border-slate-200 bg-white rounded-lg text-xs text-right font-mono"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEditAttrValue(idx, 'active', !val.active)}
                                  className={`px-2 py-1 text-[9px] font-bold rounded-lg transition cursor-pointer ${
                                    val.active 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100' 
                                      : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100'
                                  }`}
                                >
                                  {val.active ? 'Activo' : 'Inactivo'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingAttrId(null)}
                            className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg bg-white cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                          >
                            Guardar Cambios de Atributo
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-indigo-600" />
                  <strong className="text-slate-900 font-bold text-lg">Dar de Alta Nuevo Usuario</strong>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {accessError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                    <span>{accessError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Ej: Mario Marroquín"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-950 text-xs font-semibold shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Ej: mario@example.com"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-950 text-xs font-semibold shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contraseña Temporal</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Contraseña del usuario"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-950 text-xs font-semibold shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rol del Sistema</label>
                  <select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-950 text-xs font-semibold shadow-xs"
                  >
                    <option value="1">Administrador (Admin)</option>
                    <option value="2">Tienda / Ventas (Tienda)</option>
                    <option value="3">Taller / Producción (Taller)</option>
                    <option value="4">Cliente con Cuenta (Cliente)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-slate-600">¿Usuario Activo?</span>
                  <button
                    type="button"
                    onClick={() => setNewUserIsActive(!newUserIsActive)}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      newUserIsActive ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        newUserIsActive ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    {creatingUser ? 'Registrando...' : 'Registrar Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
