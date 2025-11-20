
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, ConstructionWork, User, TaskStatusDefinition } from '../types';
import { Filter, Search, Briefcase, Edit2, X, Save, Plus, History, CheckCircle2, HardHat } from 'lucide-react';

interface GlobalTaskListProps {
  tasks: Task[];
  works: ConstructionWork[];
  users: User[];
  taskStatuses: TaskStatusDefinition[];
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Task) => void;
}

export const GlobalTaskList: React.FC<GlobalTaskListProps> = ({ tasks, works, users, taskStatuses, onUpdateTask, onAddTask }) => {
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form State
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<string>(TaskStatus.BACKLOG);
  const [editPriority, setEditPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [editAssignee, setEditAssignee] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editWorkId, setEditWorkId] = useState<string>('');

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Active vs History Separation
      const isCompleted = task.status === TaskStatus.DONE;
      if (viewMode === 'ACTIVE' && isCompleted) return false;
      if (viewMode === 'HISTORY' && !isCompleted) return false;

      // 2. Filters
      const matchesStatus = filterStatus === 'ALL' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'ALL' || task.priority === filterPriority;
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            task.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tasks, viewMode, filterStatus, filterPriority, searchTerm]);

  // Grouping logic for History view
  const groupedHistoryTasks = useMemo<Record<string, Task[]>>(() => {
    if (viewMode !== 'HISTORY') return {};
    
    const groups: Record<string, Task[]> = {};
    filteredTasks.forEach(task => {
      const wId = task.workId || 'unknown';
      if (!groups[wId]) groups[wId] = [];
      groups[wId].push(task);
    });

    return groups;
  }, [filteredTasks, viewMode]);

  const handleCreateClick = () => {
      setEditingTask(null);
      setEditTitle('');
      setEditDesc('');
      setEditStatus(TaskStatus.BACKLOG);
      setEditPriority(TaskPriority.MEDIUM);
      setEditAssignee('');
      setEditDueDate('');
      setEditWorkId(works[0]?.id || ''); // Default to first work if available
      setIsModalOpen(true);
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditAssignee(task.assignedTo || '');
    setEditDueDate(task.dueDate);
    setEditWorkId(task.workId);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editTitle || !editWorkId) return;

    // Auto-set completed date if status is DONE
    const isCompleting = editStatus === TaskStatus.DONE;
    const completionDate = isCompleting 
        ? (editingTask?.completedDate || new Date().toISOString().split('T')[0])
        : undefined;

    if (editingTask) {
      // Update Existing
      const updatedTask: Task = {
        ...editingTask,
        title: editTitle,
        description: editDesc,
        status: editStatus,
        priority: editPriority,
        assignedTo: editAssignee || undefined,
        dueDate: editDueDate,
        completedDate: completionDate,
        workId: editWorkId
      };
      onUpdateTask(updatedTask);
    } else {
        // Create New
        const newTask: Task = {
            id: Math.random().toString(36).substr(2, 9),
            workId: editWorkId,
            title: editTitle,
            description: editDesc,
            status: editStatus,
            priority: editPriority,
            assignedTo: editAssignee || undefined,
            dueDate: editDueDate || new Date().toISOString().split('T')[0],
            completedDate: completionDate,
            images: []
        };
        onAddTask(newTask);
    }
    
    setIsModalOpen(false);
    setEditingTask(null);
  };

  // Reusable row renderer
  const renderTaskRow = (task: Task, showWorkColumn: boolean) => {
      const work = works.find(w => w.id === task.workId);
      const assignee = users.find(u => u.id === task.assignedTo);
      const statusDef = taskStatuses.find(ts => ts.id === task.status);

      return (
        <tr key={task.id} className="hover:bg-slate-50 transition-colors group border-b border-slate-100 last:border-0">
          <td className="px-6 py-4">
            <div className={`font-medium text-slate-800 ${viewMode === 'HISTORY' ? 'line-through text-slate-400' : ''}`}>{task.title}</div>
            <div className="text-xs text-slate-500 truncate max-w-[200px]">{task.description}</div>
          </td>
          {showWorkColumn && (
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Briefcase size={14} />
                  {work ? work.name : 'Desconhecida'}
                </div>
              </td>
          )}
          <td className="px-6 py-4">
            {assignee ? (
              <div className="flex items-center gap-2">
                <img src={assignee.avatar} className="w-6 h-6 rounded-full" alt={assignee.name} />
                <span className="text-sm text-slate-600">{assignee.name.split(' ')[0]}</span>
              </div>
            ) : <span className="text-slate-400">-</span>}
          </td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                task.status === TaskStatus.DONE ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 border-slate-200'
            }`}>
              {statusDef ? statusDef.label : task.status}
            </span>
          </td>
          <td className="px-6 py-4">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  task.priority === TaskPriority.HIGH ? 'bg-red-100 text-red-700' :
                  task.priority === TaskPriority.MEDIUM ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {task.priority}
                </span>
          </td>
          <td className="px-6 py-4 text-sm text-slate-600">
            {viewMode === 'HISTORY' ? (
                <span className="text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    {task.completedDate ? new Date(task.completedDate).toLocaleDateString('pt-BR') : '-'}
                </span>
            ) : (
                <span>
                    {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                </span>
            )}
          </td>
          <td className="px-6 py-4 text-right">
            <button 
                onClick={() => handleEditClick(task)}
                className="p-2 text-slate-400 hover:text-pms-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar Tarefa"
            >
                <Edit2 size={18} />
            </button>
          </td>
        </tr>
      );
  };

  return (
    <div className="p-6 relative">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Tarefas Gerais</h2>
            <p className="text-slate-500">Gestão consolidada de todas as atividades.</p>
        </div>
        
        {viewMode === 'ACTIVE' && (
            <button 
                onClick={handleCreateClick}
                className="bg-pms-600 hover:bg-pms-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all"
            >
                <Plus size={20} />
                Nova Tarefa
            </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
         <button 
            onClick={() => setViewMode('ACTIVE')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${viewMode === 'ACTIVE' ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
            <CheckCircle2 size={18} />
            Em Andamento
         </button>
         <button 
            onClick={() => setViewMode('HISTORY')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${viewMode === 'HISTORY' ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
            <History size={18} />
            Histórico Concluído
         </button>
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
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={20} className="text-slate-500" />
          {viewMode === 'ACTIVE' && (
             <select 
                className="border border-slate-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-pms-500 bg-white text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
            >
                <option value="ALL">Todos os Status</option>
                {taskStatuses.filter(s => s.id !== TaskStatus.DONE).map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
                ))}
            </select>
          )}

          <select 
            className="border border-slate-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-pms-500 bg-white text-sm"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="ALL">Todas Prioridades</option>
            {Object.values(TaskPriority).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* --- ACTIVE VIEW: SINGLE TABLE --- */}
      {viewMode === 'ACTIVE' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                  <th className="px-6 py-4">Tarefa</th>
                  <th className="px-6 py-4">Obra</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Prioridade</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map(task => renderTaskRow(task, true))}
              </tbody>
            </table>
            {filteredTasks.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                  Nenhuma tarefa pendente.
              </div>
            )}
          </div>
      )}

      {/* --- HISTORY VIEW: GROUPED BY WORK --- */}
      {viewMode === 'HISTORY' && (
          <div className="space-y-8">
              {Object.keys(groupedHistoryTasks).length === 0 && (
                  <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                     <History size={32} className="mx-auto mb-2 opacity-20" />
                     Nenhuma tarefa encontrada no histórico.
                  </div>
              )}

              {Object.entries(groupedHistoryTasks).map(([workId, groupTasks]: [string, Task[]]) => {
                  const work = works.find(w => w.id === workId);
                  const workName = work ? work.name : 'Obra Desconhecida';
                  
                  return (
                      <div key={workId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                              <div className="flex items-center gap-2 font-bold text-slate-800">
                                  <HardHat className="text-pms-600" size={20} />
                                  {workName}
                              </div>
                              <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                                  {groupTasks.length} tarefas concluídas
                              </span>
                          </div>
                          <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs uppercase text-slate-400 font-bold">
                                <th className="px-6 py-3 bg-slate-50/50">Tarefa</th>
                                <th className="px-6 py-3 bg-slate-50/50">Responsável</th>
                                <th className="px-6 py-3 bg-slate-50/50">Status</th>
                                <th className="px-6 py-3 bg-slate-50/50">Prioridade</th>
                                <th className="px-6 py-3 bg-slate-50/50">Concluído Em</th>
                                <th className="px-6 py-3 bg-slate-50/50 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupTasks.map(task => renderTaskRow(task, false))}
                            </tbody>
                          </table>
                      </div>
                  );
              })}
          </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   {editingTask ? <Edit2 className="text-pms-600" /> : <Plus className="text-pms-600" />}
                   {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                   <X size={24} />
                </button>
             </div>

             <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Título</label>
                   <input 
                     type="text" 
                     className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                     value={editTitle}
                     onChange={(e) => setEditTitle(e.target.value)}
                     placeholder="Ex: Instalar Piso"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Obra / Projeto</label>
                   <select 
                     className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                     value={editWorkId}
                     onChange={(e) => setEditWorkId(e.target.value)}
                   >
                      <option value="" disabled>Selecione a obra</option>
                      {works.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                   </select>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                   <textarea 
                     className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none h-24 resize-none"
                     value={editDesc}
                     onChange={(e) => setEditDesc(e.target.value)}
                     placeholder="Detalhes técnicos..."
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                        >
                            {taskStatuses.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Prioridade</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                        >
                            {Object.values(TaskPriority).map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Responsável</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                            value={editAssignee}
                            onChange={(e) => setEditAssignee(e.target.value)}
                        >
                            <option value="">Sem responsável</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Vencimento</label>
                        <input 
                            type="date" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                        />
                    </div>
                </div>
             </div>

             <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!editTitle || !editWorkId}
                  className="px-4 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-bold shadow-lg shadow-pms-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} /> {editingTask ? 'Salvar' : 'Criar Tarefa'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
