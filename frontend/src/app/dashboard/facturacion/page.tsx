'use client';
import { useState, useEffect } from 'react';

export default function FacturacionPage() {
  const [license, setLicense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchLicense();
  }, []);

  const fetchLicense = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/billing/license', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLicense(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/billing/checkout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Redirect to MercadoPago
        window.location.href = data.init_point;
      } else {
        alert('Error al generar pago');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Licencia y Facturación</h1>
        <p className="text-slate-500">Administrá el pago del servicio y descargá tus comprobantes legales (AFIP).</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-2xl">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Estado de la Suscripción</h2>
        
        {loading ? (
          <p>Cargando información...</p>
        ) : license?.status === 'ACTIVE' ? (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-4">
              <div className="text-3xl">✅</div>
              <div>
                <h3 className="font-bold text-emerald-800">Suscripción Activa</h3>
                <p className="text-sm text-emerald-600">
                  Válida hasta el {new Date(license.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-700 mb-3">Comprobante AFIP (Factura Electrónica)</h3>
              {license.afipInvoice ? (
                <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-200">
                  <div>
                    <p className="font-medium text-slate-800">Factura C - Pago Anual</p>
                    <p className="text-sm text-slate-500">{license.afipInvoice}</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                    Descargar PDF
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">La factura de AFIP está en proceso de generación (puede demorar unos minutos luego del pago).</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-4">
              <div className="text-3xl">⚠️</div>
              <div>
                <h3 className="font-bold text-amber-800">Sin Licencia Activa</h3>
                <p className="text-sm text-amber-600">
                  Debes abonar la suscripción para utilizar la plataforma.
                </p>
              </div>
            </div>
            
            <button 
              onClick={handlePay}
              disabled={paying}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
            >
              {paying ? 'Generando link de pago...' : 'Pagar Suscripción Anual ($15.000 ARS) con MercadoPago'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
