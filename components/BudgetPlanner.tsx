
import React, { useState, useEffect, useMemo } from 'react';
import { ConstructionWork, WorkBudget, BudgetCategory, BudgetItem } from '../types';
import { api } from '../services/api';
import { generateBudgetStructure } from '../services/geminiService';
import { Calculator, Plus, Save, BrainCircuit, ChevronDown, ChevronRight, Trash2, Download, RefreshCw, Loader2, DollarSign, FileSpreadsheet, LayoutList, X, FileText } from 'lucide-react';

interface BudgetPlannerProps {
    works: ConstructionWork[];
}

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ works }) => {
    const [selectedWorkId, setSelectedWorkId] = useState<string>('');
    const [budget, setBudget] = useState<WorkBudget | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    // AI Modal State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiScopeText, setAiScopeText] = useState('');

    const selectedWork = works.find(w => w.id === selectedWorkId);

    // Load Budget when Work is selected
    useEffect(() => {
        if (!selectedWorkId) {
            setBudget(null);
            return;
        }

        const loadBudget = async () => {
            setIsLoading(true);
            try {
                const existingBudget = await api.getBudget(selectedWorkId);
                if (existingBudget) {
                    setBudget(existingBudget);
                    // Auto expand all if few categories
                    if (existingBudget.categories.length < 5) {
                        const allExpanded = existingBudget.categories.reduce((acc, cat) => ({...acc, [cat.id]: true}), {});
                        setExpandedCategories(allExpanded);
                    }
                } else {
                    // Create Empty Draft
                    setBudget({
                        id: selectedWorkId,
                        workId: selectedWorkId,
                        totalValue: 0,
                        categories: [],
                        updatedAt: new Date().toISOString(),
                        version: 1
                    });
                }
            } catch (error) {
                console.error("Error loading budget", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadBudget();
    }, [selectedWorkId]);

    // --- AI MODAL HANDLERS ---

    const openAiModal = () => {
        if (!selectedWork || !budget) return;

        if (budget.categories.length > 0) {
            if (!window.confirm("ATENÇÃO: Isso substituirá toda a estrutura atual do orçamento. Deseja continuar?")) return;
        }

        // Pre-fill with existing work info as a starting point
        const initialText = `Obra: ${selectedWork.name}\n\nDescrição do Projeto:\n${selectedWork.description || 'Descreva aqui o escopo detalhado (ex: Construção de casa 200m², alto padrão, 2 pavimentos, piscina, acabamento em porcelanato...)'}`;
        
        setAiScopeText(initialText);
        setIsAiModalOpen(true);
    };

    const executeAiGeneration = async () => {
        if (!selectedWork || !budget || !aiScopeText) return;
        
        setIsGenerating(true);
        try {
            // We pass the user-edited scope text as the description to the AI service
            const aiCategories = await generateBudgetStructure(selectedWork.name, aiScopeText);
            
            // Recalculate Totals just in case
            const total = aiCategories.reduce((sum, cat) => {
                const catTotal = cat.items.reduce((s, i) => s + (i.totalPrice || 0), 0);
                cat.categoryTotal = catTotal;
                return sum + catTotal;
            }, 0);

            setBudget({
                ...budget,
                categories: aiCategories,
                totalValue: total,
                updatedAt: new Date().toISOString()
            });
            
            // Expand all generated categories
            const allExpanded = aiCategories.reduce((acc, cat) => ({...acc, [cat.id]: true}), {});
            setExpandedCategories(allExpanded);
            
            setIsAiModalOpen(false);

        } catch (error) {
            alert("Erro ao gerar orçamento com IA. Tente detalhar mais o escopo.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- MANIPULATION HANDLERS ---
    
    const toggleCategory = (catId: string) => {
        setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    const updateItem = (catId: string, itemId: string, field: keyof BudgetItem, value: any) => {
        if (!budget) return;

        const newCategories = budget.categories.map(cat => {
            if (cat.id !== catId) return cat;

            const newItems = cat.items.map(item => {
                if (item.id !== itemId) return item;
                
                const updatedItem = { ...item, [field]: value };
                
                // Auto calculate total price
                if (field === 'quantity' || field === 'unitPrice') {
                    const qty = field === 'quantity' ? Number(value) : item.quantity;
                    const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
                    updatedItem.totalPrice = qty * price;
                }
                return updatedItem;
            });

            const catTotal = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
            return { ...cat, items: newItems, categoryTotal: catTotal };
        });

        const totalValue = newCategories.reduce((sum, cat) => sum + cat.categoryTotal, 0);

        setBudget({ ...budget, categories: newCategories, totalValue });
    };

    const addCategory = () => {
        if (!budget) return;
        const newCat: BudgetCategory = {
            id: `cat_${Date.now()}`,
            name: `Nova Etapa ${budget.categories.length + 1}`,
            items: [],
            categoryTotal: 0
        };
        setBudget({ ...budget, categories: [...budget.categories, newCat] });
        setExpandedCategories(prev => ({ ...prev, [newCat.id]: true }));
    };

    const addItem = (catId: string) => {
        if (!budget) return;
        const newCategories = budget.categories.map(cat => {
            if (cat.id !== catId) return cat;
            const newItem: BudgetItem = {
                id: `item_${Date.now()}`,
                description: 'Novo Serviço / Material',
                unit: 'un',
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0
            };
            return { ...cat, items: [...cat.items, newItem] };
        });
        setBudget({ ...budget, categories: newCategories });
    };

    const removeCategory = (catId: string) => {
        if (!budget) return;
        if (!window.confirm("Excluir esta etapa e todos os itens?")) return;
        
        const newCategories = budget.categories.filter(c => c.id !== catId);
        const totalValue = newCategories.reduce((sum, cat) => sum + cat.categoryTotal, 0);
        setBudget({ ...budget, categories: newCategories, totalValue });
    };

    const removeItem = (catId: string, itemId: string) => {
        if (!budget) return;
        
        const newCategories = budget.categories.map(cat => {
            if (cat.id !== catId) return cat;
            const newItems = cat.items.filter(i => i.id !== itemId);
            const catTotal = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
            return { ...cat, items: newItems, categoryTotal: catTotal };
        });

        const totalValue = newCategories.reduce((sum, cat) => sum + cat.categoryTotal, 0);
        setBudget({ ...budget, categories: newCategories, totalValue });
    };

    const handleSave = async () => {
        if (!budget) return;
        setIsLoading(true);
        try {
            await api.saveBudget(budget);
            alert("Orçamento salvo com sucesso!");
        } catch (error) {
            alert("Erro ao salvar orçamento.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER ---

    return (
        <div className="p-6 min-h-screen pb-20 bg-slate-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="text-pms-600" /> Orçamentos & Planejamento
                    </h2>
                    <p className="text-slate-500">Estimativas de custo, EAP e comparativos (Previsto vs Realizado).</p>
                </div>
                
                {/* Work Selector */}
                <div className="bg-white p-2 rounded-lg border border-slate-300 shadow-sm flex items-center gap-2 min-w-[250px]">
                    <LayoutList size={18} className="text-slate-400 ml-2" />
                    <select 
                        className="bg-transparent outline-none w-full text-sm font-bold text-slate-700"
                        value={selectedWorkId}
                        onChange={(e) => setSelectedWorkId(e.target.value)}
                    >
                        <option value="">Selecione uma obra...</option>
                        {works.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedWorkId ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400">
                    <FileSpreadsheet size={48} className="mb-4 opacity-50" />
                    <p>Selecione uma obra acima para iniciar o orçamento.</p>
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-pms-600" size={32} />
                </div>
            ) : budget ? (
                <div className="animate-fade-in space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase block">Total Orçado</span>
                                <span className="text-2xl font-bold text-pms-700">R$ {budget.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                            <div className="hidden md:block">
                                <span className="text-xs font-bold text-slate-400 uppercase block">Total Executado (Financeiro)</span>
                                <span className="text-lg font-bold text-slate-600">
                                    {/* Future integration: Compare with financial records */}
                                    R$ -
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                             <button 
                                onClick={openAiModal}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-70"
                                title="Gerar estrutura automática com IA"
                             >
                                <BrainCircuit size={18} />
                                <span className="hidden sm:inline">IA: Gerar EAP</span>
                             </button>

                             <button 
                                onClick={addCategory}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-2 transition-all"
                             >
                                <Plus size={18} /> <span className="hidden sm:inline">Nova Etapa</span>
                             </button>

                             <button 
                                onClick={handleSave}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all"
                             >
                                <Save size={18} /> <span className="hidden sm:inline">Salvar</span>
                             </button>
                        </div>
                    </div>

                    {/* Budget Table / Accordion */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="grid grid-cols-12 bg-slate-100 p-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                            <div className="col-span-6 md:col-span-5 pl-8">Descrição do Serviço / Item</div>
                            <div className="col-span-2 text-center">Unid.</div>
                            <div className="col-span-2 text-center">Qtd.</div>
                            <div className="col-span-2 md:col-span-1 text-right">Unit. (R$)</div>
                            <div className="hidden md:block md:col-span-2 text-right pr-4">Total (R$)</div>
                        </div>

                        {budget.categories.length === 0 && (
                            <div className="p-10 text-center text-slate-400">
                                <p>O orçamento está vazio.</p>
                                <p className="text-sm mt-2">Use o botão <strong>IA: Gerar EAP</strong> para criar uma estrutura inicial baseada na descrição da obra.</p>
                            </div>
                        )}

                        {budget.categories.map((category) => (
                            <div key={category.id} className="border-b border-slate-100 last:border-0">
                                {/* Category Header */}
                                <div className="bg-slate-50 hover:bg-slate-100 transition-colors p-3 flex items-center justify-between group">
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer flex-1"
                                        onClick={() => toggleCategory(category.id)}
                                    >
                                        {expandedCategories[category.id] ? <ChevronDown size={18} className="text-slate-400"/> : <ChevronRight size={18} className="text-slate-400"/>}
                                        <input 
                                            type="text" 
                                            className="font-bold text-slate-800 bg-transparent outline-none w-full cursor-pointer focus:bg-white focus:cursor-text focus:px-2 rounded"
                                            value={category.name}
                                            onChange={(e) => {
                                                const newCats = budget.categories.map(c => c.id === category.id ? {...c, name: e.target.value} : c);
                                                setBudget({...budget, categories: newCats});
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-slate-700 text-sm">
                                            R$ {category.categoryTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <button 
                                            onClick={() => removeCategory(category.id)}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Items List */}
                                {expandedCategories[category.id] && (
                                    <div className="bg-white">
                                        {category.items.map((item) => (
                                            <div key={item.id} className="grid grid-cols-12 gap-2 p-2 border-b border-slate-50 items-center hover:bg-blue-50/30 transition-colors group/item">
                                                {/* Description */}
                                                <div className="col-span-6 md:col-span-5 pl-8 relative">
                                                    <input 
                                                        className="w-full bg-transparent outline-none text-sm text-slate-700 focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1"
                                                        value={item.description}
                                                        onChange={(e) => updateItem(category.id, item.id, 'description', e.target.value)}
                                                    />
                                                    <button 
                                                        onClick={() => removeItem(category.id, item.id)}
                                                        className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-400 opacity-0 group-hover/item:opacity-100"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                
                                                {/* Unit */}
                                                <div className="col-span-2 text-center">
                                                    <input 
                                                        className="w-full text-center bg-transparent outline-none text-sm text-slate-500 focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1"
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(category.id, item.id, 'unit', e.target.value)}
                                                    />
                                                </div>

                                                {/* Quantity */}
                                                <div className="col-span-2 text-center">
                                                    <input 
                                                        type="number"
                                                        className="w-full text-center bg-transparent outline-none text-sm font-medium text-slate-700 focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(category.id, item.id, 'quantity', e.target.value)}
                                                    />
                                                </div>

                                                {/* Unit Price */}
                                                <div className="col-span-2 md:col-span-1 text-right">
                                                    <input 
                                                        type="number"
                                                        className="w-full text-right bg-transparent outline-none text-sm text-slate-700 focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(category.id, item.id, 'unitPrice', e.target.value)}
                                                    />
                                                </div>

                                                {/* Total Price */}
                                                <div className="hidden md:block md:col-span-2 text-right pr-4 font-bold text-slate-800 text-sm">
                                                    {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Add Item Button */}
                                        <div className="p-2 pl-8">
                                            <button 
                                                onClick={() => addItem(category.id)}
                                                className="text-xs font-bold text-pms-600 hover:text-pms-700 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                                            >
                                                <Plus size={14} /> Adicionar Item
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* AI GENERATION MODAL */}
            {isAiModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <BrainCircuit className="text-purple-600" /> Gerar EAP com IA
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Descreva o escopo da obra para gerar as etapas e estimativas.
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsAiModalOpen(false)} 
                                disabled={isGenerating}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto mb-4">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-700">
                                <strong>Dica:</strong> Quanto mais detalhada a descrição (metragem, padrão de acabamento, quantidade de cômodos, tipo de estrutura), mais preciso será o orçamento gerado.
                            </div>
                            
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                                <FileText size={16} /> Escopo do Projeto
                            </label>
                            <textarea 
                                className="w-full h-64 border border-slate-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none leading-relaxed"
                                value={aiScopeText}
                                onChange={(e) => setAiScopeText(e.target.value)}
                                placeholder="Ex: Construção residencial de 150m², fundação em radier, alvenaria estrutural, telhado colonial, acabamento médio padrão, pintura acrílica, instalações elétricas e hidráulicas completas..."
                                disabled={isGenerating}
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                            <button 
                                onClick={() => setIsAiModalOpen(false)}
                                disabled={isGenerating}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={executeAiGeneration}
                                disabled={isGenerating || !aiScopeText.trim()}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-bold shadow-lg shadow-purple-600/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Analisando e Gerando...
                                    </>
                                ) : (
                                    <>
                                        <BrainCircuit size={18} />
                                        Gerar Orçamento
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
