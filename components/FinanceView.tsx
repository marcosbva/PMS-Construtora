
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { FinancialRecord, FinanceType, User, ConstructionWork, FinanceCategoryDefinition, WorkBudget, Task, FinancialItemBreakdown, MaterialOrder, OrderStatus, TaskPriority } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, X, Calendar, Tag, FileText, Edit2, Trash2, CheckCircle2, Plus, BarChart3, Ruler, ShoppingCart, Truck, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface FinanceViewProps {
  records: FinancialRecord[];
  tasks?: Task[];
  currentUser: User;
  users: User[];
  work?: ConstructionWork;
  financeCategories?: FinanceCategoryDefinition[];
  onAddRecord: (record: FinancialRecord) => void;
  onUpdateRecord?: (record: FinancialRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
  onAddCategory?: (category: FinanceCategoryDefinition) => void;
}

const COLORS = ['#c59d45', '#f97316', '#8b5cf6', '#10b981', '#f43f5e', '#eab308', '#ec4899', '#6366f1'];

export const FinanceView: React.FC<FinanceViewProps> = ({ 
    records, tasks = [], currentUser, users, work, financeCategories = [],
    onAddRecord, onUpdateRecord, onDeleteRecord, onAddCategory 
}) => {
  const isGlobal = !work;
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'MEASUREMENT'>('TRANSACTIONS');
  
  const [viewFilter, setViewFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'PENDING'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [workBudget, setWorkBudget] = useState<WorkBudget | null>(null);
  
  // Form State
  const [type, setType] = useState<FinanceType>(FinanceType.EXPENSE);
  const [category, setCategory] = useState<string>('Material');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'Pendente' | 'Pago' | 'Atrasado'>('Pendente');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [relatedBudgetCategoryId, setRelatedBudgetCategoryId] = useState('');
  
  // Item Breakdown State
  const [showItems, setShowItems] = useState(false);
  const [items, setItems] = useState<FinancialItemBreakdown[]>([{ itemName: '', quantity: 1, unit: 'un', unitPrice: 0, totalPrice: 0 }]);

  useEffect(() => {
    if (work?.id) api.getBudget(work.id).then(setWorkBudget).catch(console.error);
  }, [work?.id]);

  // Calculations
  const totals = useMemo(() => {
    const expenses = records.filter(r => r.type === FinanceType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
    const income = records.filter(r => r.type === FinanceType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
    const pendingExpense = records.filter(r => r.status === 'Pendente' && r.type === FinanceType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
    return { expenses, income, pendingExpense };
  }, [records]);

  const handleOpenModal = (record?: FinancialRecord) => {
    if (record) {
        setEditingId(record.id); setType(record.type); setCategory(record.category); setDescription(record.description); setAmount(record.amount.toString()); setDueDate(record.dueDate); setStatus(record.status as any); setSelectedEntityId(record.entityId || ''); setRelatedBudgetCategoryId(record.relatedBudgetCategoryId || '');
        setItems(record.items || [{ itemName: '', quantity: 1, unit: 'un', unitPrice: 0, totalPrice: 0 }]);
        setShowItems(!!(record.items && record.items.length > 0));
    } else {
        setEditingId(null); setType(FinanceType.EXPENSE); setDescription(''); setAmount(''); setDueDate(''); setStatus('Pendente'); setCategory('Material'); setSelectedEntityId(''); setRelatedBudgetCategoryId('');
        setItems([{ itemName: '', quantity: 1, unit: 'un', unitPrice: 0, totalPrice: 0 }]);
        setShowItems(false);
    }
    setIsModalOpen(true);
  };

  const handleItemChange = (index: number, field: keyof FinancialItemBreakdown, value: any) => {
      const newItems = [...items];
      const item = { ...newItems[index], [field]: value };
      
      // Auto calc total
      if (field === 'quantity' || field === 'unitPrice') {
          item.totalPrice = Number(item.quantity) * Number(item.unitPrice);
      }
      newItems[index] = item;
      setItems(newItems);

      // Auto update main amount
      const totalAmount = newItems.reduce((acc, i) => acc + i.totalPrice, 0);
      if (totalAmount > 0) setAmount(totalAmount.toString());
  };

  const handleSave = async () => {
    if (!description || !amount || !dueDate) return;
    
    // Filter valid items
    const validItems = showItems ? items.filter(i => i.itemName.trim() !== '') : [];

    const recordData: FinancialRecord = {
      id: editingId || `fin_${Date.now()}`,
      workId: work?.id || 'global',
      entityId: selectedEntityId || undefined,
      type, category, description, amount: parseFloat(amount), dueDate, status,
      paidDate: status === 'Pago' ? (editingId ? records.find(r=>r.id===editingId)?.paidDate || dueDate : dueDate) : undefined,
      relatedBudgetCategoryId: relatedBudgetCategoryId || undefined,
      items: validItems.length > 0 ? validItems : undefined
    };

    if (editingId && onUpdateRecord) onUpdateRecord(recordData);
    else onAddRecord(recordData);

    // AUTO-GENERATE MATERIAL ORDERS FOR INVENTORY
    // If saving a new record with items, create orders automatically to populate Material/Inventory view
    if (!editingId && validItems.length > 0 && work) {
        for (const item of validItems) {
            const order: MaterialOrder = {
                id: `auto_ord_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                workId: work.id,
                requesterId: currentUser.id,
                supplierId: selectedEntityId || undefined,
                itemName: item.itemName,
                quantity: Number(item.quantity),
                unit: item.unit,
                status: status === 'Pago' ? OrderStatus.DELIVERED : OrderStatus.PURCHASED, // If paid, assume delivered or at least bought
                priority: TaskPriority.MEDIUM,
                requestDate: dueDate,
                purchaseDate: dueDate,
                deliveryDate: status === 'Pago' ? dueDate : undefined,
                finalCost: item.totalPrice,
                notes: `Gerado automaticamente via Financeiro: ${description}`
            };
            await api.createOrder(order);
        }
        alert("Lançamento salvo! Itens foram adicionados ao controle de materiais automaticamente.");
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 pb-10 relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">
          {isGlobal ? 'Financeiro Global' : `Financeiro: ${work?.name}`}
        </h2>
        
        {!isGlobal && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('TRANSACTIONS')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'TRANSACTIONS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                >
                    Fluxo de Caixa
                </button>
                <button 
                    onClick={() => setActiveTab('MEASUREMENT')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${activeTab === 'MEASUREMENT' ? 'bg-white text-pms-600 shadow-sm' : 'text-slate-500'}`}
                >
                    <Ruler size={14}/> Medição Física
                </button>
            </div>
        )}

        <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-pms-600 text-white rounded-lg text-sm hover:bg-pms-500 flex items-center gap-2 transition-colors shadow-md">
            <DollarSign size={16} /> Novo Lançamento
        </button>
      </div>

      {activeTab === 'TRANSACTIONS' ? (
          <>
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm font-bold text-slate-500">Total Despesas</p>
                    <p className="text-2xl font-bold text-slate-800">R$ {totals.expenses.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm font-bold text-slate-500">Total Receitas</p>
                    <p className="text-2xl font-bold text-slate-800">R$ {totals.income.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm font-bold text-slate-500">A Pagar (Pendente)</p>
                    <p className="text-2xl font-bold text-slate-800">R$ {totals.pendingExpense.toLocaleString('pt-BR')}</p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FileText size={20} className="text-pms-600"/> Lançamentos</h3>
                    <select className="border border-slate-300 rounded text-sm p-1" value={viewFilter} onChange={(e) => setViewFilter(e.target.value as any)}>
                        <option value="ALL">Todos</option>
                        <option value="EXPENSE">Despesas</option>
                        <option value="INCOME">Receitas</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr><th className="px-6 py-4">Data</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4">Valor</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ações</th></tr>
                        </thead>
                        <tbody>
                            {records
                                .filter(r => {
                                    if (viewFilter === 'ALL') return true;
                                    if (viewFilter === 'PENDING') return r.status === 'Pendente';
                                    if (viewFilter === 'EXPENSE') return r.type === FinanceType.EXPENSE;
                                    if (viewFilter === 'INCOME') return r.type === FinanceType.INCOME;
                                    return false;
                                })
                                .sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
                                .map(rec => (
                                <tr key={rec.id} className="hover:bg-slate-50 border-b border-slate-100">
                                    <td className="px-6 py-4">{new Date(rec.dueDate).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold">{rec.description}</div>
                                        <div className="text-xs text-slate-500">{rec.category}</div>
                                        {rec.items && rec.items.length > 0 && (
                                            <div className="mt-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit flex items-center gap-1">
                                                <ShoppingCart size={10}/> {rec.items.length} itens detalhados
                                            </div>
                                        )}
                                    </td>
                                    <td className={`px-6 py-4 font-bold ${rec.type === FinanceType.INCOME ? 'text-green-600' : 'text-red-600'}`}>R$ {rec.amount.toLocaleString('pt-BR')}</td>
                                    <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded font-bold ${rec.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{rec.status}</span></td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleOpenModal(rec)} className="text-slate-400 hover:text-blue-600 p-1 rounded"><Edit2 size={16}/></button>
                                        <button onClick={() => onDeleteRecord && onDeleteRecord(rec.id)} className="text-slate-400 hover:text-red-600 p-1 rounded"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </>
      ) : (
          <div className="p-10 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
              <Ruler size={48} className="mx-auto mb-4 opacity-20"/>
              <p>Módulo de Medição Física em desenvolvimento.</p>
          </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <DollarSign className="text-pms-600" /> {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
             </div>

             <div className="space-y-5">
                <div className="flex gap-4 mb-2">
                    <button onClick={() => setType(FinanceType.EXPENSE)} className={`flex-1 p-2 rounded border font-bold text-sm ${type === FinanceType.EXPENSE ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white text-slate-500'}`}>Despesa</button>
                    <button onClick={() => setType(FinanceType.INCOME)} className={`flex-1 p-2 rounded border font-bold text-sm ${type === FinanceType.INCOME ? 'bg-green-50 border-green-500 text-green-600' : 'bg-white text-slate-500'}`}>Receita</button>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                   <input type="text" className="w-full border rounded p-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Nota Fiscal 123 - Material" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Valor Total (R$)</label>
                      <input type="number" className="w-full border rounded p-2 font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" disabled={showItems}/>
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Vencimento</label>
                      <input type="date" className="w-full border rounded p-2" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                   </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                    <select className="w-full border rounded p-2" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                        <option value="Pendente">Pendente</option>
                        <option value="Pago">Pago</option>
                    </select>
                </div>

                {/* ITEM BREAKDOWN TOGGLE */}
                <div className="border-t pt-4">
                    <button onClick={() => setShowItems(!showItems)} className="flex items-center gap-2 text-sm font-bold text-pms-600 hover:text-pms-700">
                        {showItems ? <X size={16}/> : <ShoppingCart size={16}/>}
                        {showItems ? 'Ocultar Detalhamento' : 'Destrinchar Itens (Materiais)'}
                    </button>
                    
                    {showItems && (
                        <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-2">Ao salvar, estes itens serão adicionados ao estoque automaticamente.</p>
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-2 mb-2 items-center">
                                    <input placeholder="Item" className="flex-1 border rounded p-1 text-xs" value={item.itemName} onChange={e => handleItemChange(idx, 'itemName', e.target.value)}/>
                                    <input placeholder="Qtd" type="number" className="w-16 border rounded p-1 text-xs" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)}/>
                                    <input placeholder="Un" className="w-14 border rounded p-1 text-xs" value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)}/>
                                    <input placeholder="R$ Unit" type="number" className="w-20 border rounded p-1 text-xs" value={item.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}/>
                                    <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                                </div>
                            ))}
                            <button onClick={() => setItems([...items, {itemName:'', quantity:1, unit:'un', unitPrice:0, totalPrice:0}])} className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2">
                                <Plus size={12}/> Adicionar Item
                            </button>
                        </div>
                    )}
                </div>
             </div>

             <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-slate-100">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button onClick={handleSave} className="px-5 py-2 bg-pms-600 text-white rounded-lg font-bold">Salvar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
