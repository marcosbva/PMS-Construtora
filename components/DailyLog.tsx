import React, { useState, useMemo } from 'react';
import { DailyLog, User, Task, WORKFORCE_ROLES_LIST, ISSUE_CATEGORIES_LIST, IssueCategory, IssueSeverity, IssueImpact, TaskStatus, DailyLogTaskUpdate } from '../types';
import { Camera, Calendar, Sun, Cloud, CloudRain, CloudSnow, CheckCircle2, X, AlertTriangle, Trash2, Plus, Minus, HardHat, Siren, AlertOctagon, ShieldCheck, Flame, DollarSign, Clock, Leaf, HeartPulse, Edit2, CheckSquare, Square, Loader2, Upload, Link as LinkIcon, ChevronDown, BarChart3, Droplets, Target } from 'lucide-react';
import { api } from '../services/api';
import { uploadFile } from '../services/storage';
import { formatLocalDate, getLocalToday } from '../constants';

interface DailyLogProps {
  logs: DailyLog[];
  users: User[];
  tasks: Task[];
  workId: string;
  currentUser: User;
  onAddLog: (log: DailyLog) => void;
  onUpdateLog?: (log: DailyLog) => void;
  onDeleteLog?: (id: string) => void;
  onUpdateTask?: (task: Task) => void; // New prop to update task progress
}

