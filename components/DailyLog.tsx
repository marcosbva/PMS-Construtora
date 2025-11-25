
import React, { useState, useMemo } from 'react';
import { DailyLog, User, Task, WORKFORCE_ROLES_LIST, ISSUE_CATEGORIES_LIST, IssueCategory, IssueSeverity, IssueImpact } from '../types';
import { Camera, Calendar, Sun, Cloud, CloudRain, CloudSnow, Briefcase, CheckCircle2, X, AlertTriangle, Trash2, Plus, Minus, HardHat, Siren, AlertOctagon, ShieldCheck, Flame, Clock, DollarSign, Leaf, HeartPulse, Edit2, CheckSquare, Square, Loader2, Upload, Link as LinkIcon, ChevronDown, ChevronUp, BarChart3, Droplets } from 'lucide-react';
import { api } from '../services/api';
import { uploadFile } from '../services/storage';

interface DailyLogProps {
  logs: DailyLog[];
  users: User[];
  tasks: Task[];
  workId: string;
  currentUser: User;
  onAddLog: (log: DailyLog) => void;
  onUpdateLog?: (log: DailyLog) => void;
  onDeleteLog?: (id: string) => void;
}

export const DailyLogView: React.FC<DailyLogProps> = ({ logs, users, tasks, workId, currentUser, onAddLog, onUpdateLog, onDeleteLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  
  // Expanded State for Accordion View
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState<'Sol' | 'Nublado' | 'Chuva' | 'Neve'>('Sol');
  const [relatedTaskId, setRelatedTaskId] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [type, setType] = useState<'Diário' | 'Vistoria' | 'Alerta' | 'Intercorrência'>('Diário');
  const [content, setContent] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  
  // Workforce State
  const [workforce, setWorkforce] = useState<Record<string, number>>({});
  const [autofillNotice, setAutofillNotice] = useState<string | null>(null);

  // Issue Specific State
  const [issueCategory, setIssueCategory] = useState<IssueCategory | ''>('');
  const [severity, setSeverity] = useState<IssueSeverity>('Baixa');
  const [selectedImpacts, setSelectedImpacts] = useState<IssueImpact[]>([]);
  const [actionPlan, setActionPlan] = useState('');
  const [isResolved, setIsResolved] = useState(false);

  // Upload Modal State
  const [tempLink, setTempLink] = useState('');

  // --- KPI CALCULATIONS ---
  const stats = useMemo(() => {
      const totalDays = logs.length;
      const incidents = logs.filter(l => l.type === 'Intercorrência').length;
      const rainyDays = logs.filter(l => l.weather === 'Chuva').length;
      
      let totalHeadcount = 0;
      logs.forEach(l => {
          if (l.workforce) {
              const values = Object.values(l.workforce) as number[];
              totalHeadcount += values.reduce((a: number, b: number) => a + b, 0);
          }
      });
      const avgHeadcount = totalDays > 0 ? Math.round(totalHeadcount / totalDays) : 0;

      return { totalDays, incidents, rainyDays, avgHeadcount };
  }, [logs]);

  const resetForm = () => {
      setDate(new Date().toISOString().split('T')[0]);
      setWeather('Sol');
      setRelatedTaskId('');
      setSelectedTeamIds([]); 
      setContent('');
      setFormImages([]);
      setWorkforce({});
      setIssueCategory('');
      setSeverity('Baixa');
      setSelectedImpacts([]);
      setActionPlan('');
      setIsResolved(false);
      setEditingLog(null);
      setAutofillNotice(null);
  };

  const handleOpenModal = (forcedType?: 'Intercorrência') => {
      resetForm();
      setType(forcedType || 'Diário');
      setIsModalOpen(true);

      if (!editingLog && (forcedType !== 'Intercorrência')) {
          api.getLastLog(workId).then((lastLog) => {
              if (lastLog && lastLog.workforce && Object.keys(lastLog.workforce).length > 0) {
                  setWorkforce((current) => {
                      if (Object.keys(current).length === 0) {
                          setAutofillNotice(`Dados de efetivo copiados de ${new Date(lastLog.date).toLocaleDateString('pt-BR')}`);
                          setTimeout(() => setAutofillNotice(null), 6000); 
                          return lastLog.workforce!;
                      }
                      return current;
                  });
              }
          }).catch(err => console.warn("Auto-fill failed", err));
      }
  };

  const handleEditClick = (e: React.MouseEvent, log: DailyLog) => {
      e.stopPropagation();
      setEditingLog(log);
      setAutofillNotice(null);
      
      setDate(log.date);
      setWeather(log.weather || 'Sol');
      setRelatedTaskId(log.relatedTaskId || '');
      setSelectedTeamIds(log.teamIds || []);
      setType(log.type);
      setContent(log.content);
      setFormImages(log.images || []);
      setWorkforce(log.workforce || {});
      
      if (log.type === 'Intercorrência') {
          setIssueCategory(log.issueCategory || '');
          setSeverity(log.severity || 'Baixa');
          setSelectedImpacts(log.impacts || []);
          setActionPlan(log.actionPlan || '');
          setIsResolved(log.isResolved || false);
      } else {
          setIsResolved(false);
      }

      setIsModalOpen(true);
  };

  const toggleLogExpansion = (id: string) => {
      setExpandedLogId(prev => prev === id ? null : id);
  };

  const toggleTeamMember = (userId: string) => {
      setSelectedTeamIds(prev => 
          prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
  };

  const toggleImpact = (impact: IssueImpact) => {
      setSelectedImpacts(prev => 
          prev.includes(impact) ? prev.filter(i => i !== impact) : [...prev, impact]
      );
  };

  const updateWorkforce = (role: string, delta: number) => {
      setWorkforce(prev => {
          const current = prev[role] || 0;
          const newCount = Math.max(0, current + delta);
          
          const newWorkforce = { ...prev };
          if (newCount === 0) {
              delete newWorkforce[role];
          } else {
              newWorkforce[role] = newCount;
          }
          return newWorkforce;
      });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setIsProcessingImages(true);
        try {
            const files: File[] = Array.from(e.target.files);
            const uploadPromises = files.map(file => {
                const path = `obras/${workId}/diarios/${date}`;
                return uploadFile(file, path, { 
                    type: 'daily_log_image',
                    author: currentUser.id 
                });
            });
            const uploadedUrls = await Promise.all(uploadPromises);
            setFormImages(prev => [...prev, ...uploadedUrls]);
            setIsUploadModalOpen(false);
        } catch (error: any) {
            alert(`Erro ao enviar imagens: ${error.message}`);
        } finally {
            setIsProcessingImages(false);
        }
    }
  };

  const handleAddLink = () => {
      if (tempLink) {
          setFormImages(prev => [...prev, tempLink]);
          setTempLink('');
      }
  };

  const removeImage = (index: number) => {
      setFormImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
      if (!content) {
          alert("A descrição é obrigatória.");
          return;
      }
      if (type === 'Intercorrência' && !issueCategory) {
          alert("Selecione uma categoria para a intercorrência.");
          return;
      }

      const logData: DailyLog = {
          id: editingLog ? editingLog.id : `log_${Date.now()}`,
          workId,
          authorId: editingLog ? editingLog.authorId : currentUser.id,
          date,
          content,
          images: formImages,
          type,
          weather,
          relatedTaskId: relatedTaskId || undefined,
          teamIds: selectedTeamIds,
          workforce: Object.keys(workforce).length > 0 ? workforce : undefined,
          issueCategory: type === 'Intercorrência' ? (issueCategory as IssueCategory) : undefined,
          isResolved: type === 'Intercorrência' ? isResolved : undefined,
          resolvedAt: (isResolved && !editingLog?.isResolved) ? new Date().toISOString() : editingLog?.resolvedAt,
          resolvedBy: (isResolved && !editingLog?.isResolved) ? currentUser.id : editingLog?.resolvedBy,
          severity: type === 'Intercorrência' ? severity : undefined,
          impacts: type === 'Intercorrência' && selectedImpacts.length > 0 ? selectedImpacts : undefined,
          actionPlan: type === 'Intercorrência' ? actionPlan : undefined
      };

      if (editingLog && onUpdateLog) {
          onUpdateLog(logData);
      } else {
          onAddLog(logData);
      }
      
      setIsModalOpen(false);
      resetForm();
  };

  const handleResolveIssue = (e: React.MouseEvent, log: DailyLog) => {
      e.stopPropagation();
      if (!onUpdateLog) return;
      if (window.confirm("Confirmar que esta intercorrência foi sanada?")) {
          const updatedLog = {
              ...log,
              isResolved: true,
              resolvedAt: new Date().toISOString(),
              resolvedBy: currentUser.id
          };
          onUpdateLog(updatedLog);
      }
  };

  const handleDelete = () => {
      if (!editingLog || !onDeleteLog) return;
      if (window.confirm("Tem certeza que deseja excluir este registro permanentemente?")) {
          onDeleteLog(editingLog.id);
          setIsModalOpen(false);
          resetForm();
      }
  };

  const getWeatherIcon = (w?: string) => {
      switch(w) {
          case 'Sol': return <Sun className="text-orange-500" size={16} />;
          case 'Nublado': return <Cloud className="text-slate-500" size={16} />;
          case 'Chuva': return <CloudRain className="text-blue-500" size={16} />;
          case 'Neve': return <CloudSnow className="text-cyan-500" size={16} />;
          default: return <Sun className="text-slate-400" size={16} />;
      }
  };

  const getImpactIcon = (impact: IssueImpact) => {
      switch(impact) {
          case 'Custo': return <DollarSign size={12} />;
          case 'Prazo': return <Clock size={12} />;
          case 'Segurança': return <HeartPulse size={12} />;
          case 'Qualidade': return <ShieldCheck size={12} />;
          case 'Meio Ambiente': return <Leaf size={12} />;
      }
  }
  
  const getTotalHeadcount = (wf?: Record<string, number>) => {
      if (!wf) return 0;
      return Object.values(wf).reduce((a, b) => a + b, 0);
  };

  const getSeverityColor = (s: IssueSeverity) => {
      switch(s) {
          case 'Baixa': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'Média': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case 'Alta': return 'bg-orange-100 text-orange-700 border-orange-200';
          case 'Crítica': return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
          default: return 'bg-slate-100 text-slate-600';
      }
  }

  const renderIssueModalContent = () => (
      <>
          <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 mb-4 flex justify-between items-center">
              <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500 uppercase">Status Atual</span>
                  <span className={`font-bold ${isResolved ? 'text-green-600' : 'text-red-600'}`}>
                      {isResolved ? 'RESOLVIDO (SANADO)' : 'EM ABERTO'}
                  </span>
              </div>
              <button 
                onClick={() => setIsResolved(!isResolved)}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                    isResolved 
                        ? 'bg-white border border-green-300 text-green-700' 
                        : 'bg-green-600 text-white hover:bg-green-500 shadow-md'
                }`}
              >
                  {isResolved ? <CheckSquare size={18}/> : <Square size={18}/>}
                  {isResolved ? 'Reabrir Intercorrência' : 'Marcar como Sanado'}
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-bold text-red-800 mb-1">Data da Ocorrência</label>
                  <input 
                    type="date" 
                    className="w-full border border-red-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-red-50/30"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-red-800 mb-1 flex items-center gap-1">
                      <AlertTriangle size={14}/> Categoria do Problema
                  </label>
                  <select 
                    className="w-full border border-red-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white"
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value as IssueCategory)}
                  >
                      <option value="">Selecione a natureza do problema...</option>
                      {ISSUE_CATEGORIES_LIST.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                      ))}
                  </select>
              </div>
          </div>

          <div className="bg-red-50/50 p-3 rounded-lg border border-red-100">
              <label className="block text-xs font-bold text-red-800 mb-2 flex items-center gap-1">
                  <Flame size={14} /> Nível de Gravidade
              </label>
              <div className="flex gap-2">
                  {(['Baixa', 'Média', 'Alta', 'Crítica'] as IssueSeverity[]).map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setSeverity(lvl)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                            severity === lvl 
                                ? (lvl === 'Crítica' ? 'bg-red-600 text-white border-red-600' : 
                                   lvl === 'Alta' ? 'bg-orange-500 text-white border-orange-500' :
                                   lvl === 'Média' ? 'bg-yellow-500 text-white border-yellow-500' :
                                   'bg-blue-500 text-white border-blue-500')
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                          {lvl.toUpperCase()}
                      </button>
                  ))}
              </div>
          </div>

          <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                  <AlertOctagon size={14} /> Áreas Impactadas
              </label>
              <div className="flex flex-wrap gap-2">
                  {(['Prazo', 'Custo', 'Qualidade', 'Segurança', 'Meio Ambiente'] as IssueImpact[]).map(imp => (
                      <button
                        key={imp}
                        onClick={() => toggleImpact(imp)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1 transition-all ${
                            selectedImpacts.includes(imp) 
                                ? 'bg-slate-800 text-white border-slate-800' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                          {getImpactIcon(imp)} {imp}
                      </button>
                  ))}
              </div>
          </div>

          <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Descrição Detalhada do Incidente</label>
              <textarea 
                className="w-full border border-red-200 rounded-lg p-3 text-sm outline-none resize-none h-24 focus:ring-2 focus:ring-red-500 bg-red-50/10"
                placeholder="O que aconteceu? Como aconteceu? Quem estava envolvido?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
          </div>

          <div>
              <label className="block text-xs font-bold text-green-700 mb-1 flex items-center gap-1">
                 <ShieldCheck size={14} /> Plano de Ação Imediata / Solução
              </label>
              <textarea 
                className="w-full border border-green-200 rounded-lg p-3 text-sm outline-none resize-none h-20 focus:ring-2 focus:ring-green-500 bg-green-50/10"
                placeholder="O que foi feito imediatamente para conter ou resolver o problema?"
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
              />
          </div>
      </>
  );

  const renderStandardLogContent = () => (
      <>
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                  <input 
                    type="date" 
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Registro</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    disabled={!!editingLog} 
                  >
                      <option value="Diário">Diário Comum</option>
                      <option value="Vistoria">Vistoria Técnica</option>
                      <option value="Alerta">Alerta Geral</option>
                      {!editingLog && <option value="Intercorrência">Intercorrência (Mudar Modo)</option>}
                      {editingLog && type === 'Intercorrência' && <option value="Intercorrência">Intercorrência</option>}
                  </select>
              </div>
          </div>

          <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Clima / Tempo</label>
              <div className="grid grid-cols-4 gap-2">
                  {(['Sol', 'Nublado', 'Chuva', 'Neve'] as const).map((w) => (
                      <button
                        key={w}
                        onClick={() => setWeather(w)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${weather === w ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                      >
                          {getWeatherIcon(w)}
                          <span className="text-[10px] mt-1 font-medium">{w}</span>
                      </button>
                  ))}
              </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 relative">
              {autofillNotice && (
                  <div className="absolute -top-3 left-4 right-4 bg-blue-600 text-white text-[10px] py-1 px-3 rounded-full shadow-md flex items-center justify-center gap-1 animate-in fade-in slide-in-from-top-2 z-10">
                      <CheckCircle2 size={10} /> {autofillNotice}
                  </div>
              )}
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <HardHat size={14} /> Efetivo do Dia (Quantidades)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WORKFORCE_ROLES_LIST.map(role => {
                      const count = workforce[role] || 0;
                      return (
                          <div key={role} className="flex items-center justify-between bg-white p-1.5 rounded border border-slate-200 shadow-sm">
                              <span className="text-[10px] font-medium text-slate-700 truncate max-w-[70px]" title={role}>{role}</span>
                              <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => updateWorkforce(role, -1)}
                                    className={`p-0.5 rounded-full ${count > 0 ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-100 text-slate-300'}`}
                                    disabled={count === 0}
                                  >
                                      <Minus size={10} />
                                  </button>
                                  <span className="text-xs font-bold w-3 text-center">{count}</span>
                                  <button 
                                    onClick={() => updateWorkforce(role, 1)}
                                    className="p-0.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                                  >
                                      <Plus size={10} />
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Equipe Interna (Nominal)</label>
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                  {users.filter(u => u.category === 'INTERNAL').map(u => (
                      <div 
                        key={u.id} 
                        onClick={() => toggleTeamMember(u.id)}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${selectedTeamIds.includes(u.id) ? 'bg-pms-100 border border-pms-300' : 'hover:bg-white'}`}
                      >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedTeamIds.includes(u.id) ? 'bg-pms-600 border-pms-600' : 'border-slate-400 bg-white'}`}>
                              {selectedTeamIds.includes(u.id) && <CheckCircle2 size={12} className="text-white"/>}
                          </div>
                          <span className="text-xs text-slate-700 font-medium">{u.name?.split(' ')[0] || 'N/A'}</span>
                      </div>
                  ))}
              </div>
          </div>

          <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Descrição das Atividades</label>
              <textarea 
                className="w-full border border-slate-300 rounded-lg p-3 text-sm outline-none resize-none h-24 focus:ring-2 focus:ring-pms-500"
                placeholder="Descreva o que foi feito na obra hoje..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
          </div>

          <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Vincular Tarefa (Opcional)</label>
              <select 
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                value={relatedTaskId}
                onChange={(e) => setRelatedTaskId(e.target.value)}
              >
                  <option value="">Sem vínculo específico</option>
                  {tasks.filter(t => t.workId === workId).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
              </select>
          </div>
      </>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* KPI DASHBOARD (COCKPIT) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Dias de Obra</span>
              <div className="flex items-center gap-2 mt-1">
                  <Calendar size={18} className="text-pms-600"/>
                  <span className="text-2xl font-bold text-slate-800">{stats.totalDays}</span>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Dias de Chuva</span>
              <div className="flex items-center gap-2 mt-1">
                  <Droplets size={18} className="text-blue-500"/>
                  <span className="text-2xl font-bold text-slate-800">{stats.rainyDays}</span>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Média Efetivo</span>
              <div className="flex items-center gap-2 mt-1">
                  <HardHat size={18} className="text-orange-500"/>
                  <span className="text-2xl font-bold text-slate-800">{stats.avgHeadcount}</span>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
              {stats.incidents > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full m-2 animate-pulse"></div>}
              <span className="text-xs font-bold text-slate-400 uppercase">Intercorrências</span>
              <div className="flex items-center gap-2 mt-1">
                  <Siren size={18} className="text-red-500"/>
                  <span className="text-2xl font-bold text-red-600">{stats.incidents}</span>
              </div>
          </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
            <h2 className="text-xl font-bold text-slate-800">Linha do Tempo</h2>
            <p className="text-xs text-slate-500">Registro histórico das atividades diárias.</p>
        </div>
        {currentUser.category !== 'CLIENT' && (
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={() => handleOpenModal('Intercorrência')}
                    className="flex-1 sm:flex-none bg-white border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all text-sm font-bold"
                >
                    <AlertTriangle size={16} />
                    Intercorrência
                </button>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex-1 sm:flex-none bg-pms-600 hover:bg-pms-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-md transition-all text-sm font-bold"
                >
                    <Camera size={16} />
                    Novo Diário
                </button>
            </div>
        )}
      </div>

      <div className="space-y-4">
        {logs.length === 0 && (
             <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                <BarChart3 size={32} className="mx-auto mb-2 opacity-20"/>
                <p>Nenhum registro encontrado para esta obra.</p>
             </div>
        )}

        {logs.map((log) => {
          const isExpanded = expandedLogId === log.id;
          const author = users.find(u => u.id === log.authorId);
          const headcount = getTotalHeadcount(log.workforce);
          const isIssue = log.type === 'Intercorrência';
          const canEdit = currentUser.id === log.authorId || currentUser.role === 'ADMIN';
          
          return (
            <div 
                key={log.id} 
                className={`bg-white rounded-lg border shadow-sm transition-all overflow-hidden group ${
                    isIssue 
                        ? (log.isResolved ? 'border-l-4 border-l-green-500 border-slate-200' : 'border-l-4 border-l-red-500 border-red-200 bg-red-50/10') 
                        : 'border-l-4 border-l-pms-600 border-slate-200 hover:border-slate-300'
                }`}
            >
                {/* COMPACT HEADER ROW (ALWAYS VISIBLE) */}
                <div 
                    className="p-3 flex items-center gap-4 cursor-pointer"
                    onClick={() => toggleLogExpansion(log.id)}
                >
                    {/* Date Box */}
                    <div className="flex flex-col items-center justify-center min-w-[3.5rem] text-slate-600">
                        <span className="text-[10px] uppercase font-bold">{new Date(log.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                        <span className="text-lg font-bold leading-none">{new Date(log.date).getDate()}</span>
                        <span className="text-[10px] opacity-70">{new Date(log.date).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0,3)}</span>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {isIssue ? (
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 ${log.isResolved ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                    {log.isResolved ? <ShieldCheck size={10}/> : <Siren size={10}/>} {log.issueCategory || 'Intercorrência'}
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                    {getWeatherIcon(log.weather)} {log.weather}
                                </span>
                            )}
                            
                            {!isIssue && headcount > 0 && (
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                    <HardHat size={10}/> {headcount}
                                </span>
                            )}

                            {log.images.length > 0 && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto sm:ml-0">
                                    <Camera size={10}/> {log.images.length}
                                </span>
                            )}
                        </div>
                        
                        <p className="text-sm text-slate-700 font-medium truncate pr-4">
                            {log.content.split('\n')[0]}
                        </p>
                    </div>

                    {/* Expand/Actions */}
                    <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
                        {canEdit && (
                            <button 
                                onClick={(e) => handleEditClick(e, log)}
                                className="p-1.5 text-slate-400 hover:text-pms-600 hover:bg-slate-100 rounded transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                        <button className={`p-1.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown size={20} />
                        </button>
                    </div>
                </div>

                {/* EXPANDED DETAILS */}
                {isExpanded && (
                    <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 border-t border-slate-100 bg-slate-50/30">
                        
                        {/* Workforce Breakdown (Standard Log) */}
                        {!isIssue && log.workforce && (
                            <div className="mt-3 mb-3 flex flex-wrap gap-2">
                                {Object.entries(log.workforce).map(([role, count]) => (
                                    <span key={role} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 shadow-sm">
                                        <b>{count}</b> {role}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Issue Details */}
                        {isIssue && (
                            <div className="mt-3 mb-3 bg-white p-3 rounded border border-slate-200 shadow-sm">
                                <div className="flex gap-2 mb-2">
                                    {log.severity && <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${getSeverityColor(log.severity)}`}>Gravidade: {log.severity}</span>}
                                </div>
                                {log.actionPlan && (
                                    <div className="text-sm">
                                        <span className="text-xs font-bold text-green-700 uppercase block mb-1">Plano de Ação:</span>
                                        <p className="text-slate-700 bg-green-50 p-2 rounded border border-green-100">{log.actionPlan}</p>
                                    </div>
                                )}
                                {log.impacts && (
                                    <div className="flex gap-1 mt-2">
                                        {log.impacts.map(imp => (
                                            <span key={imp} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                                {getImpactIcon(imp)} {imp}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Full Description */}
                        <div className="mt-3 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded border border-slate-100 shadow-sm">
                            {log.content}
                        </div>

                        {/* Image Grid */}
                        {log.images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                                {log.images.map((img, idx) => (
                                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 relative group cursor-pointer">
                                        <img src={img} alt="Evidence" className="w-full h-full object-cover hover:scale-110 transition-transform" loading="lazy" onClick={() => window.open(img, '_blank')}/>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Footer: Author & Resolution */}
                        <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                                {author && <img src={author.avatar} className="w-5 h-5 rounded-full border border-slate-300"/>}
                                <span>Registrado por <b>{author?.name || 'Desconhecido'}</b></span>
                            </div>
                            
                            {isIssue && !log.isResolved && currentUser.category !== 'CLIENT' && (
                                <button 
                                    onClick={(e) => handleResolveIssue(e, log)}
                                    className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded font-bold shadow-sm transition-colors flex items-center gap-1"
                                >
                                    <ShieldCheck size={12}/> Marcar como Sanado
                                </button>
                            )}
                            {isIssue && log.isResolved && (
                                <span className="text-green-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12}/> Resolvido em {new Date(log.resolvedAt!).toLocaleDateString('pt-BR')}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
          );
        })}
      </div>

      {/* MODALS (UPLOAD & EDIT) - Reusing previous logic, keeping them intact */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className={`bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col border-t-8 ${type === 'Intercorrência' ? 'border-red-600' : 'border-pms-600'}`}>
                  <div className={`flex justify-between items-center mb-4 pb-2 border-b ${type === 'Intercorrência' ? 'border-red-100' : 'border-slate-100'}`}>
                      <h3 className={`text-xl font-bold flex items-center gap-2 ${type === 'Intercorrência' ? 'text-red-600' : 'text-slate-800'}`}>
                          {type === 'Intercorrência' ? <Siren size={24}/> : <Camera size={24} className="text-pms-600"/>} 
                          {editingLog ? 'Editar Registro' : (type === 'Intercorrência' ? 'Reportar Intercorrência' : 'Novo Registro')}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="overflow-y-auto flex-1 pr-2 space-y-4 custom-scroll">
                      {type === 'Intercorrência' ? renderIssueModalContent() : renderStandardLogContent()}

                      <div>
                        <label className={`block text-xs font-bold mb-2 ${type === 'Intercorrência' ? 'text-red-800' : 'text-slate-500'}`}>
                            {type === 'Intercorrência' ? 'Evidências do Problema (Fotos/Vídeos)' : 'Evidências Fotográficas'}
                        </label>
                        
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className={`w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                                type === 'Intercorrência' 
                                    ? 'border-red-200 bg-red-50 hover:bg-red-100 text-red-400' 
                                    : 'border-slate-300 text-slate-400 hover:bg-slate-50 hover:border-pms-400 hover:text-pms-600'
                            }`}
                        >
                            <Camera size={24} className="mb-1"/>
                            <span className="text-xs font-bold">Adicionar Fotos ou Arquivos</span>
                        </button>

                        {formImages.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mt-3">
                                {formImages.map((img, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg border border-slate-200 bg-slate-100 overflow-hidden group">
                                        <img src={img} alt={`Attachment ${index}`} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://placehold.co/100?text=Link')} />
                                        <button 
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                      {editingLog && (
                          <button 
                              onClick={handleDelete}
                              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2 mr-auto border border-transparent hover:border-red-200 transition-all"
                          >
                              <Trash2 size={18} />
                              <span className="hidden sm:inline">Excluir</span>
                          </button>
                      )}

                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                          Cancelar
                      </button>
                      <button 
                        onClick={handleSave} 
                        className={`px-6 py-2 text-white rounded-lg font-bold shadow-lg flex items-center gap-2 ${type === 'Intercorrência' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 'bg-pms-600 hover:bg-pms-500 shadow-pms-600/20'}`}
                      >
                          {type === 'Intercorrência' ? <AlertTriangle size={18}/> : <CheckCircle2 size={18}/>}
                          {editingLog ? 'Salvar Alterações' : (type === 'Intercorrência' ? 'Registrar Ocorrência' : 'Salvar Registro')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800">Adicionar Arquivos</h3>
                      <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="space-y-4">
                      <div className={`bg-slate-50 p-4 rounded-lg border border-slate-200 text-center ${isProcessingImages ? 'opacity-50 pointer-events-none' : ''}`}>
                          <label className="cursor-pointer block">
                              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                  {isProcessingImages ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                              </div>
                              <span className="block font-bold text-slate-700 text-sm">
                                  {isProcessingImages ? 'Enviando para Nuvem...' : 'Do seu Dispositivo'}
                              </span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                multiple 
                                className="hidden" 
                                onChange={handleFileSelect}
                                disabled={isProcessingImages}
                              />
                          </label>
                      </div>

                      <div className="relative flex items-center py-2">
                          <div className="flex-grow border-t border-slate-200"></div>
                          <span className="flex-shrink-0 mx-4 text-xs text-slate-400 font-bold uppercase">OU</span>
                          <div className="flex-grow border-t border-slate-200"></div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Link Externo</label>
                          <div className="flex gap-2">
                              <div className="relative flex-1">
                                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                  <input 
                                    type="text" 
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                                    placeholder="Cole o link aqui..."
                                    value={tempLink}
                                    onChange={(e) => setTempLink(e.target.value)}
                                  />
                              </div>
                              <button 
                                onClick={handleAddLink}
                                disabled={!tempLink}
                                className="px-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50"
                              >
                                  <Plus size={18} />
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="mt-6">
                      <button 
                        onClick={() => setIsUploadModalOpen(false)}
                        className="w-full py-2 bg-pms-600 text-white rounded-lg font-bold hover:bg-pms-500"
                        disabled={isProcessingImages}
                      >
                          Concluir Seleção
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
