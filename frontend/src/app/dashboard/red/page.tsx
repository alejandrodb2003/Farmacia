'use client';
import { useState, useEffect } from 'react';

export default function RedVencimientosPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchExpiringItems();
  }, []);

  const fetchExpiringItems = async (searchQuery = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = searchQuery 
        ? `/api/network/expiring?search=${encodeURIComponent(searchQuery)}` 
        : `/api/network/expiring`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpiringItems(search);
  };

  const handleReserve = async (itemId: string, medicationName: string, pharmacyName: string) => {
    if (!confirm(`¿Derivar cliente a ${pharmacyName} para buscar ${medicationName}? Esto enviará una alerta a la farmacia.`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/network/reserve', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inventoryItemId: itemId, notes: 'Cliente derivado por cercanía.' })
      });

      if (res.ok) {
        alert('¡Cliente derivado con éxito! Se ha notificado a la farmacia.');
        fetchExpiringItems(search); // refresh list
      } else {
        alert('Error al reservar el medicamento.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Red de Vencimientos</h1>
          <p className="text-slate-500">Medicamentos próximos a vencer (&lt; 6 meses) en otras farmacias de la red.</p>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input 
            type="text"
            placeholder="Buscar medicamento, droga o laboratorio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg w-full md:w-80 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition">
            Buscar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p>Cargando red...</p>
        ) : items.length === 0 ? (
          <p className="col-span-full text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-200">
            No hay medicamentos próximos a vencer en la red en este momento.
          </p>
        ) : (
          items.map((item: any) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{item.medication.name}</h3>
                  <p className="text-sm text-slate-500">{item.medication.presentation}</p>
                </div>
                <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded">
                  Vence: {new Date(item.expirationDate).toLocaleDateString()}
                </span>
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-100 text-sm">
                <p className="text-slate-600 mb-1"><span className="font-medium">Farmacia:</span> {item.pharmacy.name}</p>
                <p className="text-slate-600 mb-3"><span className="font-medium">Ubicación:</span> {item.pharmacy.address}, {item.pharmacy.city}</p>
                
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Stock: {item.quantity}</span>
                  <button 
                    onClick={() => handleReserve(item.id, item.medication.name, item.pharmacy.name)}
                    className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium px-4 py-2 rounded-lg transition"
                  >
                    Derivar Cliente
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
