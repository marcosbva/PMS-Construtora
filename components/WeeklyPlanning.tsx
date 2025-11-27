

import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, User, WorkBudget } from '../types';
import { api } from '../services/api';
import { Calendar, CheckSquare, Square, ChevronLeft, ChevronRight, Plus, User as UserIcon, ListChecks, AlertCircle, RefreshCw, X, Link as LinkIcon, AlertTriangle } from 'lucide-react';

interface WeeklyPlanningProps {
  workId: string;
  tasks: Task[];
  users: User[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

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

export const WeeklyPlanning: React.FC<WeeklyPlanningProps> = ({ workId, tasks, users, onAddTask, onUpdateTask, onDeleteTask }) => {
  const [selectedWeek, setSelectedWeek] = useState(getWeekString(new Date()));
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  
  const [budget, setBudget] = useState<WorkBudget | null>(null);

  // Load Budget (Schedule) to get Macro Stages
  useEffect(() => {
      const loadBudget = async () => {
          const b = await api.getBudget(workId);
          setBudget(b);
      };
      loadBudget();
  }, [workId]);

  const weekRangeLabel = useMemo(() => {
      const [yearStr, weekStr] = selectedWeek.split('-W');
      const year = parseInt(yearStr);
      const week = parseInt(weekStr);
      
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = simple.getDay();
      const weekStart = simple;
      if (dayOfWeek <= 4) weekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else weekStart.setDate(simple.getDate() + 8 - simple.getDay());
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      return `${weekStart.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} - ${weekEnd.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}`;
  }, [selectedWeek]);

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

  const handleQuickAdd = () => {
      if (!newTaskTitle.trim()) return;
      if (!selectedStageId) {
          alert("Você deve vincular esta tarefa a uma Etapa Macro do Cronograma.");
          return;
      }

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
          stageId: selectedStageId // Mandatory Link
      };

      onAddTask(newTask);
      setNewTaskTitle('');
  };

  const toggleTaskCompletion = (task: Task) => {
      const newStatus = task.status === TaskStatus.DONE ? TaskStatus.PLANNING : TaskStatus.DONE;
      onUpdateTask({ ...task, status: newStatus });
  };

  const handleImportOverdue = () => {
      if (overdueTasks.length === 0) return;
      if (window.confirm(`Deseja mover ${overdueTasks.length} tarefas pendentes para a semana atual?`)) {
          overdueTasks.forEach(task => {
              onUpdateTask({
                  ...task,
                  planningWeek: selectedWeek,
                  status: TaskStatus.PLANNING
              });
          });
      }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ListChecks className="text-pms-600" /> Execução Semanal
          </h2>
          <p className="text-slate-500">Transforme o Cronograma Macro em metas semanais para a equipe.</p>
        </div>
        
        <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <button onClick={() => handleWeekChange('prev')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <ChevronLeft size={20}/>
            </button>
            <div className="px-4 text-center">
                <span className="block text-xs text-slate-400 uppercase font-bold tracking-wider">Semana {selectedWeek.split('-W')[1]}</span>
                <span className="block font-bold text-slate-800 text-sm">{weekRangeLabel}</span>
            </div>
            <button onClick={() => handleWeekChange('next')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <ChevronRight size={20}/>
            </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
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

      {/* OVERDUE NOTICE */}
      {overdueTasks.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                  <AlertCircle className="text-orange-600 mt-1" size={20} />
                  <div>
                      <h4 className="font-bold text-orange-800">Pendências Anteriores</h4>
                      <p className="text-sm text-orange-700">Existem {overdueTasks.length} tarefas não concluídas de semanas passadas.</p>
                  </div>
              </div>
              <button onClick={handleImportOverdue} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm">
                  <RefreshCw size={16} /> Repescar Tarefas
              </button>
          </div>
      )}

      {/* NEW TASK INPUT */}
      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 mb-8">
          <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase">Adicionar Atividade à Semana</h4>
          <div className="flex flex-col gap-3">
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                placeholder="O que será feito? Ex: Rebocar Parede Sala"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              
              <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                      <select 
                        className={`w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white ${!selectedStageId ? 'border-orange-300 text-orange-700 font-bold' : 'border-slate-300'}`}
                        value={selectedStageId}
                        onChange={(e) => setSelectedStageId(e.target.value)}
                      >
                          <option value="">Vincular a Etapa Macro (Obrigatório)...</option>
                          {budget?.categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                      </select>
                  </div>
                  
                  <div className="w-full md:w-48 relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        className="w-full pl-10 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                      >
                          <option value="">Responsável...</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>)}
                      </select>
                  </div>
                  <button 
                    onClick={handleQuickAdd}
                    disabled={!newTaskTitle || !selectedStageId}
                    className="bg-pms-600 hover:bg-pms-500 text-white px-6 rounded-lg font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <Plus size={24} />
                  </button>
              </div>
          </div>
          {!selectedStageId && <p className="text-[10px] text-orange-600 mt-2 flex items-center gap-1"><AlertTriangle size={10}/> Selecione a etapa do cronograma para liberar a adição.</p>}
      </div>

      {/* TASK LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {weeklyTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Nenhuma atividade planejada para esta semana.</p>
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
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs font-bold text-pms-600 bg-pms-50 px-2 py-0.5 rounded flex items-center gap-1 border border-pms-100">
                                          <LinkIcon size={10}/> {stageName}
                                      </span>
                                      {assignee && (
                                          <span className="text-xs text-slate-500 flex items-center gap-1">
                                              <UserIcon size={10}/> {assignee.name.split(' ')[0]}
                                          </span>
                                      )}
                                  </div>
                              </div>

                              <button 
                                  onClick={() => {
                                      if(window.confirm("Tem certeza que deseja excluir esta tarefa?")) onDeleteTask(task.id);
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
  );
};
