

import React, { useState, useMemo } from 'react';
import { RentalItem, RentalStatus, User, FinanceType, FinancialRecord } from '../types';
import { Truck, Plus, Search, Calendar, DollarSign, AlertTriangle, CheckCircle2, Trash2, Edit2, User as UserIcon, Clock, X, ArrowUpRight, FileInput, Wallet } from 'lucide-react';

interface RentalControlProps {
  rentals: RentalItem[];
  suppliers: User[];
  onAdd: (item: RentalItem) => void;
  onUpdate: (item: RentalItem) => void;
  onDelete: (id: string) => void;
  onAddFinance?: (record: FinancialRecord) => void; // NEW PROP
  workId: string;
}

export const RentalControl: React.FC<RentalControlProps> = ({ rentals, suppliers, onAdd, onUpdate, onDelete, onAddFinance, workId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);

  // Form State
  const [itemName, setItemName] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('un');
  const [unitPrice, setUnitPrice] = useState(0);
  const [billingPeriod, setBillingPeriod] = useState<'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Total'>('Mensal');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<RentalStatus>(RentalStatus.ACTIVE);

  const filteredRentals = useMemo(() => {
      return rentals.filter(r => 
          r.workId === workId && 
          (r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (r.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [rentals, workId, searchTerm]);

  // Stats
  const stats = useMemo(() => {
      const active = filteredRentals.filter(r => r.status === RentalStatus.ACTIVE);
      const overdue = active.filter(r => new Date(r.endDate) < new Date());
      
      // Calculate monthly estimation for active contracts
      const monthlyEst = active.reduce((acc, curr) => {
          // Simple calculation logic
          if (curr.billingPeriod === 'Mensal') return acc + (curr.unitPrice * curr.quantity);
          if (curr.billingPeriod === 'Semanal') return acc + (curr.unitPrice * curr.quantity * 4);
          if (curr.billingPeriod === 'Diária') return acc + (curr.unitPrice * curr.quantity * 30);
          return acc;
      }, 0);

      return { activeCount: active.length, overdueCount: overdue.length, monthlyEst };
  }, [filteredRentals]);

  const handleOpenModal = (item?: RentalItem) => {
      if (item) {
          setEditingItem(item);
          setItemName(item.itemName);
          setSupplierId(item.supplierId || '');
          setQuantity(item.quantity);
          setUnit(item.unit);
          setUnitPrice(item.unitPrice);
          setBillingPeriod(item.billingPeriod);
          setStartDate(item.startDate);
          setEndDate(item.endDate);
          setStatus(item.status);
      } else {
          setEditingItem(null);
          setItemName('');
          setSupplierId('');
          setQuantity(1);
          setUnit('un');
          setUnitPrice(0);
          setBillingPeriod('Mensal');
          setStartDate(new Date().toISOString().split('T')[0]);
          setEndDate('');
          setStatus(RentalStatus.ACTIVE);
      }
      setIsModalOpen(true);
  };

  const handleSave = () => {
      if (!itemName || !startDate || !endDate) {
          alert("Preencha os campos obrigatórios (Nome, Início, Fim).");
          return;
      }

      const supplier = suppliers.find(s => s.id === supplierId);

      const rentalData: RentalItem = {
          id: editingItem ? editingItem.id : `rent_${Date.now()}`,
          workId,
          itemName,
          supplierId: supplierId || undefined,
          supplierName: supplier ? supplier.name : (supplierId || 'Desconhecido'),
          quantity,
          unit,
          unitPrice,
          billingPeriod,
          startDate,
          endDate,
          status: status
      };

      if (editingItem) {
          onUpdate(rentalData);
      } else {
          onAdd(rentalData);
          // FINANCIAL GENERATION LOGIC
          if (onAddFinance) {
              generateFinanceRecords(rentalData);
          }
      }

      setIsModalOpen(false);
  };

  const generateFinanceRecords = (rental: RentalItem) => {
      if (!onAddFinance) return;
      if (rental.unitPrice <= 0) return;

      if (window.confirm("Deseja gerar automaticamente os lançamentos no 'Contas a Pagar' para este aluguel?")) {
          const start = new Date(rental.startDate);
          const end = new Date(rental.endDate);
          let current = new Date(start);
          
          // Initial Jump to first due date (assuming prepay or postpay logic, let's assume Month + 1 for monthly)
          // Simplify: Generate based on periods falling within the range
          
          // Adjust current to first due date based on period
          // e.g. Monthly rent starting Jan 1 is usually due Feb 1 or Jan 1. Let's assume start date + period.
          
          while (current < end || current.getTime() === end.getTime()) {
              // Prepare Record
              const amount = rental.unitPrice * rental.quantity;
              const description = `Aluguel: ${rental.itemName} (${rental.billingPeriod})`;
              
              // Create Record
              const record: FinancialRecord = {
                  id: `fin_rent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  workId: rental.workId,
                  entityId: rental.supplierId,
                  type: FinanceType.EXPENSE,
                  category: 'Locação de Equipamentos',
                  description: description,
                  amount: amount,
                  dueDate: current.toISOString().split('T')[0],
                  status: 'Pendente'
              };
              
              onAddFinance(record);

              // Increment Date
              if (rental.billingPeriod === 'Total') break; // Only one record
              
              if (rental.billingPeriod === 'Mensal') {
                  current.setMonth(current.getMonth() + 1);
              } else if (rental.billingPeriod === 'Quinzenal') {
                  current.setDate(current.getDate() + 15);
              } else if (rental.billingPeriod === 'Semanal') {
                  current.setDate(current.getDate() + 7);
              } else if (rental.billingPeriod === 'Diária') {
                  current.setDate(current.getDate() + 1);
              }
          }
          
          alert("Lançamentos financeiros gerados com sucesso!");
      }
  };

  const handleReturn = (item: RentalItem) => {
      if (window.confirm(`Confirmar devolução de ${item.itemName}?`)) {
          onUpdate({
              ...item,
              status: RentalStatus.RETURNED,
              returnDate: new Date().toISOString().split('T')[0]
          });
      }
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50/30 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="text-pms-600" /> Controle de Aluguéis
          </h2>
          <p className="text-slate-500 text-sm">Gestão de máquinas, andaimes e equipamentos locados.</p>
        </div>
        <button 
            onClick={() => handleOpenModal()}
            className="bg-pms-600 hover:bg-pms-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all text-sm font-bold"
        >
            <Plus size={18} /> Novo Contrato
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Custo Mensal Est.</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">R$ {stats.monthlyEst.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-lg"><DollarSign size={20}/></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Itens Ativos</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">{stats.activeCount}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Truck size={20}/></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Vencidos / Atrasados</p>
                  <p className={`text-xl font-bold mt-1 ${stats.overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.overdueCount}</p>
              </div>
              <div className={`p-3 rounded-lg ${stats.overdueCount > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}><AlertTriangle size={20}/></div>
          </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-4 flex items-center gap-2">
          <Search size={18} className="text-slate-400 ml-2"/>
          <input 
            type="text" 
            placeholder="Buscar equipamento ou fornecedor..." 
            className="w-full outline-none text-sm text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      {/* LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRentals.map(item => {
              const isOverdue = item.status === RentalStatus.ACTIVE && new Date(item.endDate) < new Date();
              
              return (
                  <div key={item.id} className={`bg-white p-4 rounded-xl border shadow-sm transition-all relative group hover:shadow-md ${item.status === RentalStatus.RETURNED ? 'opacity-75 border-slate-200 bg-slate-50' : isOverdue ? 'border-red-200 bg-red-50/20' : 'border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                  {item.itemName}
                                  <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                      {item.quantity} {item.unit}
                                  </span>
                              </h4>
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                  <UserIcon size={12}/> {item.supplierName || 'Fornecedor não informado'}
                              </div>
                          </div>
                          
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${
                              item.status === RentalStatus.RETURNED ? 'bg-slate-100 text-slate-500 border-slate-200' :
                              isOverdue ? 'bg-red-100 text-red-600 border-red-200' :
                              'bg-green-100 text-green-600 border-green-200'
                          }`}>
                              {isOverdue ? 'ATRASADO' : item.status}
                          </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 my-3 text-sm">
                          <div>
                              <span className="text-[10px] text-slate-400 uppercase block font-bold">Custo</span>
                              <div className="font-medium text-slate-700">R$ {item.unitPrice.toLocaleString()} <span className="text-xs text-slate-400">/ {item.billingPeriod}</span></div>
                          </div>
                          <div>
                              <span className="text-[10px] text-slate-400 uppercase block font-bold">Vencimento / Devolução</span>
                              <div className={`font-medium flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                                  <Calendar size={14}/> {new Date(item.endDate).toLocaleDateString('pt-BR')}
                              </div>
                          </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2">
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock size={12}/> Chegou: {new Date(item.startDate).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex gap-2">
                              {item.status === RentalStatus.ACTIVE && (
                                  <button 
                                    onClick={() => handleReturn(item)}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                                    title="Registrar Devolução"
                                  >
                                      <CheckCircle2 size={18}/>
                                  </button>
                              )}
                              <button onClick={() => handleOpenModal(item)} className="p-1.5 text-slate-400 hover:text-pms-600 hover:bg-slate-100 rounded-lg transition-colors">
                                  <Edit2 size={18}/>
                              </button>
                              <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={18}/>
                              </button>
                          </div>
                      </div>
                  </div>
              );
          })}
          {filteredRentals.length === 0 && (
              <div className="col-span-full p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                  <Truck size={48} className="mx-auto mb-2 opacity-20" />
                  Nenhum contrato de aluguel encontrado.
              </div>
          )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800">{editingItem ? 'Editar Contrato' : 'Novo Aluguel'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                      <div><label className="block text-xs font-bold text-slate-500 mb-1">Equipamento / Item</label><input className="w-full border rounded p-2 text-sm" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ex: Betoneira 400L"/></div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Fornecedor</label>
                          <select className="w-full border rounded p-2 text-sm bg-white" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                              <option value="">Selecione ou deixe em branco...</option>
                              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Quantidade</label><input type="number" className="w-full border rounded p-2 text-sm" value={quantity} onChange={e => setQuantity(Number(e.target.value))}/></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Unidade</label><input className="w-full border rounded p-2 text-sm" value={unit} onChange={e => setUnit(e.target.value)} placeholder="un, m, kit"/></div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Valor Unitário (R$)</label><input type="number" className="w-full border rounded p-2 text-sm" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))}/></div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Cobrança / Recorrência</label>
                              <select className="w-full border rounded p-2 text-sm bg-white" value={billingPeriod} onChange={e => setBillingPeriod(e.target.value as any)}>
                                  {['Diária', 'Semanal', 'Quinzenal', 'Mensal', 'Total'].map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Data Chegada</label><input type="date" className="w-full border rounded p-2 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)}/></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Previsão Devolução</label><input type="date" className="w-full border rounded p-2 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)}/></div>
                      </div>
                      
                      {editingItem && (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                              <select className="w-full border rounded p-2 text-sm bg-white" value={status} onChange={e => setStatus(e.target.value as RentalStatus)}>
                                  {Object.values(RentalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                      )}

                      {!editingItem && (
                          <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 flex gap-2 border border-blue-200">
                              <Wallet size={16} className="shrink-0" />
                              O sistema oferecerá para gerar automaticamente as contas a pagar após salvar.
                          </div>
                      )}
                  </div>

                  <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-slate-100">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg text-sm font-bold">Cancelar</button>
                      <button onClick={handleSave} className="px-6 py-2 bg-pms-600 text-white rounded-lg text-sm font-bold hover:bg-pms-500 shadow-md">Salvar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
