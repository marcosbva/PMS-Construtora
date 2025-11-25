import React, { useMemo } from 'react';
import { DailyLog, WORKFORCE_ROLES_LIST } from '../types';
import { Users, HardHat, TrendingUp, Calendar, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface WorkforceSummaryProps {
  logs: DailyLog[];
  title?: string;
}

// Updated colors for Gold Theme
const COLORS = ['#c59d45', '#f97316', '#8b5cf6', '#10b981', '#f43f5e', '#eab308', '#6366f1', '#ec4899', '#64748b'];

export const WorkforceSummary: React.FC<WorkforceSummaryProps> = ({ logs, title = "Resumo de Efetivo" }) => {
  
  const stats = useMemo(() => {
    let totalManDays = 0;
    const roleCounts: Record<string, number> = {};
    const uniqueDays = new Set(logs.map(l => l.date)).size;

    logs.forEach(log => {
      if (log.workforce) {
        Object.entries(log.workforce).forEach(([role, val]) => {
          const count = val as number;
          totalManDays += count;
          roleCounts[role] = (roleCounts[role] || 0) + count;
        });
      }
    });

    const averageDaily = uniqueDays > 0 ? (totalManDays / uniqueDays) : 0;

    const chartData = Object.entries(roleCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalManDays, averageDaily, chartData, uniqueDays };
  }, [logs]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <HardHat size={18} className="text-pms-600" />
          {title}
        </h3>
        <p className="text-xs text-slate-500">Histórico acumulado de profissionais.</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Big Numbers */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <span className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Total (Homem-Dia)</span>
                <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-slate-800">{stats.totalManDays}</span>
                    <Users size={16} className="text-blue-400 mb-1" />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight mt-1">Soma de todos os diários.</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                <span className="text-[10px] font-bold text-orange-600 uppercase block mb-1">Média Diária</span>
                <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-slate-800">{stats.averageDaily.toFixed(1)}</span>
                    <TrendingUp size={16} className="text-orange-400 mb-1" />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight mt-1">Pessoas/dia no canteiro.</p>
            </div>
        </div>

        {/* Chart */}
        <div className="h-48 relative">
            <h4 className="text-xs font-bold text-slate-600 mb-2 absolute top-0 left-0 z-10">Distribuição por Função</h4>
            {stats.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={stats.chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {stats.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} dias`, 'Acumulado']} />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                    Sem dados registrados.
                </div>
            )}
        </div>

        {/* Legend / List */}
        <div className="space-y-2 max-h-40 overflow-y-auto custom-scroll pr-1">
            {stats.chartData.map((item, idx) => (
                <div key={item.name} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-slate-600 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{item.value}</span>
                </div>
            ))}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400">
             <Clock size={12} />
             <span>Baseado em {stats.uniqueDays} dias de registro.</span>
        </div>
      </div>
    </div>
  );
};