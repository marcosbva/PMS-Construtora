
import React, { useState } from 'react';
import { InventoryItem, InventoryStatus, ConstructionWork } from '../types';
import { Wrench, Plus, Search, Filter, MapPin, AlertTriangle, CheckCircle2, Truck, Edit2, Trash2, Warehouse, Calendar, ArrowRightLeft, Camera, X, Package } from 'lucide-react';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  works: ConstructionWork[];
  onAdd: (item: InventoryItem) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ inventory, works, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InventoryStatus>('ALL');
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Move Form State
  const [moveTargetWorkId, setMoveTargetWorkId] = useState<string>(''); // '' means Warehouse
  const [moveDate, setMoveDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit/Create Form State
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Ferramenta');
  const [itemBrand, setItemBrand] = useState('');
  const [itemSerial, setItemSerial] = useState('');
  const [itemStatus, setItemStatus] = useState<InventoryStatus>(InventoryStatus.AVAILABLE);
  const [itemImage, setItemImage] = useState('');

  // --- FILTERS ---
  const filteredInventory = inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (item.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
  });

  // --- ACTION HANDLERS ---

  const handleOpenCreate = () => {
      setEditingItem(null);
      setItemName('');
      setItemCategory('Ferramenta');
      setItemBrand('');
      setItemSerial('');
      setItemStatus(InventoryStatus.AVAILABLE);
      setItemImage('');
      setIsEditModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
      setEditingItem(item);
      setItemName(item.name);
      setItemCategory(item.category);
      setItemBrand(item.brand || '');
      setItemSerial(item.serialNumber || '');
      setItemStatus(item.status);
      setItemImage(item.imageUrl || '');
      setIsEditModalOpen(true);
  };

  const handleOpenMove = (item: InventoryItem) => {
      setEditingItem(item);
      setMoveTargetWorkId(item.currentWorkId || ''); // Pre-select current location
      setMoveDate(new Date().toISOString().split('T')[0]);
      setIsMoveModalOpen(true);
  };

  const handleSaveItem = () => {
      if (!itemName) return;

      const itemData: InventoryItem = {
          id: editingItem ? editingItem.id : `inv_${Date.now()}`,
          name: itemName,
          category: itemCategory,
          brand: itemBrand,
          serialNumber: itemSerial,
          status: itemStatus,
          currentWorkId: editingItem ? editingItem.currentWorkId : undefined, // Keep existing location logic or default
          lastMovementDate: editingItem ? editingItem.lastMovementDate : new Date().toISOString(),
          imageUrl: itemImage
      };

      if (editingItem) {
          onUpdate(itemData);
      } else {
          onAdd(itemData);
      }
      setIsEditModalOpen(false);
  };

  const handleExecuteMove = () => {
      if (!editingItem) return;

      const isToWarehouse = !moveTargetWorkId;
      const newStatus = isToWarehouse ? InventoryStatus.AVAILABLE : InventoryStatus.IN_USE;

      const updatedItem: InventoryItem = {
          ...editingItem,
          currentWorkId: isToWarehouse ? undefined : moveTargetWorkId,
          status: newStatus,
          lastMovementDate: new Date().toISOString() // Ideally use moveDate if format allows
      };

      onUpdate(updatedItem);
      setIsMoveModalOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) setItemImage(ev.target.result as string);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const getStatusColor = (status: InventoryStatus) => {
      switch(status) {
          case InventoryStatus.AVAILABLE: return 'bg-green-100 text-green-700 border-green-200';
          case InventoryStatus.IN_USE: return 'bg-blue-100 text-blue-700 border-blue-200';
          case InventoryStatus.MAINTENANCE: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case InventoryStatus.LOST: return 'bg-red-100 text-red-700 border-red-200';
          default: return 'bg-slate-100 text-slate-600';
      }
  };

  return (
    <div className="p-6 min-h-screen pb-20 bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="text-pms-600" /> Estoque & Equipamentos
          </h2>
          <p className="text-slate-500">Gerencie máquinas, ferramentas e EPIs entre obras.</p>
        </div>
        <button 
            onClick={handleOpenCreate}
            className="bg-pms-600 hover:bg-pms-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all"
        >
            <Plus size={20} /> Novo Item
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Buscar equipamento, marca..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-pms-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter size={18} className="text-slate-400" />
              <select 
                  className="bg-white border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-pms-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                  <option value="ALL">Todos Status</option>
                  {Object.values(InventoryStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                  ))}
              </select>
          </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
          {filteredInventory.map(item => {
              const currentWork = works.find(w => w.id === item.currentWorkId);
              
              return (
                  <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col">
                      <div className="h-40 bg-slate-100 relative overflow-hidden border-b border-slate-100">
                          {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                              <div className="flex items-center justify-center h-full text-slate-300">
                                  <Package size={48} />
                              </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleOpenEdit(item)} className="bg-white p-1.5 rounded-full text-slate-600 hover:text-pms-600 shadow-sm">
                                  <Edit2 size={14} />
                              </button>
                              <button onClick={() => onDelete(item.id)} className="bg-white p-1.5 rounded-full text-slate-600 hover:text-red-600 shadow-sm">
                                  <Trash2 size={14} />
                              </button>
                          </div>
                          <div className="absolute bottom-2 left-2">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(item.status)}`}>
                                  {item.status}
                              </span>
                          </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col">
                          <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{item.name}</h3>
                          <p className="text-xs text-slate-500 mb-3">{item.category} • {item.brand || 'S/ Marca'}</p>
                          
                          <div className="mt-auto pt-3 border-t border-slate-100">
                              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                  {currentWork ? (
                                      <>
                                          <MapPin size={16} className="text-red-500" />
                                          <span className="truncate" title={currentWork.name}>{currentWork.name}</span>
                                      </>
                                  ) : (
                                      <>
                                          <Warehouse size={16} className="text-green-600" />
                                          <span>Depósito Central</span>
                                      </>
                                  )}
                              </div>
                              
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-3">
                                  <Calendar size={12} />
                                  Desde {new Date(item.lastMovementDate).toLocaleDateString('pt-BR')}
                              </div>

                              <button 
                                  onClick={() => handleOpenMove(item)}
                                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                              >
                                  <ArrowRightLeft size={16} /> Mover / Transferir
                              </button>
                          </div>
                      </div>
                  </div>
              );
          })}
          {filteredInventory.length === 0 && (
              <div className="col-span-full p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                  <Package size={48} className="mx-auto mb-2 opacity-20" />
                  Nenhum item encontrado no estoque.
              </div>
          )}
      </div>

      {/* EDIT/CREATE MODAL */}
      {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                      <h3 className="text-xl font-bold text-slate-800">{editingItem ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                  </div>
                  
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                      {/* Image Upload */}
                      <div className="flex justify-center mb-4">
                          <label className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative overflow-hidden group">
                              {itemImage ? (
                                  <img src={itemImage} className="w-full h-full object-cover" />
                              ) : (
                                  <div className="text-slate-400 flex flex-col items-center">
                                      <Camera size={24} className="mb-1"/>
                                      <span className="text-xs">Adicionar Foto</span>
                                  </div>
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                              {itemImage && <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs">Alterar Foto</div>}
                          </label>
                      </div>

                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome do Item</label><input type="text" className="w-full border rounded p-2" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ex: Betoneira 400L"/></div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                              <input list="categories" className="w-full border rounded p-2" value={itemCategory} onChange={e => setItemCategory(e.target.value)} />
                              <datalist id="categories">
                                  <option value="Ferramenta Elétrica" />
                                  <option value="Maquinário" />
                                  <option value="Andaimes" />
                                  <option value="EPI" />
                                  <option value="Veículo" />
                              </datalist>
                          </div>
                          <div><label className="block text-sm font-bold text-slate-700 mb-1">Marca</label><input type="text" className="w-full border rounded p-2" value={itemBrand} onChange={e => setItemBrand(e.target.value)} /></div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-sm font-bold text-slate-700 mb-1">Nº Série / Patrimônio</label><input type="text" className="w-full border rounded p-2" value={itemSerial} onChange={e => setItemSerial(e.target.value)} /></div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Status Operacional</label>
                              <select className="w-full border rounded p-2 bg-white" value={itemStatus} onChange={e => setItemStatus(e.target.value as InventoryStatus)}>
                                  {Object.values(InventoryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                      <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                      <button onClick={handleSaveItem} className="px-6 py-2 bg-pms-600 text-white rounded-lg font-bold hover:bg-pms-500 shadow-lg">Salvar</button>
                  </div>
              </div>
          </div>
      )}

      {/* MOVE MODAL */}
      {isMoveModalOpen && editingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Truck className="text-pms-600"/> Movimentar Item</h3>
                      <button onClick={() => setIsMoveModalOpen(false)}><X size={24} className="text-slate-400"/></button>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex gap-4 items-center">
                      {editingItem.imageUrl && <img src={editingItem.imageUrl} className="w-12 h-12 rounded object-cover bg-white border" />}
                      <div>
                          <p className="font-bold text-slate-800">{editingItem.name}</p>
                          <p className="text-xs text-slate-500">{editingItem.brand} • {editingItem.serialNumber}</p>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Destino</label>
                          <select 
                              className="w-full border border-slate-300 rounded-lg p-3 bg-white font-medium outline-none focus:ring-2 focus:ring-pms-500"
                              value={moveTargetWorkId}
                              onChange={(e) => setMoveTargetWorkId(e.target.value)}
                          >
                              <option value="">🏠 Depósito / Warehouse (Devolução)</option>
                              <optgroup label="Obras em Andamento">
                                  {works.map(w => (
                                      <option key={w.id} value={w.id}>📍 {w.name}</option>
                                  ))}
                              </optgroup>
                          </select>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Data da Movimentação</label>
                          <input 
                              type="date" 
                              className="w-full border border-slate-300 rounded-lg p-3 outline-none"
                              value={moveDate}
                              onChange={(e) => setMoveDate(e.target.value)}
                          />
                      </div>

                      {!moveTargetWorkId && (
                          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-xs flex gap-2 items-center">
                              <CheckCircle2 size={16} />
                              O status será alterado automaticamente para <strong>Disponível</strong>.
                          </div>
                      )}
                      {moveTargetWorkId && (
                          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs flex gap-2 items-center">
                              <AlertTriangle size={16} />
                              O status será alterado para <strong>Em Uso</strong>.
                          </div>
                      )}
                  </div>

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                      <button onClick={() => setIsMoveModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                      <button onClick={handleExecuteMove} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 shadow-lg">Confirmar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