export const DailyLogView: React.FC<DailyLogProps> = ({ logs, users, tasks, workId, currentUser, onAddLog, onUpdateLog, onDeleteLog, onUpdateTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  
  // Expanded State for Accordion View
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState(getLocalToday());
  const [weather, setWeather] = useState<'Sol' | 'Nublado' | 'Chuva' | 'Neve'>('Sol');
  
  // Task Progress State (The "Big Change")
  // We store temp updates locally before saving
  const [taskUpdates, setTaskUpdates] = useState<DailyLogTaskUpdate[]>([]);
  
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [type, setType] = useState<'Diário' | 'Vistoria' | 'Alerta' | 'Intercorrência'>('Diário');
  const [content, setContent] = useState(''); // Kept as optional general notes
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

  // Active Tasks for Selection
  const activeTasks = useMemo(() => {
      return tasks.filter(t => t.workId === workId && (t.status === TaskStatus.PLANNING || t.status === TaskStatus.EXECUTION || t.status === TaskStatus.NC));
  }, [tasks, workId]);

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
      setDate(getLocalToday());
      setWeather('Sol');
      setTaskUpdates([]);
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
                          setAutofillNotice(`Dados de efetivo copiados de ${formatLocalDate(lastLog.date)}`);
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
      // Load task updates if existing
      setTaskUpdates(log.taskUpdates || []);
      
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

  // --- TASK PROGRESS HANDLERS ---
  const toggleTaskUpdate = (taskId: string) => {
      setTaskUpdates(prev => {
          const exists = prev.find(u => u.taskId === taskId);
          if (exists) {
              return prev.filter(u => u.taskId !== taskId);
          } else {
              return [...prev, { taskId, progressDelta: 0, notes: '' }];
          }
      });
  };

  const updateTaskProgressDelta = (taskId: string, delta: number) => {
      setTaskUpdates(prev => prev.map(u => 
          u.taskId === taskId ? { ...u, progressDelta: Math.max(0, Math.min(100, delta)) } : u
      ));
  };

  // --- SAVE HANDLER ---
  const handleSave = () => {
      if (!content && taskUpdates.length === 0 && type === 'Diário') {
          alert("Indique pelo menos uma atividade realizada ou adicione uma observação.");
          return;
      }
      if (type === 'Intercorrência' && !issueCategory) {
          alert("Selecione uma categoria para a intercorrência.");
          return;
      }

      // 1. Save Log
      const logData: DailyLog = {
          id: editingLog ? editingLog.id : `log_${Date.now()}`,
          workId,
          authorId: editingLog ? editingLog.authorId : currentUser.id,
          date,
          content, // Optional now
          images: formImages,
          type,
          weather,
          taskUpdates, // New Field
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

      // 2. AUTO-UPDATE TASKS (Single Source of Truth Logic)
      if (onUpdateTask) {
          taskUpdates.forEach(update => {
              const task = tasks.find(t => t.id === update.taskId);
              if (task) {
                  // If editing log, we might be double counting if we just add delta.
                  // For simplicity in this prototype, we assume we ADD progress. 
                  // In a real robust system, we'd need to recalc total based on history.
                  // Here, we just Apply the delta to the current task state.
                  
                  // NOTE: If editing an old log, this logic is flawed because it applies progress again.
                  // Ideally, Task Progress should be a computed value from ALL logs.
                  // But for this "ERP Lite" approach, let's just update the Task record forward.
                  
                  if (!editingLog) { // Only apply progress on NEW logs to avoid duplication/confusion
                      const currentProgress = task.physicalProgress || 0;
                      // Don't exceed 100%
                      let newProgress = Math.min(100, currentProgress + update.progressDelta);
                      
                      const updatedTask = {
                          ...task,
                          physicalProgress: newProgress,
                          status: newProgress >= 100 ? TaskStatus.DONE : TaskStatus.EXECUTION
                      };
                      onUpdateTask(updatedTask);
                  }
              }
          });
      }
      
      setIsModalOpen(false);
      resetForm();
  };

  // ... (Rest of handlers like delete, upload, toggleTeamMember are same as before) ...
  const toggleLogExpansion = (id: string) => setExpandedLogId(prev => prev === id ? null : id);
  const toggleTeamMember = (userId: string) => setSelectedTeamIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  const toggleImpact = (impact: IssueImpact) => setSelectedImpacts(prev => prev.includes(impact) ? prev.filter(i => i !== impact) : [...prev, impact]);
  const updateWorkforce = (role: string, delta: number) => {
      setWorkforce(prev => {
          const current = prev[role] || 0;
          const newCount = Math.max(0, current + delta);
          const newWorkforce = { ...prev };
          if (newCount === 0) delete newWorkforce[role];
          else newWorkforce[role] = newCount;
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
                return uploadFile(file, path, { type: 'daily_log_image', author: currentUser.id });
            });
            const uploadedUrls = await Promise.all(uploadPromises);
            setFormImages(prev => [...prev, ...uploadedUrls]);
            setIsUploadModalOpen(false);
        } catch (error: any) { alert(`Erro ao enviar imagens: ${error.message}`); } finally { setIsProcessingImages(false); }
    }
  };
  const handleAddLink = () => { if (tempLink) { setFormImages(prev => [...prev, tempLink]); setTempLink(''); } };
  const removeImage = (index: number) => setFormImages(prev => prev.filter((_, i) => i !== index));
  const handleResolveIssue = (e: React.MouseEvent, log: DailyLog) => {
      e.stopPropagation(); if (!onUpdateLog) return;
      if (window.confirm("Confirmar que esta intercorrência foi sanada?")) {
          onUpdateLog({ ...log, isResolved: true, resolvedAt: new Date().toISOString(), resolvedBy: currentUser.id });
      }
  };
  const handleDelete = () => {
      if (!editingLog || !onDeleteLog) return;
      if (window.confirm("Tem certeza que deseja excluir este registro permanentemente?")) {
          onDeleteLog(editingLog.id); setIsModalOpen(false); resetForm();
      }
  };
  const getWeatherIcon = (w?: string) => { switch(w) { case 'Sol': return <Sun className="text-orange-500" size={16} />; case 'Nublado': return <Cloud className="text-slate-500" size={16} />; case 'Chuva': return <CloudRain className="text-blue-500" size={16} />; case 'Neve': return <CloudSnow className="text-cyan-500" size={16} />; default: return <Sun className="text-slate-400" size={16} />; }};
  const getImpactIcon = (impact: IssueImpact) => { switch(impact) { case 'Custo': return <DollarSign size={12} />; case 'Prazo': return <Clock size={12} />; case 'Segurança': return <HeartPulse size={12} />; case 'Qualidade': return <ShieldCheck size={12} />; case 'Meio Ambiente': return <Leaf size={12} />; }};
  const getTotalHeadcount = (wf?: Record<string, number>) => { if (!wf) return 0; return (Object.values(wf) as number[]).reduce((a: number, b: number) => a + b, 0); };
  const getSeverityColor = (s: IssueSeverity) => { switch(s) { case 'Baixa': return 'bg-blue-100 text-blue-700 border-blue-200'; case 'Média': return 'bg-yellow-100 text-yellow-700 border-yellow-200'; case 'Alta': return 'bg-orange-100 text-orange-700 border-orange-200'; case 'Crítica': return 'bg-red-100 text-red-700 border-red-200 animate-pulse'; default: return 'bg-slate-100 text-slate-600'; }};

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* KPI COCKPIT */}
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
            <p className="text-xs text-slate-500">Registro histórico das atividades.</p>
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

      {/* TIMELINE LIST */}
      <div className="space-y-4">
        {logs.map((log) => {
          const isExpanded = expandedLogId === log.id;
          const author = users.find(u => u.id === log.authorId);
          const headcount = getTotalHeadcount(log.workforce);
          const isIssue = log.type === 'Intercorrência';
          
          return (
            <div 
                key={log.id} 
                className={`bg-white rounded-lg border shadow-sm transition-all overflow-hidden group ${
                    isIssue 
                        ? (log.isResolved ? 'border-l-4 border-l-green-500 border-slate-200' : 'border-l-4 border-l-red-500 border-red-200 bg-red-50/10') 
                        : 'border-l-4 border-l-pms-600 border-slate-200 hover:border-slate-300'
                }`}
            >
                {/* COMPACT HEADER */}
                <div className="p-3 flex items-center gap-4 cursor-pointer" onClick={() => toggleLogExpansion(log.id)}>
                    <div className="flex flex-col items-center justify-center min-w-[3.5rem] text-slate-600">
                        <span className="text-[10px] uppercase font-bold">{formatLocalDate(log.date).split('/')[1]}</span>
                        <span className="text-lg font-bold leading-none">{formatLocalDate(log.date).split('/')[0]}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
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
                            {!isIssue && headcount > 0 && <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1"><HardHat size={10}/> {headcount}</span>}
                            {log.taskUpdates && log.taskUpdates.length > 0 && (
                                <span className="text-[10px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-1"><Target size={10}/> {log.taskUpdates.length} Avanços</span>
                            )}
                        </div>
                        <p className="text-sm text-slate-700 font-medium truncate pr-4">{log.content || (log.taskUpdates && log.taskUpdates.length > 0 ? "Avanço físico registrado" : "Sem observações")}</p>
                    </div>
                    <button className={`p-1.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown size={20} /></button>
                </div>

                {/* EXPANDED */}
                {isExpanded && (
                    <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 border-t border-slate-100 bg-slate-50/30">
                        {!isIssue && log.workforce && (
                            <div className="mt-3 mb-3 flex flex-wrap gap-2">
                                {Object.entries(log.workforce).map(([role, count]) => (
                                    <span key={role} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 shadow-sm"><b>{count}</b> {role}</span>
                                ))}
                            </div>
                        )}

                        {/* Task Updates Display */}
                        {log.taskUpdates && log.taskUpdates.length > 0 && (
                            <div className="mb-3 bg-white p-3 rounded border border-green-200">
                                <span className="text-xs font-bold text-green-700 uppercase block mb-2">Avanço Físico Realizado:</span>
                                {log.taskUpdates.map(update => {
                                    const task = tasks.find(t => t.id === update.taskId);
                                    return (
                                        <div key={update.taskId} className="flex justify-between items-center text-sm border-b border-green-50 last:border-0 py-1">
                                            <span className="text-slate-700">{task?.title || 'Tarefa Desconhecida'}</span>
                                            <span className="font-bold text-green-600">+{update.progressDelta}%</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Image Grid */}
                        {log.images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                                {log.images.map((img, idx) => (
                                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 relative group cursor-pointer">
                                        <img src={img} alt="Evidence" className="w-full h-full object-cover hover:scale-110 transition-transform" onClick={() => window.open(img, '_blank')}/>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                                {author && <img src={author.avatar} className="w-5 h-5 rounded-full border border-slate-300"/>}
                                <span>Registrado por <b>{author?.name || 'Desconhecido'}</b></span>
                            </div>
                            {isIssue && !log.isResolved && currentUser.category !== 'CLIENT' && <button onClick={(e) => handleResolveIssue(e, log)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded font-bold shadow-sm transition-colors flex items-center gap-1"><ShieldCheck size={12}/> Marcar como Sanado</button>}
                        </div>
                    </div>
                )}
            </div>
          );
        })}
      </div>

      {/* EDIT/CREATE MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className={`bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col border-t-8 ${type === 'Intercorrência' ? 'border-red-600' : 'border-pms-600'}`}>
                  <div className={`flex justify-between items-center mb-4 pb-2 border-b ${type === 'Intercorrência' ? 'border-red-100' : 'border-slate-100'}`}>
                      <h3 className={`text-xl font-bold flex items-center gap-2 ${type === 'Intercorrência' ? 'text-red-600' : 'text-slate-800'}`}>
                          {type === 'Intercorrência' ? <Siren size={24}/> : <Camera size={24} className="text-pms-600"/>} 
                          {editingLog ? 'Editar Registro' : (type === 'Intercorrência' ? 'Reportar Intercorrência' : 'Novo Registro')}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                  </div>

                  <div className="overflow-y-auto flex-1 pr-2 space-y-4 custom-scroll">
                      {type === 'Intercorrência' ? (
                          <>
                              {/* ISSUE FORM (Simplified for brevity, assuming standard fields exist) */}
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-xs font-bold text-red-800 mb-1">Data</label><input type="date" className="w-full border rounded p-2" value={date} onChange={e => setDate(e.target.value)} /></div>
                                  <div>
                                      <label className="block text-xs font-bold text-red-800 mb-1">Categoria</label>
                                      <select className="w-full border rounded p-2" value={issueCategory} onChange={e => setIssueCategory(e.target.value as any)}>
                                          <option value="">Selecione...</option>
                                          {ISSUE_CATEGORIES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Descrição</label>
                                  <textarea className="w-full border rounded p-2 h-24" value={content} onChange={e => setContent(e.target.value)} placeholder="O que aconteceu?"/>
                              </div>
                          </>
                      ) : (
                          <>
                              {/* STANDARD LOG FORM */}
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-xs font-bold text-slate-500 mb-1">Data</label><input type="date" className="w-full border rounded p-2" value={date} onChange={e => setDate(e.target.value)}/></div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">Clima</label>
                                      <div className="flex gap-1">{['Sol', 'Nublado', 'Chuva'].map(w => <button key={w} onClick={() => setWeather(w as any)} className={`flex-1 p-1 rounded text-[10px] font-bold border ${weather === w ? 'bg-slate-800 text-white' : 'bg-white'}`}>{w}</button>)}</div>
                                  </div>
                              </div>

                              {/* TASK SELECTION (PHYSICAL PROGRESS) */}
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <label className="block text-xs font-bold text-green-800 mb-2 flex items-center gap-1"><Target size={14}/> Quais tarefas avançaram hoje?</label>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {activeTasks.length > 0 ? activeTasks.map(task => {
                                          const isSelected = taskUpdates.some(u => u.taskId === task.id);
                                          const update = taskUpdates.find(u => u.taskId === task.id);
                                          return (
                                              <div key={task.id} className={`bg-white border p-2 rounded transition-all ${isSelected ? 'border-green-500 ring-1 ring-green-500' : 'border-slate-200'}`}>
                                                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleTaskUpdate(task.id)}>
                                                      <span className="text-sm font-medium text-slate-700 truncate flex-1">{task.title}</span>
                                                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                                                          {isSelected && <CheckCircle2 size={12} className="text-white"/>}
                                                      </div>
                                                  </div>
                                                  {isSelected && update && (
                                                      <div className="mt-2 pt-2 border-t border-slate-100">
                                                          <div className="flex items-center gap-2 mb-1">
                                                              <span className="text-xs text-slate-500">Avanço Hoje:</span>
                                                              <input 
                                                                type="range" min="0" max="100" step="5" 
                                                                value={update.progressDelta} 
                                                                onChange={(e) => updateTaskProgressDelta(task.id, parseInt(e.target.value))}
                                                                className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                                                              />
                                                              <span className="text-xs font-bold text-green-700 w-8 text-right">+{update.progressDelta}%</span>
                                                          </div>
                                                          <p className="text-[10px] text-slate-400">Progresso atual acumulado: {task.physicalProgress || 0}%</p>
                                                      </div>
                                                  )}
                                              </div>
                                          );
                                      }) : <p className="text-xs text-slate-400 italic">Nenhuma tarefa em execução.</p>}
                                  </div>
                              </div>

                              {/* WORKFORCE */}
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2"><HardHat size={14} /> Efetivo do Dia</label>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {WORKFORCE_ROLES_LIST.map(role => {
                                          const count = workforce[role] || 0;
                                          return (
                                              <div key={role} className="flex items-center justify-between bg-white p-1.5 rounded border border-slate-200">
                                                  <span className="text-[10px] font-medium text-slate-700 truncate max-w-[70px]">{role}</span>
                                                  <div className="flex items-center gap-1">
                                                      <button onClick={() => updateWorkforce(role, -1)} className="p-0.5 rounded-full bg-slate-100" disabled={count === 0}><Minus size={10} /></button>
                                                      <span className="text-xs font-bold w-3 text-center">{count}</span>
                                                      <button onClick={() => updateWorkforce(role, 1)} className="p-0.5 rounded-full bg-green-100 text-green-600"><Plus size={10} /></button>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>

                              <div><label className="block text-xs font-bold text-slate-500 mb-1">Observações Gerais (Opcional)</label><textarea className="w-full border rounded p-2 h-20 text-sm" value={content} onChange={e => setContent(e.target.value)} placeholder="Outras ocorrências..."/></div>
                          </>
                      )}

                      {/* PHOTOS */}
                      <button onClick={() => setIsUploadModalOpen(true)} className="w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-slate-400">
                          <Camera size={24} className="mb-1"/><span className="text-xs font-bold">Adicionar Fotos</span>
                      </button>
                      {formImages.length > 0 && <div className="grid grid-cols-4 gap-2">{formImages.map((img, i) => <div key={i} className="aspect-square rounded bg-slate-100 relative"><img src={img} className="w-full h-full object-cover"/><button onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"><X size={10}/></button></div>)}</div>}
                  </div>

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg">Cancelar</button>
                      <button onClick={handleSave} className="px-6 py-2 bg-pms-600 text-white rounded-lg font-bold shadow-lg">Salvar</button>
                  </div>
              </div>
          </div>
      )}
      
      {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Adicionar Arquivos</h3>
                  <label className="cursor-pointer block bg-slate-50 p-4 rounded-lg border border-slate-200 text-center mb-4">
                      {isProcessingImages ? <Loader2 size={24} className="animate-spin mx-auto"/> : <Upload size={24} className="mx-auto text-blue-600 mb-2"/>}
                      <span className="text-sm font-bold text-slate-700">Upload do Dispositivo</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={isProcessingImages}/>
                  </label>
                  <button onClick={() => setIsUploadModalOpen(false)} className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg font-bold">Fechar</button>
              </div>
          </div>
      )}
    </div>
  );
};