'use client';
import { useState, useEffect, useRef } from 'react';

export default function InventarioPage() {
  const [inventory, setInventory] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal State for new medicine
  const [showModal, setShowModal] = useState(false);
  const [newMedData, setNewMedData] = useState({
    barcode: '',
    name: '',
    genericName: '',
    presentation: '',
    expirationDate: '',
    quantity: 1
  });

  useEffect(() => {
    fetchInventory();
    // Auto-focus barcode input
    inputRef.current?.focus();
  }, []);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    setError('');

    const currentBarcode = barcodeInput;
    setBarcodeInput(''); // clear immediately for next scan

    try {
      const token = localStorage.getItem('token');
      // 1. Check if medication exists in global catalog
      const medRes = await fetch(`http://localhost:3001/api/medications/barcode/${currentBarcode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (medRes.status === 404) {
        // Open modal to add new medication to catalog
        setNewMedData({ ...newMedData, barcode: currentBarcode, name: '', genericName: '', presentation: '', expirationDate: '', quantity: 1 });
        setShowModal(true);
        return;
      }

      if (!medRes.ok) throw new Error('Error al buscar medicamento');
      
      const medication = await medRes.json();
      
      // If found, normally we would ask for expiration date. 
      // For this MVP, if they just scan, let's assume an expiration date 1 year from now, or show a quick prompt.
      // Let's use a quick window.prompt for the expiration date to keep it simple, or default it.
      const expStr = window.prompt(`¿Fecha de vencimiento para ${medication.name}? (YYYY-MM-DD)`, new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]);
      if (!expStr) return; // User cancelled

      // Add to inventory
      const addRes = await fetch('http://localhost:3001/api/inventory', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medicationId: medication.id,
          batch: 'LOTE-DEFAULT',
          expirationDate: expStr,
          quantity: 1
        })
      });

      if (addRes.ok) {
        fetchInventory();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddNewMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // 1. Create in catalog
      const medRes = await fetch('http://localhost:3001/api/medications', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barcode: newMedData.barcode,
          name: newMedData.name,
          genericName: newMedData.genericName,
          presentation: newMedData.presentation,
        })
      });
      const medication = await medRes.json();

      // 2. Add to inventory
      await fetch('http://localhost:3001/api/inventory', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medicationId: medication.id,
          batch: 'LOTE-DEFAULT',
          expirationDate: newMedData.expirationDate,
          quantity: newMedData.quantity
        })
      });

      setShowModal(false);
      fetchInventory();
      inputRef.current?.focus();
    } catch (err) {
      console.error(err);
      alert('Error al agregar medicamento');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi Inventario</h1>
          <p className="text-slate-500">Gestioná tu stock. Usa tu lector USB para cargar rápido.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <form onSubmit={handleBarcodeSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Escanear Código de Barras (o escribir manualmente)</label>
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Escanea aquí..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
              autoFocus
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition h-full">
            Buscar / Cargar
          </button>
        </form>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Medicamento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cód. Barras</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vencimiento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cantidad</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">Cargando...</td></tr>
            ) : inventory.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">Inventario vacío. Escaneá un producto para comenzar.</td></tr>
            ) : (
              inventory.map((item: any) => {
                // Highlight if expires in < 6 months
                const expDate = new Date(item.expirationDate);
                const sixMonthsFromNow = new Date();
                sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
                const isExpiringSoon = expDate <= sixMonthsFromNow;

                return (
                  <tr key={item.id} className={isExpiringSoon ? 'bg-orange-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{item.medication.name}</div>
                      <div className="text-sm text-slate-500">{item.medication.presentation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.medication.barcode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={isExpiringSoon ? 'text-orange-600' : 'text-slate-600'}>
                        {expDate.toLocaleDateString()}
                      </span>
                      {isExpiringSoon && <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Próximo a vencer</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                      {item.quantity}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for New Medication (Colaborative DB) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-2">Medicamento No Encontrado</h2>
            <p className="text-slate-600 mb-6 text-sm">Este código de barras ({newMedData.barcode}) no existe en la base colaborativa. Cargá los datos por única vez y quedarán disponibles para toda la red.</p>
            
            <form onSubmit={handleAddNewMedication} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre Comercial</label>
                <input type="text" required value={newMedData.name} onChange={e => setNewMedData({...newMedData, name: e.target.value})} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Genérico (Droga)</label>
                  <input type="text" value={newMedData.genericName} onChange={e => setNewMedData({...newMedData, genericName: e.target.value})} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Presentación</label>
                  <input type="text" placeholder="Ej: Caja x30 comp." value={newMedData.presentation} onChange={e => setNewMedData({...newMedData, presentation: e.target.value})} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
              </div>
              <hr />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Fecha de Vto.</label>
                  <input type="date" required value={newMedData.expirationDate} onChange={e => setNewMedData({...newMedData, expirationDate: e.target.value})} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Cantidad</label>
                  <input type="number" min="1" required value={newMedData.quantity} onChange={e => setNewMedData({...newMedData, quantity: parseInt(e.target.value)})} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">Guardar e Ingresar Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
