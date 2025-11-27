
import React, { useState, useEffect, useMemo } from 'react';
import { ConstructionWork, WorkBudget, BudgetCategory, Task, TaskStatus } from '../types';
import { api } from '../services/api';
import { generateBudgetStructure } from '../services/geminiService';
import { Calendar, DollarSign, Plus, Save, ChevronDown, ChevronRight, BrainCircuit, Trash2, Clock, CheckCircle2, Circle, Loader2, ArrowRight, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';

interface PlanningCenterProps {
    work: ConstructionWork;
    tasks: Task[]; // Need tasks to count items
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
            status: 'PENDING',
            progress: 0
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

    const removeStage = (stageId: string) => {
        if (!budget || !window.confirm("Remover esta etapa e todos os seus itens?")) return;
        const newCats = budget.categories.filter(c => c.id !== stageId);
        const total = newCats.reduce((acc, c) => acc + c.categoryTotal, 0);
        setBudget({ ...budget, categories: newCats, totalValue: total });
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

    // Calculate Stats
    const getStageStats = (stage: BudgetCategory) => {
        const stageTasks = tasks.filter(t => t.stageId === stage.id);
        const totalTasks = stageTasks.length;
        
        // Use stored progress as source of truth
        const realProgress = stage.progress || 0;
        
        // Weight Calculation (Representativity in Total Budget)
        const totalBudget = budget?.totalValue || 1;
        const weight = (stage.categoryTotal / totalBudget) * 100;

        return { realProgress, weight, taskCount: totalTasks };
    };

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-pms-600"/></div>;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 className="text-pms-400"/> Planejamento Físico-Financeiro
                    </h2>
                    <p className="text-slate-400 text-sm">Defina o orçamento base e o cronograma macro. O progresso físico é alimentado pelas tarefas de campo.</p>
                </div>
                <div className="text-right bg-white/10 p-3 rounded-lg border border-white/10">
                    <p className="text-xs text-slate-400 uppercase font-bold">Orçamento Total</p>
                    <p className="text-2xl font-bold text-pms-400">R$ {budget?.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
            </div>

            <div className="flex gap-2 justify-end">
                <button onClick={() => setIsAiModalOpen(true)} className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg font-bold flex items-center gap-2 transition-colors border border-purple-200">
                    <BrainCircuit size={18}/> IA: Gerar EAP
                </button>
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-pms-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-pms-500 transition-colors disabled:opacity-50 shadow-md">
                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar Planejamento
                </button>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 p-3 border-b border-slate-200 grid grid-cols-12 gap-2 font-bold text-slate-600 text-[10px] uppercase tracking-wider items-center">
                    <div className="col-span-4 pl-8">Etapa (Pacote de Trabalho)</div>
                    <div className="col-span-2 text-right">Orçamento (R$)</div>
                    <div className="col-span-1 text-center">Peso (%)</div>
                    <div className="col-span-2 text-center">Cronograma</div>
                    <div className="col-span-2 text-center">Avanço Físico Real</div>
                    <div className="col-span-1"></div>
                </div>

                <div className="divide-y divide-slate-100">
                    {budget?.categories.map(stage => {
                        const { realProgress, weight, taskCount } = getStageStats(stage);
                        const isExpanded = expandedRows[stage.id];

                        return (
                            <div key={stage.id} className="group bg-white hover:bg-slate-50 transition-colors">
                                {/* Macro Row */}
                                <div className="p-3 grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-4 flex items-center gap-2">
                                        <button 
                                            onClick={() => setExpandedRows(prev => ({...prev, [stage.id]: !prev[stage.id]}))}
                                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                                        >
                                            {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                        </button>
                                        <input 
                                            className="w-full font-bold text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-pms-300 focus:bg-white transition-all text-sm"
                                            value={stage.name}
                                            onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                                            placeholder="Nome da Etapa"
                                        />
                                    </div>
                                    <div className="col-span-2 text-right font-medium text-slate-700 text-sm">
                                        R$ {stage.categoryTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                                            {weight.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="col-span-2 flex gap-1">
                                        <input 
                                            type="date" 
                                            className="w-full text-[10px] border border-slate-200 rounded p-1 text-slate-600 bg-white"
                                            value={stage.startDate || ''}
                                            onChange={(e) => updateStage(stage.id, 'startDate', e.target.value)}
                                        />
                                        <input 
                                            type="date" 
                                            className="w-full text-[10px] border border-slate-200 rounded p-1 text-slate-600 bg-white"
                                            value={stage.endDate || ''}
                                            onChange={(e) => updateStage(stage.id, 'endDate', e.target.value)}
                                        />
                                    </div>
                                    
                                    {/* PHYSICAL PROGRESS (EDITABLE) */}
                                    <div className="col-span-2 px-2">
                                        <div className="flex justify-between text-[10px] mb-1">
                                            <span className="text-slate-400" title="Tarefas vinculadas">{taskCount} tarefas</span>
                                            <input 
                                                type="number" 
                                                min="0" max="100"
                                                className={`w-12 text-right font-bold bg-transparent border-b border-slate-300 focus:border-pms-500 outline-none ${realProgress === 100 ? 'text-green-600' : 'text-slate-700'}`}
                                                value={realProgress}
                                                onChange={(e) => updateStage(stage.id, 'progress', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                            />
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden relative group/prog">
                                            <div className={`h-full ${realProgress === 100 ? 'bg-green-500' : 'bg-pms-500'}`} style={{width: `${realProgress}%`}}></div>
                                            <input 
                                                type="range"
                                                min="0" max="100"
                                                value={realProgress}
                                                onChange={(e) => updateStage(stage.id, 'progress', parseInt(e.target.value))}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                                                title="Arraste para ajustar manualmente"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <button onClick={() => removeStage(stage.id)} className="text-slate-300 hover:text-red-500 p-1 transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                </div>

                                {/* Detailed Items (Sub-rows) */}
                                {isExpanded && (
                                    <div className="bg-slate-50 pl-10 pr-4 py-3 border-t border-slate-100 shadow-inner">
                                        <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                                            <Circle size={8} fill="currentColor"/> Detalhamento de Custos (Composição)
                                        </div>
                                        {stage.items.length > 0 && (
                                            <div className="grid grid-cols-12 gap-2 mb-2 text-[10px] font-bold text-slate-400 border-b border-slate-200 pb-1">
                                                <div className="col-span-6">Descrição do Item</div>
                                                <div className="col-span-1 text-center">Un</div>
                                                <div className="col-span-1 text-center">Qtd</div>
                                                <div className="col-span-2 text-right">Unitário</div>
                                                <div className="col-span-2 text-right">Total</div>
                                            </div>
                                        )}
                                        
                                        {stage.items.map(item => (
                                            <div key={item.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
                                                <div className="col-span-6">
                                                    <input 
                                                        className="w-full text-xs bg-white border border-slate-200 rounded p-1.5 focus:border-pms-300 outline-none"
                                                        value={item.description}
                                                        onChange={(e) => updateItem(stage.id, item.id, 'description', e.target.value)}
                                                        placeholder="Descrição do item"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <input 
                                                        className="w-full text-xs bg-white border border-slate-200 rounded p-1.5 text-center"
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(stage.id, item.id, 'unit', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <input 
                                                        type="number"
                                                        className="w-full text-xs bg-white border border-slate-200 rounded p-1.5 text-center font-bold"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(stage.id, item.id, 'quantity', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2 relative">
                                                    <span className="absolute left-1.5 top-1.5 text-[10px] text-slate-400">R$</span>
                                                    <input 
                                                        type="number"
                                                        className="w-full text-xs bg-white border border-slate-200 rounded p-1.5 pl-6 text-right"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(stage.id, item.id, 'unitPrice', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-1 text-right text-xs font-bold text-slate-600 p-1.5">
                                                    {item.totalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button onClick={() => {
                                                        const newItems = stage.items.filter(i => i.id !== item.id);
                                                        const newTotal = newItems.reduce((acc, i) => acc + i.totalPrice, 0);
                                                        const newCats = budget.categories.map(c => c.id === stage.id ? {...c, items: newItems, categoryTotal: newTotal} : c);
                                                        setBudget({...budget, categories: newCats, totalValue: newCats.reduce((acc, c) => acc + c.categoryTotal, 0)});
                                                    }} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => addItem(stage.id)} className="text-xs font-bold text-pms-600 hover:text-pms-500 flex items-center gap-1 mt-3 bg-white border border-pms-200 px-3 py-1.5 rounded-lg shadow-sm transition-all hover:shadow-md">
                                            <Plus size={12}/> Adicionar Item de Custo
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <button onClick={addStage} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-bold hover:bg-white hover:border-pms-400 hover:text-pms-600 transition-all flex items-center justify-center gap-2">
                        <Plus size={18}/> Adicionar Nova Etapa Macro
                    </button>
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
