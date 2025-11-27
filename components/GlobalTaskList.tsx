
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, ConstructionWork, User, TaskStatusDefinition, WorkStatus } from '../types';
import { Filter, Search, Briefcase, Calendar, CheckCircle2, HardHat } from 'lucide-react';

interface GlobalTaskListProps {
  tasks: Task[];
  works: ConstructionWork[];
  users: User[];
  taskStatuses: TaskStatusDefinition[];
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const GlobalTaskList: React.FC<GlobalTaskListProps> = ({ tasks, works, users, taskStatuses }) => {
  // Read Only View Logic
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to check if date is within current week
  const isThisWeek = (dateString: string) => {
      const date = new Date(dateString);
      const today = new Date();
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
      const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      return date >= firstDay && date <= lastDay;
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Only Show Execution Tasks
      const isExecution = task.status === TaskStatus.EXECUTION || task.status === TaskStatus.PLANNING;
      if (!isExecution) return false;

      // 2. Only show tasks due this week or overdue
      // const dueThisWeek = isThisWeek(task.dueDate) || new Date(task.dueDate) < new Date();
      // if (!dueThisWeek) return false;

      const matchesSearch = (task.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const work = works.find(w => w.id === task.workId);
      const activeWork = work?.status === WorkStatus.EXECUTION;

      return matchesSearch && activeWork;
    });
  }, [tasks, works, searchTerm]);

  // Group by Work
  const groupedTasks = useMemo(() => {
      const groups: Record<string, Task[]> = {};
      filteredTasks.forEach(task => {
          if (!groups[task.workId]) groups[task.workId] = [];
          groups[task.workId].push(task);
      });
      return groups;
  }, [filteredTasks]);

  return (
    <div className="p-6 relative">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Tarefas da Semana</h2>
            <p className="text-slate-500">Visão consolidada das atividades em execução em todas as obras.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar tarefa..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-pms-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- READ ONLY GROUPED LIST --- */}
      <div className="space-y-8">
          {Object.keys(groupedTasks).length === 0 && (
              <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                 <CheckCircle2 size={48} className="mx-auto mb-3 opacity-20" />
                 <p>Nenhuma tarefa ativa encontrada para esta semana.</p>
              </div>
          )}

          {Object.entries(groupedTasks).map(([workId, groupTasks]: [string, Task[]]) => {
              const work = works.find(w => w.id === workId);
              const workName = work ? work.name : 'Obra Desconhecida';
              
              return (
                  <div key={workId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                          <div className="flex items-center gap-2 font-bold text-slate-800">
                              <HardHat className="text-pms-600" size={20} />
                              {workName}
                          </div>
                          <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                              {groupTasks.length} atividades
                          </span>
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs uppercase text-slate-400 font-bold">
                            <th className="px-6 py-3 bg-slate-50/50">Tarefa</th>
                            <th className="px-6 py-3 bg-slate-50/50">Responsável</th>
                            <th className="px-6 py-3 bg-slate-50/50">Vencimento</th>
                            <th className="px-6 py-3 bg-slate-50/50 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupTasks.map(task => {
                                const assignee = users.find(u => u.id === task.assignedTo);
                                const statusDef = taskStatuses.find(s => s.id === task.status);
                                return (
                                    <tr key={task.id} className="hover:bg-slate-50 border-b border-slate-50 last:border-0">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-700 block">{task.title}</span>
                                            {task.physicalProgress ? (
                                                <div className="mt-1 w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-green-500" style={{width: `${task.physicalProgress}%`}}></div>
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="px-6 py-4">
                                            {assignee ? (
                                                <div className="flex items-center gap-2">
                                                    <img src={assignee.avatar} className="w-6 h-6 rounded-full" />
                                                    <span className="text-sm text-slate-600">{assignee.name.split(' ')[0]}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14}/>
                                                {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600">
                                                {statusDef ? statusDef.label : task.status}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                      </table>
                  </div>
              );
          })}
      </div>
    </div>
  );
};
