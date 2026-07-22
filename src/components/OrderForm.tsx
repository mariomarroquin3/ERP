import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Calendar as CalendarIcon,
  Tag,
  Layers,
  FileText,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  ArrowLeft,
  ChevronRight,
  Info,
  ExternalLink,
  ShieldAlert,
  Search,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, ProductAttribute, ProductSize, User } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface OrderFormProps {
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const getDaysForPriority = (p: 'low' | 'medium' | 'high' | 'urgent'): number => {
  switch (p) {
    case 'urgent': return 2;
    case 'high': return 4;
    case 'medium': return 7;
    case 'low': return 14;
    default: return 7;
  }
};

const calculateSuggestedDate = (startDateStr: string, p: 'low' | 'medium' | 'high' | 'urgent'): string => {
  if (!startDateStr) return '';
  const parts = startDateStr.split('-');
  if (parts.length !== 3) return '';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const date = new Date(year, month, day);
  const days = getDaysForPriority(p);
  date.setDate(date.getDate() + days);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateSpanish = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = months[monthIdx] || month;

  return `${day} ${monthName} ${year}`;
};

export default function OrderForm({ token, onSuccess, onCancel }: OrderFormProps) {
  const { theme, toggleTheme } = useTheme();
  // Clients list
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Products list
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const filteredClients = clients.filter(c => {
    const term = clientSearch.toLowerCase();
    return c.full_name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term);
  });

  const filteredProducts = products.filter(p => {
    const term = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term));
  });

  // Product details (sizes & attributes)
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const selectedProduct = products.find((product) => product.id === parseInt(selectedProductId, 10));
  const isPantsProduct = !!selectedProduct && (
    selectedProduct.product_type_id === 3 ||
    /pantal[oó]n|jeans?|inferior/i.test(selectedProduct.product_type_name || '')
  );
  const displayedSizes = sizes.filter((size) => isPantsProduct
    ? size.size_code?.startsWith('P-') || size.apparel_category === 'pantalon'
    : !size.size_code?.startsWith('P-') && size.apparel_category !== 'pantalon'
  );

  // Form values
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [notes, setNotes] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [productionStartDate, setProductionStartDate] = useState('');

  // Order Quantities & Attr selections
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({}); // product_size_id -> quantity
  const [attributeSelections, setAttributeSelections] = useState<Record<string, { attribute_value_id: number | null, custom_value: string | null }>>({}); // attribute_id -> values
  const [attachedFiles, setAttachedFiles] = useState<{ file_url: string; file_type: string }[]>([]);

  // Capacity indicators
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [capacityInfo, setCapacityInfo] = useState<any[]>([]);

  // State managers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  // Sample remote embroidery files for easy testing
  const presetsLogos = [
    { name: 'Logo Deportivo León', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300' },
    { name: 'Emblema Escolar Clásico', url: 'https://images.unsplash.com/photo-1590156221122-c51de77531a6?w=300' },
    { name: 'Bordado Floral Minimalista', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300' }
  ];

  useEffect(() => {
    fetchInitialData();
    // Default dates
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const startStr = start.toISOString().split('T')[0];
    setProductionStartDate(startStr);

    const deliveryStr = calculateSuggestedDate(startStr, 'medium');
    setEstimatedDeliveryDate(deliveryStr);
  }, []);

  const handlePriorityChange = (p: 'low' | 'medium' | 'high' | 'urgent') => {
    setPriority(p);
    if (productionStartDate) {
      const suggested = calculateSuggestedDate(productionStartDate, p);
      setEstimatedDeliveryDate(suggested);
    }
  };

  const handleProductionStartDateChange = (newStartDate: string) => {
    setProductionStartDate(newStartDate);
    if (newStartDate) {
      const suggested = calculateSuggestedDate(newStartDate, priority);
      setEstimatedDeliveryDate(suggested);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      fetchProductDetails(parseInt(selectedProductId, 10));
    } else {
      setAttributes([]);
      setSizes([]);
      setSizeQuantities({});
      setAttributeSelections({});
    }
  }, [selectedProductId]);

  useEffect(() => {
    if (productionStartDate && selectedProductId) {
      checkCalendarCapacity();
    }
  }, [productionStartDate, selectedProductId, sizeQuantities]);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, productsRes] = await Promise.all([
        fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/catalogs/products', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const clientsData = await clientsRes.json();
      const productsData = await productsRes.json();

      if (clientsData.success) setClients(clientsData.clients);
      if (productsData.success) setProducts(productsData.products);
    } catch (err) {
      console.error('Error fetching initial form data:', err);
    }
  };

  const fetchProductDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/catalogs/products/${id}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAttributes(data.attributes);
        setSizes(data.sizes);

        // Reset inputs
        const initialQtys: Record<string, number> = {};
        data.sizes.forEach((s: ProductSize) => {
          initialQtys[s.id] = 0;
        });
        setSizeQuantities(initialQtys);

        const initialAttrs: Record<string, any> = {};
        data.attributes.forEach((a: ProductAttribute) => {
          initialAttrs[a.id] = {
            attribute_value_id: null,
            custom_value: null
          };
        });
        setAttributeSelections(initialAttrs);
      }
    } catch (err) {
      console.error('Error fetching product specs:', err);
    }
  };

  const checkCalendarCapacity = async () => {
    if (!productionStartDate) return;
    setCapacityLoading(true);
    try {
      // Fetch calendar for specified start date
      const res = await fetch(`/api/capacity?start_date=${productionStartDate}&end_date=${productionStartDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Aggregate workload requested
        const totalWorkload = (Object.values(sizeQuantities) as number[]).reduce((sum: number, q: number) => sum + Number(q || 0), 0);

        const stagesInfo = data.calendar.map((cal: any) => {
          const committed = data.committed.find((com: any) => com.stage_id === cal.stage_id && com.work_date === cal.work_date);
          const commPoints = committed ? committed.committed_points : 0;
          return {
            ...cal,
            committed_points: commPoints,
            remaining: cal.max_capacity_points - commPoints,
            requested: totalWorkload,
            safe: (cal.max_capacity_points - commPoints) >= totalWorkload
          };
        });

        setCapacityInfo(stagesInfo);
      }
    } catch (err) {
      console.error('Error checking capacity:', err);
    } finally {
      setCapacityLoading(false);
    }
  };

  const handleQtyChange = (productSizeId: number, qty: number) => {
    setSizeQuantities(prev => ({
      ...prev,
      [productSizeId]: Math.max(0, qty)
    }));
  };

  const handleAttrChange = (attributeId: number, valueId: number | null, customVal: string | null) => {
    setAttributeSelections(prev => ({
      ...prev,
      [attributeId]: {
        attribute_value_id: valueId,
        custom_value: customVal
      }
    }));
  };

  const addAttachment = (url: string) => {
    if (!url) return;
    setAttachedFiles(prev => [...prev, { file_url: url, file_type: 'image/jpeg' }]);
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormError('');
    setLoading(true);

    const client = clients.find(c => c.id === parseInt(selectedClientId, 10));
    if (!client) {
      setFormError('Debe seleccionar un cliente de la lista');
      setLoading(false);
      return;
    }

    // Prepare sizes list
    const sizesPayload = Object.entries(sizeQuantities)
      .map(([id, qty]) => ({ product_size_id: parseInt(id, 10), quantity: qty as number }))
      .filter(s => s.quantity > 0);

    if (sizesPayload.length === 0) {
      setFormError('Debe agregar cantidad para al menos una talla en la matriz');
      setLoading(false);
      return;
    }

    // Validate required attributes
    for (const attr of attributes) {
      const sel = attributeSelections[attr.id];
      if (attr.is_required) {
        if (attr.requires_catalog_value && !sel?.attribute_value_id) {
          setFormError(`El atributo "${attr.attribute_name}" es obligatorio y requiere una opción del catálogo`);
          setLoading(false);
          return;
        }
        if (!attr.requires_catalog_value && (!sel?.custom_value || sel.custom_value.trim() === '')) {
          setFormError(`El atributo "${attr.attribute_name}" es obligatorio y requiere un texto libre`);
          setLoading(false);
          return;
        }
      }
    }

    const payload = {
      client_id: client.id,
      client_name: client.full_name, // Inmutable Snapshot matching selection
      priority,
      notes,
      estimated_delivery_date: estimatedDeliveryDate,
      production_start_date: productionStartDate,
      product_id: parseInt(selectedProductId, 10),
      sizes: sizesPayload,
      attributes: Object.entries(attributeSelections).map(([id, s]: [string, any]) => ({
        attribute_id: parseInt(id, 10),
        attribute_value_id: s.attribute_value_id,
        custom_value: s.custom_value
      })),
      files: attachedFiles
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        // Here we parse Custom Database Triggers exception codes (e.g., ERR_CAPACITY_EXCEEDED)
        const errorCode = data.code || 'DB_ERROR';
        const errorMessage = data.message || 'Error al guardar pedido';

        if (errorCode === 'ERR_CAPACITY_EXCEEDED' || errorMessage.includes('45001') || errorMessage.includes('CAPACITY_EXCEEDED')) {
          checkCalendarCapacity();
        }
        throw new Error(`${errorCode}|${errorMessage}`);
      }

      onSuccess();
    } catch (err: any) {
      const errMsg = err.message || 'Error inesperado al conectar con el servidor.';
      setError(errMsg);

      if (errMsg.includes('ERR_CAPACITY_EXCEEDED') || errMsg.includes('45001') || errMsg.includes('CAPACITY_EXCEEDED')) {
        setFormError('CAPACIDAD DE TALLER EXCEDIDA: Por favor ajusta la Fecha de Inicio en Taller o la Fecha de Entrega Estimada para distribuir la carga de trabajo en días con suficiente capacidad disponible.');
        checkCalendarCapacity();
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimation = () => {
    const product = products.find(p => p.id === parseInt(selectedProductId, 10));
    if (!product) return 0;

    let total = Number(product.base_price);

    // Add attr price modifiers
    Object.entries(attributeSelections).forEach(([attrId, sel]: [string, any]) => {
      const attr = attributes.find(a => a.id === parseInt(attrId, 10));
      if (sel.attribute_value_id) {
        const val = attr?.values?.find(v => v.id === sel.attribute_value_id);
        if (val) total += Number(val.price_modifier);
      } else if (sel.custom_value && sel.custom_value.trim() !== '') {
        if (attr?.attribute_name.toLowerCase().includes('bordado')) {
          total += 2.50; // Standard $2.50 embroidery price increase
        }
      }
    });

    // Sum sizes quantities * (unitCost + size_modifier)
    let totalOrderCost = 0;
    Object.entries(sizeQuantities).forEach(([psId, qty]: [string, any]) => {
      const sz = sizes.find(s => s.id === parseInt(psId, 10));
      if (sz && qty > 0) {
        totalOrderCost += (qty as number) * (total + Number(sz.price_modifier));
      }
    });

    return totalOrderCost;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
            title="Volver al Calendario"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Crear Pedido Transaccional</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Formulario complejo con validación en tiempo real y gobernanza en Base de Datos.</p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-100 transition"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      {/* SQL Warning Panel (DB Triggers Errors Interface) */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-900 dark:text-red-300 p-5 rounded-2xl flex gap-3.5 items-start"
        >
          <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-wide">
              Excepción Detectada en Triggers de Base de Datos
            </h4>
            <p className="text-xs font-semibold leading-relaxed text-red-700 dark:text-red-400">
              {error.includes('|') ? error.split('|')[1] : error}
            </p>
            <div className="text-[10px] text-red-500 dark:text-red-400 font-mono mt-1 pt-1.5 border-t border-red-200/50 dark:border-red-800/50">
              Código Error SQLSTATE: {error.includes('|') ? error.split('|')[0] : 'ERR_TRIGGER_VIOLATION'}
            </div>
          </div>
        </motion.div>
      )}

      {formError && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-4 rounded-xl flex gap-2 items-center text-xs font-semibold">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Column 1: Client & General details */}
          <div className="md:col-span-1 space-y-5">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-xs">

              {/* Client select */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Cliente Solicitante</label>

                {/* Search input */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar cliente por nombre..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs font-medium placeholder-slate-400"
                  />
                  {clientSearch && (
                    <button
                      type="button"
                      onClick={() => setClientSearch('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[10px] font-bold"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="block w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium"
                >
                  <option value="">
                    {filteredClients.length === 0 ? 'Sin resultados' : 'Seleccione un cliente...'}
                  </option>
                  {filteredClients.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                  ))}
                </select>

                {/* Mobile and quick-select touch suggestions */}
                {clientSearch && filteredClients.length > 0 && (
                  <div className="bg-indigo-50/40 dark:bg-indigo-900/20 p-2 rounded-xl space-y-1.5 border border-indigo-100/50 dark:border-indigo-800/30">
                    <span className="text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider block">Sugerencias (toca para seleccionar):</span>
                    <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                      {filteredClients.slice(0, 3).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(c.id.toString());
                            setClientSearch('');
                          }}
                          className={`w-full text-left text-[11px] p-1.5 rounded-lg border transition flex justify-between items-center ${
                            selectedClientId === c.id.toString()
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate font-semibold">{c.full_name}</span>
                          <span className="text-[9px] font-mono opacity-80 shrink-0 ml-1">{c.email}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1 leading-normal">
                  * El backend creará un snapshot inmutable para el <code className="font-mono bg-slate-100 dark:bg-slate-800 p-0.5 rounded">client_name</code>.
                </span>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">Prioridad del Pedido</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['low', 'medium', 'high', 'urgent'] as const).map(p => {
                    const days = getDaysForPriority(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePriorityChange(p)}
                        className={`px-2 py-1.5 text-[10px] font-bold rounded-xl border transition uppercase flex flex-col items-center justify-center gap-0.5 ${
                          priority === p
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : p === 'high' ? 'Alta' : 'Urgente'}</span>
                        <span className={`text-[8px] font-medium font-sans ${priority === p ? 'text-indigo-200' : 'text-slate-400'}`}>
                          +{days} {days === 1 ? 'día' : 'días'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1 dark:text-slate-300">
                    <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                    Fecha Inicio en Taller
                  </label>
                  <input
                    type="date"
                    required
                    value={productionStartDate}
                    onChange={(e) => handleProductionStartDateChange(e.target.value)}
                    className="block w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 text-xs font-mono dark:text-slate-100 dark:border-slate-700 dark:bg-slate-800/50"
                  />
                  <span className="text-[9px] text-indigo-600 block mt-1 font-medium dark:text-indigo-400">
                    * Valida capacidad diaria de taller.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1 dark:text-slate-300">
                      <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                      Fecha de Entrega Estimada
                    </label>
                    {estimatedDeliveryDate === calculateSuggestedDate(productionStartDate, priority) ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 dark:text-emerald-300 dark:bg-emerald-900/40">
                        ✓ Sugerida
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 dark:text-amber-300 dark:bg-amber-900/40">
                        ✏ Manual
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    className="block w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 text-xs font-mono dark:text-slate-100 dark:border-slate-700 dark:bg-slate-800/50"
                  />

                  {/* Interactive Date Suggestion Panel based on Priority */}
                  <div className="bg-slate-50/85 p-3 rounded-xl border border-slate-200/70 mt-2 space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider dark:text-slate-400">
                      Sugerencias por Prioridad:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['urgent', 'high', 'medium', 'low'] as const).map((p) => {
                        const dateSug = calculateSuggestedDate(productionStartDate, p);
                        const formattedDateSug = dateSug ? formatDateSpanish(dateSug) : '';
                        const days = getDaysForPriority(p);
                        const isCurrentPriority = priority === p;
                        const isCurrentDate = estimatedDeliveryDate === dateSug;

                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPriority(p);
                              setEstimatedDeliveryDate(dateSug);
                            }}
                            className={`text-left p-2 rounded-xl border transition flex flex-col gap-0.5 ${
                              isCurrentPriority && isCurrentDate
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold'
                                : isCurrentPriority
                                ? 'bg-indigo-50 text-indigo-900 border-indigo-200 font-semibold'
                                : 'bg-white hover:bg-slate-100/70 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="text-[10px] font-bold capitalize flex items-center justify-between">
                              <span>{p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : p === 'high' ? 'Alta' : 'Urgente'}</span>
                              <span className={isCurrentPriority && isCurrentDate ? 'text-indigo-200' : 'text-indigo-600 font-medium'}>
                                +{days}d
                              </span>
                            </span>
                            <span className={`text-[9px] font-mono font-medium ${isCurrentPriority && isCurrentDate ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {formattedDateSug}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {estimatedDeliveryDate !== calculateSuggestedDate(productionStartDate, priority) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (productionStartDate) {
                            setEstimatedDeliveryDate(calculateSuggestedDate(productionStartDate, priority));
                          }
                        }}
                        className="w-full text-center text-[9px] text-indigo-600 hover:text-indigo-800 font-bold underline transition block pt-1 dark:text-indigo-400"
                      >
                        Reestablecer a sugerida por prioridad ({formatDateSpanish(calculateSuggestedDate(productionStartDate, priority))})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">Notas de Pedido</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre empaque, bordados..."
                  className="block w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 text-xs h-20 dark:text-slate-100 dark:border-slate-700 dark:bg-slate-800/50"
                />
              </div>
            </div>

            {/* Live Capacity Indicators */}
            {selectedProductId && productionStartDate && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs dark:bg-slate-800 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1 dark:text-slate-200">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Capacidad de Taller Activa
                </h4>
                {capacityLoading ? (
                  <span className="text-xs text-slate-400 animate-pulse block">Validando calendario...</span>
                ) : capacityInfo.length > 0 ? (
                  <div className="space-y-2 text-[11px]">
                    {capacityInfo.map((stage: any, idx: number) => {
                      const totalQty = (Object.values(sizeQuantities) as number[]).reduce((sum, q) => sum + Number(q || 0), 0);
                      const remains = stage.max_capacity_points - stage.committed_points;
                      const hasCapacity = remains >= totalQty;
                      return (
                        <div key={idx} className="space-y-1 p-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                          <div className="flex justify-between font-semibold">
                            <span className="text-slate-700 uppercase dark:text-slate-300">Etapa: {stage.stage_id === 1 ? 'Corte' : stage.stage_id === 2 ? 'Costura' : stage.stage_id === 3 ? 'Bordado' : stage.stage_id === 4 ? 'Planchado' : 'Empaque'}</span>
                            <span className={hasCapacity ? 'text-emerald-700' : 'text-red-700'}>
                              {remains} pts disp
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden dark:bg-slate-700">
                            <div
                              className={`h-full transition-all duration-300 ${hasCapacity ? 'bg-indigo-600' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(100, (stage.committed_points / stage.max_capacity_points) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400">
                            <span>Comprometido: {stage.committed_points} pts</span>
                            <span>Máx: {stage.max_capacity_points}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-red-500 block font-medium dark:text-red-400">¡Sin definir capacidad para esta fecha!</span>
                )}
              </div>
            )}
          </div>

          {/* Column 2: Product & Custom Details */}
          <div className="md:col-span-2 space-y-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6 shadow-xs dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
                Especificaciones de Producción
              </h3>

              {/* Product selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Producto del Catálogo</label>

                {/* Search input */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar producto por nombre..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[10px] font-bold"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="block w-full py-2.5 px-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                >
                  <option value="">
                    {filteredProducts.length === 0 ? 'Sin resultados' : 'Seleccione un producto para configurar...'}
                  </option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - Base: ${parseFloat(p.base_price as any).toFixed(2)}</option>
                  ))}
                </select>

                {/* Mobile and quick-select touch suggestions */}
                {productSearch && filteredProducts.length > 0 && (
                  <div className="bg-indigo-50/40 dark:bg-indigo-900/20 p-2 rounded-xl space-y-1.5 border border-indigo-100/50 dark:border-indigo-800/30">
                    <span className="text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider block">Sugerencias (toca para seleccionar):</span>
                    <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                      {filteredProducts.slice(0, 3).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductId(p.id.toString());
                            setProductSearch('');
                          }}
                          className={`w-full text-left text-[11px] p-1.5 rounded-lg border transition flex justify-between items-center ${
                            selectedProductId === p.id.toString()
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate font-semibold">{p.name}</span>
                          <span className="text-[9px] font-mono opacity-80 shrink-0 ml-1">Base: ${parseFloat(p.base_price as any).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedProductId && (
                <div className="space-y-6 border-t border-slate-100 pt-5">
                  {/* Dynamic Sizes Matrix */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 dark:text-slate-400">
                      Matriz de Tallas (Cantidades)
                    </h4>

                    <div className="space-y-4">
                      {/* Tallas de Hombre */}
                      {displayedSizes.filter(sz => sz.size_gender === 'hombre' || sz.size_code?.startsWith('H-')).length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1.5 bg-indigo-50/50 dark:bg-indigo-900/20 py-1 px-2.5 rounded-lg w-max">
                            👔 Colección de Caballeros
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {displayedSizes.filter(sz => sz.size_gender === 'hombre' || sz.size_code?.startsWith('H-')).map((sz) => (
                              <div key={sz.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 block uppercase">{sz.size_code || 'Talla'}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">{sz.size_name || 'Nombre'}</span>
                                </div>
                                <div className="mt-2.5">
                                  <input
                                    type="number"
                                    min="0"
                                    value={sizeQuantities[sz.id] || ''}
                                    onChange={(e) => handleQtyChange(sz.id, parseInt(e.target.value, 10) || 0)}
                                    placeholder="0"
                                    className="block w-full py-1 px-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                  />
                                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 block text-center mt-1 font-medium">
                                    {Number(sz.price_modifier) > 0 ? `+$${parseFloat(sz.price_modifier as any).toFixed(2)}` : 'Sin cargo'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tallas de Mujer */}
                      {displayedSizes.filter(sz => sz.size_gender === 'mujer' || sz.size_code?.startsWith('M-')).length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider block mb-1.5 bg-pink-50/50 dark:bg-pink-900/20 py-1 px-2.5 rounded-lg w-max">
                            👚 Colección de Damas
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {displayedSizes.filter(sz => sz.size_gender === 'mujer' || sz.size_code?.startsWith('M-')).map((sz) => (
                              <div key={sz.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 block uppercase">{sz.size_code || 'Talla'}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">{sz.size_name || 'Nombre'}</span>
                                </div>
                                <div className="mt-2.5">
                                  <input
                                    type="number"
                                    min="0"
                                    value={sizeQuantities[sz.id] || ''}
                                    onChange={(e) => handleQtyChange(sz.id, parseInt(e.target.value, 10) || 0)}
                                    placeholder="0"
                                    className="block w-full py-1 px-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                  />
                                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 block text-center mt-1 font-medium">
                                    {Number(sz.price_modifier) > 0 ? `+$${parseFloat(sz.price_modifier as any).toFixed(2)}` : 'Sin cargo'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Unisex/Other Sizes */}
                      {displayedSizes.filter(sz =>
                        sz.size_gender !== 'hombre' &&
                        sz.size_gender !== 'mujer' &&
                        !sz.size_code?.startsWith('H-') &&
                        !sz.size_code?.startsWith('M-')
                      ).length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5 bg-slate-100 dark:bg-slate-800 py-1 px-2.5 rounded-lg w-max">
                            🌐 Colección Estándar / Unisex
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {displayedSizes.filter(sz =>
                              sz.size_gender !== 'hombre' &&
                              sz.size_gender !== 'mujer' &&
                              !sz.size_code?.startsWith('H-') &&
                              !sz.size_code?.startsWith('M-')
                            ).map((sz) => (
                              <div key={sz.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 block uppercase">{sz.size_code || 'Talla'}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">{sz.size_name || 'Nombre'}</span>
                                </div>
                                <div className="mt-2.5">
                                  <input
                                    type="number"
                                    min="0"
                                    value={sizeQuantities[sz.id] || ''}
                                    onChange={(e) => handleQtyChange(sz.id, parseInt(e.target.value, 10) || 0)}
                                    placeholder="0"
                                    className="block w-full py-1 px-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                  />
                                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 block text-center mt-1 font-medium">
                                    {Number(sz.price_modifier) > 0 ? `+$${parseFloat(sz.price_modifier as any).toFixed(2)}` : 'Sin cargo'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Attributes */}
                  {attributes.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                      <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Atributos y Personalizaciones
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {attributes.map((attr) => {
                          const selection = attributeSelections[attr.id] || { attribute_value_id: null, custom_value: null };
                          return (
                            <div key={attr.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5 bg-slate-50/50 dark:bg-slate-800/50">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                <span>{attr.attribute_name}</span>
                                {attr.is_required && <span className="text-[9px] font-bold text-red-500 dark:text-red-400">Obligatorio</span>}
                              </label>

                              {attr.requires_catalog_value ? (
<select
                                required={attr.is_required}
                                value={selection.attribute_value_id || ''}
                                onChange={(e) => handleAttrChange(attr.id, parseInt(e.target.value, 10) || null, null)}
                                className="block w-full py-1.5 px-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                              >
                                <option value="">Seleccione opción...</option>
                                {attr.values?.map((val) => (
                                  <option key={val.id} value={val.id}>
                                    {val.value} {Number(val.price_modifier) > 0 ? `(+$${parseFloat(val.price_modifier as any).toFixed(2)})` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  required={attr.is_required}
                                  value={selection.custom_value || ''}
                                  onChange={(e) => handleAttrChange(attr.id, null, e.target.value)}
                                  placeholder="Escriba especificación libre..."
                                  className="block w-full py-1.5 px-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                                />
                                {attr.attribute_name.toLowerCase().includes('bordado') && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block leading-none">
                                    {selection.custom_value && selection.custom_value.trim() !== ''
                                      ? '✓ Recargo por bordado personalizado aplicado: +$2.50'
                                      : '* El bordado personalizado tiene un recargo de +$2.50'}
                                  </span>
                                )}
                              </div>
                            )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Embroidery files attachment */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 dark:text-slate-400">
                      Subida de Logotipos y Bordados Adjuntos
                    </h4>

                    <div className="space-y-3">
                      {/* Local image upload */}
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          id="image-upload"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (!file.type.startsWith('image/')) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setAttachedFiles(prev => [...prev, { file_url: event.target.result as string, file_type: file.type }]);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                            e.target.value = ''; // Reset input to allow selecting the same file again
                          }}
                        />
                        <label
                          htmlFor="image-upload"
                          className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-xs font-bold hover:bg-indigo-700 cursor-pointer flex items-center justify-center w-full transition"
                        >
                          <UploadCloud className="h-4 w-4 mr-2" />
                          Adjuntar Imagen
                        </label>
                      </div>

                      {/* Presets quick select */}
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1 font-bold">Logos de Prueba Disponibles:</span>
                        <div className="grid grid-cols-3 gap-2">
                          {presetsLogos.map((logo, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => addAttachment(logo.url)}
                              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition text-[10px] flex items-center justify-between"
                            >
                              <span className="truncate pr-1 font-medium text-slate-600 dark:text-slate-400">{logo.name}</span>
                              <Plus className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Display attached images list */}
                      {attachedFiles.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          {attachedFiles.map((file, idx) => (
                            <div key={idx} className="relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50 group">
                              <img src={file.file_url} referrerPolicy="no-referrer" alt="Adjunto" className="h-20 w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeAttachment(idx)}
                                className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white p-1 rounded-lg transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estimation summary */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center">
                    <div className="flex items-center gap-2 mb-2 sm:mb-0">
                      <div className="bg-indigo-600 p-2 rounded-xl text-white">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold leading-none mb-1 text-slate-300">Presupuesto Estimado</h4>
                        <span className="text-[9px] text-indigo-300 block font-semibold uppercase leading-tight">Mantenido por Base de Datos</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-indigo-400 font-mono">${calculateEstimation().toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400 block">Excluye impuestos y recargo de capacidad</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Bar */}
            {selectedProductId && (
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md disabled:opacity-50 transition"
                >
                  {loading ? 'Creando pedido en transacción...' : 'Registrar Pedido con Éxito'}
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
