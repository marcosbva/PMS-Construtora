

import React, { useMemo, useState } from 'react';
import { FinancialRecord, FinanceType, FinanceCategory, User, UserRole, ConstructionWork } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle, X, Calendar, Tag, FileText, Edit2, Trash2, CheckCircle2, ArrowRight, Clock, User as UserIcon } from 'lucide-react';

interface FinanceViewProps {
  records: FinancialRecord[];
  currentUser: User;
  users: User[]; // To look up Supplier names
  work?: ConstructionWork; // If null, global view
  onAddRecord: (record: FinancialRecord) => void;
  onUpdateRecord?: (record: FinancialRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
}

const COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#f43f5e'];

export const FinanceView: React.FC<FinanceViewProps> = ({ records, currentUser, users, work, onAddRecord, onUpdateRecord, onDeleteRecord }) => {
  const isGlobal = !work;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [type, setType] = useState<FinanceType>(FinanceType.EXPENSE);
  const [category, setCategory] = useState<FinanceCategory>(FinanceCategory.MATERIAL);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'Pendente' | 'Pago' | 'Atrasado'>('Pendente');
  const [selectedEntityId, setSelectedEntityId] = useState(''); // Supplier or Client ID

  // Permission Check
  if (currentUser.role === UserRole.MASTER) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-center text-slate-500">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-yellow-500" />
          <p>Acesso restrito. Contate o administrador.</p>
        </div>
      </div>
    );
  }

  // Calculate Totals
  const totals = useMemo(() => {
    const expenses = records.filter(r => r.type === FinanceType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
    const income = records.filter(r => r.type === FinanceType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
    const pendingExpense = records.filter(r => r.status === 'Pendente' && r.type === FinanceType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
    
    // Income specifics
    const incomeReceived = records.filter(r => r.type === FinanceType.INCOME && r.status === 'Pago').reduce((acc, curr) => acc + curr.amount, 0);
    const incomePending = records.filter(r => r.type === FinanceType.INCOME && r.status === 'Pendente').reduce((acc, curr) => acc + curr.amount, 0);
    
    return { expenses, income, pendingExpense, incomeReceived, incomePending };
  }, [records]);

  // Chart Data: Expenses by Category
  const dataByCategory = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    records.filter(r => r.type === FinanceType.EXPENSE).forEach(r => {
      categoryMap[r.category] = (categoryMap[r.category] || 0) + r.amount;
    });
    return Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] }));
  }, [records]);

  // --- LOGIC CHANGE: AGGREGATE BY SUPPLIER ---
  const financialSummary = useMemo(() => {
      const summary: Record<string, { entityName: string, type: FinanceType, paid: number, pending: number, total: number }> = {};

      records.forEach(record => {
          // If we don't have an entity ID, try to use description or fallback
          const key = record.entityId || record.description; 
          const user = users.find(u => u.id === record.entityId);
          const name = user ? user.name : (record.entityId ? 'Fornecedor Desconhecido' : record.description); // Fallback to desc if no ID

          if (!summary[key]) {
              summary[key] = { entityName: name, type: record.type, paid: 0, pending: 0, total: 0 };
          }

          summary[key].total += record.amount;
          if (record.status === 'Pago') {
              summary[key].paid += record.amount;
          } else {
              summary[key].pending += record.amount;
          }
      });

      return Object.values(summary);
  }, [records, users]);

  // --- LOGIC CHANGE: OPEN INVOICES ONLY ---
  const openInvoices = useMemo(() => {
      return records
        .filter(r => r.status !== 'Pago')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [records]);


  const handleOpenModal = (record?: FinancialRecord) => {
    if (record) {
        setEditingId(record.id);
        setType(record.type);
        setCategory(record.category);
        setDescription(record.description);
        setAmount(record.amount.toString());
        setDueDate(record.dueDate);
        setStatus(record.status as any);
        setSelectedEntityId(record.entityId || '');
    } else {
        setEditingId(null);
        setType(FinanceType.EXPENSE);
        setDescription('');
        setAmount('');
        setDueDate('');
        setStatus('Pendente');
        setCategory(FinanceCategory.MATERIAL);
        setSelectedEntityId('');
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!description || !amount || !dueDate || !work) return;

    const recordData: FinancialRecord = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      workId: work.id,
      entityId: selectedEntityId || undefined,
      type,
      category,
      description,
      amount: parseFloat(amount),
      dueDate,
      status,
      paidDate: status === 'Pago' ? (editingId ? records.find(r=>r.id===editingId)?.paidDate || dueDate : dueDate) : undefined
    };

    if (editingId && onUpdateRecord) {
        onUpdateRecord(recordData);
    } else {
        onAddRecord(recordData);
    }
    
    setIsModalOpen(false);
  };

  const quickPay = (record: FinancialRecord) => {
      if (onUpdateRecord) {
          onUpdateRecord({
              ...record,
              status: 'Pago',
              paidDate: new Date().toISOString().split('T')[0]
          });
      }
  }

  return (
    <div className="space-y-8 pb-10 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">
          {isGlobal ? 'Financeiro Global' : `Financeiro: ${work.name}`}
        </h2>
        <div className="flex gap-2">
            <button className="px-4 py-2 bg-pms-900 text-white rounded-lg text-sm hover:bg-pms-800">
                Relatório PDF
            </button>
            {!isGlobal && (
              <button 
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-pms-600 text-white rounded-lg text-sm hover:bg-pms-500 flex items-center gap-2 transition-colors"
              >
                  <DollarSign size={16} /> Novo Lançamento
              </button>
            )}
        </div>
      </div>

      {/* Summary Cards - General */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg text-red-600"><TrendingDown size={20}/></div>
            <span className="text-sm text-slate-500 font-medium">Total Despesas</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">R$ {totals.expenses.toLocaleString('pt-BR')}</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
           <div className="absolute right-0 top-0 h-full w-1 bg-green-500"></div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg text-green-600"><TrendingUp size={20}/></div>
            <span className="text-sm text-slate-500 font-medium">Total Receitas</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">R$ {totals.income.toLocaleString('pt-BR')}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
           <div className="absolute right-0 top-0 h-full w-1 bg-orange-400"></div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><AlertTriangle size={20}/></div>
            <span className="text-sm text-slate-500 font-medium">A Pagar (Pendente)</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">R$ {totals.pendingExpense.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Graphs Row: Income & Expense Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Income Dashboard Specifics */}
         <div className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="text-green-600" size={20} />
                Dashboard de Receitas
            </h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                    <div>
                        <span className="text-xs font-bold text-green-700 uppercase">Receita Realizada (Pago)</span>
                        <p className="text-2xl font-bold text-green-900 mt-1">R$ {totals.incomeReceived.toLocaleString('pt-BR')}</p>
                    </div>
                    <CheckCircle2 className="text-green-400 h-8 w-8 opacity-50" />
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div>
                        <span className="text-xs font-bold text-blue-700 uppercase">Receita Prevista (A Receber)</span>
                        <p className="text-2xl font-bold text-blue-900 mt-1">R$ {totals.incomePending.toLocaleString('pt-BR')}</p>
                    </div>
                    <Calendar className="text-blue-400 h-8 w-8 opacity-50" />
                </div>
            </div>
        </div>

        {/* Expense Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80">
          <h3 className="font-bold text-slate-700 mb-4">Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataByCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {dataByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip formatter={(value: number) => `R$ ${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 1. SUMMARY TABLE (Replacing Detailed List) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Tag size={20} className="text-pms-600"/>
              Resumo por Fornecedor / Cliente
          </h3>
          <p className="text-xs text-slate-500 mt-1">Consolidado de pagamentos realizados e valores em aberto.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">Fornecedor / Cliente</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3 bg-green-50/50 text-green-700">Já Pago</th>
                <th className="px-6 py-3 bg-orange-50/50 text-orange-700">Em Aberto (A Quitar)</th>
                <th className="px-6 py-3 font-extrabold">Total Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {financialSummary.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{item.entityName}</td>
                  <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${item.type === FinanceType.INCOME ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.type}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-green-600 font-medium bg-green-50/10">
                    R$ {item.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-orange-600 font-bold bg-orange-50/10">
                    {item.pending > 0 ? `R$ ${item.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {financialSummary.length === 0 && (
                  <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum registro financeiro encontrado.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. OPEN INVOICES TABLE (New Section) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-l-4 border-l-orange-400">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
             <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock size={20} className="text-orange-500"/>
                    Boletos e Contas em Aberto
                </h3>
                <p className="text-xs text-slate-500 mt-1">Lista de pendências financeiras (pagas não aparecem aqui).</p>
             </div>
             <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">
                 {openInvoices.length} Pendentes
             </span>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                      <tr>
                          <th className="px-6 py-3">Beneficiário / Pagador</th>
                          <th className="px-6 py-3">Descrição</th>
                          <th className="px-6 py-3">Vencimento</th>
                          <th className="px-6 py-3">Valor</th>
                          <th className="px-6 py-3">Status</th>
                          {!isGlobal && <th className="px-6 py-3 text-right">Ações</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {openInvoices.map(record => {
                          const entity = users.find(u => u.id === record.entityId);
                          const name = entity ? entity.name : (record.entityId ? 'Desconhecido' : 'Geral');
                          const isOverdue = new Date(record.dueDate) < new Date() && record.status !== 'Pago';

                          return (
                            <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-700">
                                    {name}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {record.description}
                                    <div className="text-[10px] text-slate-400 uppercase mt-0.5">{record.category}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                        <Calendar size={14} />
                                        {new Date(record.dueDate).toLocaleDateString('pt-BR')}
                                    </div>
                                </td>
                                <td className={`px-6 py-4 font-bold ${record.type === FinanceType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                                    R$ {record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        record.status === 'Atrasado' || isOverdue ? 'bg-red-100 text-red-700' : 
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {isOverdue ? 'Atrasado' : record.status}
                                    </span>
                                </td>
                                {!isGlobal && (
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Pay Button */}
                                            <button 
                                                onClick={() => quickPay(record)}
                                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1 transition-colors"
                                                title="Dar Baixa (Pago)"
                                            >
                                                <CheckCircle2 size={12} /> Baixar
                                            </button>
                                            <button 
                                                onClick={() => handleOpenModal(record)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            {onDeleteRecord && (
                                                <button 
                                                    onClick={() => onDeleteRecord(record.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                          );
                      })}
                      {openInvoices.length === 0 && (
                          <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                  <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500 opacity-50" />
                                  Tudo em dia! Nenhuma conta em aberto.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* New/Edit Launch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <DollarSign className="text-pms-600" /> {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                   <X size={24} />
                </button>
             </div>

             <div className="space-y-5">
                {/* Type Selection */}
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Operação</label>
                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setType(FinanceType.INCOME)}
                        className={`p-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === FinanceType.INCOME ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      >
                         <TrendingUp size={18} /> Receita (Entrada)
                      </button>
                      <button 
                        onClick={() => setType(FinanceType.EXPENSE)}
                        className={`p-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === FinanceType.EXPENSE ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      >
                         <TrendingDown size={18} /> Despesa (Saída)
                      </button>
                   </div>
                </div>

                {/* Entity Selection (Supplier/Client) */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                        {type === FinanceType.INCOME ? 'Cliente (Pagador)' : 'Fornecedor / Prestador'}
                    </label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                            value={selectedEntityId}
                            onChange={(e) => setSelectedEntityId(e.target.value)}
                        >
                            <option value="">Selecione da lista...</option>
                            {users
                                .filter(u => {
                                    // Filter logic: Expenses -> Suppliers/Employees, Income -> Clients
                                    if (type === FinanceType.EXPENSE) return u.category !== 'CLIENT';
                                    return u.category === 'CLIENT';
                                })
                                .map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.category})</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Vincule para aparecer no Resumo por Fornecedor.</p>
                </div>

                {/* Description */}
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Descrição / Item</label>
                   <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Ex: Parcela 1/3 Cimento"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pms-500 outline-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   {/* Value */}
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Valor (R$)</label>
                      <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                          <input 
                            type="number" 
                            placeholder="0,00"
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pms-500 outline-none font-bold text-slate-700"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                          />
                      </div>
                   </div>
                   {/* Date */}
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Data Vencimento</label>
                      <div className="relative">
                         <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                         <input 
                           type="date" 
                           className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pms-500 outline-none"
                           value={dueDate}
                           onChange={(e) => setDueDate(e.target.value)}
                         />
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Category */}
                    <div>
                       <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                       <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <select 
                             className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                             value={category}
                             onChange={(e) => setCategory(e.target.value as FinanceCategory)}
                          >
                             {Object.values(FinanceCategory).map(c => (
                                <option key={c} value={c}>{c}</option>
                             ))}
                          </select>
                       </div>
                    </div>
                    {/* Status */}
                    <div>
                       <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                       <select 
                          className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pms-500 outline-none font-bold ${status === 'Pago' ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50'}`}
                          value={status}
                          onChange={(e) => setStatus(e.target.value as any)}
                       >
                          <option value="Pendente">Pendente (A Pagar)</option>
                          <option value="Pago">Pago (Realizado)</option>
                          <option value="Atrasado">Atrasado</option>
                       </select>
                    </div>
                </div>
             </div>

             <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!description || !amount || !dueDate}
                  className="px-5 py-2.5 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-bold shadow-lg shadow-pms-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                >
                  {editingId ? 'Salvar Alterações' : 'Criar Lançamento'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};