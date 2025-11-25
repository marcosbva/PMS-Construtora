
import React, { useState, useEffect } from 'react';
import { ConstructionWork, WorkStatus, User, UserCategory, WorkBudget, DailyLog } from '../types';
import { Camera, Save, MapPin, Calendar, DollarSign, User as UserIcon, Loader2, Briefcase, FileText, Image as ImageIcon, Trash2, AlertTriangle, Calculator, FolderOpen, Link as LinkIcon, ExternalLink, HardHat, Upload, Eye } from 'lucide-react';
import { api } from '../services/api';
import { uploadFile } from '../services/storage';
import { WorkforceSummary } from './WorkforceSummary';

interface WorkOverviewProps {
  work: ConstructionWork;
  users: User[]; // To select client
  logs: DailyLog[]; // To calculate stats
  onUpdateWork: (work: ConstructionWork) => Promise<void>;
  onDeleteWork: (id: string) => Promise<void>;
}

export const WorkOverview: React.FC<WorkOverviewProps> = ({ work, users, logs, onUpdateWork, onDeleteWork }) => {
  const [formData, setFormData] = useState<ConstructionWork>(work);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [budgetData, setBudgetData] = useState<WorkBudget | null>(null);
  const [isLoadingBudget, setIsLoadingBudget] = useState(true);
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Sync state if prop changes (e.g. background update)
  useEffect(() => {
    setFormData(work);
    setIsDirty(false);
  }, [work]);

  // Fetch Budget Data from the new Module
  useEffect(() => {
    const fetchBudget = async () => {
        setIsLoadingBudget(true);
        try {
            const b = await api.getBudget(work.id);
            setBudgetData(b);
            
            // If budget exists, sync the ConstructionWork budget field to match the calculated total
            if (b && b.totalValue !== work.budget) {
                setFormData(prev => ({ ...prev, budget: b.totalValue }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingBudget(false);
        }
    };
    fetchBudget();
  }, [work.id]);

  const handleChange = (field: keyof ConstructionWork, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploadingCover(true);
      try {
          // Standardized Path: obras/${obraId}/capa
          const url = await uploadFile(file, `obras/${work.id}/capa`, { type: 'cover_image' });
          handleChange('imageUrl', url);
      } catch (err) {
          alert("Erro ao atualizar capa.");
      } finally {
          setIsUploadingCover(false);
      }
    }
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingContract(true);
      try {
          // Standardized Path: obras/${obraId}/contratos
          const url = await uploadFile(file, `obras/${work.id}/contratos`, { type: 'contract_pdf' });
          
          handleChange('contractUrl', url);
          alert("Contrato enviado com sucesso! Lembre-se de salvar as alterações.");
      } catch (err: any) {
          console.error("Upload error:", err);
          alert("Erro ao enviar arquivo: " + err.message);
      } finally {
          setIsUploadingContract(false);
      }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateWork(formData);
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save work", error);
      alert("Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Cover Image Section */}
      <div className="relative h-64 md:h-80 w-full rounded-2xl overflow-hidden shadow-md group bg-slate-200">
        {formData.imageUrl ? (
          <img 
            src={formData.imageUrl} 
            alt="Capa da Obra" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
            <ImageIcon size={48} className="mb-2 opacity-50" />
            <span className="text-sm font-bold">Sem imagem de capa</span>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90"></div>

        {/* Loading Overlay */}
        {isUploadingCover && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 backdrop-blur-sm">
                <Loader2 size={40} className="text-white animate-spin" />
            </div>
        )}

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
           <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 shadow-sm">{formData.name}</h1>
           <div className="flex flex-wrap gap-3 items-center">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                  formData.status === WorkStatus.COMPLETED ? 'bg-green-500/20 border-green-400 text-green-100' :
                  formData.status === WorkStatus.PAUSED ? 'bg-red-500/20 border-red-400 text-red-100' :
                  'bg-blue-500/20 border-blue-400 text-blue-100'
              }`}>
                  {formData.status}
              </span>
              <span className="text-white/80 text-sm flex items-center gap-1">
                  <MapPin size={14} /> {formData.address || 'Endereço não informado'}
              </span>
           </div>
        </div>

        {/* Change Cover Button */}
        <label className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full cursor-pointer transition-all shadow-lg border border-white/30 group-hover:scale-110 z-10">
          <Camera size={20} />
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingCover} />
        </label>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details Form */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase className="text-pms-600" size={20} />
                        Dados da Obra
                    </h3>
                    {isDirty && (
                        <span className="text-xs font-bold text-orange-500 animate-pulse">
                            Alterações não salvas
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nome da Obra</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Endereço</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                className="w-full pl-9 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cliente</label>
                         <select 
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                            value={formData.clientId || ''}
                            onChange={e => {
                                const c = users.find(u => u.id === e.target.value);
                                setFormData(prev => ({ ...prev, clientId: e.target.value, client: c ? c.name : '' }));
                                setIsDirty(true);
                            }}
                         >
                             <option value="">Selecione...</option>
                             {users.filter(u => u.category === UserCategory.CLIENT).map(u => (
                                 <option key={u.id} value={u.id}>{u.name}</option>
                             ))}
                         </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-1">
                            <HardHat size={14} /> Responsável Técnico
                        </label>
                         <select 
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                            value={formData.responsibleId || ''}
                            onChange={e => handleChange('responsibleId', e.target.value)}
                         >
                             <option value="">Selecione o Engenheiro/Mestre...</option>
                             {users.filter(u => u.category === UserCategory.INTERNAL).map(u => (
                                 <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                             ))}
                         </select>
                    </div>
                    
                    {/* BUDGET FIELD LINKED TO MODULE */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-1">
                           <Calculator size={14} /> Orçamento Previsto (Módulo)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-500 font-bold text-sm">R$</span>
                            
                            {isLoadingBudget ? (
                                <div className="w-full h-[46px] border border-slate-200 bg-slate-50 rounded-lg flex items-center pl-9 text-slate-400">
                                    <Loader2 className="animate-spin mr-2" size={16}/> Carregando...
                                </div>
                            ) : budgetData ? (
                                <input 
                                    type="text" 
                                    readOnly
                                    className="w-full pl-9 border border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-bold text-slate-700 cursor-not-allowed outline-none"
                                    value={budgetData.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    title="Gerencie este valor no menu 'Orçamentos'"
                                />
                            ) : (
                                <div className="w-full border border-orange-200 bg-orange-50 rounded-lg p-3 flex items-center gap-2">
                                     <AlertTriangle size={16} className="text-orange-500" />
                                     <span className="text-xs font-bold text-orange-700">Pendente: Fazer Orçamento</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Data Início</label>
                        <input 
                            type="date" 
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                            value={formData.startDate}
                            onChange={(e) => handleChange('startDate', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Previsão Término</label>
                        <input 
                            type="date" 
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                            value={formData.endDate}
                            onChange={(e) => handleChange('endDate', e.target.value)}
                        />
                    </div>
                </div>

                {/* DOCUMENTATION LINKS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Drive Link */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-1">
                            <LinkIcon size={14} /> Link de Projetos (Drive)
                        </label>
                        <input 
                            type="url"
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none text-blue-600 underline"
                            value={formData.driveLink || ''}
                            onChange={(e) => handleChange('driveLink', e.target.value)}
                            placeholder="Cole aqui o link da pasta..."
                        />
                    </div>

                    {/* Signed Contract Upload */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-1">
                            <FileText size={14} /> Contrato Assinado
                        </label>
                        
                        {formData.contractUrl ? (
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-300 rounded-lg p-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="bg-red-100 text-red-600 p-1.5 rounded">
                                        <FileText size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 truncate">Contrato Anexado</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <a 
                                        href={formData.contractUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                        title="Visualizar Contrato"
                                    >
                                        <Eye size={16} />
                                    </a>
                                    <button 
                                        onClick={() => {
                                            if(window.confirm("Deseja remover o contrato anexado?")) {
                                                handleChange('contractUrl', '');
                                            }
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Excluir / Trocar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-300 rounded-lg p-2.5 cursor-pointer hover:bg-slate-50 hover:border-pms-400 transition-all ${isUploadingContract ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isUploadingContract ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin text-pms-600" />
                                        <span className="text-xs font-bold text-pms-600">Enviando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500">Anexar Contrato (PDF)</span>
                                    </>
                                )}
                                <input 
                                    type="file" 
                                    accept="application/pdf,image/*" 
                                    className="hidden" 
                                    onChange={handleContractUpload}
                                    disabled={isUploadingContract}
                                />
                            </label>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Descrição / Observações</label>
                    <textarea 
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none h-32 resize-none"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Detalhes importantes sobre a obra..."
                    />
                </div>
            </div>
        </div>

        {/* Right Column: Status & Save */}
        <div className="space-y-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase flex items-center gap-2">
                    <Save size={16} className="text-pms-600"/> Ações
                </h3>
                
                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Status Atual</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.values(WorkStatus).map(status => (
                            <button
                                key={status}
                                onClick={() => handleChange('status', status)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                    formData.status === status 
                                    ? 'bg-slate-800 text-white border-slate-800' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Progresso Geral</label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={formData.progress} 
                            onChange={(e) => handleChange('progress', parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pms-600"
                        />
                        <span className="font-bold text-slate-800 min-w-[3rem] text-right">{formData.progress}%</span>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                    className="w-full py-3 bg-pms-600 text-white rounded-xl font-bold hover:bg-pms-500 shadow-lg shadow-pms-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all"
                >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            {/* DRIVE ACCESS BUTTON */}
            {formData.driveLink && (
                <a 
                    href={formData.driveLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-3 transition-all transform hover:scale-105 group"
                >
                    <FolderOpen size={24} className="group-hover:animate-bounce" />
                    <span>Acessar Projetos (Drive)</span>
                    <ExternalLink size={16} className="opacity-70" />
                </a>
            )}

            {/* WORKFORCE SUMMARY WIDGET */}
            <WorkforceSummary logs={logs} title="Efetivo Acumulado" />

            {/* DELETE ZONE */}
            <div className="bg-red-50 rounded-xl border border-red-100 p-6 mt-4">
                <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                    <AlertTriangle size={18} /> Zona de Perigo
                </h4>
                <p className="text-xs text-red-600 mb-4 leading-relaxed">
                    A exclusão da obra é irreversível e removerá todos os dados vinculados (tarefas, financeiro, diário).
                </p>
                <button
                    onClick={() => onDeleteWork(work.id)}
                    className="w-full py-2 bg-white text-red-600 border border-red-200 rounded-lg font-bold hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                    <Trash2 size={18} /> Excluir Obra
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
