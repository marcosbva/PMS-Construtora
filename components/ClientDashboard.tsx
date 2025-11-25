
import React, { useState, useMemo } from 'react';
import { ConstructionWork, FinancialRecord, DailyLog, FinanceType, User, MaterialOrder, OrderStatus, Material } from '../types';
import { MapPin, Calendar, TrendingUp, Image as ImageIcon, CheckCircle2, DollarSign, Clock, Phone, AlertCircle, Package, ChevronRight, ArrowRight, Home, Ruler, PaintBucket, CheckSquare } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ClientDashboardProps {
  currentUser: User;
  users: User[]; // Users list to find the responsible engineer
  works: ConstructionWork[];
  finance: FinancialRecord[];
  logs: DailyLog[];
  orders: MaterialOrder[];
  materials: Material[];
  companySettings?: { name?: string, logoUrl?: string, phone?: string } | null;
}

// Chart Colors
const COLORS = ['#10b981', '#e2e8f0']; // Green (Paid), Slate (Remaining)

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ currentUser, users, works, finance, logs, orders, materials, companySettings }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FINANCE' | 'MATERIALS' | 'GALLERY'>('OVERVIEW');

  // SECURITY: Strictly filter work by Client ID
  const myWork = useMemo(() => {
    return works.find(w => w.clientId === currentUser.id);
  }, [works, currentUser.id]);

  // Find Responsible Engineer
  const responsibleEngineer = useMemo(() => {
      if (!myWork || !myWork.responsibleId) return null;
      return users.find(u => u.id === myWork.responsibleId);
  }, [myWork, users]);

  // Filter related data based on the identified work
  const myFinance = useMemo(() => {
    if (!myWork) return [];
    return finance.filter(f => f.workId === myWork.id && f.type === FinanceType.EXPENSE);
  }, [finance, myWork]);

  const myLogs = useMemo(() => {
    if (!myWork) return [];
    // Get logs with images, sort desc by date
    return logs
        .filter(l => l.workId === myWork.id && l.images && l.images.length > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, myWork]);

  const myOrders = useMemo(() => {
      if (!myWork) return [];
      return orders.filter(o => 
          o.workId === myWork.id && 
          (o.status === OrderStatus.PURCHASED || o.status === OrderStatus.DELIVERED)
      ).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [orders, myWork]);

  // --- FINANCIAL CALCULATIONS ---
  const financialStats = useMemo(() => {
      if (!myWork) return { totalContract: 0, paid: 0, remaining: 0, percentPaid: 0 };

      const paid = myFinance
        .filter(f => f.status === 'Pago')
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      // Use the Work Budget as the Total Contract Value. 
      // If budget is 0 (not set), fall back to sum of expenses + pending (estimate)
      let totalContract = myWork.budget; 
      
      if (totalContract === 0) {
          const pending = myFinance
            .filter(f => f.status === 'Pendente')
            .reduce((acc, curr) => acc + curr.amount, 0);
          totalContract = paid + pending; 
      }

      const remaining = Math.max(0, totalContract - paid);
      const percentPaid = totalContract > 0 ? Math.round((paid / totalContract) * 100) : 0;

      return { totalContract, paid, remaining, percentPaid };
  }, [myFinance, myWork]);

  // --- TIMELINE LOGIC (Inferred from Progress) ---
  const timelineStages = useMemo(() => {
      if (!myWork) return [];
      const p = myWork.progress;
      
      return [
          { label: 'Projetos', icon: <Ruler size={18}/>, status: p >= 10 ? 'DONE' : 'CURRENT' },
          { label: 'Fundação', icon: <ArrowRight size={18} className="rotate-90"/>, status: p >= 30 ? 'DONE' : (p >= 10 ? 'CURRENT' : 'WAITING') },
          { label: 'Estrutura', icon: <Home size={18}/>, status: p >= 60 ? 'DONE' : (p >= 30 ? 'CURRENT' : 'WAITING') },
          { label: 'Acabamento', icon: <PaintBucket size={18}/>, status: p >= 90 ? 'DONE' : (p >= 60 ? 'CURRENT' : 'WAITING') },
          { label: 'Entrega', icon: <CheckSquare size={18}/>, status: p >= 100 ? 'DONE' : (p >= 90 ? 'CURRENT' : 'WAITING') },
      ];
  }, [myWork]);

  const recentPhotos = useMemo(() => {
      const photos: { url: string, date: string, label: string }[] = [];
      myLogs.slice(0, 3).forEach(log => { // Take from top 3 logs
          if (log.images[0]) {
              photos.push({ url: log.images[0], date: log.date, label: log.content });
          }
      });
      return photos;
  }, [myLogs]);

  // Helper to get material category
  const getMaterialCategory = (itemName: string) => {
      const mat = materials.find(m => m.name === itemName);
      return mat ? mat.category : '-';
  };

  // CONTACT LINKS
  const waNumber = responsibleEngineer?.phone ? responsibleEngineer.phone.replace(/\D/g, '') : '';
  const waLink = waNumber ? `https://wa.me/55${waNumber}` : '#';
  const officePhone = companySettings?.phone ? companySettings.phone.replace(/\D/g, '') : '';

  if (!myWork) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8 text-center">
        <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center mb-6">
            <AlertCircle size={40} className="text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Área do Cliente</h2>
        <p className="text-slate-500 max-w-md">
          Não encontramos um projeto ativo vinculado ao seu perfil. Por favor, entre em contato com a administração.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      
      {/* 1. HERO SECTION */}
      <div className="relative w-full h-[380px] md:h-[450px] bg-slate-900">
          <div className="absolute inset-0">
              <img 
                src={myWork.imageUrl || 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2531&auto=format&fit=crop'} 
                alt="Capa" 
                className="w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent"></div>
          </div>

          <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 max-w-7xl mx-auto">
              <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                  Painel do Cliente
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">{myWork.name}</h1>
              <p className="text-white/80 flex items-center gap-2 text-sm md:text-base mb-8">
                  <MapPin size={18} className="text-pms-400"/> {myWork.address}
              </p>

              {/* Large Progress Bar */}
              <div className="max-w-xl">
                  <div className="flex justify-between text-white text-sm font-bold mb-2 uppercase tracking-wide">
                      <span>Progresso Geral</span>
                      <span className="text-pms-400">{myWork.progress}% Concluído</span>
                  </div>
                  <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                      <div 
                          className="h-full bg-gradient-to-r from-pms-600 to-pms-400 shadow-[0_0_15px_rgba(197,157,69,0.6)] transition-all duration-1000 ease-out" 
                          style={{ width: `${myWork.progress}%` }}
                      />
                  </div>
              </div>
          </div>
      </div>

      {/* 2. FLOATING STATS CARDS */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto -mt-16 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-xl border border-slate-100 flex items-center gap-4 transform hover:-translate-y-1 transition-transform">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Calendar size={24}/></div>
                  <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Início da Obra</p>
                      <p className="text-lg font-bold text-slate-800">{myWork.startDate ? new Date(myWork.startDate).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-xl border border-slate-100 flex items-center gap-4 transform hover:-translate-y-1 transition-transform">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-full"><Clock size={24}/></div>
                  <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Previsão de Entrega</p>
                      <p className="text-lg font-bold text-slate-800">{myWork.endDate ? new Date(myWork.endDate).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-xl border border-slate-100 flex items-center gap-4 transform hover:-translate-y-1 transition-transform">
                  <div className="p-3 bg-green-50 text-green-600 rounded-full"><CheckCircle2 size={24}/></div>
                  <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Status Atual</p>
                      <p className="text-lg font-bold text-slate-800">{myWork.status}</p>
                  </div>
              </div>
          </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto mt-10">
          
          {/* TABS */}
          <div className="flex justify-center md:justify-start gap-2 mb-8 overflow-x-auto pb-2">
              <button onClick={() => setActiveTab('OVERVIEW')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'OVERVIEW' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Visão Geral</button>
              <button onClick={() => setActiveTab('FINANCE')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'FINANCE' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Financeiro</button>
              <button onClick={() => setActiveTab('MATERIALS')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'MATERIALS' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Materiais</button>
              <button onClick={() => setActiveTab('GALLERY')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'GALLERY' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Galeria</button>
          </div>

          {/* TAB CONTENT */}
          <div className="animate-fade-in space-y-8">
              
              {activeTab === 'OVERVIEW' && (
                  <>
                    {/* 3. VISUAL TIMELINE */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-8">Etapas da Construção</h3>
                        <div className="relative">
                            {/* Line */}
                            <div className="absolute top-5 left-0 w-full h-1 bg-slate-100 rounded-full -z-0"></div>
                            
                            <div className="flex justify-between relative z-10">
                                {timelineStages.map((stage, idx) => (
                                    <div key={idx} className="flex flex-col items-center text-center group">
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                                            stage.status === 'DONE' ? 'bg-green-500 border-green-100 text-white shadow-green-200 shadow-lg' :
                                            stage.status === 'CURRENT' ? 'bg-blue-600 border-blue-100 text-white shadow-blue-200 shadow-lg scale-110' :
                                            'bg-white border-slate-200 text-slate-300'
                                        }`}>
                                            {stage.icon}
                                        </div>
                                        <p className={`mt-4 text-xs md:text-sm font-bold ${stage.status === 'WAITING' ? 'text-slate-400' : 'text-slate-700'}`}>
                                            {stage.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 4. ACTIVITY FEED (LATEST PHOTOS) */}
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Aconteceu na Obra</h3>
                        {recentPhotos.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {recentPhotos.map((photo, idx) => (
                                    <div key={idx} className="group relative h-64 rounded-2xl overflow-hidden shadow-sm cursor-pointer">
                                        <img src={photo.url} alt="Feed" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90"></div>
                                        <div className="absolute bottom-0 left-0 p-4 text-white">
                                            <span className="text-[10px] font-bold bg-white/20 backdrop-blur px-2 py-1 rounded mb-2 inline-block">
                                                {new Date(photo.date).toLocaleDateString('pt-BR')}
                                            </span>
                                            <p className="text-sm font-medium line-clamp-2">{photo.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 border-dashed text-center text-slate-400">
                                <ImageIcon size={40} className="mx-auto mb-2 opacity-20"/>
                                <p>Nenhuma atualização fotográfica recente.</p>
                            </div>
                        )}
                    </div>
                  </>
              )}

              {activeTab === 'FINANCE' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* MACRO CHART */}
                      <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center h-[400px]">
                          <h3 className="text-lg font-bold text-slate-800 mb-2 w-full text-left">Resumo Financeiro</h3>
                          <div className="w-full h-64 relative">
                              <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                      <Pie
                                          data={[
                                              { name: 'Pago', value: financialStats.paid },
                                              { name: 'Restante', value: financialStats.remaining }
                                          ]}
                                          cx="50%"
                                          cy="50%"
                                          innerRadius={60}
                                          outerRadius={80}
                                          paddingAngle={5}
                                          dataKey="value"
                                          stroke="none"
                                      >
                                          <Cell fill={COLORS[0]} />
                                          <Cell fill={COLORS[1]} />
                                      </Pie>
                                      <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString()}`} />
                                  </PieChart>
                              </ResponsiveContainer>
                              {/* Center Text */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                  <span className="text-3xl font-bold text-slate-800">{financialStats.percentPaid}%</span>
                                  <span className="text-xs text-slate-400 uppercase font-bold">Quitado</span>
                              </div>
                          </div>
                          <div className="flex justify-center gap-6 w-full mt-4">
                              <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                  <span className="text-sm font-medium text-slate-600">Pago</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                                  <span className="text-sm font-medium text-slate-600">A Pagar</span>
                              </div>
                          </div>
                      </div>

                      {/* NUMBERS & LIST */}
                      <div className="lg:col-span-2 space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg">
                                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Valor Total Contrato (Est.)</p>
                                  <p className="text-2xl font-bold">R$ {financialStats.totalContract.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Total Pago</p>
                                  <p className="text-2xl font-bold text-emerald-600">R$ {financialStats.paid.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                          </div>

                          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                              <div className="p-6 border-b border-slate-100">
                                  <h3 className="font-bold text-slate-800">Próximos Pagamentos (Previsão)</h3>
                              </div>
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left text-sm">
                                      <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                                          <tr>
                                              <th className="px-6 py-4">Vencimento</th>
                                              <th className="px-6 py-4">Descrição</th>
                                              <th className="px-6 py-4 text-right">Valor</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {myFinance
                                              .filter(f => f.status === 'Pendente')
                                              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                                              .slice(0, 5) // Show only top 5
                                              .map(item => (
                                              <tr key={item.id} className="hover:bg-slate-50">
                                                  <td className="px-6 py-4 text-slate-600">{new Date(item.dueDate).toLocaleDateString('pt-BR')}</td>
                                                  <td className="px-6 py-4 font-medium text-slate-800">{item.description}</td>
                                                  <td className="px-6 py-4 text-right font-bold text-slate-800">R$ {item.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                              </tr>
                                          ))}
                                          {myFinance.filter(f => f.status === 'Pendente').length === 0 && (
                                              <tr><td colSpan={3} className="p-8 text-center text-slate-400">Nenhum pagamento pendente.</td></tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'MATERIALS' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800">Materiais no Canteiro</h3>
                          <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{myOrders.length} Itens</span>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                                  <tr>
                                      <th className="px-6 py-4">Data</th>
                                      <th className="px-6 py-4">Material</th>
                                      <th className="px-6 py-4 text-center">Qtd.</th>
                                      <th className="px-6 py-4 text-right">Status</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {myOrders.map(order => (
                                      <tr key={order.id} className="hover:bg-slate-50">
                                          <td className="px-6 py-4 text-slate-500">{new Date(order.requestDate).toLocaleDateString('pt-BR')}</td>
                                          <td className="px-6 py-4 font-medium text-slate-800">
                                              {order.itemName}
                                              <span className="block text-xs text-slate-400 font-normal">{getMaterialCategory(order.itemName)}</span>
                                          </td>
                                          <td className="px-6 py-4 text-center text-slate-700">
                                              <strong>{order.quantity}</strong> {order.unit}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              {order.status === OrderStatus.DELIVERED ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase">
                                                      Entregue
                                                  </span>
                                              ) : (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                                                      Comprado
                                                  </span>
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {activeTab === 'GALLERY' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {myLogs.flatMap(l => l.images.map(img => ({url: img, date: l.date, desc: l.content}))).map((photo, idx) => (
                          <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-200 cursor-pointer">
                              <img src={photo.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy"/>
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                                  <span className="text-xs font-bold">{new Date(photo.date).toLocaleDateString('pt-BR')}</span>
                                  <p className="text-[10px] line-clamp-2 opacity-80">{photo.desc}</p>
                              </div>
                          </div>
                      ))}
                      {myLogs.length === 0 && <div className="col-span-full text-center p-10 text-slate-400">Galeria vazia.</div>}
                  </div>
              )}
          </div>
      </div>

      {/* 5. FLOATING ACTION BUTTON (WHATSAPP) */}
      {responsibleEngineer && waNumber && (
          <a 
            href={waLink} 
            target="_blank" 
            rel="noreferrer"
            className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl hover:shadow-green-500/30 transition-all transform hover:scale-110 flex items-center gap-2 group"
            title="Falar com Engenheiro"
          >
              <Phone size={24} fill="white" />
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap font-bold text-sm">
                  Falar com Engenheiro
              </span>
          </a>
      )}
    </div>
  );
};
