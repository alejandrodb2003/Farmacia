'use client';
import { useState, useEffect } from 'react';

export default function EntregasPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Validation State
  const [validatingResId, setValidatingResId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    fetchIncoming();
  }, []);

  const fetchIncoming = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/network/reservations/incoming', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatingResId || !pinInput) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/network/reservations/${validatingResId}/complete`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin: pinInput })
      });

      if (res.ok) {
        alert('¡PIN correcto! Medicamento entregado con éxito.');
        setValidatingResId(null);
        setPinInput('');
        fetchIncoming(); // refresh
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'PIN incorrecto'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Mostrador de Entregas Logísticas</h1>
        <p className="text-slate-500">Valide con PIN los medicamentos que vienen a retirar cadetes o clientes derivados de otras farmacias.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p>Cargando reservas...</p>
        ) : reservations.length === 0 ? (
          <p className="col-span-full py-10 text-slate-500 bg-white rounded-xl border border-slate-200 p-8">
            No hay retiros pendientes.
          </p>
        ) : (
          reservations.map((res: any) => {
            const isPending = res.status === 'PENDING';
            const isFulfilled = res.status === 'FULFILLED';

            return (
              <div key={res.id} className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col ${isFulfilled ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${isPending ? 'bg-orange-100 text-orange-800' : isFulfilled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                    {res.status}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {new Date(res.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg text-slate-900 mb-1">{res.inventoryItem.medication.name}</h3>
                <p className="text-sm text-slate-600 mb-4">Lote: {res.inventoryItem.batch || 'N/A'}</p>

                <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm border border-slate-100">
                  <p className="mb-1 text-slate-500">Derivado por: <span className="font-bold text-slate-800">{res.requestingPharmacyName}</span></p>
                  <p className="mb-1 text-slate-500">Modalidad: <span className="font-bold text-slate-800">{res.pickupMethod}</span></p>
                  <p className="text-slate-500">Retira: <span className="font-bold text-slate-800">{res.personName || 'No especificado'}</span></p>
                </div>

                {isPending && (
                  <div className="mt-auto">
                    {validatingResId === res.id ? (
                      <form onSubmit={handleValidatePin} className="flex gap-2">
                        <input 
                          type="text" 
                          maxLength={4}
                          placeholder="PIN"
                          value={pinInput}
                          onChange={e => setPinInput(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded text-center text-lg font-bold tracking-widest focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded font-bold hover:bg-emerald-700">
                          ✔
                        </button>
                        <button type="button" onClick={() => setValidatingResId(null)} className="bg-slate-200 text-slate-600 px-3 py-2 rounded font-bold hover:bg-slate-300">
                          ✕
                        </button>
                      </form>
                    ) : (
                      <button 
                        onClick={() => setValidatingResId(res.id)}
                        className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold px-4 py-3 rounded-lg transition"
                      >
                        Validar PIN y Entregar
                      </button>
                    )}
                  </div>
                )}
                {isFulfilled && (
                  <div className="mt-auto text-center py-2 text-emerald-600 font-bold text-sm bg-emerald-100/50 rounded-lg">
                    ✓ Entregado
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
