'use client';
import { useState, useEffect } from 'react';

export default function RedVencimientosPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [pickupMethod, setPickupMethod] = useState<'CLIENTE' | 'CADETE'>('CLIENTE');
  const [personName, setPersonName] = useState('');
  const [reservationResult, setReservationResult] = useState<any>(null); // To show PIN & Ticket button

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

  const openReserveModal = (item: any) => {
    setSelectedItem(item);
    setPickupMethod('CLIENTE');
    setPersonName('');
    setReservationResult(null);
  };

  const submitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/network/reserve', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          inventoryItemId: selectedItem.id, 
          notes: 'Cliente/Cadete derivado por sistema logístico.',
          pickupMethod,
          personName
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReservationResult(data.reservation); // Contains the PIN
        fetchExpiringItems(search); // refresh list
      } else {
        alert('Error al reservar el medicamento.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const closeAndReset = () => {
    setSelectedItem(null);
    setReservationResult(null);
  };

  const printTicket = () => {
    if (!reservationResult?.id) return;
    const token = localStorage.getItem('token');
    // Open in new tab, but we need to pass token. Usually PDF endpoints can't easily be opened in new tab with Bearer tokens without a cookie.
    // For now, let's fetch it as blob and open.
    fetch(`/api/network/reservations/${reservationResult.id}/ticket`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    })
    .catch(err => console.error(err));
  };

  return (
    <div className="p-8 relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Red de Vencimientos</h1>
          <p className="text-slate-500">Medicamentos disponibles en otras farmacias de la red.</p>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input 
            type="text"
            placeholder="Buscar medicamento..."
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
                    onClick={() => openReserveModal(item)}
                    className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium px-4 py-2 rounded-lg transition"
                  >
                    Coordinar Retiro
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reservation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              {!reservationResult ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Coordinar Retiro Logístico</h2>
                  <p className="text-slate-500 text-sm mb-6">
                    Se reservará <span className="font-bold">{selectedItem.medication.name}</span> en <span className="font-bold">{selectedItem.pharmacy.name}</span>.
                  </p>
                  
                  <form onSubmit={submitReservation} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Método de Retiro</label>
                      <select 
                        value={pickupMethod}
                        onChange={(e) => setPickupMethod(e.target.value as any)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="CLIENTE">El Cliente va personalmente</option>
                        <option value="CADETE">Mandar un Cadete / Repartidor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de quien retira</label>
                      <input 
                        type="text" 
                        required
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button 
                        type="button" 
                        onClick={closeAndReset}
                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
                      >
                        Confirmar y Generar PIN
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                    ✓
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Reserva Confirmada!</h2>
                  <p className="text-slate-500 mb-6">El retiro ha sido coordinado con {selectedItem.pharmacy.name}.</p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                    <p className="text-sm font-bold text-slate-500 uppercase mb-2">PIN DE SEGURIDAD</p>
                    <p className="text-5xl font-black text-slate-800 tracking-widest">{reservationResult.securityPin}</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={printTicket}
                      className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 flex justify-center items-center gap-2"
                    >
                      🖨️ Imprimir Ticket PDF
                    </button>
                    <button 
                      onClick={closeAndReset}
                      className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
