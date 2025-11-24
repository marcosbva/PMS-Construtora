import React, { useEffect, useState } from 'react';
import { 
  Briefcase, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  Loader2 
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
import { ConstructionWork, FinancialRecord, DailyLog, FinanceType } from '../types';

const PIE_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#f43f5e', '#eab308'];

interface KPIState {
  activeWorks: number;
  pendingExpense: number;
  totalWorkforce: number;
  activeAlerts: number;
}

interface ChartData {
  costByWork: { name: string; value: number }[];
  expensesByCategory: { name: string; value: number }[];
}

interface DashboardProps {
  works: ConstructionWork[];
  finance: FinancialRecord[];
}

export const Dashboard: React.FC<DashboardProps> = ({ works, finance }) => {
  const [logsLoading, setLogsLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIState>({
    activeWorks: 0,
    pendingExpense: 0,
    totalWorkforce: 0,
    activeAlerts: 0
  });
  const [charts, setCharts] = useState<ChartData>({
    costByWork: [],
    expensesByCategory: []
  });

  // Fetch logs in real-time locally for the dashboard
  useEffect(() => {
    // Only subscribe to logs here, works and finance come from props
    const unsubLogs = api.subscribeToAllLogs((logs) => {
        calculateMetrics(works, finance, logs);
        setLogsLoading(false);
    });

    return () => unsubLogs();
  }, [works, finance]); // Recalculate if props change

  const calculateMetrics = (works: ConstructionWork[], finance: FinancialRecord[], logs: DailyLog[]) => {
      // --- KPI CALCULATIONS ---
      const activeWorksCount = works.filter(w => w.status !== 'Concluída').length;

      const pendingExpenseTotal = finance
        .filter(f => f.type === FinanceType.EXPENSE && f.status === 'Pendente')
        .reduce((acc, curr) => acc + curr.amount, 0);

      // Workforce calculation logic
      const latestLogsByWork: Record<string, DailyLog> = {};
      logs.forEach(log => {
        if (!latestLogsByWork[log.workId] || new Date(log.date) > new Date(latestLogsByWork[log.workId].date)) {
          latestLogsByWork[log.workId] = log;
        }
      });

      let workforceCount = 0;
      Object.values(latestLogsByWork).forEach(log => {
        if (log.workforce) {
          workforceCount += Object.values(log.workforce).reduce((a, b) => a + b, 0);
        }
      });

      const alertsCount = logs.filter(l => l.type === 'Intercorrência' && !l.isResolved).length;

      // --- CHARTS ---
      const workExpenses: Record<string, number> = {};
      const workNames: Record<string, string> = {};
      
      works.forEach(w => workNames[w.id] = w.name);

      finance
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
      finance
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
        totalWorkforce: workforceCount,
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="text-pms-600" /> Painel de Controle
        </h2>
        <p className="text-slate-500">Visão executiva em tempo real.</p>
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-purple-300 transition-colors">
          <div>
            <p className="text-sm font-bold text-slate-500">Efetivo em Campo</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{kpis.totalWorkforce}</p>
          </div>
          <div className="p-4 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Users size={24} />
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
      
      <div className="flex justify-end">
          <p className="text-xs text-slate-400 italic flex items-center gap-1">
             <TrendingUp size={12}/> Dados atualizados em tempo real.
          </p>
      </div>
    </div>
  );
};