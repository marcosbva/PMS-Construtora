import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, User, UserRole } from '../types';
import { AlertCircle, CheckCircle2, Clock, Camera, MoreHorizontal, Plus, User as UserIcon, BrainCircuit } from 'lucide-react';
import { analyzeTaskContent } from '../services/geminiService';

interface KanbanBoardProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Task) => void;
  workId: string;
}

const STATUS_COLUMNS = [
  { id: TaskStatus.BACKLOG, label: 'Backlog', color: 'bg-gray-100 border-gray-200' },
  { id: TaskStatus.PLANNING, label: 'Planejamento', color: 'bg-blue-50 border-blue-100' },
  { id: TaskStatus.EXECUTION, label: 'Execução (Pedro)', color: 'bg-orange-50 border-orange-100' },
  { id: TaskStatus.WAITING_MATERIAL, label: 'Aguar. Material', color: 'bg-yellow-50 border-yellow-100' },
  { id: TaskStatus.NC, label: 'Não Conformidade', color: 'bg-red-50 border-red-100' },
  { id: TaskStatus.DONE, label: 'Concluído', color: 'bg-green-50 border-green-100' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, users, currentUser, onUpdateTask, onAddTask, workId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    const updatedTask = { ...task, status: newStatus };
    if (newStatus === TaskStatus.DONE) {
      // Could add logic here to set completion date
    }
    onUpdateTask(updatedTask);
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle) return;

    setIsAnalyzing(true);
    
    // AI Analysis for priority and NC detection
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
      aiAnalysis: aiResult.summary
    };

    onAddTask(newTask);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setIsModalOpen(false);
    setIsAnalyzing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-xl font-bold text-slate-800 hidden md:block">Quadro de Tarefas</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-pms-600 text-white px-4 py-2 rounded-lg hover:bg-pms-500 transition-colors w-full md:w-auto justify-center shadow-md"
        >
          <Plus size={20} />
          Nova Tarefa
        </button>
      </div>

      {/* Horizontal Scrollable Kanban */}
      <div className="flex-1 overflow-x-auto kanban-scroll pb-4">
        <div className="flex gap-4 min-w-max px-2 h-full">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.id);
            
            return (
              <div key={col.id} className={`w-72 md:w-80 flex-shrink-0 flex flex-col rounded-xl border ${col.color} h-full max-h-[calc(100vh-220px)]`}>
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
                        {task.status === TaskStatus.NC && (
                          <AlertCircle size={16} className="text-red-500" />
                        )}
                      </div>

                      <h4 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2">{task.title}</h4>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
                      
                      {task.aiAnalysis && (
                        <div className="bg-indigo-50 p-2 rounded text-[10px] text-indigo-700 mb-2 flex items-start gap-1">
                           <BrainCircuit size={10} className="mt-0.5 flex-shrink-0"/>
                           <span>AI: {task.aiAnalysis}</span>
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
                         
                         {/* Simple Mobile Friendly Status Mover */}
                         <select 
                            value={task.status}
                            onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                            className="text-xs bg-slate-50 border border-slate-200 rounded px-1 py-1 max-w-[120px] truncate focus:outline-none focus:ring-1 focus:ring-pms-500"
                         >
                            {Object.values(TaskStatus).map(s => (
                                <option key={s} value={s}>{s}</option>
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

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Nova Tarefa</h3>
            <input 
              type="text" 
              placeholder="Título da Tarefa"
              className="w-full border border-slate-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-pms-500 outline-none"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
            />
            <textarea 
              placeholder="Descrição detalhada..."
              className="w-full border border-slate-300 rounded-lg p-3 mb-4 h-32 resize-none focus:ring-2 focus:ring-pms-500 outline-none"
              value={newTaskDesc}
              onChange={e => setNewTaskDesc(e.target.value)}
            />
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                disabled={isAnalyzing}
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateTask}
                disabled={isAnalyzing || !newTaskTitle}
                className="px-4 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 flex items-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                   <>
                    <BrainCircuit className="animate-pulse" size={18} />
                    Analisando...
                   </>
                ) : 'Criar Tarefa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
