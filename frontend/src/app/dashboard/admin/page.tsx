'use client';
import { useState, useEffect } from 'react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings', 'pharmacies', 'users'

  // Settings State
  const [settings, setSettings] = useState({
    mpAccessToken: '',
    afipCuit: '',
    afipCert: '',
    afipKey: '',
    licensePrice: 10000,
    afipPtoVta: 1
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pharmacies State
  const [pharmacies, setPharmacies] = useState([]);
  const [newPharmacy, setNewPharmacy] = useState({ name: '', cuit: '', email: '', phone: '', address: '', city: '' });

  // Users State
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'USER', pharmacyId: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      if (activeTab === 'settings') {
        const res = await fetch('/api/settings', { headers });
        if (res.ok) {
          const data = await res.json();
          setSettings({
            mpAccessToken: data.mpAccessToken || '',
            afipCuit: data.afipCuit || '',
            afipCert: data.afipCert || '',
            afipKey: data.afipKey || '',
            licensePrice: data.licensePrice || 10000,
            afipPtoVta: data.afipPtoVta || 1
          });
        }
      } else if (activeTab === 'pharmacies') {
        const res = await fetch('/api/admin/pharmacies', { headers });
        if (res.ok) setPharmacies(await res.json());
      } else if (activeTab === 'users') {
        const res = await fetch('/api/admin/users', { headers });
        if (res.ok) setUsers(await res.json());
        
        // Also fetch pharmacies for the dropdown
        const resP = await fetch('/api/admin/pharmacies', { headers });
        if (resP.ok) setPharmacies(await resP.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) alert('Configuración guardada exitosamente.');
      else alert('Error al guardar configuración.');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/pharmacies', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newPharmacy)
      });
      if (res.ok) {
        alert('Farmacia creada');
        setNewPharmacy({ name: '', cuit: '', email: '', phone: '', address: '', city: '' });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al crear');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        alert('Usuario creado');
        setNewUser({ name: '', email: '', password: '', role: 'USER', pharmacyId: '' });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al crear');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Panel de Superusuario (SaaS)</h1>
        <p className="text-slate-500">Gestión global de configuraciones, farmacias y usuarios.</p>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-6 font-medium text-sm transition-colors ${activeTab === 'settings' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Configuraciones MP/AFIP
        </button>
        <button 
          onClick={() => setActiveTab('pharmacies')}
          className={`py-3 px-6 font-medium text-sm transition-colors ${activeTab === 'pharmacies' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Gestión de Farmacias
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`py-3 px-6 font-medium text-sm transition-colors ${activeTab === 'users' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Gestión de Usuarios
        </button>
      </div>

      {loading && <p>Cargando datos...</p>}

      {!loading && activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <h3 className="font-bold text-blue-900 mb-4 text-lg">Mercado Pago</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Production Access Token</label>
                    <input 
                      type="text" 
                      value={settings.mpAccessToken}
                      onChange={e => setSettings({...settings, mpAccessToken: e.target.value})}
                      placeholder="APP_USR-123456789..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio Mensual/Anual de Licencia ($)</label>
                    <input 
                      type="number" 
                      value={settings.licensePrice}
                      onChange={e => setSettings({...settings, licensePrice: Number(e.target.value)})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <h3 className="font-bold text-slate-900 mb-4 text-lg">AFIP Web Services</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">CUIT de Empresa</label>
                      <input 
                        type="text" 
                        value={settings.afipCuit}
                        onChange={e => setSettings({...settings, afipCuit: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pto de Venta</label>
                      <input 
                        type="number" 
                        value={settings.afipPtoVta}
                        onChange={e => setSettings({...settings, afipPtoVta: Number(e.target.value)})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Certificado (cert.pem)</label>
                    <textarea 
                      value={settings.afipCert}
                      onChange={e => setSettings({...settings, afipCert: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Llave Privada (key.pem)</label>
                    <textarea 
                      value={settings.afipKey}
                      onChange={e => setSettings({...settings, afipKey: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                    />
                  </div>
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
      )}

      {!loading && activeTab === 'pharmacies' && (
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 text-lg">Crear Nueva Farmacia</h3>
            <form onSubmit={handleCreatePharmacy} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Nombre" required className="px-4 py-2 border rounded-lg" value={newPharmacy.name} onChange={e => setNewPharmacy({...newPharmacy, name: e.target.value})} />
              <input type="text" placeholder="CUIT" required className="px-4 py-2 border rounded-lg" value={newPharmacy.cuit} onChange={e => setNewPharmacy({...newPharmacy, cuit: e.target.value})} />
              <input type="email" placeholder="Email" className="px-4 py-2 border rounded-lg" value={newPharmacy.email} onChange={e => setNewPharmacy({...newPharmacy, email: e.target.value})} />
              <input type="text" placeholder="Teléfono" className="px-4 py-2 border rounded-lg" value={newPharmacy.phone} onChange={e => setNewPharmacy({...newPharmacy, phone: e.target.value})} />
              <input type="text" placeholder="Dirección" className="px-4 py-2 border rounded-lg" value={newPharmacy.address} onChange={e => setNewPharmacy({...newPharmacy, address: e.target.value})} />
              <input type="text" placeholder="Ciudad" className="px-4 py-2 border rounded-lg" value={newPharmacy.city} onChange={e => setNewPharmacy({...newPharmacy, city: e.target.value})} />
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Registrar Farmacia</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CUIT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ciudad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuarios Registrados</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {pharmacies.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{p.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{p.cuit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{p.city}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{p.users?.length || 0} usuarios</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'users' && (
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 text-lg">Crear Nuevo Usuario</h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nombre Completo" required className="px-4 py-2 border rounded-lg" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <input type="email" placeholder="Email (Login)" required className="px-4 py-2 border rounded-lg" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              <input type="password" placeholder="Contraseña" required className="px-4 py-2 border rounded-lg" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              
              <select required className="px-4 py-2 border rounded-lg" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="USER">Usuario (Farmacéutico)</option>
                <option value="SUPERADMIN">Super Admin (Dueño SaaS)</option>
              </select>

              {newUser.role !== 'SUPERADMIN' && (
                <select required className="px-4 py-2 border rounded-lg md:col-span-2" value={newUser.pharmacyId} onChange={e => setNewUser({...newUser, pharmacyId: e.target.value})}>
                  <option value="">Seleccione una farmacia...</option>
                  {pharmacies.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.cuit})</option>
                  ))}
                </select>
              )}
              
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Registrar Usuario</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Farmacia Asignada</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {users.map((u: any) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{u.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{u.pharmacy?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
