

import React, { useMemo, useState, useEffect } from 'react';
import { FinancialRecord, FinanceType, User, ConstructionWork, FinanceCategoryDefinition, WorkBudget, FinancialItemBreakdown, MaterialOrder, OrderStatus, TaskPriority } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, X, Calendar, FileText, Edit2, Trash2, Plus, ShoppingCart, Ruler, ArrowRight, Wallet, AlertCircle, PieChart as PieIcon, List } from 'lucide-react';
import { api } from '../services/api';

interface FinanceViewProps {
  records: FinancialRecord[];
  currentUser: User;
  users: User[];
  work?: ConstructionWork;
  financeCategories?: FinanceCategoryDefinition[];
  onAddRecord: (record: FinancialRecord) => void;
  onUpdateRecord?: (record: FinancialRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
  onAddCategory?: (category: FinanceCategoryDefinition) => void;
}

// Gold & Modern Palette
const COLORS = ['#c59d45', '#64748b', '#ef4444', '#10b981']; 

export const FinanceView: React.FC<FinanceViewProps> = ({ 
    records, currentUser, users, work, financeCategories = [],
    onAddRecord, onUpdateRecord, onDeleteRecord, onAddCategory 
}) => {
  const isGlobal = !work;
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'BUDGET_CONTROL' | 'TRANSACTIONS'>('DASHBOARD');
  
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
  
  // Link to Planning (Budget Category)
  const [relatedBudgetCategoryId, setRelatedBudgetCategoryId] = useState('');
  
  // Item Breakdown State
  const [showItems, setShowItems] = useState(false);
  const [items, setItems] = useState<FinancialItemBreakdown[]>([{ itemName: '', quantity: 1, unit: 'un', unitPrice: 0, totalPrice: 0 }]);

  // Fix infinite loop by checking work.id specifically
  useEffect(() => {
    if (work?.id) api.getBudget(work.id).then(setWorkBudget).catch(console.error);
  }, [work?.id]);

  // --- CALCULATIONS ---

  // 1. General Totals
  const totals = useMemo(() => {
    const expenses = records.filter(r => r.type === FinanceType.EXPENSE && r.status === 'Pago').reduce((acc, curr) => acc + curr.amount, 0);
    const income = records.filter(r => r.type === FinanceType.INCOME && r.status === 'Pago').reduce((acc, curr) => acc + curr.amount, 0);
    const pending = records.filter(r => r.status === 'Pendente').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = income - expenses;
    return { expenses, income, pending, balance };
  }, [records]);

  // 2. Budget vs Actual Logic (The "Controller" View)
  const budgetControl = useMemo(() => {
      if (!workBudget) return [];

      return workBudget.categories.map(cat => {
          // Find expenses linked to this budget category OR matching string name (fallback)
          const categoryExpenses = records
            .filter(r => 
                r.type === FinanceType.EXPENSE && 
                (r.relatedBudgetCategoryId === cat.id || r.category === cat.name)
            )
            .reduce((acc, curr) => acc + curr.amount, 0);

          const progress = cat.categoryTotal > 0 ? (categoryExpenses / cat.categoryTotal) * 100 : 0;
          
          return {
              id: cat.id,
              name: cat.name,
              planned: cat.categoryTotal,
              actual: categoryExpenses,
              balance: cat.categoryTotal - categoryExpenses,
              progress
          };
      });
  }, [workBudget, records]);

  // 3. Chart Data
  const chartData = useMemo(() => {
      return budgetControl.map(b => ({
          name: b.name,
          Orçado: b.planned,
          Realizado: b.actual
      }));
  }, [budgetControl]);


  // --- HANDLERS ---

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
      if (field === 'quantity' || field === 'unitPrice') {
          item.totalPrice = Number(item.quantity) * Number(item.unitPrice);
      }
      newItems[index] = item;
      setItems(newItems);
      const totalAmount = newItems.reduce((acc, i) => acc + i.totalPrice, 0);
      if (totalAmount > 0) setAmount(totalAmount.toString());
  };

