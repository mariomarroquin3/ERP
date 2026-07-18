import React from 'react';
import { Invoice, Order } from '../types';
import { QRCodeCanvas } from 'qrcode.react';

interface InvoiceDocumentProps {
  invoice: Invoice;
  order: Order | null;
  onClose: () => void;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ invoice, order, onClose }) => {
  const formatCurrency = (value: number) => `$${Number(value).toFixed(4)}`;
  const formatCurrencyTotal = (value: number) => `$${Number(value).toFixed(2)}`;
  const formatDate = (value: string) => {
    if (!value) return '';
    // If already in "YYYY-MM-DD HH:MM:SS" format (local time from server), return as-is
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return value;
    // Otherwise parse and format in El Salvador timezone
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const fmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/El_Salvador',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    return fmt.format(d).replace(',', '');
  };

  const isCCF = invoice.invoice_type === 'credito_fiscal';
  const qrValue = invoice.codigo_generacion 
    ? `https://factura.gob.sv/?codGen=${invoice.codigo_generacion}` 
    : `https://factura.gob.sv/?num=${invoice.invoice_number}`;

  const buildInvoiceHtml = () => {
    const items = order?.items && order.items.length > 0 ? order.items : [];
    const rows = items.length > 0
      ? items.map((item, i) => {
          const attributes = item.attributes && item.attributes.length > 0
            ? item.attributes.map((attr) => attr.value_label).join(', ')
            : '';
          return `
            <tr>
              <td style="text-align:center">${i + 1}</td>
              <td style="text-align:center">${item.quantity}</td>
              <td style="text-align:center">Unidad</td>
              <td>
                <div>${escapeHtml(item.product_name || `Producto #${item.product_id}`)}</div>
                ${attributes ? `<div style="font-size:10px;color:#666">${escapeHtml(attributes)}</div>` : ''}
              </td>
              <td style="text-align:right">${formatCurrency(item.unit_price)}</td>
              <td style="text-align:right">$0.00</td>
              <td style="text-align:right">$0.00</td>
              <td style="text-align:right">$0.00</td>
              <td style="text-align:right">$0.00</td>
              <td style="text-align:right">${formatCurrencyTotal(item.subtotal)}</td>
            </tr>`;
        }).join('')
      : `<tr><td colspan="10" style="padding:16px;text-align:center;">Productos del pedido</td></tr>`;

    let qrDataUrl = '';
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      qrDataUrl = canvas.toDataURL();
    }

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Factura ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; font-size: 11px; }
            .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .logo-area { width: 40%; }
            .logo-text { font-size: 32px; font-weight: 900; font-style: italic; color: #003366; letter-spacing: -1px; }
            .title-area { width: 60%; text-align: center; font-weight: bold; font-size: 14px; }
            .ver { text-align: right; font-weight: normal; font-size: 12px; margin-top: -15px; }
            
            .info-grid { display: flex; margin-bottom: 15px; }
            .info-left { width: 40%; font-size: 10px; }
            .info-left div { margin-bottom: 3px; }
            .info-qr { width: 20%; text-align: center; }
            .info-qr img { width: 90px; height: 90px; }
            .info-right { width: 40%; text-align: right; font-size: 10px; }
            .info-right div { margin-bottom: 3px; }
            
            .boxes { display: flex; gap: 15px; margin-bottom: 15px; }
            .box { border: 1px solid #999; border-radius: 8px; padding: 10px; width: 50%; font-size: 10px; }
            .box-title { text-align: center; font-weight: bold; margin-bottom: 5px; font-size: 11px; }
            
            .box-grid { display: flex; flex-wrap: wrap; }
            .box-col { width: 50%; margin-bottom: 4px; }
            .box-col-full { width: 100%; margin-bottom: 4px; }
            .lbl { font-weight: bold; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 10px; border: 1px solid #ddd; }
            th { background-color: #e5e7eb; border: 1px solid #ddd; padding: 5px; text-align: center; font-weight: bold; }
            td { border-left: 1px solid #ddd; border-right: 1px solid #ddd; padding: 5px; vertical-align: top; }
            tr { border-bottom: 1px solid #f3f4f6; }
            
            .totals-container { display: flex; }
            .totals-left { width: 55%; border: 1px solid #ddd; border-top: 0; }
            .totals-table { width: 45%; border-collapse: collapse; }
            .totals-table td { border: 1px solid #ddd; padding: 4px 6px; text-align: right; font-size: 10px; }
            .totals-table td.lbl-td { text-align: right; width: 70%; }
            .totals-table td.val-td { width: 30%; }
          </style>
        </head>
        <body>
          <div class="header-top">
            <div class="logo-area">
              <div class="logo-text">LA MAQUILA</div>
            </div>
            <div class="title-area">
              <div>DOCUMENTO TRIBUTARIO ELECTRÓNICO</div>
              <div>${isCCF ? 'COMPROBANTE DE CRÉDITO FISCAL' : 'FACTURA DE CONSUMIDOR FINAL'}</div>
            </div>
            <div class="ver">Ver. 3</div>
          </div>

          <div class="info-grid">
            <div class="info-left">
              <div class="lbl">Código de generación:</div>
              <div>${invoice.codigo_generacion || '00000000-0000-0000-0000-000000000000'}</div>
              <div class="lbl" style="margin-top:5px">Número de control:</div>
              <div>${invoice.numero_control || 'DTE-03-00000000-000000000000000'}</div>
              <div class="lbl" style="margin-top:5px">Sello de recepción:</div>
              <div>${invoice.sello_recepcion || '00000000000000000000000000000000'}</div>
            </div>
            <div class="info-qr">
              ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : '<div style="width:90px;height:90px;border:1px solid #ccc;margin:0 auto;">QR</div>'}
            </div>
            <div class="info-right">
              <div class="lbl">Modelo de facturación:</div>
              <div>Modelo Facturación previo</div>
              <div class="lbl" style="margin-top:5px">Tipo de transmisión:</div>
              <div>Transmisión normal</div>
              <div class="lbl" style="margin-top:5px">Fecha y hora de generación:</div>
              <div>${formatDate(invoice.fecha_hora_generacion || invoice.created_at)}</div>
            </div>
          </div>

          <div class="boxes">
            <!-- EMISOR -->
            <div class="box">
              <div class="box-title">EMISOR</div>
              <div class="box-col-full lbl">LA MAQUILA, S.A. DE C.V.</div>
              <div class="box-grid">
                <div class="box-col"><span class="lbl">NIT:</span><br/>0614-010101-101-1</div>
                <div class="box-col"><span class="lbl">NRC:</span><br/>123456-7</div>
              </div>
              <div class="box-col-full"><span class="lbl">Actividad Económica:</span><br/>FABRICACIÓN DE PRENDAS DE VESTIR</div>
              <div class="box-col-full"><span class="lbl">Dirección:</span><br/>ZONA INDUSTRIAL, SAN SALVADOR, EL SALVADOR</div>
              <div class="box-grid">
                <div class="box-col"><span class="lbl">Teléfono:</span><br/>2222-0000</div>
                <div class="box-col"><span class="lbl">Correo:</span><br/>facturacion@lamaquila.com</div>
              </div>
              <div class="box-col-full"><span class="lbl">Tipo de establecimiento:</span><br/>Casa Matriz</div>
            </div>
            <!-- RECEPTOR -->
            <div class="box">
              <div class="box-title">RECEPTOR</div>
              <div class="box-col-full lbl">${escapeHtml(invoice.receptor_nombre || order?.client_name || 'CLIENTE MOSTRADOR')}</div>
              <div class="box-grid">
                <div class="box-col"><span class="lbl">NIT:</span><br/>${escapeHtml(invoice.receptor_nit || '')}</div>
                <div class="box-col"><span class="lbl">NRC:</span><br/>${escapeHtml(invoice.receptor_nrc || '')}</div>
              </div>
              <div class="box-col-full"><span class="lbl">Actividad económica:</span><br/>${escapeHtml(invoice.receptor_actividad_economica || '')}</div>
              <div class="box-col-full"><span class="lbl">Dirección:</span><br/>${escapeHtml(invoice.receptor_direccion || '')}</div>
              <div class="box-grid">
                <div class="box-col"><span class="lbl">Teléfono:</span><br/>${escapeHtml(invoice.receptor_telefono || '')}</div>
                <div class="box-col"><span class="lbl">Correo:</span><br/>${escapeHtml(invoice.receptor_correo || '')}</div>
              </div>
              <div class="box-col-full"><span class="lbl">Nombre comercial:</span><br/>${escapeHtml(invoice.receptor_nombre_comercial || '')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Descripción</th>
                <th>Precio<br/>Unitario</th>
                <th>Descuento<br/>por ítem</th>
                <th>Otros montos<br/>no afectos</th>
                <th>Ventas<br/>no sujetas</th>
                <th>Ventas<br/>exentas</th>
                <th>Ventas<br/>gravadas</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan="7" style="border:0"></td>
                <td colspan="2" style="text-align:right;border:1px solid #ddd;font-weight:bold;">Suma de ventas:</td>
                <td style="text-align:right;border:1px solid #ddd;">${formatCurrencyTotal(Number(invoice.subtotal))}</td>
              </tr>
            </tfoot>
          </table>

          <div class="totals-container">
            <div class="totals-left"></div>
            <table class="totals-table">
              <tr><td class="lbl-td">Suma total de operaciones:</td><td class="val-td">${formatCurrencyTotal(Number(invoice.subtotal))}</td></tr>
              <tr><td class="lbl-td">Monto global Desc., Rebajas y otros a ventas no sujetas:</td><td class="val-td">$0.00</td></tr>
              <tr><td class="lbl-td">Monto global Desc., Rebajas y otros a ventas exentas:</td><td class="val-td">$0.00</td></tr>
              <tr><td class="lbl-td">Monto global Desc., Rebajas y otros a ventas gravadas:</td><td class="val-td">${formatCurrencyTotal(Number(invoice.discount))}</td></tr>
              <tr><td class="lbl-td">Sub-Total:</td><td class="val-td">${formatCurrencyTotal(Number(invoice.subtotal) - Number(invoice.discount))}</td></tr>
              <tr><td class="lbl-td">Impuesto al valor agregado (IVA 13%):</td><td class="val-td">${formatCurrencyTotal(Number(invoice.tax))}</td></tr>
              <tr><td class="lbl-td">IVA retenido:</td><td class="val-td">${formatCurrencyTotal(Number(invoice.iva_retenido || 0))}</td></tr>
              <tr><td class="lbl-td">IVA percibido:</td><td class="val-td">${formatCurrencyTotal(Number(invoice.iva_percibido || 0))}</td></tr>
              <tr><td class="lbl-td">Retención renta:</td><td class="val-td">${formatCurrencyTotal(Number(invoice.retencion_renta || 0))}</td></tr>
              <tr><td class="lbl-td">Monto total de la operación:</td><td class="val-td">${formatCurrencyTotal(Number(invoice.total))}</td></tr>
              <tr><td class="lbl-td">Total otros montos no afectos:</td><td class="val-td">$0.00</td></tr>
            </table>
          </div>
        </body>
      </html>`;
  };

  const handleExport = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(buildInvoiceHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex justify-center items-start overflow-y-auto p-4">
      <div className="bg-white max-w-[1000px] w-full my-4 rounded-xl shadow-2xl overflow-hidden relative border border-slate-200">
        <div className="flex justify-end items-center bg-slate-50 p-4 border-b border-slate-200 print:hidden sticky top-0 z-10">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold shadow-sm transition-all text-sm"
            >
              Descargar / Imprimir PDF
            </button>
            <button
              onClick={onClose}
              className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-5 py-2 rounded-lg font-bold shadow-sm transition-all text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* FACTURA UI MOCKUP */}
        <div className="p-10 bg-white text-black font-sans text-[11px] leading-tight">
          
          <div className="flex justify-between items-start mb-6">
            <div className="w-2/5">
              <h1 className="text-4xl font-black italic text-blue-900 tracking-tighter">LA MAQUILA</h1>
            </div>
            <div className="w-3/5 text-center font-bold text-[14px] uppercase">
              <div>DOCUMENTO TRIBUTARIO ELECTRÓNICO</div>
              <div>{isCCF ? 'COMPROBANTE DE CRÉDITO FISCAL' : 'FACTURA DE CONSUMIDOR FINAL'}</div>
            </div>
            <div className="text-right text-[12px] mt-0 w-16">Ver. 3</div>
          </div>

          <div className="flex mb-4">
            <div className="w-2/5 pr-4">
              <div className="font-bold text-[10px]">Código de generación:</div>
              <div className="mb-1 text-[10px] break-all">{invoice.codigo_generacion || '00000000-0000-0000-0000-000000000000'}</div>
              <div className="font-bold text-[10px]">Número de control:</div>
              <div className="mb-1 text-[10px] break-all">{invoice.numero_control || 'DTE-03-00000000-000000000000000'}</div>
              <div className="font-bold text-[10px]">Sello de recepción:</div>
              <div className="text-[10px] break-all">{invoice.sello_recepcion || '00000000000000000000000000000000'}</div>
            </div>
            <div className="w-1/5 flex justify-center items-start">
              <QRCodeCanvas 
                id="qr-code-canvas"
                value={qrValue} 
                size={90} 
                level="M"
              />
            </div>
            <div className="w-2/5 pl-4 text-right">
              <div className="font-bold text-[10px]">Modelo de facturación:</div>
              <div className="mb-1 text-[10px]">Modelo Facturación previo</div>
              <div className="font-bold text-[10px]">Tipo de transmisión:</div>
              <div className="mb-1 text-[10px]">Transmisión normal</div>
              <div className="font-bold text-[10px]">Fecha y hora de generación:</div>
              <div className="text-[10px]">{formatDate(invoice.fecha_hora_generacion || invoice.created_at)}</div>
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            {/* EMISOR */}
            <div className="w-1/2 border border-gray-400 rounded-lg p-3 text-[10px] leading-snug">
              <div className="text-center font-bold text-[11px] mb-2">EMISOR</div>
              <div className="font-bold mb-1">LA MAQUILA, S.A. DE C.V.</div>
              <div className="flex mb-1">
                <div className="w-1/2"><span className="font-bold">NIT:</span><br/>0614-010101-101-1</div>
                <div className="w-1/2"><span className="font-bold">NRC:</span><br/>123456-7</div>
              </div>
              <div className="mb-1"><span className="font-bold">Actividad Económica:</span><br/>FABRICACIÓN DE PRENDAS DE VESTIR</div>
              <div className="mb-1"><span className="font-bold">Dirección:</span><br/>ZONA INDUSTRIAL, SAN SALVADOR, EL SALVADOR</div>
              <div className="flex mb-1">
                <div className="w-1/2"><span className="font-bold">Teléfono:</span><br/>2222-0000</div>
                <div className="w-1/2"><span className="font-bold">Correo:</span><br/>facturacion@lamaquila.com</div>
              </div>
              <div><span className="font-bold">Tipo de establecimiento:</span><br/>Casa Matriz</div>
            </div>

            {/* RECEPTOR */}
            <div className="w-1/2 border border-gray-400 rounded-lg p-3 text-[10px] leading-snug">
              <div className="text-center font-bold text-[11px] mb-2">RECEPTOR</div>
              <div className="font-bold mb-1 uppercase">{invoice.receptor_nombre || order?.client_name || 'CLIENTE MOSTRADOR'}</div>
              <div className="flex mb-1">
                <div className="w-1/2"><span className="font-bold">NIT:</span><br/>{invoice.receptor_nit || ''}</div>
                <div className="w-1/2"><span className="font-bold">NRC:</span><br/>{invoice.receptor_nrc || ''}</div>
              </div>
              <div className="mb-1"><span className="font-bold">Actividad económica:</span><br/>{invoice.receptor_actividad_economica || ''}</div>
              <div className="mb-1"><span className="font-bold">Dirección:</span><br/>{invoice.receptor_direccion || ''}</div>
              <div className="flex mb-1">
                <div className="w-1/2"><span className="font-bold">Teléfono:</span><br/>{invoice.receptor_telefono || ''}</div>
                <div className="w-1/2"><span className="font-bold">Correo:</span><br/>{invoice.receptor_correo || ''}</div>
              </div>
              <div><span className="font-bold">Nombre comercial:</span><br/>{invoice.receptor_nombre_comercial || ''}</div>
            </div>
          </div>

          <div className="border border-gray-300 rounded overflow-hidden">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead className="bg-gray-200 border-b border-gray-300">
                <tr>
                  <th className="py-1 px-1 text-center border-r border-gray-300 font-bold">No.</th>
                  <th className="py-1 px-1 text-center border-r border-gray-300 font-bold">Cantidad</th>
                  <th className="py-1 px-1 text-center border-r border-gray-300 font-bold">Unidad</th>
                  <th className="py-1 px-2 border-r border-gray-300 font-bold">Descripción</th>
                  <th className="py-1 px-1 text-center border-r border-gray-300 font-bold leading-tight">Precio<br/>Unitario</th>
                  <th className="py-1 px-1 text-center border-r border-gray-300 font-bold leading-tight">Descuento<br/>por ítem</th>
                  <th className="py-1 px-1 text-center border-r border-gray-300 font-bold leading-tight">Otros montos<br/>no afectos</th>
                  <th className="py-1 px-1 text-center border-r border-gray-300 font-bold leading-tight">Ventas<br/>no sujetas</th>
                  <th className="py-1 px-1 text-center border-r border-gray-300 font-bold leading-tight">Ventas<br/>exentas</th>
                  <th className="py-1 px-1 text-center font-bold leading-tight">Ventas<br/>gravadas</th>
                </tr>
              </thead>
              <tbody>
                {order?.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 last:border-0">
                      <td className="py-1 px-1 text-center border-r border-gray-200">{index + 1}</td>
                      <td className="py-1 px-1 text-center border-r border-gray-200">{item.quantity}</td>
                      <td className="py-1 px-1 text-center border-r border-gray-200">Unidad</td>
                      <td className="py-1 px-2 border-r border-gray-200">
                        <div className="font-semibold uppercase">{item.product_name || `Producto #${item.product_id}`}</div>
                        {item.attributes && item.attributes.length > 0 && (
                          <div className="text-[9px] text-gray-500 mt-0.5">{item.attributes.map((attr) => attr.value_label).join(', ')}</div>
                        )}
                      </td>
                      <td className="py-1 px-1 text-right border-r border-gray-200">{formatCurrency(item.unit_price)}</td>
                      <td className="py-1 px-1 text-right border-r border-gray-200">$0.00</td>
                      <td className="py-1 px-1 text-right border-r border-gray-200">$0.00</td>
                      <td className="py-1 px-1 text-right border-r border-gray-200">$0.00</td>
                      <td className="py-1 px-1 text-right border-r border-gray-200">$0.00</td>
                      <td className="py-1 px-1 text-right font-bold">{formatCurrencyTotal(item.subtotal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-gray-200">
                    <td colSpan={10} className="py-4 text-center text-gray-500 font-semibold">Productos del pedido</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7} className="border-r border-gray-200 border-t border-gray-200"></td>
                  <td colSpan={2} className="py-1 px-1 text-right border-r border-t border-gray-200 font-bold">Suma de ventas:</td>
                  <td className="py-1 px-1 text-right border-t border-gray-200 font-bold">{formatCurrencyTotal(Number(invoice.subtotal))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex mt-0 text-[10px]">
            <div className="w-[55%] flex flex-col items-center justify-end pb-8 border border-gray-300 border-t-0 border-r-0">
            </div>
            <div className="w-[45%]">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold w-[70%]">Suma total de operaciones:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right w-[30%]">{formatCurrencyTotal(Number(invoice.subtotal))}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold text-[9px]">Monto global Desc., Rebajas y otros a ventas no sujetas:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">$0.00</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold text-[9px]">Monto global Desc., Rebajas y otros a ventas exentas:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">$0.00</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold text-[9px]">Monto global Desc., Rebajas y otros a ventas gravadas:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrencyTotal(Number(invoice.discount))}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold">Sub-Total:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrencyTotal(Number(invoice.subtotal) - Number(invoice.discount))}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold">Impuesto al valor agregado (IVA 13%):</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrencyTotal(Number(invoice.tax))}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold">IVA retenido:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrencyTotal(Number(invoice.iva_retenido || 0))}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold">IVA percibido:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrencyTotal(Number(invoice.iva_percibido || 0))}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold">Retención renta:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrencyTotal(Number(invoice.retencion_renta || 0))}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold bg-gray-100">Monto total de la operación:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold bg-gray-100">{formatCurrencyTotal(Number(invoice.total))}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold">Total otros montos no afectos:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">$0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
