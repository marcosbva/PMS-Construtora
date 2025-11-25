
import React, { useState, useMemo } from 'react';
import { ConstructionWork, WorkStage, StageStatus, ProgressMethod, Task, TaskStatus } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Clock, Calendar, ArrowRight, Settings, ListChecks } from 'lucide-react';

interface ProjectStagesProps {
  work: ConstructionWork;
  tasks: Task[];
  onUpdateWork: (work: ConstructionWork) => void;
}

export const ProjectStages: React.FC<ProjectStagesProps> = ({ work, tasks, onUpdateWork }) => {
  const [newStageName, setNewStageName] = useState('');

  const stages = useMemo(() => {
    return (work.stages || []).sort((a, b) => a.order - b.order);
  }, [work.stages]);

  const completionStats = useMemo(() => {
    const total = stages.length;
    if (total === 0) return { count: 0, percent: 0 };
    const completed = stages.filter(s => s.status === 'COMPLETED').length;
    return { count: completed, percent: Math.round((completed / total) * 100) };
  }, [stages]);

  // Centralized Progress Calculation Function
  const calculateAndSaveProgress = (
      currentStages: WorkStage[], 
      method: ProgressMethod = work.progressMethod || 'STAGES'
  ) => {
      let newProgress = 0;

      if (method === 'STAGES') {
          const total = currentStages.length;
          if (total > 0) {
              const completed = currentStages.filter(s => s.status === 'COMPLETED').length;
              newProgress = Math.round((completed / total) * 100);
          }
      } else if (method === 'TASKS') {
          const total = tasks.length;
          if (total > 0) {
              const completed = tasks.filter(t => t.status === TaskStatus.DONE).length;
              newProgress = Math.round((completed / total) * 100);
          }
      }

      // Update Work with new Stages AND new Progress AND new Method
      onUpdateWork({ 
          ...work, 
          stages: currentStages,
          progress: newProgress,
          progressMethod: method
      });
  };

  const handleMethodChange = (newMethod: ProgressMethod) => {
      // Trigger calculation with current stages but new method
      calculateAndSaveProgress(work.stages || [], newMethod);
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;

    const newStage: WorkStage = {
      id: `stg_${Date.now()}`,
      name: newStageName,
      status: 'PENDING',
      order: stages.length // Add to end
    };

    const updatedStages = [...(work.stages || []), newStage];
    calculateAndSaveProgress(updatedStages);
    setNewStageName('');
  };

  const handleDeleteStage = (stageId: string) => {
    if(!window.confirm("Excluir esta etapa?")) return;
    const updatedStages = stages.filter(s => s.id !== stageId);
    calculateAndSaveProgress(updatedStages);
  };

  const handleStatusChange = (stageId: string, currentStatus: StageStatus) => {
    let nextStatus: StageStatus = 'PENDING';
    if (currentStatus === 'PENDING') nextStatus = 'IN_PROGRESS';
    else if (currentStatus === 'IN_PROGRESS') nextStatus = 'COMPLETED';
    else nextStatus = 'PENDING'; // Cycle back

    const updatedStages = stages.map(s => 
      s.id === stageId ? { ...s, status: nextStatus } : s
    );
    
    calculateAndSaveProgress(updatedStages);
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50/50">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-pms-600" /> Cronograma & Etapas
          </h2>
          <p className="text-slate-500">Defina as fases macro da obra e o método de cálculo de progresso.</p>
        </div>
      </div>

      {/* SETTINGS & PROGRESS HEADER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* CALCULATION METHOD SELECTOR */}
        <div className="lg:col-span-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                    <Settings size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Calcular Progresso Geral via:</h3>
                    <p className="text-xs text-slate-500">Define como a barra de % na Visão Geral é atualizada.</p>
                </div>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => handleMethodChange('STAGES')}
                    className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${
                        (work.progressMethod || 'STAGES') === 'STAGES' 
                        ? 'bg-white text-pms-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <ArrowRight size={14}/> Por Etapas do Cronograma
                </button>
                <button 
                    onClick={() => handleMethodChange('TASKS')}
                    className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${
                        work.progressMethod === 'TASKS' 
                        ? 'bg-white text-pms-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <ListChecks size={14}/> Por Tarefas (Kanban)
                </button>
            </div>
        </div>

        {/* Add New Stage */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-2">Nova Etapa Macro</label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    className="flex-1 border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-pms-500 outline-none"
                    placeholder="Ex: Fundação, Alvenaria, Pintura..."
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                />
                <button 
                    onClick={handleAddStage}
                    disabled={!newStageName}
                    className="bg-pms-600 hover:bg-pms-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    <Plus size={20}/> Adicionar
                </button>
            </div>
        </div>

        {/* Progress Widget */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Conclusão do Cronograma</span>
                <span className="text-2xl font-bold text-slate-800">{completionStats.percent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pms-600 to-pms-400 transition-all duration-700" style={{width: `${completionStats.percent}%`}}></div>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-right">
                {completionStats.count} de {stages.length} etapas concluídas
            </p>
        </div>
      </div>

      {/* STAGES LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <ArrowRight size={18} className="text-pms-600"/> Linha do Tempo
              </h3>
              <span className="text-xs bg-white border px-2 py-1 rounded text-slate-500">
                  {stages.length} etapas cadastradas
              </span>
          </div>

          <div className="divide-y divide-slate-100">
              {stages.map((stage, index) => (
                  <div key={stage.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                          <span className="text-slate-300 font-bold text-lg w-6 text-center">{index + 1}</span>
                          <div>
                              <p className={`font-bold text-lg ${stage.status === 'COMPLETED' ? 'text-slate-800' : 'text-slate-600'}`}>
                                  {stage.name}
                              </p>
                              {stage.status === 'PENDING' && <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded">Pendente</span>}
                              {stage.status === 'IN_PROGRESS' && <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded animate-pulse">Em Andamento</span>}
                              {stage.status === 'COMPLETED' && <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">Concluído</span>}
                          </div>
                      </div>

                      <div className="flex items-center gap-3">
                          {/* Status Toggle Button */}
                          <button 
                              onClick={() => handleStatusChange(stage.id, stage.status)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all shadow-sm ${
                                  stage.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' :
                                  stage.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' :
                                  'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                              {stage.status === 'COMPLETED' ? <CheckCircle2 size={18}/> : stage.status === 'IN_PROGRESS' ? <Clock size={18}/> : <Circle size={18}/>}
                              {stage.status === 'COMPLETED' ? 'Concluído' : stage.status === 'IN_PROGRESS' ? 'Andamento' : 'Pendente'}
                          </button>

                          <button 
                              onClick={() => handleDeleteStage(stage.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir Etapa"
                          >
                              <Trash2 size={18} />
                          </button>
                      </div>
                  </div>
              ))}
              
              {stages.length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                      <Calendar size={48} className="mx-auto mb-3 opacity-20"/>
                      <p>Nenhuma etapa definida.</p>
                      <p className="text-sm">Adicione as fases da obra acima para gerar o cronograma visual.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
