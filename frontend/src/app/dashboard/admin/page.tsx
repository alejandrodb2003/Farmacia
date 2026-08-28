'use client';
import { useState, useEffect } from 'react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    mpAccessToken: '',
    afipCuit: '',
    afipCert: '',
    afipKey: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          mpAccessToken: data.mpAccessToken || '',
          afipCuit: data.afipCuit || '',
          afipCert: data.afipCert || '',
          afipKey: data.afipKey || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/settings', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Configuración guardada exitosamente. El sistema de facturación ya está actualizado.');
      } else {
        alert('Error al guardar configuración. Verificá tener permisos de Superadmin.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Cargando panel...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Panel de Superusuario (SaaS)</h1>
        <p className="text-slate-500">Configuración global de pasarelas de pago y facturación electrónica AFIP.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">1. Mercado Pago</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Production Access Token</label>
              <input 
                type="text" 
                value={settings.mpAccessToken}
                onChange={e => setSettings({...settings, mpAccessToken: e.target.value})}
                placeholder="APP_USR-123456789..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-2">Usado para generar los links de pago de las licencias anuales de las farmacias.</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
            <h3 className="font-bold text-slate-900 mb-4 text-lg">2. AFIP Web Services (Factura Electrónica)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CUIT de la Empresa (Dueño del SaaS)</label>
                <input 
                  type="text" 
                  value={settings.afipCuit}
                  onChange={e => setSettings({...settings, afipCuit: e.target.value})}
                  placeholder="20123456789"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Certificado (cert.pem)</label>
                <textarea 
                  value={settings.afipCert}
                  onChange={e => setSettings({...settings, afipCert: e.target.value})}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  rows={5}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Llave Privada (key.pem)</label>
                <textarea 
                  value={settings.afipKey}
                  onChange={e => setSettings({...settings, afipKey: e.target.value})}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  rows={5}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Credenciales'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
