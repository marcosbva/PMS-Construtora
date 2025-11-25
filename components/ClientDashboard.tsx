
import React, { useState, useMemo } from 'react';
import { ConstructionWork, FinancialRecord, DailyLog, FinanceType, User } from '../types';
import { MapPin, Calendar, TrendingUp, Image as ImageIcon, CheckCircle2, DollarSign, Clock, Phone, AlertCircle, ChevronRight, Download } from 'lucide-react';

interface ClientDashboardProps {
  currentUser: User;
  works: ConstructionWork[];
  finance: FinancialRecord[];
  logs: DailyLog[];
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ currentUser, works, finance, logs }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FINANCE' | 'GALLERY'>('OVERVIEW');

  // SECURITY: Strictly filter work by Client ID
  const myWork = useMemo(() => {
    return works.find(w => w.clientId === currentUser.id);
  }, [works, currentUser.id]);

  // Filter related data based on the identified work
  const myFinance = useMemo(() => {
    if (!myWork) return [];
    return finance.filter(f => f.workId === myWork.id && f.type === FinanceType.EXPENSE);
  }, [finance, myWork]);

  const myLogs = useMemo(() => {
    if (!myWork) return [];
    return logs.filter(l => l.workId === myWork.id && l.images && l.images.length > 0);
  }, [logs, myWork]);

  // Calculations
  const totalInvested = useMemo(() => {
    return myFinance
        .filter(f => f.status === 'Pago')
        .reduce((acc, curr) => acc + curr.amount, 0);
  }, [myFinance]);

  const upcomingPayments = useMemo(() => {
    return myFinance
        .filter(f => f.status === 'Pendente')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [myFinance]);

  const galleryImages = useMemo(() => {
      const images: { url: string; date: string; description: string }[] = [];
      myLogs.forEach(log => {
          log.images.forEach(img => {
              images.push({
                  url: img,
                  date: log.date,
                  description: log.content
              });
          });
      });
      // Sort newest first
      return images.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [myLogs]);

  if (!myWork) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-8 text-center">
        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={40} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Nenhuma obra vinculada</h2>
        <p className="text-slate-500 max-w-md">
          Não encontramos um projeto ativo associado ao seu perfil. Entre em contato com a administração da PMS Construtora.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-20 animate-fade-in">
      {/* HERO HEADER */}
      <div className="relative h-64 w-full rounded-2xl overflow-hidden shadow-lg mb-8 group">
        <img 
          src={myWork.imageUrl || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop'} 
          alt="Capa da Obra" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 text-white">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <span className="bg-pms-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                        {myWork.status}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{myWork.name}</h1>
                    <p className="text-white/80 flex items-center gap-2 text-sm">
                        <MapPin size={16} /> {myWork.address}
                    </p>
                </div>
                
                <div className="md:text-right min-w-[200px]">
                    <div className="flex justify-between text-xs font-bold uppercase mb-2 text-pms-300">
                        <span>Progresso Físico</span>
                        <span>{myWork.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                        <div 
                            className="h-full bg-pms-500 shadow-[0_0_10px_rgba(197,157,69,0.5)]" 
                            style={{ width: `${myWork.progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'OVERVIEW' ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <TrendingUp size={18} /> Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('FINANCE')}
            className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'FINANCE' ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <DollarSign size={18} /> Financeiro
          </button>
          <button 
            onClick={() => setActiveTab('GALLERY')}
            className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'GALLERY' ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <ImageIcon size={18} /> Galeria de Fotos
          </button>
      </div>

      {/* CONTENT AREA */}
      <div className="space-y-6">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Calendar className="text-pms-600" size={20}/> Prazos e Datas
                      </h3>
                      <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                              <span className="text-sm text-slate-500">Data de Início</span>
                              <span className="font-bold text-slate-800">
                                  {myWork.startDate ? new Date(myWork.startDate).toLocaleDateString('pt-BR') : '-'}
                              </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                              <span className="text-sm text-slate-500">Previsão de Entrega</span>
                              <span className="font-bold text-slate-800">
                                  {myWork.endDate ? new Date(myWork.endDate).toLocaleDateString('pt-BR') : '-'}
                              </span>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                      <div className="w-16 h-16 bg-pms-100 text-pms-600 rounded-full flex items-center justify-center mb-4">
                          <Phone size={32} />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-2">Fale com o Engenheiro</h3>
                      <p className="text-sm text-slate-500 mb-6">Dúvidas sobre o andamento? Entre em contato direto.</p>
                      <a 
                        href="https://wa.me/5511999999999" // Replace with actual company number
                        target="_blank"
                        rel="noreferrer"
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all transform hover:scale-105"
                      >
                          WhatsApp da Obra <ChevronRight size={16} />
                      </a>
                  </div>
              </div>
          )}

          {/* TAB: FINANCE */}
          {activeTab === 'FINANCE' && (
              <div className="animate-fade-in space-y-6">
                  {/* Investment Card */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                      <p className="text-pms-300 text-sm font-bold uppercase tracking-wider mb-2">Total Investido (Pago)</p>
                      <h2 className="text-4xl md:text-5xl font-bold mb-1">
                          R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h2>
                      <p className="text-slate-400 text-sm">Valores atualizados conforme notas fiscais e recibos.</p>
                  </div>

                  {/* Pending Payments Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2">
                              <Clock className="text-orange-500" size={20} /> Próximos Pagamentos Previstos
                          </h3>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                                  <tr>
                                      <th className="px-6 py-4">Vencimento</th>
                                      <th className="px-6 py-4">Descrição</th>
                                      <th className="px-6 py-4">Categoria</th>
                                      <th className="px-6 py-4 text-right">Valor</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {upcomingPayments.map(item => (
                                      <tr key={item.id} className="hover:bg-slate-50">
                                          <td className="px-6 py-4 font-medium text-slate-700">
                                              {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                                          </td>
                                          <td className="px-6 py-4 text-slate-600">{item.description}</td>
                                          <td className="px-6 py-4">
                                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200">
                                                  {item.category}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right font-bold text-slate-800">
                                              R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          </td>
                                      </tr>
                                  ))}
                                  {upcomingPayments.length === 0 && (
                                      <tr>
                                          <td colSpan={4} className="p-8 text-center text-slate-400">
                                              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500 opacity-50" />
                                              Tudo em dia! Nenhum pagamento pendente.
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: GALLERY */}
          {activeTab === 'GALLERY' && (
              <div className="animate-fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {galleryImages.map((img, idx) => (
                          <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                              <img 
                                src={img.url} 
                                alt={`Registro de ${img.date}`} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                  <p className="text-white text-xs font-bold mb-1">
                                      {new Date(img.date).toLocaleDateString('pt-BR')}
                                  </p>
                                  <p className="text-white/80 text-[10px] line-clamp-2">
                                      {img.description}
                                  </p>
                              </div>
                          </div>
                      ))}
                  </div>
                  {galleryImages.length === 0 && (
                      <div className="p-10 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                          <ImageIcon size={48} className="mx-auto mb-2 text-slate-300" />
                          <p className="text-slate-500">Nenhuma foto registrada no diário de obras ainda.</p>
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};
