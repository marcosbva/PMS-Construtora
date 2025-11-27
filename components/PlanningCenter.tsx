

import React, { useState, useEffect } from 'react';
import { ConstructionWork, WorkBudget, BudgetCategory, Task, TaskStatus } from '../types';
import { api } from '../services/api';
import { generateBudgetStructure } from '../services/geminiService';
import { Calendar, DollarSign, Plus, Save, ChevronDown, ChevronRight, BrainCircuit, Trash2, Clock, CheckCircle2, Circle, Loader2, ArrowRight } from 'lucide-react';

interface PlanningCenterProps {
    work: ConstructionWork;
    tasks: Task[]; // Need tasks to calculate real progress of stages
    onUpdateWork: (work: ConstructionWork) => void;
}

export const PlanningCenter: React.FC<PlanningCenterProps> = ({ work, tasks, onUpdateWork }) => {
    const [budget, setBudget] = useState<WorkBudget | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    
    // AI Modal
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiScope, setAiScope] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const b = await api.getBudget(work.id);
                if (b) {
                    setBudget(b);
                } else {
                    // Initialize empty budget/schedule
                    setBudget({
                        id: work.id,
                        workId: work.id,
                        totalValue: 0,
                        categories: [],
                        updatedAt: new Date().toISOString()
                    });
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [work.id]);

    const handleSave = async () => {
        if (!budget) return;
        setIsSaving(true);
        try {
            await api.saveBudget(budget);
            
            // Also update work budget total
            if (budget.totalValue !== work.budget) {
                onUpdateWork({ ...work, budget: budget.totalValue });
            }
            alert("Planejamento salvo com sucesso!");
        } catch (e) {
            alert("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    const updateStage = (stageId: string, field: keyof BudgetCategory, value: any) => {
        if (!budget) return;
        const newCats = budget.categories.map(cat => {
            if (cat.id === stageId) {
                return { ...cat, [field]: value };
            }
            return cat;
        });
        setBudget({ ...budget, categories: newCats });
    };

    const updateItem = (stageId: string, itemId: string, field: string, value: any) => {
        if (!budget) return;
        const newCats = budget.categories.map(cat => {
            if (cat.id !== stageId) return cat;
            
            const newItems = cat.items.map(item => {
                if (item.id !== itemId) return item;
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unitPrice') {
                    updated.totalPrice = Number(updated.quantity) * Number(updated.unitPrice);
                }
                return updated;
            });
            
            const catTotal = newItems.reduce((acc, i) => acc + i.totalPrice, 0);
            return { ...cat, items: newItems, categoryTotal: catTotal };
        });
        
        const total = newCats.reduce((acc, c) => acc + c.categoryTotal, 0);
        setBudget({ ...budget, categories: newCats, totalValue: total });
    };

    const addStage = () => {
        if (!budget) return;
        const newStage: BudgetCategory = {
            id: `stg_${Date.now()}`,
            name: 'Nova Etapa Macro',
            items: [],
            categoryTotal: 0,
            status: 'PENDING'
        };
        setBudget({ ...budget, categories: [...budget.categories, newStage] });
        setExpandedRows(prev => ({ ...prev, [newStage.id]: true }));
    };

    const addItem = (stageId: string) => {
        if (!budget) return;
        const newCats = budget.categories.map(cat => {
            if (cat.id !== stageId) return cat;
            return {
                ...cat,
                items: [...cat.items, {
                    id: `itm_${Date.now()}`,
                    description: 'Novo Item',
                    quantity: 1,
                    unit: 'un',
                    unitPrice: 0,
                    totalPrice: 0
                }]
            };
        });
        setBudget({ ...budget, categories: newCats });
    };

    const handleAiGenerate = async () => {
        if (!aiScope) return;
        setIsGenerating(true);
        try {
            const categories = await generateBudgetStructure(work.name, aiScope);
            const total = categories.reduce((acc, c) => acc + (c.categoryTotal || 0), 0);
            setBudget({
                id: work.id,
                workId: work.id,
                totalValue: total,
                categories: categories,
                updatedAt: new Date().toISOString()
            });
            setIsAiModalOpen(false);
        } catch (e) {
            alert("Erro na IA.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Calculate Progress per Stage based on Tasks linked to it
    const getStageProgress = (stageId: string) => {
        const stageTasks = tasks.filter(t => t.stageId === stageId);
        if (stageTasks.length === 0) return 0;
        
        const completed = stageTasks.filter(t => t.status === TaskStatus.DONE).length;
        return Math.round((completed / stageTasks.length) * 100);
    };

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-pms-600"/></div>;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-pms-600"/> Planejamento Integrado
                    </h2>
                    <p className="text-slate-500">Defina o Orçamento (Escopo) e o Cronograma (Prazo) em um só lugar.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsAiModalOpen(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-purple-500 transition-colors">
                        <BrainCircuit size={18}/> IA: Gerar Estrutura
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-green-500 transition-colors disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 p-4 border-b border-slate-200 grid grid-cols-12 gap-4 font-bold text-slate-600 text-xs uppercase">
                    <div className="col-span-4">Etapa Macro (Pacote de Trabalho)</div>
                    <div className="col-span-2 text-right">Orçamento (R$)</div>
                    <div className="col-span-2 text-center">Início</div>
                    <div className="col-span-2 text-center">Fim</div>
                    <div className="col-span-2 text-center">Progresso Real</div>
                </div>

                <div className="divide-y divide-slate-100">
                    {budget?.categories.map(stage => {
                        const progress = getStageProgress(stage.id);
                        const isExpanded = expandedRows[stage.id];

                        return (
                            <div key={stage.id} className="group">
                                {/* Macro Row */}
                                <div className="p-3 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 transition-colors">
                                    <div className="col-span-4 flex items-center gap-2">
                                        <button onClick={() => setExpandedRows(prev => ({...prev, [stage.id]: !prev[stage.id]}))}>
                                            {isExpanded ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
                                        </button>
                                        <input 
                                            className="w-full font-bold text-slate-800 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-pms-300 rounded px-1"
                                            value={stage.name}
                                            onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2 text-right font-bold text-slate-700">
                                        R$ {stage.categoryTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                            type="date" 
                                            className="w-full text-xs border rounded p-1 text-slate-600"
                                            value={stage.startDate || ''}
                                            onChange={(e) => updateStage(stage.id, 'startDate', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                            type="date" 
                                            className="w-full text-xs border rounded p-1 text-slate-600"
                                            value={stage.endDate || ''}
                                            onChange={(e) => updateStage(stage.id, 'endDate', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2 flex flex-col items-center">
                                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500" style={{width: `${progress}%`}}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 mt-1">{progress}% Concluído</span>
                                    </div>
                                </div>

                                {/* Detailed Items (Sub-rows) */}
                                {isExpanded && (
                                    <div className="bg-slate-50/50 pl-12 pr-4 py-2 border-t border-slate-100 shadow-inner">
                                        <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase">Detalhamento de Custo</div>
                                        {stage.items.map(item => (
                                            <div key={item.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
                                                <div className="col-span-5">
                                                    <input 
                                                        className="w-full text-xs bg-white border border-slate-200 rounded p-1"
                                                        value={item.description}
                                                        onChange={(e) => updateItem(stage.id, item.id, 'description', e.target.value)}
                                                        placeholder="Descrição do item"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <input 
                                                        className="w-full text-xs bg-white border border-slate-200 rounded p-1 text-center"
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(stage.id, item.id, 'unit', e.target.value)}
                                                        placeholder="Un"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <input 
                                                        type="number"
                                                        className="w-full text-xs bg-white border border-slate-200 rounded p-1 text-center"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(stage.id, item.id, 'quantity', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input 
                                                        type="number"
                                                        className="w-full text-xs bg-white border border-slate-200 rounded p-1 text-right"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(stage.id, item.id, 'unitPrice', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2 text-right text-xs font-bold text-slate-600 p-1">
                                                    R$ {item.totalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button onClick={() => {
                                                        const newItems = stage.items.filter(i => i.id !== item.id);
                                                        const newTotal = newItems.reduce((acc, i) => acc + i.totalPrice, 0);
                                                        const newCats = budget.categories.map(c => c.id === stage.id ? {...c, items: newItems, categoryTotal: newTotal} : c);
                                                        setBudget({...budget, categories: newCats, totalValue: newCats.reduce((acc, c) => acc + c.categoryTotal, 0)});
                                                    }} className="text-red-300 hover:text-red-500"><Trash2 size={12}/></button>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => addItem(stage.id)} className="text-xs font-bold text-pms-600 hover:text-pms-500 flex items-center gap-1 mt-2">
                                            <Plus size={12}/> Adicionar Item de Custo
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <button onClick={addStage} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-bold hover:bg-slate-100 hover:border-slate-400 transition-colors flex items-center justify-center gap-2">
                        <Plus size={18}/> Adicionar Nova Etapa Macro
                    </button>
                </div>
            </div>

            {/* Simple Gantt Visualization */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Clock className="text-orange-500"/> Linha do Tempo (Cronograma Macro)
                </h3>
                <div className="space-y-4">
                    {budget?.categories.filter(c => c.startDate && c.endDate).map(stage => (
                        <div key={stage.id}>
                            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                <span>{stage.name}</span>
                                <span>
                                    {new Date(stage.startDate!).toLocaleDateString('pt-BR')} <ArrowRight size={10} className="inline mx-1"/> {new Date(stage.endDate!).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden relative">
                                {/* This is a visual representation, for a real Gantt we'd need date math for positioning */}
                                <div className="absolute left-0 top-0 h-full bg-blue-100 w-full">
                                    <div className="h-full bg-blue-500" style={{width: `${getStageProgress(stage.id)}%`}}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {budget?.categories.filter(c => c.startDate && c.endDate).length === 0 && (
                        <p className="text-center text-slate-400 text-sm">Defina datas de início e fim nas etapas acima para visualizar o cronograma.</p>
                    )}
                </div>
            </div>

            {/* AI MODAL */}
            {isAiModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BrainCircuit className="text-purple-600"/> Inteligência Artificial
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Descreva o escopo da obra e a IA irá criar as Etapas do Cronograma e estimar custos iniciais.
                        </p>
                        <textarea 
                            className="w-full h-32 border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Ex: Construção de casa 200m², fundação radier, alvenaria estrutural, acabamento porcelanato..."
                            value={aiScope}
                            onChange={e => setAiScope(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setIsAiModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button onClick={handleAiGenerate} disabled={isGenerating} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
                                {isGenerating ? <Loader2 className="animate-spin"/> : <BrainCircuit size={18}/>} Gerar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
