'use client';
import { useState, useEffect, useRef } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiX } from 'react-icons/fi'; // Needs react-icons? Wait, let's just use text buttons or emojis to avoid installing new deps.

export default function InventarioPage() {
  const [inventory, setInventory] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewMedModal, setShowNewMedModal] = useState(false);

  const [currentMedication, setCurrentMedication] = useState<any>(null); // For Add Stock
  
  // Data for adding stock of existing medication
  const [addStockData, setAddStockData] = useState({
    expirationDate: '',
    quantity: 1,
    batch: 'DEFAULT'
  });

  // Data for editing existing inventory item
  const [editItemData, setEditItemData] = useState<any>(null);

  // Data for creating totally new medication in catalog
  const [newMedData, setNewMedData] = useState({
    barcode: '',
    name: '',
    genericName: '',
    presentation: '',
    expirationDate: '',
    quantity: 1,
    batch: 'DEFAULT'
  });

  useEffect(() => {
    fetchInventory();
    inputRef.current?.focus();
  }, []);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/inventory', {
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
    setBarcodeInput(''); // clear for next scan

    try {
      const token = localStorage.getItem('token');
      const medRes = await fetch(`/api/medications/barcode/${currentBarcode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (medRes.status === 404) {
        setNewMedData({ ...newMedData, barcode: currentBarcode, name: '', genericName: '', presentation: '', expirationDate: '', quantity: 1 });
        setShowNewMedModal(true);
        return;
      }

      if (!medRes.ok) throw new Error('Error al buscar medicamento');
      
      const medication = await medRes.json();
      setCurrentMedication(medication);
      
      // Default to 1 year from now for expiration
      const defaultExp = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
      setAddStockData({ expirationDate: defaultExp, quantity: 1, batch: 'LOTE-1' });
      setShowAddModal(true);

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const addRes = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medicationId: currentMedication.id,
          batch: addStockData.batch,
          expirationDate: addStockData.expirationDate,
          quantity: addStockData.quantity
        })
      });

      if (addRes.ok) {
        setShowAddModal(false);
        fetchInventory();
        inputRef.current?.focus();
      } else {
        alert('Error al agregar stock');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNewMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const medRes = await fetch('/api/medications', {
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

      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medicationId: medication.id,
          batch: newMedData.batch,
          expirationDate: newMedData.expirationDate,
          quantity: newMedData.quantity
        })
      });

      setShowNewMedModal(false);
      fetchInventory();
      inputRef.current?.focus();
    } catch (err) {
      console.error(err);
      alert('Error al agregar medicamento');
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/inventory/${editItemData.id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: editItemData.quantity })
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este lote del inventario?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (item: any) => {
    setEditItemData({ ...item });
    setShowEditModal(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi Inventario</h1>
          <p className="text-slate-500">Gestión de stock, lotes y vencimientos.</p>
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
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition h-full">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lote / Vencimiento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">Cargando...</td></tr>
            ) : inventory.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">Inventario vacío. Escaneá un producto para comenzar.</td></tr>
            ) : (
              inventory.map((item: any) => {
                const expDate = new Date(item.expirationDate);
                const isExpiringSoon = expDate <= new Date(new Date().setMonth(new Date().getMonth() + 6));

                return (
                  <tr key={item.id} className={isExpiringSoon ? 'bg-orange-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{item.medication.name}</div>
                      <div className="text-sm text-slate-500">{item.medication.presentation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.medication.barcode}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">Lote: {item.batch || 'N/A'}</div>
                      <div className={`text-sm font-medium ${isExpiringSoon ? 'text-orange-600' : 'text-slate-600'}`}>
                        Vto: {expDate.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                      {item.quantity} und.
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-900 transition">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 transition">
                        Borrar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- MODALS ---------------- */}

      {/* Modal 1: Add Stock for Existing Medication */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-1">Ingresar Stock</h2>
            <p className="text-slate-600 mb-6 text-sm">{currentMedication?.name} ({currentMedication?.presentation})</p>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Lote</label>
                <input type="text" value={addStockData.batch} onChange={e => setAddStockData({...addStockData, batch: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Fecha de Vto.</label>
                <input type="date" required value={addStockData.expirationDate} onChange={e => setAddStockData({...addStockData, expirationDate: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Cantidad</label>
                <input type="number" min="1" required value={addStockData.quantity} onChange={e => setAddStockData({...addStockData, quantity: parseInt(e.target.value)})} className="mt-1 w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Quantity */}
      {showEditModal && editItemData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold mb-1">Editar Stock</h2>
            <p className="text-slate-600 mb-6 text-sm">{editItemData.medication?.name}</p>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nueva Cantidad</label>
                <input type="number" min="0" required value={editItemData.quantity} onChange={e => setEditItemData({...editItemData, quantity: parseInt(e.target.value)})} className="mt-1 w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Actualizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: New Medication (Colaborative DB) */}
      {showNewMedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-2">Medicamento No Encontrado</h2>
            <p className="text-slate-600 mb-6 text-sm">Este código ({newMedData.barcode}) no existe en la base colaborativa. Cargalo y quedará disponible para toda la red.</p>
            
            <form onSubmit={handleAddNewMedication} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre Comercial</label>
                <input type="text" required value={newMedData.name} onChange={e => setNewMedData({...newMedData, name: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Genérico (Droga)</label>
                  <input type="text" value={newMedData.genericName} onChange={e => setNewMedData({...newMedData, genericName: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Presentación</label>
                  <input type="text" placeholder="Ej: Caja x30 comp." value={newMedData.presentation} onChange={e => setNewMedData({...newMedData, presentation: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <hr className="my-4" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Lote</label>
                  <input type="text" value={newMedData.batch} onChange={e => setNewMedData({...newMedData, batch: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Vto.</label>
                  <input type="date" required value={newMedData.expirationDate} onChange={e => setNewMedData({...newMedData, expirationDate: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Cantidad</label>
                  <input type="number" min="1" required value={newMedData.quantity} onChange={e => setNewMedData({...newMedData, quantity: parseInt(e.target.value)})} className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowNewMedModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700">Guardar e Ingresar Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
