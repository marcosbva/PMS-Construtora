
import React, { useState } from 'react';
import { Task, TaskStatusDefinition, TaskPriority, User, TaskStatus } from '../types';
import { AlertCircle, BrainCircuit, Plus, Edit2, DollarSign, Ruler } from 'lucide-react';
import { analyzeTaskContent } from '../services/geminiService';

interface KanbanBoardProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  taskStatuses: TaskStatusDefinition[];
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Task) => void;
  workId: string;
}

const getColorClasses = (scheme: string) => {
  switch (scheme) {
    case 'blue': return 'bg-blue-50 border-blue-100';
    case 'green': return 'bg-green-50 border-green-100';
    case 'orange': return 'bg-orange-50 border-orange-100';
    case 'red': return 'bg-red-50 border-red-100';
    case 'yellow': return 'bg-yellow-50 border-yellow-100';
    case 'purple': return 'bg-purple-50 border-purple-100';
    default: return 'bg-gray-100 border-gray-200';
  }
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, users, currentUser, taskStatuses, onUpdateTask, onAddTask, workId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [physicalProgress, setPhysicalProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleStatusChange = (task: Task, newStatus: string) => {
    const updatedTask: Task = { ...task, status: newStatus };
    
    if (newStatus === TaskStatus.DONE) {
      updatedTask.completedDate = new Date().toISOString().split('T')[0];
      updatedTask.physicalProgress = 100; // Auto-complete
    } else {
      // updatedTask.completedDate = undefined; 
    }

    onUpdateTask(updatedTask);
  };

  const openCreateModal = () => {
      setEditingTask(null);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setEstimatedCost('');
      setPhysicalProgress(0);
      setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
      setEditingTask(task);
      setNewTaskTitle(task.title);
      setNewTaskDesc(task.description);
      setEstimatedCost(task.estimatedCost ? task.estimatedCost.toString() : '');
      setPhysicalProgress(task.physicalProgress || 0);
      setIsModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!newTaskTitle) return;

    if (editingTask) {
        // Edit Mode
        const updatedTask: Task = {
            ...editingTask,
            title: newTaskTitle,
            description: newTaskDesc,
            estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
            physicalProgress: physicalProgress
        };
        onUpdateTask(updatedTask);
        setIsModalOpen(false);
    } else {
        // Create Mode
        setIsAnalyzing(true);
        
        // AI Analysis
        const aiResult = await analyzeTaskContent(newTaskTitle, newTaskDesc);
        
        const newTask: Task = {
          id: Math.random().toString(36).substr(2, 9),
          workId,
          title: newTaskTitle,
          description: newTaskDesc,
          status: aiResult.isNC ? TaskStatus.NC : TaskStatus.BACKLOG,
          priority: aiResult.priority as TaskPriority,
          assignedTo: currentUser.id,
          dueDate: new Date().toISOString().split('T')[0],
          images: [],
          aiAnalysis: aiResult.summary,
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
          physicalProgress: physicalProgress
        };

        onAddTask(newTask);
        setIsAnalyzing(false);
        setIsModalOpen(false);
    }
    
    setNewTaskTitle('');
    setNewTaskDesc('');
  };

  const isClient = currentUser.category === 'CLIENT';

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-xl font-bold text-slate-800 hidden md:block">Quadro de Tarefas</h2>
        {!isClient && (
            <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-pms-600 text-white px-4 py-2 rounded-lg hover:bg-pms-500 transition-colors w-full md:w-auto justify-center shadow-md"
            >
            <Plus size={20} />
            Nova Tarefa
            </button>
        )}
      </div>

      {/* Horizontal Scrollable Kanban */}
      <div className="flex-1 overflow-x-auto kanban-scroll pb-4">
        <div className="flex gap-4 min-w-max px-2 h-full">
          {taskStatuses.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.id);
            const colorClass = getColorClasses(col.colorScheme);
            
            return (
              <div key={col.id} className={`w-72 md:w-80 flex-shrink-0 flex flex-col rounded-xl border ${colorClass} h-full max-h-[calc(100vh-220px)]`}>
                <div className="p-3 font-bold text-slate-700 border-b border-slate-200/50 flex justify-between items-center sticky top-0 bg-inherit rounded-t-xl z-10">
                  <span>{col.label}</span>
                  <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs text-slate-500 border border-slate-200">
                    {colTasks.length}
                  </span>
                </div>
                
                <div className="p-2 flex-1 overflow-y-auto space-y-3">
                  {colTasks.map(task => (
                    <div key={task.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative">
                      {/* Priority Badge */}
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          task.priority === TaskPriority.HIGH ? 'bg-red-100 text-red-700' :
                          task.priority === TaskPriority.MEDIUM ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {task.priority}
                        </span>
                        <div className="flex gap-2">
                            {task.status === TaskStatus.NC && (
                            <AlertCircle size={16} className="text-red-500" />
                            )}
                            {!isClient && (
                                <button 
                                    onClick={() => openEditModal(task)}
                                    className="text-slate-400 hover:text-pms-600 p-0.5"
                                    title="Editar Tarefa"
                                >
                                    <Edit2 size={14} />
                                </button>
                            )}
                        </div>
                      </div>

                      <h4 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2">{task.title}</h4>
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{task.description}</p>
                      
                      {/* Physical Progress Bar */}
                      {(task.physicalProgress || 0) > 0 && (
                          <div className="mb-3">
                              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                                  <span>Progresso Físico</span>
                                  <span>{task.physicalProgress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500" style={{width: `${task.physicalProgress}%`}}></div>
                              </div>
                          </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                         <div className="flex items-center gap-1">
                            {task.assignedTo && (
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-white" title="Responsável">
                                  <img src={users.find(u => u.id === task.assignedTo)?.avatar} alt="User" className="w-full h-full object-cover"/>
                                </div>
                            )}
                         </div>
                         
                         {/* Simple Mobile Friendly Status Mover - Disabled for Clients */}
                         <select 
                            value={task.status}
                            onChange={(e) => handleStatusChange(task, e.target.value)}
                            disabled={isClient}
                            className={`text-xs border rounded px-1 py-1 max-w-[120px] truncate focus:outline-none focus:ring-1 focus:ring-pms-500 ${isClient ? 'bg-slate-100 text-slate-400 border-slate-100 appearance-none' : 'bg-slate-50 border-slate-200'}`}
                         >
                            {taskStatuses.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                         </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      {isModalOpen && !isClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
            <input 
              type="text" 
              placeholder="Título da Tarefa"
              className="w-full border border-slate-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-pms-500 outline-none"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
            />
            <textarea 
              placeholder="Descrição detalhada..."
              className="w-full border border-slate-300 rounded-lg p-3 mb-4 h-24 resize-none focus:ring-2 focus:ring-pms-500 outline-none"
              value={newTaskDesc}
              onChange={e => setNewTaskDesc(e.target.value)}
            />
            
            {/* NEW: Cost & Progress Fields */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <DollarSign size={12}/> Orçamento (Est.)
                    </label>
                    <input 
                        type="number" 
                        className="w-full border rounded p-2 text-sm"
                        placeholder="0.00"
                        value={estimatedCost}
                        onChange={e => setEstimatedCost(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <Ruler size={12}/> Avanço Físico (%)
                    </label>
                    <input 
                        type="number" 
                        min="0" max="100"
                        className="w-full border rounded p-2 text-sm"
                        value={physicalProgress}
                        onChange={e => setPhysicalProgress(Number(e.target.value))}
                    />
                </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                disabled={isAnalyzing}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveTask}
                disabled={isAnalyzing || !newTaskTitle}
                className="px-4 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 flex items-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                   <>
                    <BrainCircuit className="animate-pulse" size={18} />
                    Analisando...
                   </>
                ) : (editingTask ? 'Salvar Alterações' : 'Criar Tarefa')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
