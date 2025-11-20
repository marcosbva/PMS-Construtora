
import React, { useMemo, useState } from 'react';
import { FinancialRecord, FinanceType, FinanceCategory, User, UserRole, ConstructionWork } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle, X, Calendar, Tag, FileText, Edit2, Trash2, CheckCircle2, ArrowRight, Clock } from 'lucide-react';

interface FinanceViewProps {
  records: FinancialRecord[];
  currentUser: User;
  work?: ConstructionWork; // If null, global view
  onAddRecord: (record: FinancialRecord) => void;
  onUpdateRecord?: (record: FinancialRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
}

const COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#f43f5e'];

export const FinanceView: React.FC<FinanceViewProps> = ({ records, currentUser, work, onAddRecord, onUpdateRecord, onDeleteRecord }) => {
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

  // 15-Day Forecast (Income + Expenses)
  const upcomingSchedule = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const limitDate = new Date(today);
    limitDate.setDate(today.getDate() + 15);

    return records
        .filter(r => {
            if (r.status !== 'Pendente') return false;
            // Manual parsing to avoid timezone shifts
            const [y, m, d] = r.dueDate.split('-').map(Number);
            const rDate = new Date(y, m - 1, d);
            
            return rDate >= today && rDate <= limitDate;
        })
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
    } else {
        setEditingId(null);
        setType(FinanceType.EXPENSE);
        setDescription('');
        setAmount('');
        setDueDate('');
        setStatus('Pendente');
        setCategory(FinanceCategory.MATERIAL);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!description || !amount || !dueDate || !work) return;

    const recordData: FinancialRecord = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      workId: work.id,
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

  return (
    <div className="space-y-6 pb-10 relative">
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

      {/* Transaction List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Lançamentos Detalhados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Vencimento</th>
                <th className="px-6 py-3">Valor</th>
                <th className="px-6 py-3">Status</th>
                {!isGlobal && <th className="px-6 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-900">{record.description}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">{record.category}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(record.dueDate).toLocaleDateString('pt-BR')}</td>
                  <td className={`px-6 py-4 font-bold ${record.type === FinanceType.INCOME ? 'text-green-600' : 'text-slate-700'}`}>
                    {record.type === FinanceType.INCOME ? '+' : '-'} R$ {record.amount.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      record.status === 'Pago' ? 'bg-green-100 text-green-700' : 
                      record.status === 'Atrasado' ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  {!isGlobal && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 15-Day Financial Forecast (Bottom Section) */}
      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden text-white">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
             <h3 className="font-bold flex items-center gap-2">
                <Clock className="text-pms-500" size={20} />
                Cronograma Financeiro (Próximos 15 Dias)
             </h3>
             <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">Receitas e Despesas</span>
          </div>
          
          {upcomingSchedule.length > 0 ? (
             <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {upcomingSchedule.map(record => {
                   const isIncome = record.type === FinanceType.INCOME;
                   const dateObj = new Date(record.dueDate);
                   // Manual UTC fix adjustment for display if needed, but normally Date() treats string as UTC 00:00 if format yyyy-mm-dd
                   const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                   const dayNum = dateObj.getDate() + 1; // Correcting common off-by-one in JS parsing if strictly local
                   const displayDate = new Date(record.dueDate.replace(/-/g, '/')); // Simple trick for browser compatibility

                   return (
                    <div 
                      key={record.id} 
                      onClick={() => handleOpenModal(record)}
                      className={`relative p-4 rounded-lg border cursor-pointer hover:bg-white/5 transition-colors ${
                          isIncome ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
                      }`}
                    >
                        <div className={`absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold uppercase ${
                            isIncome ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                           {isIncome ? 'Receita' : 'Despesa'}
                        </div>
                        
                        <div className="flex gap-3 mb-2">
                            <div className="bg-slate-900/50 rounded px-2 py-1 text-center min-w-[45px]">
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">{displayDate.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0,3)}</span>
                                <span className="block text-lg font-bold leading-none">{displayDate.getDate()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate text-slate-200" title={record.description}>{record.description}</p>
                                <p className="text-xs text-slate-400">{record.category}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                            <span className="text-xs text-slate-400">Valor Previsto</span>
                            <span className={`font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                                R$ {record.amount.toLocaleString('pt-BR')}
                            </span>
                        </div>
                    </div>
                   );
                })}
             </div>
          ) : (
             <div className="p-10 text-center text-slate-400">
                <Calendar className="mx-auto mb-2 opacity-20" size={40} />
                <p>Nenhum lançamento previsto para os próximos 15 dias.</p>
             </div>
          )}
      </div>

      {/* New/Edit Launch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
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

                {/* Description */}
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                   <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Ex: Pagamento Fornecedor ABC"
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
