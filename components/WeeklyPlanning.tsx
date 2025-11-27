
import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, User, WorkBudget, BudgetCategory } from '../types';
import { api } from '../services/api';
import { Calendar, CheckSquare, Square, ChevronLeft, ChevronRight, Plus, User as UserIcon, ListChecks, AlertCircle, RefreshCw, X, Link as LinkIcon, AlertTriangle, ArrowRight, Clock, CheckCircle2, Ruler, Minus } from 'lucide-react';

interface WeeklyPlanningProps {
  workId: string;
  tasks: Task[];
  users: User[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

// ... (Helper functions keep same) ...
const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getWeekString = (date: Date) => {
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
};

const getDateFromWeek = (weekString: string) => {
    const [year, week] = weekString.split('-W').map(Number);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const weekStart = simple;
    if (dayOfWeek <= 4) weekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else weekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return weekStart;
}

interface MeasureModalProps {
    task: Task;
    stage: BudgetCategory;
    onConfirm: (delta: number) => void;
    onClose: () => void;
}

const MeasureModal: React.FC<MeasureModalProps> = ({ task, stage, onConfirm, onClose }) => {
    const [delta, setDelta] = useState(0);
    const currentProgress = stage.progress || 0;
    const projectedProgress = Math.min(100, currentProgress + delta);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Ruler size={24}/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Medição de Avanço Físico</h3>
                    <p className="text-sm text-slate-500 mt-1">Tarefa: "{task.title}"</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-6">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-500 uppercase">{stage.name}</span>
                        <span className="text-xs font-bold text-slate-700">{currentProgress}% Atual</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                        <div className="h-full bg-slate-400" style={{width: `${currentProgress}%`}}></div>
                        <div className="h-full bg-green-500 relative" style={{width: `${delta}%`}}>
                            {delta > 0 && <div className="absolute inset-0 animate-pulse bg-white/20"></div>}
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-slate-400">Novo Acumulado:</span>
                        <span className={`text-lg font-bold ${delta > 0 ? 'text-green-600' : 'text-slate-600'}`}>{projectedProgress}%</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-700 text-center">Quanto essa tarefa avançou na etapa?</p>
                    
                    {/* Quick Button for 0% */}
                    <button 
                        onClick={() => setDelta(0)}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-all ${delta === 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                        <Minus size={14}/> Apenas Serviço (Limpeza, Apoio, Prep.)
                    </button>

                    {/* Percentage Slider */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>0%</span>
                            <span className="font-bold text-blue-600">+{delta}%</span>
                            <span>{100 - currentProgress}% (Restante)</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max={100 - currentProgress} 
                            step="1"
                            value={delta} 
                            onChange={(e) => setDelta(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex gap-2 justify-center">
                            {[5, 10, 20, 50].map(val => (
                                <button 
                                    key={val}
                                    onClick={() => setDelta(Math.min(100 - currentProgress, val))}
                                    disabled={val > (100 - currentProgress)}
                                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold hover:bg-blue-100 disabled:opacity-30"
                                >
                                    +{val}%
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mt-8 pt-4 border-t border-slate-100">
                    <button onClick={onClose} className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                    <button onClick={() => onConfirm(delta)} className="flex-[2] py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 shadow-lg shadow-green-600/20">
                        Confirmar e Concluir
                    </button>
                </div>
            </div>
        </div>
    );
};

export const WeeklyPlanning: React.FC<WeeklyPlanningProps> = ({ workId, tasks, users, onAddTask, onUpdateTask, onDeleteTask }) => {
  const [selectedWeek, setSelectedWeek] = useState(getWeekString(new Date()));
  const [budget, setBudget] = useState<WorkBudget | null>(null);
  
  // Measure Modal State
  const [measureModal, setMeasureModal] = useState<{task: Task, stage: BudgetCategory} | null>(null);

  // Quick Add State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');

  // Load Budget (Schedule)
  useEffect(() => {
      const loadBudget = async () => {
          const b = await api.getBudget(workId);
          setBudget(b);
      };
      loadBudget();
  }, [workId]);

  const weekRangeLabel = useMemo(() => {
      const weekStart = getDateFromWeek(selectedWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} - ${weekEnd.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}`;
  }, [selectedWeek]);

  // Determine Active Stages from Schedule based on Selected Week
  const activeStages = useMemo(() => {
      if (!budget) return [];
      const weekStart = getDateFromWeek(selectedWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      return budget.categories.filter(cat => {
          if (!cat.startDate || !cat.endDate) return false;
          const start = new Date(cat.startDate);
          const end = new Date(cat.endDate);
          // Check overlapping
          return start <= weekEnd && end >= weekStart;
      });
  }, [budget, selectedWeek]);

  const weeklyTasks = useMemo(() => {
      return tasks.filter(t => t.workId === workId && t.planningWeek === selectedWeek);
  }, [tasks, workId, selectedWeek]);

  const overdueTasks = useMemo(() => {
      return tasks.filter(t => 
          t.workId === workId && 
          t.planningWeek && 
          t.planningWeek < selectedWeek && 
          t.status !== TaskStatus.DONE
      );
  }, [tasks, workId, selectedWeek]);

  const progress = useMemo(() => {
      if (weeklyTasks.length === 0) return 0;
      const completed = weeklyTasks.filter(t => t.status === TaskStatus.DONE).length;
      return Math.round((completed / weeklyTasks.length) * 100);
  }, [weeklyTasks]);

  const handleWeekChange = (direction: 'prev' | 'next') => {
      const [yearStr, weekStr] = selectedWeek.split('-W');
      let year = parseInt(yearStr);
      let week = parseInt(weekStr);

      if (direction === 'prev') {
          week--;
          if (week < 1) { year--; week = 52; }
      } else {
          week++;
          if (week > 52) { year++; week = 1; }
      }
      setSelectedWeek(`${year}-W${week.toString().padStart(2, '0')}`);
  };

  // Helper to create task directly from Stage
  const handleCreateFromStage = (stage: BudgetCategory) => {
      const task: Task = {
          id: `wk_task_${Date.now()}`,
          workId,
          title: `Executar: ${stage.name}`,
          description: 'Tarefa gerada automaticamente via cronograma.',
          status: TaskStatus.PLANNING,
          priority: TaskPriority.MEDIUM,
          planningWeek: selectedWeek,
          dueDate: new Date().toISOString().split('T')[0],
          images: [],
          stageId: stage.id
      };
      onAddTask(task);
  };

  const handleQuickAdd = () => {
      if (!newTaskTitle.trim() || !selectedStageId) return;
      const newTask: Task = {
          id: `wk_task_${Date.now()}`,
          workId,
          title: newTaskTitle,
          description: 'Planejamento Semanal',
          status: TaskStatus.PLANNING,
          priority: TaskPriority.MEDIUM,
          planningWeek: selectedWeek,
          assignedTo: newTaskAssignee || undefined,
          dueDate: new Date().toISOString().split('T')[0],
          images: [],
          stageId: selectedStageId
      };
      onAddTask(newTask);
      setNewTaskTitle('');
  };

  // NEW: Toggle Task Logic with Measurement
  const toggleTaskCompletion = (task: Task) => {
      // Case 1: Unmarking (Done -> Planning)
      if (task.status === TaskStatus.DONE) {
          onUpdateTask({ ...task, status: TaskStatus.PLANNING });
          return;
      }

      // Case 2: Marking Done (Planning -> Done)
      // Check if linked to stage
      if (task.stageId && budget) {
          const stage = budget.categories.find(c => c.id === task.stageId);
          if (stage) {
              setMeasureModal({ task, stage });
              return;
          }
      }

      // Fallback: Just mark done if no stage link
      onUpdateTask({ ...task, status: TaskStatus.DONE });
  };

  const handleMeasureConfirm = async (delta: number) => {
      if (!measureModal || !budget) return;
      
      const { task, stage } = measureModal;
      
      // 1. Update Budget Category Progress
      const newProgress = Math.min(100, (stage.progress || 0) + delta);
      const newCategories = budget.categories.map(c => 
          c.id === stage.id ? { ...c, progress: newProgress } : c
      );
      
      const updatedBudget = { ...budget, categories: newCategories };
      setBudget(updatedBudget); // Optimistic Update
      await api.saveBudget(updatedBudget);

      // 2. Update Task
      onUpdateTask({ ...task, status: TaskStatus.DONE });
      
      setMeasureModal(null);
  };

  const handleImportOverdue = () => {
      if (overdueTasks.length === 0) return;
      if (window.confirm(`Deseja mover ${overdueTasks.length} tarefas pendentes para a semana atual?`)) {
          overdueTasks.forEach(task => {
              onUpdateTask({ ...task, planningWeek: selectedWeek, status: TaskStatus.PLANNING });
          });
      }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      
      {measureModal && (
          <MeasureModal 
              task={measureModal.task} 
              stage={measureModal.stage} 
              onConfirm={handleMeasureConfirm} 
              onClose={() => setMeasureModal(null)} 
          />
      )}

      {/* LEFT COLUMN: ACTIVE SCHEDULE (Context) */}
      <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="text-pms-600"/> Cronograma Ativo
              </h3>
              <p className="text-xs text-slate-500 mb-4">Etapas do Planejamento Integrado que coincidem com esta semana ({weekRangeLabel}).</p>
              
              <div className="space-y-3">
                  {activeStages.length > 0 ? activeStages.map(stage => {
                      const isActive = weeklyTasks.some(t => t.stageId === stage.id);
                      return (
                          <div key={stage.id} className={`p-3 rounded-lg border transition-all ${isActive ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 hover:border-pms-300'}`}>
                              <div className="flex justify-between items-start mb-2">
                                  <span className="font-bold text-slate-700 text-sm">{stage.name}</span>
                                  {isActive && <CheckCircle2 size={14} className="text-green-600"/>}
                              </div>
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100">
                                      {new Date(stage.startDate!).toLocaleDateString('pt-BR')} - {new Date(stage.endDate!).toLocaleDateString('pt-BR')}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-600">
                                      {stage.progress || 0}% Concluído
                                  </span>
                              </div>
                              <button 
                                onClick={() => handleCreateFromStage(stage)}
                                className="w-full text-xs bg-slate-800 text-white px-2 py-1.5 rounded flex items-center justify-center gap-1 hover:bg-slate-700 transition-colors"
                              >
                                  <Plus size={10}/> Gerar Tarefa de Execução
                              </button>
                          </div>
                      );
                  }) : (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                          <AlertCircle size={24} className="mx-auto mb-2 opacity-30"/>
                          <p className="text-xs">Nenhuma etapa agendada para esta semana no Planejamento.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* OVERDUE NOTICE */}
          {overdueTasks.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2">
                  <div className="flex items-center gap-2 text-orange-800 font-bold">
                      <AlertTriangle size={18} />
                      <h4>Pendências</h4>
                  </div>
                  <p className="text-xs text-orange-700">{overdueTasks.length} tarefas de semanas passadas não foram concluídas.</p>
                  <button onClick={handleImportOverdue} className="w-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors">
                      <RefreshCw size={14} /> Trazer para esta Semana
                  </button>
              </div>
          )}
      </div>

      {/* RIGHT COLUMN: WEEKLY EXECUTION LIST */}
      <div className="lg:col-span-2 space-y-6">
          {/* Week Navigator */}
          <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                <button onClick={() => handleWeekChange('prev')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={24}/></button>
                <div className="text-center">
                    <span className="block text-xs text-slate-400 uppercase font-bold tracking-wider">Semana {selectedWeek.split('-W')[1]}</span>
                    <span className="block font-bold text-slate-800 text-lg">{weekRangeLabel}</span>
                </div>
                <button onClick={() => handleWeekChange('next')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={24}/></button>
          </div>

          {/* Progress Bar */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-end mb-2">
                  <div>
                      <h3 className="text-lg font-bold text-slate-700">Meta da Semana</h3>
                      <p className="text-sm text-slate-500">{weeklyTasks.filter(t => t.status === TaskStatus.DONE).length} de {weeklyTasks.length} tarefas concluídas</p>
                  </div>
                  <span className={`text-3xl font-bold ${progress === 100 ? 'text-green-600' : 'text-pms-600'}`}>{progress}%</span>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-pms-600 to-pms-400'}`} style={{width: `${progress}%`}}></div>
              </div>
          </div>

          {/* Manual Task Add */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2 items-start md:items-center">
              <div className="flex-1 w-full">
                  <input 
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-pms-500 outline-none"
                    placeholder="Nova tarefa avulsa..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                  />
              </div>
              <select 
                className="w-full md:w-48 border border-slate-300 rounded-lg p-2 text-sm bg-white"
                value={selectedStageId}
                onChange={e => setSelectedStageId(e.target.value)}
              >
                  <option value="">Vincular Etapa...</option>
                  {budget?.categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <button 
                onClick={handleQuickAdd}
                disabled={!newTaskTitle || !selectedStageId}
                className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                  <Plus size={20}/>
              </button>
          </div>

          {/* Task List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {weeklyTasks.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                      <ListChecks size={48} className="mx-auto mb-3 opacity-20" />
                      <p>Nenhuma atividade planejada para esta semana.</p>
                      <p className="text-xs mt-2">Use o painel lateral para importar do cronograma ou adicione manualmente.</p>
                  </div>
              ) : (
                  <div className="divide-y divide-slate-100">
                      {weeklyTasks.map(task => {
                          const isDone = task.status === TaskStatus.DONE;
                          const assignee = users.find(u => u.id === task.assignedTo);
                          const stageName = budget?.categories.find(c => c.id === task.stageId)?.name || 'Sem Vínculo';

                          return (
                              <div key={task.id} className={`p-4 flex items-center gap-4 group transition-colors ${isDone ? 'bg-slate-50' : 'hover:bg-blue-50/30'}`}>
                                  <button 
                                    onClick={() => toggleTaskCompletion(task)}
                                    className={`shrink-0 transition-transform active:scale-90 ${isDone ? 'text-green-500' : 'text-slate-300 hover:text-pms-500'}`}
                                  >
                                      {isDone ? <CheckSquare size={28} /> : <Square size={28} />}
                                  </button>
                                  
                                  <div className="flex-1">
                                      <p className={`text-base font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                          {task.title}
                                      </p>
                                      <div className="flex items-center gap-3 mt-1">
                                          <span className="text-[10px] font-bold text-pms-600 bg-pms-50 px-2 py-0.5 rounded flex items-center gap-1 border border-pms-100">
                                              <LinkIcon size={10}/> {stageName}
                                          </span>
                                          {assignee && (
                                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                                  <UserIcon size={12}/> {assignee.name.split(' ')[0]}
                                              </span>
                                          )}
                                      </div>
                                  </div>

                                  <button 
                                      onClick={() => {
                                          if(window.confirm("Excluir tarefa?")) onDeleteTask(task.id);
                                      }}
                                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                      <X size={18} />
                                  </button>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
