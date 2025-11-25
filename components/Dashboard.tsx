

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
  BellRing,
  Truck,
  Building2
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
import { ConstructionWork, FinancialRecord, DailyLog, FinanceType, MaterialOrder, OrderStatus, RentalItem, RentalStatus, InventoryItem } from '../types';

// Updated colors to match new Brand Identity (Gold Primary)
const PIE_COLORS = ['#c59d45', '#f97316', '#8b5cf6', '#10b981', '#f43f5e', '#eab308'];

interface KPIState {
  activeWorks: number;
  pendingExpense: number;
  cashBalance: number;
  activeAlerts: number;
  totalAssets: number; // New KPI
}

interface ChartData {
  costByWork: { name: string; value: number }[];
  expensesByCategory: { name: string; value: number }[];
}

interface DashboardProps {
  works: ConstructionWork[];
  finance: FinancialRecord[];
  orders?: MaterialOrder[];
  rentals?: RentalItem[]; 
  inventory?: InventoryItem[]; // Added Inventory prop
  onNavigate?: (view: string) => void; 
}

export const Dashboard: React.FC<DashboardProps> = ({ works, finance, orders = [], rentals = [], inventory = [], onNavigate }) => {
  const [logsLoading, setLogsLoading] = useState(true);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState<string>('ALL');

  const [kpis, setKpis] = useState<KPIState>({
    activeWorks: 0,
    pendingExpense: 0,
    cashBalance: 0,
    activeAlerts: 0,
    totalAssets: 0
  });
  const [charts, setCharts] = useState<ChartData>({
    costByWork: [],
    expensesByCategory: []
  });
  
  const [assetBreakdown, setAssetBreakdown] = useState({ equipment: 0, realEstate: 0 });
  
  const [nextExpenses, setNextExpenses] = useState<FinancialRecord[]>([]);
  const [expiringRentals, setExpiringRentals] = useState<RentalItem[]>([]);

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
    const filteredRentals = selectedWorkId === 'ALL' ? rentals : rentals.filter(r => r.workId === selectedWorkId);
    // Inventory is global, but could be filtered if assigned to work. For "Patrimony" it usually means everything the company owns.
    // If a specific work is selected, we might show equipment *at that work*, but Real Estate is usually corporate level.
    // For simplicity, let's keep Assets global in the main KPI, or filter by 'currentWorkId' if Work is selected.
    
    // Asset Logic:
    let filteredInventory = inventory;
    if (selectedWorkId !== 'ALL') {
        filteredInventory = inventory.filter(i => i.currentWorkId === selectedWorkId);
    }

    calculateMetrics(filteredWorks, filteredFinance, filteredLogs, filteredRentals, filteredInventory);
  }, [works, finance, allLogs, orders, rentals, inventory, selectedWorkId, logsLoading]);

  const calculateMetrics = (currentWorks: ConstructionWork[], currentFinance: FinancialRecord[], currentLogs: DailyLog[], currentRentals: RentalItem[], currentInventory: InventoryItem[]) => {
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

      // ASSET CALCULATION
      let equipmentVal = 0;
      let realEstateEquity = 0;

      currentInventory.forEach(item => {
          if (item.assetType === 'REAL_ESTATE') {
              realEstateEquity += (item.amountPaid || 0);
          } else {
              equipmentVal += (item.estimatedValue || 0);
          }
      });
      
      setAssetBreakdown({ equipment: equipmentVal, realEstate: realEstateEquity });

      const upcoming = currentFinance
        .filter(f => f.type === FinanceType.EXPENSE && f.status === 'Pendente')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5);
      
      setNextExpenses(upcoming);

      // Calculate Expiring Rentals (End Date between today and today+7)
      const today = new Date();
      today.setHours(0,0,0,0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const expiring = currentRentals.filter(r => {
          if (r.status !== RentalStatus.ACTIVE) return false;
          const endDate = new Date(r.endDate);
          endDate.setHours(0,0,0,0); // Normalize time
          return endDate >= today && endDate <= nextWeek;
      });
      setExpiringRentals(expiring);


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
        activeAlerts: alertsCount,
        totalAssets: equipmentVal + realEstateEquity
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

      {/* ASSETS SUMMARY CARD (New Feature) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
          <div className="flex flex-col md:flex-row justify-between items-center relative z-10">
              <div className="mb-4 md:mb-0">
                  <h3 className="text-pms-300 text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Building2 size={16} /> Patrimônio & Ativos
                  </h3>
                  <p className="text-3xl font-bold">R$ {kpis.totalAssets.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-400 mt-1">Valor total acumulado (Pago/Quitado)</p>
              </div>
              
              <div className="flex gap-6 text-sm">
                  <div className="text-right">
                      <span className="text-slate-400 block text-xs uppercase font-bold">Imóveis (Equity)</span>
                      <span className="font-bold text-white text-lg">R$ {assetBreakdown.realEstate.toLocaleString('pt-BR', { notation: 'compact' })}</span>
                  </div>
                  <div className="text-right border-l border-slate-600 pl-6">
                      <span className="text-slate-400 block text-xs uppercase font-bold">Maquinário</span>
                      <span className="font-bold text-white text-lg">R$ {assetBreakdown.equipment.toLocaleString('pt-BR', { notation: 'compact' })}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* ALERTS SECTION (Expiring Rentals) */}
      {expiringRentals.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
              <h3 className="text-red-800 font-bold flex items-center gap-2 mb-3">
                  <BellRing size={20} className="animate-pulse" /> Atenção: Aluguéis Vencendo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {expiringRentals.map(rental => {
                      const workName = works.find(w => w.id === rental.workId)?.name || 'Obra Desconhecida';
                      return (
                          <div key={rental.id} className="bg-white p-3 rounded-lg border border-red-200 shadow-sm flex items-center gap-3">
                              <div className="bg-red-100 p-2 rounded text-red-600">
                                  <Truck size={18} />
                              </div>
                              <div>
                                  <p className="font-bold text-slate-800 text-sm">{rental.itemName}</p>
                                  <p className="text-xs text-slate-500">{workName}</p>
                                  <p className="text-xs font-bold text-red-600 mt-1">
                                      Vence: {new Date(rental.endDate).toLocaleDateString('pt-BR')}
                                  </p>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

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
              <Bar dataKey="value" fill="#c59d45" radius={[0, 4, 4, 0]} barSize={20} />
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