  const handleSave = async () => {
    if (!description || !amount || !dueDate) return;
    const validItems = showItems ? items.filter(i => i.itemName.trim() !== '') : [];

    const recordData: FinancialRecord = {
      id: editingId || `fin_${Date.now()}`,
      workId: work?.id || 'global',
      entityId: selectedEntityId || undefined,
      type, category, description, amount: parseFloat(amount), dueDate, status,
      paidDate: status === 'Pago' ? (editingId ? records.find(r=>r.id===editingId)?.paidDate || dueDate : dueDate) : undefined,
      relatedBudgetCategoryId: relatedBudgetCategoryId || undefined, // LINK TO BUDGET
      items: validItems.length > 0 ? validItems : undefined
    };

    if (editingId && onUpdateRecord) onUpdateRecord(recordData);
    else onAddRecord(recordData);

    // Auto-generate orders if items present
    if (!editingId && validItems.length > 0 && work) {
        for (const item of validItems) {
            const order: MaterialOrder = {
                id: `auto_ord_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                workId: work.id,
                requesterId: currentUser.id,
                itemName: item.itemName,
                quantity: Number(item.quantity),
                unit: item.unit,
                status: status === 'Pago' ? OrderStatus.DELIVERED : OrderStatus.PURCHASED,
                priority: TaskPriority.MEDIUM,
                requestDate: dueDate,
                purchaseDate: dueDate,
                deliveryDate: status === 'Pago' ? dueDate : undefined,
                finalCost: item.totalPrice,
                notes: `Gerado via Financeiro: ${description}`
            };
            await api.createOrder(order);
        }
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in bg-slate-50/50 min-h-screen p-6">
      
      {/* 1. HERO HEADER (KPIs) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="text-pms-600" /> {isGlobal ? 'Financeiro Global' : `Controladoria: ${work?.name}`}
          </h2>
          <p className="text-slate-500">Gestão de custos, pagamentos e orçado x realizado.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2 transition-all shadow-lg shadow-slate-900/20">
            <Plus size={18} /> Novo Lançamento
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Orçamento Total</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">R$ {workBudget?.totalValue.toLocaleString('pt-BR') || '0,00'}</p>
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><PieChart size={20}/></div>
              </div>
              <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{width: '100%'}}></div>
              </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Realizado (Pago)</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">R$ {totals.expenses.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><TrendingDown size={20}/></div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-bold text-orange-600">{workBudget?.totalValue ? Math.round((totals.expenses / workBudget.totalValue) * 100) : 0}%</span> do orçamento consumido
              </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">A Pagar (Previsto)</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">R$ {totals.pending.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertCircle size={20}/></div>
              </div>
              <p className="text-xs text-slate-400 mt-4">Compromissos futuros lançados</p>
          </div>

          <div className={`p-5 rounded-xl border shadow-sm ${totals.balance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex justify-between items-start">
                  <div>
                      <p className={`text-xs font-bold uppercase tracking-wider ${totals.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Saldo em Caixa</p>
                      <p className={`text-2xl font-bold mt-1 ${totals.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>R$ {totals.balance.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${totals.balance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}><Wallet size={20}/></div>
              </div>
              <p className={`text-xs mt-4 font-medium ${totals.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Receitas - Despesas Pagas</p>
          </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex gap-2 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('DASHBOARD')} 
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'DASHBOARD' ? 'border-pms-600 text-pms-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <PieIcon size={18}/> Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('BUDGET_CONTROL')} 
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'BUDGET_CONTROL' ? 'border-pms-600 text-pms-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <Ruler size={18}/> Controle Orçamentário
          </button>
          <button 
            onClick={() => setActiveTab('TRANSACTIONS')} 
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'TRANSACTIONS' ? 'border-pms-600 text-pms-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <List size={18}/> Lançamentos (Fluxo)
          </button>
      </div>

      {/* 3. TAB CONTENT */}
      
      {/* --- DASHBOARD TAB --- */}
      {activeTab === 'DASHBOARD' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px]">
              <h3 className="font-bold text-slate-800 mb-6">Orçado vs Realizado (Por Categoria)</h3>
              <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize:12}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                      <Legend />
                      <Bar dataKey="Orçado" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Realizado" fill="#c59d45" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
      )}

      {/* --- BUDGET CONTROL TAB --- */}
      {activeTab === 'BUDGET_CONTROL' && (
          <div className="space-y-4">
              {budgetControl.length > 0 ? budgetControl.map(cat => {
                  const isOverBudget = cat.actual > cat.planned;
                  return (
                      <div key={cat.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                      {isOverBudget ? <AlertCircle size={20}/> : <Wallet size={20}/>}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800">{cat.name}</h4>
                                      <p className="text-xs text-slate-500">Etapa do Planejamento</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <span className={`text-xs font-bold px-2 py-1 rounded border ${isOverBudget ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                      {cat.progress.toFixed(1)}% Consumido
                                  </span>
                              </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                              <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${isOverBudget ? 'bg-red-500' : 'bg-pms-500'}`} 
                                  style={{width: `${Math.min(100, cat.progress)}%`}}
                              ></div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm border-t border-slate-50 pt-3">
                              <div>
                                  <span className="block text-xs text-slate-400 font-bold uppercase">Orçado</span>
                                  <span className="font-bold text-slate-800">R$ {cat.planned.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                              </div>
                              <div>
                                  <span className="block text-xs text-slate-400 font-bold uppercase">Gasto Real</span>
                                  <span className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-slate-800'}`}>R$ {cat.actual.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                              </div>
                              <div className="text-right">
                                  <span className="block text-xs text-slate-400 font-bold uppercase">Saldo</span>
                                  <span className={`font-bold ${cat.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>R$ {cat.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                              </div>
                          </div>
                      </div>
                  )
              }) : (
                  <div className="p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed text-slate-400">
                      <Wallet size={48} className="mx-auto mb-3 opacity-20"/>
                      <p>Nenhuma etapa orçamentária definida. Vá em "Planejamento Integrado" para criar o orçamento.</p>
                  </div>
              )}
          </div>
      )}

      {/* --- TRANSACTIONS TAB (Original List) --- */}
      {activeTab === 'TRANSACTIONS' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                          <tr>
                              <th className="px-6 py-4">Data</th>
                              <th className="px-6 py-4">Descrição</th>
                              <th className="px-6 py-4">Categoria/Vínculo</th>
                              <th className="px-6 py-4">Valor</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {records
                              .sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
                              .map(rec => (
                              <tr key={rec.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 text-slate-600">{new Date(rec.dueDate).toLocaleDateString('pt-BR')}</td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-slate-800">{rec.description}</div>
                                      {rec.items && rec.items.length > 0 && (
                                          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit mt-1">
                                              <ShoppingCart size={10}/> {rec.items.length} itens
                                          </span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-slate-600">{rec.category}</div>
                                      {rec.relatedBudgetCategoryId && workBudget && (
                                          <span className="text-[10px] text-slate-400 block">
                                              Ref: {workBudget.categories.find(c => c.id === rec.relatedBudgetCategoryId)?.name}
                                          </span>
                                      )}
                                  </td>
                                  <td className={`px-6 py-4 font-bold ${rec.type === FinanceType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                                      {rec.type === FinanceType.INCOME ? '+' : '-'} R$ {rec.amount.toLocaleString('pt-BR')}
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${
                                          rec.status === 'Pago' ? 'bg-green-100 text-green-700 border-green-200' : 
                                          rec.status === 'Atrasado' ? 'bg-red-100 text-red-700 border-red-200' :
                                          'bg-yellow-100 text-yellow-700 border-yellow-200'
                                      }`}>
                                          {rec.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                                      <button onClick={() => handleOpenModal(rec)} className="p-1.5 text-slate-400 hover:text-pms-600 bg-slate-100 rounded transition-colors"><Edit2 size={16}/></button>
                                      <button onClick={() => onDeleteRecord && onDeleteRecord(rec.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-100 rounded transition-colors"><Trash2 size={16}/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
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
                {/* Type Selection */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setType(FinanceType.EXPENSE)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${type === FinanceType.EXPENSE ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>Despesa</button>
                    <button onClick={() => setType(FinanceType.INCOME)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${type === FinanceType.INCOME ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}>Receita</button>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                   <input type="text" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Pagamento Material" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                      <input type="number" className="w-full border rounded-lg p-2 text-sm font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" disabled={showItems}/>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimento</label>
                      <input type="date" className="w-full border rounded-lg p-2 text-sm" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                   </div>
                </div>

                {/* Budget Link */}
                {workBudget && type === FinanceType.EXPENSE && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vincular a Etapa do Orçamento</label>
                        <select 
                            className="w-full border rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-pms-500 outline-none"
                            value={relatedBudgetCategoryId}
                            onChange={(e) => setRelatedBudgetCategoryId(e.target.value)}
                        >
                            <option value="">Sem vínculo (Custo Extra)</option>
                            {workBudget.categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name} (Saldo: R$ {(cat.categoryTotal - (budgetControl.find(b=>b.id===cat.id)?.actual || 0)).toLocaleString()})</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                        <select className="w-full border rounded-lg p-2 text-sm bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>
                            {financeCategories.filter(c => c.type === 'BOTH' || c.type === (type === FinanceType.EXPENSE ? 'EXPENSE' : 'INCOME') as 'EXPENSE' | 'INCOME' | 'BOTH').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                        <select className="w-full border rounded-lg p-2 text-sm bg-white" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
                        </select>
                    </div>
                </div>

                {/* ITEM BREAKDOWN */}
                <div className="border-t pt-4">
                    <button onClick={() => setShowItems(!showItems)} className="flex items-center gap-2 text-sm font-bold text-pms-600 hover:text-pms-700 w-full justify-center bg-slate-50 py-2 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                        {showItems ? <X size={16}/> : <ShoppingCart size={16}/>}
                        {showItems ? 'Ocultar Detalhamento de Itens' : 'Destrinchar Itens (Materiais)'}
                    </button>
                    
                    {showItems && (
                        <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in slide-in-from-top-2">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-2 mb-2 items-center">
                                    <input placeholder="Item" className="flex-1 border rounded p-1 text-xs" value={item.itemName} onChange={e => handleItemChange(idx, 'itemName', e.target.value)}/>
                                    <input placeholder="Qtd" type="number" className="w-14 border rounded p-1 text-xs" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)}/>
                                    <input placeholder="Un" className="w-12 border rounded p-1 text-xs" value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)}/>
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
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-sm">Cancelar</button>
                <button onClick={handleSave} className="px-5 py-2 bg-pms-600 text-white rounded-lg font-bold text-sm hover:bg-pms-500 shadow-md">Salvar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
