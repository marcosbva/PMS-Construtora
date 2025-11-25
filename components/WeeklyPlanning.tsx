
import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, User } from '../types';
import { Calendar, CheckSquare, Square, ChevronLeft, ChevronRight, Plus, User as UserIcon, ListChecks, AlertCircle, ArrowDownCircle, RefreshCw, X } from 'lucide-react';

interface WeeklyPlanningProps {
  workId: string;
  tasks: Task[];
  users: User[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
}

// Helper to get Week Number
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

export const WeeklyPlanning: React.FC<WeeklyPlanningProps> = ({ workId, tasks, users, onAddTask, onUpdateTask }) => {
  const [selectedWeek, setSelectedWeek] = useState(getWeekString(new Date()));
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  // Calculate Week Date Range
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
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      return `${weekStart.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} - ${weekEnd.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}`;
  }, [selectedWeek]);

  const weeklyTasks = useMemo(() => {
      return tasks.filter(t => t.workId === workId && t.planningWeek === selectedWeek);
  }, [tasks, workId, selectedWeek]);

  // Logic to find overdue tasks from previous weeks
  const overdueTasks = useMemo(() => {
      return tasks.filter(t => 
          t.workId === workId && 
          t.planningWeek && // Is a weekly task
          t.planningWeek < selectedWeek && // From a past week
          t.status !== TaskStatus.DONE // Not finished
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

      const newTask: Task = {
          id: `wk_task_${Date.now()}`,
          workId,
          title: newTaskTitle,
          description: 'Planejamento Semanal',
          status: TaskStatus.PLANNING, // Default to Planning (To Do)
          priority: TaskPriority.MEDIUM,
          planningWeek: selectedWeek,
          assignedTo: newTaskAssignee || undefined,
          dueDate: new Date().toISOString().split('T')[0], // Today/Week
          images: []
      };

      onAddTask(newTask);
      setNewTaskTitle('');
  };

  const handleImportOverdue = () => {
      if (overdueTasks.length === 0) return;
      
      if (window.confirm(`Deseja mover ${overdueTasks.length} tarefas pendentes para a semana atual?`)) {
          overdueTasks.forEach(task => {
              onUpdateTask({
                  ...task,
                  planningWeek: selectedWeek, // Move to this week
                  status: TaskStatus.PLANNING // Ensure it's active
              });
          });
      }
  };

  const toggleTaskCompletion = (task: Task) => {
      const newStatus = task.status === TaskStatus.DONE ? TaskStatus.PLANNING : TaskStatus.DONE;
      const completedDate = newStatus === TaskStatus.DONE ? new Date().toISOString().split('T')[0] : undefined;
      
      onUpdateTask({
          ...task,
          status: newStatus,
          completedDate
      });
  };

  const handleDeleteTask = (taskId: string) => {
      // Assuming onUpdateTask logic handles delete via status or we need a dedicated delete handler prop.
      // Since deleting is critical, for now we can set status to archived or just hide it from week.
      // However, proper way is asking parent to delete. 
      // Since prop is not passed, we will just remove the planningWeek tag to "remove" it from the list.
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          if(window.confirm("Remover esta tarefa da lista semanal?")) {
             onUpdateTask({ ...task, planningWeek: undefined });
          }
      }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ListChecks className="text-pms-600" /> Planejamento Semanal
          </h2>
          <p className="text-slate-500">Checklist de atividades e metas da semana.</p>
        </div>
        
        {/* Week Navigator */}
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

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="flex justify-between items-end mb-2">
              <div>
                  <h3 className="text-lg font-bold text-slate-700">Meta da Semana</h3>
                  <p className="text-sm text-slate-500">{weeklyTasks.filter(t => t.status === TaskStatus.DONE).length} de {weeklyTasks.length} itens concluídos</p>
              </div>
              <span className={`text-3xl font-bold ${progress === 100 ? 'text-green-600' : 'text-pms-600'}`}>{progress}%</span>
          </div>
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-pms-600 to-pms-400'}`} 
                style={{width: `${progress}%`}}
              ></div>
          </div>
      </div>

      {/* OVERDUE TASKS ALERT */}
      {overdueTasks.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                  <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                      <AlertCircle size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-orange-800">Pendências Encontradas</h4>
                      <p className="text-sm text-orange-700">
                          Você tem <strong>{overdueTasks.length} tarefas</strong> não concluídas de semanas anteriores.
                      </p>
                  </div>
              </div>
              <button 
                onClick={handleImportOverdue}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all whitespace-nowrap w-full md:w-auto justify-center"
              >
                  <RefreshCw size={16} /> Trazer para esta Semana
              </button>
          </div>
      )}

      {/* Quick Add Input */}
      <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
              <input 
                type="text" 
                className="w-full pl-4 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-pms-500 outline-none shadow-sm"
                placeholder="Adicionar nova tarefa para esta semana..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              />
          </div>
          <div className="w-48 relative hidden md:block">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-pms-500 outline-none bg-white shadow-sm appearance-none"
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
              >
                  <option value="">Responsável...</option>
                  {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>
                  ))}
              </select>
          </div>
          <button 
            onClick={handleQuickAdd}
            disabled={!newTaskTitle}
            className="bg-pms-600 hover:bg-pms-500 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-50"
          >
              <Plus size={24} />
          </button>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {weeklyTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Nenhuma atividade planejada para esta semana.</p>
                  <p className="text-sm mt-2">Use o campo acima para adicionar itens ao checklist.</p>
              </div>
          ) : (
              <div className="divide-y divide-slate-100">
                  {weeklyTasks.map(task => {
                      const isDone = task.status === TaskStatus.DONE;
                      const assignee = users.find(u => u.id === task.assignedTo);

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
                                  {task.description !== 'Planejamento Semanal' && (
                                      <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                                  )}
                              </div>

                              {assignee && (
                                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                                      <img src={assignee.avatar} className="w-5 h-5 rounded-full" />
                                      <span className="text-xs font-bold text-slate-600 hidden sm:inline">{assignee.name.split(' ')[0]}</span>
                                  </div>
                              )}

                              <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                  task.priority === 'Alta' ? 'text-red-600 bg-red-50' : 
                                  task.priority === 'Média' ? 'text-orange-600 bg-orange-50' : 
                                  'text-green-600 bg-green-50'
                              }`}>
                                  {task.priority}
                              </div>

                              <button 
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remover da semana"
                              >
                                  <X size={18} />
                              </button>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>
      
      <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
          <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
          <div>
              <h4 className="text-sm font-bold text-blue-800">Como funciona?</h4>
              <p className="text-xs text-blue-700 mt-1">
                  Este painel é integrado ao sistema principal. Ao marcar um item como concluído aqui, ele também será atualizado no quadro Kanban e nas Tarefas Gerais. Use esta visualização para reuniões semanais de alinhamento com a equipe.
              </p>
          </div>
      </div>
    </div>
  );
};
