
import React, { useEffect, useState } from 'react';
import { 
  Briefcase, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  Loader2,
  Filter,
  Wallet,
  Clock,
  Calendar,
  CheckCircle2,
  BellRing
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { api } from '../services/api';
import { ConstructionWork, FinancialRecord, DailyLog, FinanceType, MaterialOrder, OrderStatus } from '../types';

const PIE_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#f43f5e', '#eab308'];

interface KPIState {
  activeWorks: number;
  pendingExpense: number;
  cashBalance: number;
  activeAlerts: number;
}

interface ChartData {
  costByWork: { name: string; value: number }[];
  expensesByCategory: { name: string; value: number }[];
}

interface DashboardProps {
  works: ConstructionWork[];
  finance: FinancialRecord[];
  orders?: MaterialOrder[];
  onNavigate?: (view: string) => void; 
}

export const Dashboard: React.FC<DashboardProps> = ({ works, finance, orders = [], onNavigate }) => {
  const [logsLoading, setLogsLoading] = useState(true);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState<string>('ALL');

  const [kpis, setKpis] = useState<KPIState>({
    activeWorks: 0,
    pendingExpense: 0,
    cashBalance: 0,
    activeAlerts: 0
  });
  const [charts, setCharts] = useState<ChartData>({
    costByWork: [],
    expensesByCategory: []
  });
  
  const [nextExpenses, setNextExpenses] = useState<FinancialRecord[]>([]);

  useEffect(() => {
    const unsubLogs = api.subscribeToAllLogs((logs) => {
        setAllLogs(logs);
        setLogsLoading(false);
    });

    return () => unsubLogs();
  }, []);

  useEffect(() => {
    if (logsLoading) return;

    const filteredWorks = selectedWorkId === 'ALL' ? works : works.filter(w => w.id === selectedWorkId);
    const filteredFinance = selectedWorkId === 'ALL' ? finance : finance.filter(f => f.workId === selectedWorkId);
    const filteredLogs = selectedWorkId === 'ALL' ? allLogs : allLogs.filter(l => l.workId === selectedWorkId);

    calculateMetrics(filteredWorks, filteredFinance, filteredLogs);
  }, [works, finance, allLogs, orders, selectedWorkId, logsLoading]);

  const calculateMetrics = (currentWorks: ConstructionWork[], currentFinance: FinancialRecord[], currentLogs: DailyLog[]) => {
      const activeWorksCount = currentWorks.filter(w => w.status !== 'Concluída').length;

      const pendingExpenseTotal = currentFinance
        .filter(f => f.type === FinanceType.EXPENSE && f.status === 'Pendente')
        .reduce((acc, curr) => acc + curr.amount, 0);

      const totalIncome = currentFinance
        .filter(f => f.type === FinanceType.INCOME && f.status === 'Pago')
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      const totalExpense = currentFinance
        .filter(f => f.type === FinanceType.EXPENSE && f.status === 'Pago')
        .reduce((acc, curr) => acc + curr.amount, 0);
        
      const cash = totalIncome - totalExpense;

      const alertsCount = currentLogs.filter(l => l.type === 'Intercorrência' && !l.isResolved).length;

      const upcoming = currentFinance
        .filter(f => f.type === FinanceType.EXPENSE && f.status === 'Pendente')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5);
      
      setNextExpenses(upcoming);

      const workExpenses: Record<string, number> = {};
      const workNames: Record<string, string> = {};
      
      currentWorks.forEach(w => workNames[w.id] = w.name);

      currentFinance
        .filter(f => f.type === FinanceType.EXPENSE)
        .forEach(f => {
          const wName = workNames[f.workId] || 'Outros';
          workExpenses[wName] = (workExpenses[wName] || 0) + f.amount;
        });

      const costByWorkData = Object.entries(workExpenses)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const catExpenses: Record<string, number> = {};
      currentFinance
        .filter(f => f.type === FinanceType.EXPENSE)
        .forEach(f => {
          const cat = f.category || 'Sem Categoria';
          catExpenses[cat] = (catExpenses[cat] || 0) + f.amount;
        });

      const expensesByCategoryData = Object.entries(catExpenses)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setKpis({
        activeWorks: activeWorksCount,
        pendingExpense: pendingExpenseTotal,
        cashBalance: cash,
        activeAlerts: alertsCount
      });

      setCharts({
        costByWork: costByWorkData,
        expensesByCategory: expensesByCategoryData
      });
  };

  if (logsLoading && works.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Loader2 size={40} className="animate-spin mb-4 text-pms-600" />
        <p>Sincronizando dados em tempo real...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-pms-600" /> Painel de Controle
          </h2>
          <p className="text-slate-500">Visão executiva em tempo real.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <Filter size={18} className="text-slate-400 ml-1" />
            <select 
                value={selectedWorkId} 
                onChange={(e) => setSelectedWorkId(e.target.value)}
                className="bg-transparent outline-none text-sm font-bold text-slate-700 min-w-[200px] cursor-pointer"
            >
                <option value="ALL">Todas as Obras</option>
                {works.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                ))}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-blue-300 transition-colors">
          <div>
            <p className="text-sm font-bold text-slate-500">Obras Ativas</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{kpis.activeWorks}</p>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Briefcase size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-orange-300 transition-colors">
          <div>
            <p className="text-sm font-bold text-slate-500">A Pagar (Pendente)</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">
              R$ {kpis.pendingExpense.toLocaleString('pt-BR', { notation: 'compact' })}
            </p>
          </div>
          <div className="p-4 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-emerald-300 transition-colors">
          <div>
            <p className="text-sm font-bold text-slate-500">Caixa (Realizado)</p>
            <p className={`text-3xl font-bold mt-1 ${kpis.cashBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
               R$ {kpis.cashBalance.toLocaleString('pt-BR', { notation: 'compact' })}
            </p>
          </div>
          <div className={`p-4 rounded-lg transition-colors ${kpis.cashBalance >= 0 ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'}`}>
            <Wallet size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-red-300 transition-colors">
          <div>
            <p className="text-sm font-bold text-slate-500">Intercorrências</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{kpis.activeAlerts}</p>
          </div>
          <div className={`p-4 rounded-lg transition-colors ${kpis.activeAlerts > 0 ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-green-50 text-green-600'}`}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
          <h3 className="font-bold text-slate-800 mb-6">Maiores Custos por Obra</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={charts.costByWork} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100} 
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} 
              />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Gasto Total']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
          <h3 className="font-bold text-slate-800 mb-6">Distribuição de Despesas</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={charts.expensesByCategory}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={5}
                dataKey="value"
              >
                {charts.expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
              <Legend 
                verticalAlign="middle" 
                align="right" 
                layout="vertical"
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row for Details: Upcoming & Works Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Expenses */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[400px]">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="text-orange-500" size={20} />
                      Próximos Compromissos
                  </h3>
                  <p className="text-sm text-slate-500">Contas a pagar mais urgentes.</p>
              </div>
              <div className="p-4 flex-1 overflow-y-auto custom-scroll">
                  {nextExpenses.length > 0 ? (
                      <div className="space-y-3">
                          {nextExpenses.map(item => {
                              const workName = works.find(w => w.id === item.workId)?.name || 'Obra Excluída';
                              const isOverdue = new Date(item.dueDate) < new Date();
                              return (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-orange-200 transition-colors">
                                      <div>
                                          <div className="font-bold text-slate-700 text-sm">{item.description}</div>
                                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                              <Briefcase size={10} /> {workName}
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <div className={`font-bold text-sm ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                                              R$ {item.amount.toLocaleString('pt-BR')}
                                          </div>
                                          <div className={`text-xs font-medium flex items-center justify-end gap-1 mt-1 ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                                              <Calendar size={10} /> {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                                          </div>
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6">
                          <CheckCircle2 size={32} className="mb-2 opacity-50 text-green-500"/>
                          <p>Nenhum pagamento pendente próximo.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Works Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[400px]">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Briefcase className="text-pms-600" size={20} />
                      Resumo de Prazos das Obras
                  </h3>
                  <p className="text-sm text-slate-500">Cronograma macro dos projetos.</p>
              </div>
              <div className="overflow-x-auto overflow-y-auto custom-scroll">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-100 sticky top-0">
                          <tr>
                              <th className="px-6 py-3">Obra</th>
                              <th className="px-6 py-3">Início</th>
                              <th className="px-6 py-3">Término Prev.</th>
                              <th className="px-6 py-3 text-center">Progresso</th>
                              <th className="px-6 py-3 text-right">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {works
                              .filter(w => selectedWorkId === 'ALL' || w.id === selectedWorkId)
                              .map(work => (
                              <tr key={work.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-3 font-medium text-slate-800">{work.name}</td>
                                  <td className="px-6 py-3 text-slate-600">{work.startDate ? new Date(work.startDate).toLocaleDateString('pt-BR') : '-'}</td>
                                  <td className="px-6 py-3 text-slate-600">{work.endDate ? new Date(work.endDate).toLocaleDateString('pt-BR') : '-'}</td>
                                  <td className="px-6 py-3 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                          <span className="text-sm font-bold text-slate-700">{work.progress}%</span>
                                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                                              <div 
                                                  className="h-full bg-pms-600 rounded-full" 
                                                  style={{ width: `${work.progress}%` }}
                                              />
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                                          work.status === 'Concluída' ? 'bg-green-100 text-green-700 border-green-200' :
                                          work.status === 'Pausada' ? 'bg-red-100 text-red-700 border-red-200' :
                                          'bg-blue-100 text-blue-700 border-blue-200'
                                      }`}>
                                          {work.status}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                          {works.length === 0 && (
                              <tr><td colSpan={5} className="p-6 text-center text-slate-400">Nenhuma obra cadastrada.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
      
      <div className="flex justify-end">
          <p className="text-xs text-slate-400 italic flex items-center gap-1">
             <TrendingUp size={12}/> Dados atualizados em tempo real.
          </p>
      </div>
    </div>
  );
};
