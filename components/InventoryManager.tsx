

import React, { useState, useMemo } from 'react';
import { InventoryItem, InventoryStatus, ConstructionWork, User, AssetType, RealEstateStatus } from '../types';
import { Wrench, Plus, Search, Filter, MapPin, CheckCircle2, Truck, Edit2, Trash2, Warehouse, Calendar, ArrowRightLeft, Camera, X, Package, Handshake, DollarSign, Building2, Key, FileText, Link as LinkIcon, Calculator } from 'lucide-react';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  works: ConstructionWork[];
  users: User[]; // Added users for Partner lookup
  onAdd: (item: InventoryItem) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ inventory, works, users, onAdd, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState<AssetType>('EQUIPMENT');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Move Form State
  const [moveTargetWorkId, setMoveTargetWorkId] = useState<string>(''); 
  const [moveTargetPartnerId, setMoveTargetPartnerId] = useState<string>(''); 
  const [moveType, setMoveType] = useState<'WAREHOUSE' | 'WORK' | 'PARTNER'>('WAREHOUSE');
  const [moveDate, setMoveDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit/Create Form State (Shared & Specific)
  const [assetType, setAssetType] = useState<AssetType>('EQUIPMENT');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemImage, setItemImage] = useState('');
  
  // Equipment Fields
  const [itemBrand, setItemBrand] = useState('');
  const [itemSerial, setItemSerial] = useState('');
  const [itemStatus, setItemStatus] = useState<string>(InventoryStatus.AVAILABLE);
  const [itemValue, setItemValue] = useState(''); // Estimated Value
  
  // Real Estate Fields
  const [reDevelopment, setReDevelopment] = useState('');
  const [reUnit, setReUnit] = useState('');
  const [reDeveloper, setReDeveloper] = useState('');
  const [rePurchaseValue, setRePurchaseValue] = useState('');
  const [reAmountPaid, setReAmountPaid] = useState('');
  const [reKeyDate, setReKeyDate] = useState('');
  const [reDocLink, setReDocLink] = useState('');
  
  // Edit/Create Location State (Equipment Only)
  const [itemLocationType, setItemLocationType] = useState<'WAREHOUSE' | 'WORK' | 'PARTNER'>('WAREHOUSE');
  const [itemLocationId, setItemLocationId] = useState('');

  // --- FILTERS & DATA ---
  const filteredInventory = useMemo(() => {
      return inventory.filter(item => {
          // Filter by Tab (Type)
          const itemType = item.assetType || 'EQUIPMENT'; // Backward compatibility
          if (itemType !== activeTab) return false;

          // Search
          const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (item.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (item.developmentName || '').toLowerCase().includes(searchTerm.toLowerCase());
          
          // Status Filter
          const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
          
          return matchesSearch && matchesStatus;
      });
  }, [inventory, activeTab, searchTerm, statusFilter]);

  // --- KPI CALCULATION ---
  const totalAssetValue = useMemo(() => {
      return filteredInventory.reduce((acc, item) => {
          if (activeTab === 'EQUIPMENT') {
              return acc + (item.estimatedValue || 0);
          } else {
              // For Real Estate, Asset Value = Paid Amount (Equity)
              return acc + (item.amountPaid || 0);
          }
      }, 0);
  }, [filteredInventory, activeTab]);

  // --- ACTION HANDLERS ---

  const resetForm = (type: AssetType) => {
      setEditingItem(null);
      setAssetType(type);
      setItemName('');
      setItemCategory('');
      setItemImage('');
      
      // Equipment
      setItemBrand('');
      setItemSerial('');
      setItemStatus(InventoryStatus.AVAILABLE);
      setItemValue('');
      setItemLocationType('WAREHOUSE');
      setItemLocationId('');

      // Real Estate
      setReDevelopment('');
      setReUnit('');
      setReDeveloper('');
      setRePurchaseValue('');
      setReAmountPaid('');
      setReKeyDate('');
      setReDocLink('');
      if (type === 'REAL_ESTATE') setItemStatus('EM_CONSTRUCAO');
  };

  const handleOpenCreate = () => {
      resetForm(activeTab);
      setIsEditModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
      setEditingItem(item);
      const type = item.assetType || 'EQUIPMENT';
      setAssetType(type);
      setItemName(item.name);
      setItemCategory(item.category);
      setItemImage(item.imageUrl || '');
      setItemStatus(item.status);

      if (type === 'EQUIPMENT') {
          setItemBrand(item.brand || '');
          setItemSerial(item.serialNumber || '');
          setItemValue(item.estimatedValue ? item.estimatedValue.toString() : '');
          
          if (item.currentWorkId) {
              setItemLocationType('WORK');
              setItemLocationId(item.currentWorkId);
          } else if (item.currentPartnerId) {
              setItemLocationType('PARTNER');
              setItemLocationId(item.currentPartnerId);
          } else {
              setItemLocationType('WAREHOUSE');
              setItemLocationId('');
          }
      } else {
          // Real Estate Fields
          setReDevelopment(item.developmentName || '');
          setReUnit(item.unitNumber || '');
          setReDeveloper(item.developerName || '');
          setRePurchaseValue(item.purchaseValue ? item.purchaseValue.toString() : '');
          setReAmountPaid(item.amountPaid ? item.amountPaid.toString() : '');
          setReKeyDate(item.keyDeliveryDate || '');
          setReDocLink(item.documentLink || '');
      }

      setIsEditModalOpen(true);
  };

  const handleSaveItem = () => {
      if (!itemName) return;

      // Common Fields
      const commonData = {
          id: editingItem ? editingItem.id : `inv_${Date.now()}`,
          assetType,
          name: itemName,
          category: itemCategory || 'Geral',
          imageUrl: itemImage,
          lastMovementDate: editingItem ? editingItem.lastMovementDate : new Date().toISOString(),
          status: itemStatus as any
      };

      let itemData: InventoryItem;

      if (assetType === 'EQUIPMENT') {
          // Resolve Location
          let currentWorkId: string | undefined = undefined;
          let currentPartnerId: string | undefined = undefined;
          if (itemLocationType === 'WORK' && itemLocationId) currentWorkId = itemLocationId;
          else if (itemLocationType === 'PARTNER' && itemLocationId) currentPartnerId = itemLocationId;

          itemData = {
              ...commonData,
              brand: itemBrand,
              serialNumber: itemSerial,
              currentWorkId,
              currentPartnerId,
              estimatedValue: itemValue ? parseFloat(itemValue) : 0
          };
      } else {
          // Real Estate
          itemData = {
              ...commonData,
              developmentName: reDevelopment,
              unitNumber: reUnit,
              developerName: reDeveloper,
              purchaseValue: rePurchaseValue ? parseFloat(rePurchaseValue) : 0,
              amountPaid: reAmountPaid ? parseFloat(reAmountPaid) : 0,
              keyDeliveryDate: reKeyDate,
              documentLink: reDocLink
          };
      }

      if (editingItem) onUpdate(itemData);
      else onAdd(itemData);
      
      setIsEditModalOpen(false);
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

  // --- HELPERS ---
  const getStatusColor = (status: string) => {
      switch(status) {
          // Equipment
          case InventoryStatus.AVAILABLE: return 'bg-green-100 text-green-700 border-green-200';
          case InventoryStatus.IN_USE: return 'bg-blue-100 text-blue-700 border-blue-200';
          case InventoryStatus.MAINTENANCE: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case InventoryStatus.LOST: return 'bg-red-100 text-red-700 border-red-200';
          case InventoryStatus.LOANED: return 'bg-purple-100 text-purple-700 border-purple-200';
          
          // Real Estate
          case 'EM_CONSTRUCAO': return 'bg-orange-100 text-orange-700 border-orange-200';
          case 'PRONTO': return 'bg-green-100 text-green-700 border-green-200';
          case 'ALUGADO': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'A_VENDA': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case 'VENDIDO': return 'bg-slate-100 text-slate-600 border-slate-200';
          default: return 'bg-slate-100 text-slate-600';
      }
  };

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'EM_CONSTRUCAO': return 'Em Construção';
          case 'PRONTO': return 'Pronto / Entregue';
          case 'ALUGADO': return 'Alugado';
          case 'A_VENDA': return 'À Venda';
          case 'VENDIDO': return 'Vendido';
          default: return status;
      }
  };

  return (
    <div className="p-6 min-h-screen pb-20 bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="text-pms-600" /> Patrimônio & Ativos
          </h2>
          <p className="text-slate-500">Gestão de equipamentos e carteira de imóveis.</p>
        </div>
        
        <div className="flex items-center gap-3">
             {/* ASSET VALUE SUMMARY */}
             <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                <div className="bg-green-100 p-1.5 rounded-full text-green-600">
                    <DollarSign size={16} />
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">
                        {activeTab === 'EQUIPMENT' ? 'Valor em Equipamentos' : 'Patrimônio (Pago)'}
                    </p>
                    <p className="font-bold text-slate-800 text-sm">R$ {totalAssetValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, compactDisplay: 'short'})}</p>
                </div>
            </div>

            <button 
                onClick={handleOpenCreate}
                className="bg-pms-600 hover:bg-pms-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all font-bold text-sm"
            >
                <Plus size={20} /> Novo Item
            </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl w-fit mb-6">
          <button 
            onClick={() => { setActiveTab('EQUIPMENT'); setStatusFilter('ALL'); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'EQUIPMENT' ? 'bg-white text-pms-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              <Wrench size={16} /> Maquinário & Ferramentas
          </button>
          <button 
            onClick={() => { setActiveTab('REAL_ESTATE'); setStatusFilter('ALL'); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'REAL_ESTATE' ? 'bg-white text-pms-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              <Building2 size={16} /> Carteira de Imóveis
          </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                  type="text" 
                  placeholder={activeTab === 'EQUIPMENT' ? "Buscar equipamento..." : "Buscar empreendimento ou unidade..."}
                  className="w-full pl-10 pr-4 py-2 bg-transparent outline-none text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <select 
              className="bg-transparent outline-none text-sm font-medium text-slate-600 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
          >
              <option value="ALL">Todos Status</option>
              {activeTab === 'EQUIPMENT' ? (
                  Object.values(InventoryStatus).map(s => <option key={s} value={s}>{s}</option>)
              ) : (
                  ['EM_CONSTRUCAO', 'PRONTO', 'ALUGADO', 'A_VENDA', 'VENDIDO'].map(s => (
                      <option key={s} value={s}>{getStatusLabel(s)}</option>
                  ))
              )}
          </select>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
          {filteredInventory.map(item => {
              
              // --- REAL ESTATE CARD ---
              if (item.assetType === 'REAL_ESTATE') {
                  const paid = item.amountPaid || 0;
                  const total = item.purchaseValue || 1; // avoid div by zero
                  const percent = Math.min(100, Math.round((paid / total) * 100));
                  const balance = total - paid;

                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col">
                        <div className="h-32 bg-slate-800 relative overflow-hidden">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-600 bg-slate-200">
                                    <Building2 size={40} opacity={0.5} />
                                </div>
                            )}
                            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenEdit(item)} className="bg-white/90 p-1.5 rounded-full text-slate-700 hover:text-pms-600 shadow-sm"><Edit2 size={14}/></button>
                                <button onClick={() => onDelete(item.id)} className="bg-white/90 p-1.5 rounded-full text-slate-700 hover:text-red-600 shadow-sm"><Trash2 size={14}/></button>
                            </div>
                            <div className="absolute bottom-3 left-3">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wider shadow-sm ${getStatusColor(item.status)}`}>
                                    {getStatusLabel(item.status)}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                            <div className="mb-3">
                                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{item.name}</h3>
                                <div className="flex items-center text-xs text-slate-500 gap-2">
                                    <Building2 size={12} /> {item.developmentName}
                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                    <span className="font-bold text-slate-700">{item.unitNumber}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-3">
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    <span>Quitado</span>
                                    <span>{percent}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                                    <div className="h-full bg-pms-500" style={{width: `${percent}%`}}></div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-slate-400">Pago</p>
                                        <p className="text-xs font-bold text-green-600">R$ {paid.toLocaleString('pt-BR', {compactDisplay:'short', notation:'compact'})}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400">Saldo Devedor</p>
                                        <p className="text-xs font-bold text-red-500">R$ {balance.toLocaleString('pt-BR', {compactDisplay:'short', notation:'compact'})}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 uppercase">Entrega</span>
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        <Key size={12} /> 
                                        {item.keyDeliveryDate ? new Date(item.keyDeliveryDate).toLocaleDateString('pt-BR') : 'N/D'}
                                    </span>
                                </div>
                                {item.documentLink && (
                                    <a 
                                        href={item.documentLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                        title="Ver Contrato"
                                    >
                                        <FileText size={16} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                  );
              }

              // --- EQUIPMENT CARD (Existing Logic) ---
              const currentWork = works.find(w => w.id === item.currentWorkId);
              const currentPartner = users.find(u => u.id === item.currentPartnerId);
              
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
                              <button onClick={() => handleOpenEdit(item)} className="bg-white p-1.5 rounded-full text-slate-600 hover:text-pms-600 shadow-sm"><Edit2 size={14}/></button>
                              <button onClick={() => onDelete(item.id)} className="bg-white p-1.5 rounded-full text-slate-600 hover:text-red-600 shadow-sm"><Trash2 size={14}/></button>
                          </div>
                          <div className="absolute bottom-2 left-2">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(item.status)}`}>
                                  {item.status}
                              </span>
                          </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-1">
                              <h3 className="font-bold text-slate-800 text-lg leading-tight">{item.name}</h3>
                              {item.estimatedValue ? (
                                  <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                      R$ {item.estimatedValue.toLocaleString('pt-BR', { compactDisplay: 'short', notation: 'compact' })}
                                  </span>
                              ) : null}
                          </div>
                          <p className="text-xs text-slate-500 mb-3">{item.category} • {item.brand || 'S/ Marca'}</p>
                          
                          <div className="mt-auto pt-3 border-t border-slate-100">
                              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                  {currentWork ? (
                                      <><MapPin size={16} className="text-red-500 shrink-0" /><span className="truncate" title={currentWork.name}>{currentWork.name}</span></>
                                  ) : currentPartner ? (
                                      <><Handshake size={16} className="text-purple-600 shrink-0" /><span className="truncate" title={currentPartner.name}>Emprestado: {currentPartner.name}</span></>
                                  ) : (
                                      <><Warehouse size={16} className="text-green-600 shrink-0" /><span>Depósito Central</span></>
                                  )}
                              </div>
                              <button onClick={() => { setEditingItem(item); setMoveDate(new Date().toISOString().split('T')[0]); setMoveType(item.currentWorkId ? 'WORK' : item.currentPartnerId ? 'PARTNER' : 'WAREHOUSE'); setIsMoveModalOpen(true); }} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                  <ArrowRightLeft size={16} /> Mover
                              </button>
                          </div>
                      </div>
                  </div>
              );
          })}
          {filteredInventory.length === 0 && (
              <div className="col-span-full p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                  {activeTab === 'EQUIPMENT' ? <Package size={48} className="mx-auto mb-2 opacity-20" /> : <Building2 size={48} className="mx-auto mb-2 opacity-20" />}
                  Nenhum item encontrado.
              </div>
          )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                      <h3 className="text-xl font-bold text-slate-800">{editingItem ? 'Editar Item' : 'Novo Cadastro'}</h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                  </div>
                  
                  <div className="overflow-y-auto custom-scroll pr-1 flex-1 space-y-4">
                      
                      {/* Type Switcher (Only on Create) */}
                      {!editingItem && (
                          <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                              <button 
                                onClick={() => resetForm('EQUIPMENT')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${assetType === 'EQUIPMENT' ? 'bg-white text-pms-600 shadow-sm' : 'text-slate-500'}`}
                              >
                                  <Wrench size={14}/> Maquinário
                              </button>
                              <button 
                                onClick={() => resetForm('REAL_ESTATE')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${assetType === 'REAL_ESTATE' ? 'bg-white text-pms-600 shadow-sm' : 'text-slate-500'}`}
                              >
                                  <Building2 size={14}/> Imóvel
                              </button>
                          </div>
                      )}

                      {/* Image Upload */}
                      <div className="flex justify-center mb-2">
                          <label className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative overflow-hidden group">
                              {itemImage ? (
                                  <img src={itemImage} className="w-full h-full object-cover" />
                              ) : (
                                  <div className="text-slate-400 flex flex-col items-center">
                                      <Camera size={24} className="mb-1"/>
                                      <span className="text-xs">Foto do {assetType === 'EQUIPMENT' ? 'Equipamento' : 'Imóvel/Planta'}</span>
                                  </div>
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          </label>
                      </div>

                      {/* SHARED FIELDS */}
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome / Título</label><input type="text" className="w-full border rounded p-2" value={itemName} onChange={e => setItemName(e.target.value)} placeholder={assetType === 'EQUIPMENT' ? "Ex: Betoneira 400L" : "Ex: Ap. 102 - Res. Jardins"}/></div>

                      {/* --- EQUIPMENT FORM --- */}
                      {assetType === 'EQUIPMENT' && (
                          <>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label><input list="eq_cats" className="w-full border rounded p-2" value={itemCategory} onChange={e => setItemCategory(e.target.value)} /><datalist id="eq_cats"><option value="Ferramenta Elétrica"/><option value="Maquinário"/><option value="EPI"/></datalist></div>
                                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Marca</label><input type="text" className="w-full border rounded p-2" value={itemBrand} onChange={e => setItemBrand(e.target.value)} /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Nº Série</label><input type="text" className="w-full border rounded p-2" value={itemSerial} onChange={e => setItemSerial(e.target.value)} /></div>
                                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Valor Est. (R$)</label><input type="number" className="w-full border rounded p-2" value={itemValue} onChange={e => setItemValue(e.target.value)} /></div>
                              </div>
                              <div><label className="block text-sm font-bold text-slate-700 mb-1">Status</label><select className="w-full border rounded p-2 bg-white" value={itemStatus} onChange={e => setItemStatus(e.target.value)}>{Object.values(InventoryStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                              
                              {/* Location Initial Set (Only Create) */}
                              {!editingItem && (
                                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Localização Inicial</label>
                                      <div className="grid grid-cols-2 gap-2">
                                          <select className="w-full border rounded p-2 bg-white text-xs" value={itemLocationType} onChange={e => { setItemLocationType(e.target.value as any); setItemLocationId(''); }}><option value="WAREHOUSE">Depósito</option><option value="WORK">Obra</option><option value="PARTNER">Parceiro</option></select>
                                          {itemLocationType === 'WORK' && <select className="w-full border rounded p-2 bg-white text-xs" value={itemLocationId} onChange={e => setItemLocationId(e.target.value)}><option value="">Obra...</option>{works.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>}
                                          {itemLocationType === 'PARTNER' && <select className="w-full border rounded p-2 bg-white text-xs" value={itemLocationId} onChange={e => setItemLocationId(e.target.value)}><option value="">Parceiro...</option>{users.filter(u => u.category !== 'CLIENT').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
                                      </div>
                                  </div>
                              )}
                          </>
                      )}

                      {/* --- REAL ESTATE FORM --- */}
                      {assetType === 'REAL_ESTATE' && (
                          <>
                              <div><label className="block text-sm font-bold text-slate-700 mb-1">Empreendimento</label><input type="text" className="w-full border rounded p-2" value={reDevelopment} onChange={e => setReDevelopment(e.target.value)} placeholder="Nome do Prédio / Condomínio"/></div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Unidade / Lote</label><input type="text" className="w-full border rounded p-2" value={reUnit} onChange={e => setReUnit(e.target.value)} /></div>
                                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Tipo</label><select className="w-full border rounded p-2 bg-white" value={itemCategory} onChange={e => setItemCategory(e.target.value)}><option value="Planta">Na Planta</option><option value="Pronto">Pronto</option><option value="Terreno">Terreno</option><option value="Comercial">Comercial</option></select></div>
                              </div>
                              <div><label className="block text-sm font-bold text-slate-700 mb-1">Construtora Origem</label><input type="text" className="w-full border rounded p-2" value={reDeveloper} onChange={e => setReDeveloper(e.target.value)} /></div>
                              
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                  <h4 className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1"><Calculator size={12}/> Financeiro</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div><label className="block text-xs font-bold text-slate-600 mb-1">Valor do Contrato</label><input type="number" className="w-full border rounded p-2 text-sm" value={rePurchaseValue} onChange={e => setRePurchaseValue(e.target.value)} /></div>
                                      <div><label className="block text-xs font-bold text-slate-600 mb-1">Valor Pago (Acumulado)</label><input type="number" className="w-full border rounded p-2 text-sm font-bold text-green-700" value={reAmountPaid} onChange={e => setReAmountPaid(e.target.value)} /></div>
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Status</label><select className="w-full border rounded p-2 bg-white" value={itemStatus} onChange={e => setItemStatus(e.target.value)}><option value="EM_CONSTRUCAO">Em Construção</option><option value="PRONTO">Pronto</option><option value="ALUGADO">Alugado</option><option value="A_VENDA">À Venda</option><option value="VENDIDO">Vendido</option></select></div>
                                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Previsão Chaves</label><input type="date" className="w-full border rounded p-2" value={reKeyDate} onChange={e => setReKeyDate(e.target.value)} /></div>
                              </div>
                              <div><label className="block text-sm font-bold text-slate-700 mb-1">Link do Contrato (Drive)</label><input type="url" className="w-full border rounded p-2 text-blue-600 underline" value={reDocLink} onChange={e => setReDocLink(e.target.value)} placeholder="https://..." /></div>
                          </>
                      )}
                  </div>

                  <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100">
                      <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                      <button onClick={handleSaveItem} className="px-6 py-2 bg-pms-600 text-white rounded-lg font-bold hover:bg-pms-500 shadow-lg">Salvar Item</button>
                  </div>
              </div>
          </div>
      )}

      {/* MOVE MODAL (Only for Equipment) */}
      {isMoveModalOpen && editingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              {/* Reusing existing move modal logic but kept generic since code size limit is tight. 
                  This modal is identical to previous version for equipment moving. */}
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Movimentar Equipamento</h3><button onClick={() => setIsMoveModalOpen(false)}><X size={20}/></button></div>
                  <div className="space-y-4">
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button onClick={() => setMoveType('WAREHOUSE')} className={`flex-1 py-2 text-xs font-bold rounded ${moveType === 'WAREHOUSE' ? 'bg-white shadow' : 'text-slate-500'}`}>Depósito</button>
                          <button onClick={() => setMoveType('WORK')} className={`flex-1 py-2 text-xs font-bold rounded ${moveType === 'WORK' ? 'bg-white shadow' : 'text-slate-500'}`}>Obra</button>
                          <button onClick={() => setMoveType('PARTNER')} className={`flex-1 py-2 text-xs font-bold rounded ${moveType === 'PARTNER' ? 'bg-white shadow' : 'text-slate-500'}`}>Parceiro</button>
                      </div>
                      {moveType === 'WORK' && <select className="w-full border p-2 rounded" value={moveTargetWorkId} onChange={e => setMoveTargetWorkId(e.target.value)}><option value="">Selecione Obra...</option>{works.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>}
                      {moveType === 'PARTNER' && <select className="w-full border p-2 rounded" value={moveTargetPartnerId} onChange={e => setMoveTargetPartnerId(e.target.value)}><option value="">Selecione Parceiro...</option>{users.filter(u => u.category !== 'CLIENT').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
                      <div><label className="text-xs font-bold">Data</label><input type="date" className="w-full border p-2 rounded" value={moveDate} onChange={e => setMoveDate(e.target.value)} /></div>
                  </div>
                  <div className="flex justify-end mt-4 gap-2">
                      <button onClick={() => setIsMoveModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Cancelar</button>
                      <button 
                        onClick={() => {
                            // Simple inline handler to respect the prop interface
                            const newStatus = moveType === 'WORK' ? InventoryStatus.IN_USE : moveType === 'PARTNER' ? InventoryStatus.LOANED : InventoryStatus.AVAILABLE;
                            const workId = moveType === 'WORK' ? moveTargetWorkId : undefined;
                            const partnerId = moveType === 'PARTNER' ? moveTargetPartnerId : undefined;
                            onUpdate({ ...editingItem, status: newStatus, currentWorkId: workId, currentPartnerId: partnerId, lastMovementDate: new Date().toISOString() });
                            setIsMoveModalOpen(false);
                        }} 
                        className="px-4 py-2 bg-slate-800 text-white rounded font-bold"
                      >
                          Confirmar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
