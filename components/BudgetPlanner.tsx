
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ConstructionWork, WorkBudget, BudgetCategory, BudgetItem, Task, TaskStatus, TaskPriority, FinancialRecord, FinanceType } from '../types';
import { api } from '../services/api';
import { generateBudgetStructure, generateBudgetProposalText } from '../services/geminiService';
import { Calculator, Plus, Save, BrainCircuit, ChevronDown, ChevronRight, Trash2, Download, RefreshCw, Loader2, DollarSign, FileSpreadsheet, LayoutList, X, FileText, AlertCircle, CheckCircle2, FileDown, Printer, Upload, Image as ImageIcon } from 'lucide-react';

interface BudgetPlannerProps {
    works: ConstructionWork[];
    tasks: Task[]; // Added to check existing tasks
    activeWorkId?: string;
    onAddTask: (task: Task) => void; // Added to create tasks
    onUpdateTask: (task: Task) => void; // Added to update tasks
}

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ works, tasks, activeWorkId, onAddTask, onUpdateTask }) => {
    const [selectedWorkId, setSelectedWorkId] = useState<string>(activeWorkId || '');
    const [budget, setBudget] = useState<WorkBudget | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    // Financial Data for Comparison
    const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);

    // AI Modal State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiScopeText, setAiScopeText] = useState('');
    const [aiFile, setAiFile] = useState<string | null>(null); // Base64 string (Image or PDF)
    const [aiFileName, setAiFileName] = useState<string>('');
    const [aiFileType, setAiFileType] = useState<'image' | 'pdf' | null>(null);

    // Proposal Modal State
    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
    const [proposalText, setProposalText] = useState('');
    const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const selectedWork = works.find(w => w.id === selectedWorkId);

    // Sync with prop if it changes
    useEffect(() => {
        if (activeWorkId) {
            setSelectedWorkId(activeWorkId);
        }
    }, [activeWorkId]);

    // Load Budget when Work is selected
    useEffect(() => {
        if (!selectedWorkId) {
            setBudget(null);
            setFinancialRecords([]);
            return;
        }

        const loadData = async () => {
            setIsLoading(true);
            try {
                // Load Budget
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

                // Load Financials for Comparison
                const records = await api.getFinance();
                setFinancialRecords(records.filter(r => r.workId === selectedWorkId && r.type === FinanceType.EXPENSE));

            } catch (error) {
                console.error("Error loading budget", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [selectedWorkId]);

    // --- SYNC TO KANBAN HANDLER ---
    const handleSyncToKanban = async () => {
        if (!budget || !selectedWork) return;
        
        setIsSyncing(true);
        try {
            let createdCount = 0;
            let updatedCount = 0;

            for (const category of budget.categories) {
                // 1. Build the Description Table
                const itemsTable = category.items.map(item => 
                    `• [ ${String(item.quantity).padEnd(3)} ${item.unit.padEnd(4)} ]  ${item.description}`
                ).join('\n');

                const taskDescription = `Orçamento Aprovado - Escopo Detalhado:\n\n${itemsTable}\n\n(Sincronizado em ${new Date().toLocaleDateString('pt-BR')})`;

                // 2. Check if task exists (Match by Title and WorkId)
                const existingTask = tasks.find(t => t.workId === selectedWork.id && t.title.trim() === category.name.trim());

                if (existingTask) {
                    // Update existing task description
                    const updatedTask = {
                        ...existingTask,
                        description: taskDescription
                    };
                    onUpdateTask(updatedTask);
                    updatedCount++;
                } else {
                    // Create new task
                    const newTask: Task = {
                        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        workId: selectedWork.id,
                        title: category.name,
                        description: taskDescription,
                        status: TaskStatus.PLANNING,
                        priority: TaskPriority.MEDIUM,
                        dueDate: new Date().toISOString().split('T')[0],
                        images: []
                    };
                    onAddTask(newTask);
                    createdCount++;
                }
            }

            alert(`Sincronização concluída!\n\nTarefas Criadas: ${createdCount}\nTarefas Atualizadas: ${updatedCount}\n\nVerifique a aba "Tarefas & Kanban".`);

        } catch (error) {
            console.error(error);
            alert("Erro ao sincronizar com Kanban.");
        } finally {
            setIsSyncing(false);
        }
    };

    // --- AI MODAL HANDLERS ---

    const openAiModal = () => {
        if (!selectedWork || !budget) return;

        if (budget.categories.length > 0) {
            if (!window.confirm("ATENÇÃO: Isso substituirá toda a estrutura atual do orçamento. Deseja continuar?")) return;
        }

        // Pre-fill with existing work info as a starting point
        const initialText = `Obra: ${selectedWork.name}\n\nDescrição do Projeto:\n${selectedWork.description || 'Descreva aqui o escopo detalhado (ex: Construção de casa 200m², alto padrão, 2 pavimentos, piscina, acabamento em porcelanato...)'}`;
        
        setAiScopeText(initialText);
        setAiFile(null);
        setAiFileName('');
        setAiFileType(null);
        setIsAiModalOpen(true);
    };

    const handleAiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const isPdf = file.type === 'application/pdf';
            const reader = new FileReader();
            
            reader.onloadend = () => {
                if (reader.result) {
                    setAiFile(reader.result as string);
                    setAiFileName(file.name);
                    setAiFileType(isPdf ? 'pdf' : 'image');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const executeAiGeneration = async () => {
        if (!selectedWork || !budget || !aiScopeText) return;
        
        setIsGenerating(true);
        try {
            // We pass the user-edited scope text and optional file (Image/PDF) to the AI service
            const aiCategories = await generateBudgetStructure(
                selectedWork.name, 
                aiScopeText,
                aiFile || undefined
            );
            
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
            alert("Orçamento BIM gerado! Revise os itens e clique em 'Sincronizar com Kanban' para criar as tarefas.");

        } catch (error) {
            alert("Erro ao gerar orçamento com IA. Tente detalhar mais o escopo ou usar uma imagem menor.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- PROPOSAL HANDLERS ---
    const handleGenerateProposal = async () => {
        if (!selectedWork || !budget) return;
        setIsGeneratingProposal(true);
        try {
            const text = await generateBudgetProposalText(selectedWork, budget.categories);
            setProposalText(text);
            setIsProposalModalOpen(true);
        } catch (error) {
            alert("Erro ao gerar proposta.");
        } finally {
            setIsGeneratingProposal(false);
        }
    };

    const handlePrintProposal = () => {
        if (!printRef.current) return;
        // Create a style element to enforce print styling
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body * { visibility: hidden; }
                #print-area, #print-area * { visibility: visible; }
                #print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
            }
        `;
        document.head.appendChild(style);
        window.print();
        document.head.removeChild(style);
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

    const addCategory = async () => {
        if (!budget || !selectedWork) return;
        const newCatName = `Nova Etapa ${budget.categories.length + 1}`;
        const newCat: BudgetCategory = {
            id: `cat_${Date.now()}`,
            name: newCatName,
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

    // --- HELPER: Calculate Actual Spent per Category ---
    const getRealizedAmount = (categoryId: string) => {
        return financialRecords
            .filter(r => r.relatedBudgetCategoryId === categoryId)
            .reduce((sum, r) => sum + r.amount, 0);
    };

    // --- RENDER ---

    return (
        <div className={`min-h-screen pb-20 ${activeWorkId ? '' : 'p-6 bg-slate-50'}`}>
            {!activeWorkId && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Calculator className="text-pms-600" /> Orçamentos & Planejamento
                        </h2>
                        <p className="text-slate-500">Estimativas de custo, EAP e comparativos (Previsto vs Realizado).</p>
                    </div>
                </div>
            )}
            
            {/* Work Selector - Only show if NO activeWorkId forced */}
            {!activeWorkId && (
                <div className="bg-white p-2 rounded-lg border border-slate-300 shadow-sm flex items-center gap-2 min-w-[250px] mb-6">
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
            )}

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
                            <div className="border-l pl-4 border-slate-200">
                                <span className="text-xs font-bold text-slate-400 uppercase block">Total Realizado</span>
                                <span className="text-xl font-bold text-slate-600">
                                    R$ {financialRecords.reduce((s,r) => s + r.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                             {/* SYNC BUTTON */}
                             <button 
                                onClick={handleSyncToKanban}
                                disabled={isSyncing}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all disabled:opacity-70"
                                title="Criar/Atualizar tarefas no Kanban baseadas neste orçamento"
                             >
                                {isSyncing ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18} />}
                                <span className="hidden sm:inline">Sincronizar com Kanban</span>
                             </button>

                             <button 
                                onClick={handleGenerateProposal}
                                disabled={isGeneratingProposal}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70"
                                title="Gerar Proposta Profissional em PDF"
                             >
                                {isGeneratingProposal ? <Loader2 size={18} className="animate-spin"/> : <FileDown size={18} />}
                                <span className="hidden sm:inline">Proposta PDF</span>
                             </button>

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

                        {budget.categories.map((category) => {
                            const realized = getRealizedAmount(category.id);
                            const percent = category.categoryTotal > 0 ? (realized / category.categoryTotal) * 100 : 0;
                            const isOverBudget = realized > category.categoryTotal;

                            return (
                                <div key={category.id} className="border-b border-slate-100 last:border-0">
                                    {/* Category Header */}
                                    <div className="bg-slate-50 hover:bg-slate-100 transition-colors p-3 flex flex-col md:flex-row md:items-center justify-between group gap-2">
                                        
                                        {/* Left Side: Expand + Name input */}
                                        <div className="flex items-center gap-2 flex-1 w-full">
                                            <div 
                                                className="cursor-pointer p-1"
                                                onClick={() => toggleCategory(category.id)}
                                            >
                                                {expandedCategories[category.id] ? <ChevronDown size={18} className="text-slate-400"/> : <ChevronRight size={18} className="text-slate-400"/>}
                                            </div>
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

                                        {/* Right Side: Totals & Progress Bar */}
                                        <div className="flex items-center gap-4 w-full md:w-auto justify-end pl-8 md:pl-0">
                                            
                                            {/* Comparison Bar */}
                                            <div className="flex flex-col items-end min-w-[150px]">
                                                <div className="flex gap-3 text-xs mb-1">
                                                    <span className="text-slate-500">Orçado: <span className="font-bold">R$ {category.categoryTotal.toLocaleString('pt-BR', {notation:'compact'})}</span></span>
                                                    <span className={`${isOverBudget ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}`}>
                                                        Real: R$ {realized.toLocaleString('pt-BR', {notation:'compact'})}
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
                                                    <div 
                                                        className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`} 
                                                        style={{width: `${Math.min(percent, 100)}%`}}
                                                    />
                                                </div>
                                            </div>

                                            {/* Delete Action */}
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
                            );
                        })}
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
                                    <BrainCircuit className="text-purple-600" /> Gerar EAP com IA (BIM)
                                </h3>
                                <p className="text-sm text-slate-500">
                                    A IA atuará como um Especialista BIM para analisar o escopo e arquivos técnicos.
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

                        <div className="flex-1 overflow-y-auto mb-4 custom-scroll pr-2">
                            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-4 text-xs text-purple-700 flex items-start gap-2">
                                <BrainCircuit size={16} className="mt-0.5 shrink-0"/>
                                <div>
                                    <strong>Modo Especialista:</strong> O sistema analisará plantas em PDF ou Imagens para extrair quantitativos visuais e estruturar o orçamento com precisão de engenharia.
                                </div>
                            </div>
                            
                            {/* FILE UPLOAD SECTION */}
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                                    <Upload size={16} /> Arquivo Técnico (Planta Baixa / Projeto)
                                </label>
                                
                                {aiFile ? (
                                    <div className="relative w-full h-40 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group flex items-center justify-center">
                                        {aiFileType === 'image' ? (
                                            <img src={aiFile} alt="Reference" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-600">
                                                <FileText size={48} className="text-red-500 mb-2" />
                                                <span className="font-bold text-sm">{aiFileName}</span>
                                                <span className="text-xs text-slate-400">Documento PDF Carregado</span>
                                            </div>
                                        )}
                                        
                                        <button 
                                            onClick={() => { setAiFile(null); setAiFileName(''); setAiFileType(null); }}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-80 hover:opacity-100 shadow-sm"
                                            title="Remover arquivo"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <div className="flex gap-2 mb-2 text-slate-400">
                                                <ImageIcon size={24} />
                                                <FileText size={24} />
                                            </div>
                                            <p className="text-xs text-slate-500 font-bold">Clique para enviar Imagem ou PDF</p>
                                            <p className="text-[10px] text-slate-400">JPG, PNG, PDF (Max 5MB)</p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleAiFileUpload} />
                                    </label>
                                )}
                            </div>

                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                                <FileText size={16} /> Descrição Complementar do Escopo
                            </label>
                            <textarea 
                                className="w-full h-32 border border-slate-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none leading-relaxed"
                                value={aiScopeText}
                                onChange={(e) => setAiScopeText(e.target.value)}
                                placeholder="Ex: Acabamento de alto padrão, porcelanato 90x90, pintura acrílica suvinil, rodapé santa luzia..."
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
                                disabled={isGenerating || (!aiScopeText.trim() && !aiFile)}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-bold shadow-lg shadow-purple-600/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        BIM AI Analisando...
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

            {/* PROPOSAL PDF PREVIEW MODAL */}
            {isProposalModalOpen && selectedWork && budget && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900 rounded-t-xl">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileText className="text-blue-400" /> Pré-visualização da Proposta
                            </h3>
                            <div className="flex gap-3">
                                <button 
                                    onClick={handlePrintProposal}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 transition-all"
                                >
                                    <Printer size={18} /> Imprimir / Salvar PDF
                                </button>
                                <button 
                                    onClick={() => setIsProposalModalOpen(false)}
                                    className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Document View - Mimics A4 Paper */}
                        <div className="flex-1 overflow-y-auto bg-slate-800 p-8 flex justify-center">
                            <div 
                                id="print-area" 
                                ref={printRef}
                                className="bg-white w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl text-slate-900 font-serif leading-relaxed relative"
                            >
                                {/* HEADER */}
                                <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Proposta Comercial</h1>
                                        <p className="text-sm text-slate-500 mt-1">Ref: {selectedWork.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-xl font-bold text-slate-800">PMS Construtora</h2>
                                        <p className="text-xs text-slate-500">Engenharia e Gestão de Obras</p>
                                        <p className="text-xs text-slate-500">{new Date().toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>

                                {/* AI GENERATED TEXT (Intro, Method, Terms) */}
                                <div className="prose prose-sm max-w-none mb-8 text-justify whitespace-pre-wrap font-sans text-slate-700">
                                    {proposalText}
                                </div>

                                {/* BUDGET TABLE (React Rendered) */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-slate-900 mb-2 border-l-4 border-slate-800 pl-3 uppercase">Quadro Resumo de Investimento</h3>
                                    <table className="w-full text-sm border-collapse border border-slate-300">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="border border-slate-300 p-2 text-left">Etapa / Serviço</th>
                                                <th className="border border-slate-300 p-2 text-center w-24">Qtd</th>
                                                <th className="border border-slate-300 p-2 text-center w-24">Unid</th>
                                                <th className="border border-slate-300 p-2 text-right w-32">Unit. (R$)</th>
                                                <th className="border border-slate-300 p-2 text-right w-32">Total (R$)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {budget.categories.map(cat => (
                                                <React.Fragment key={cat.id}>
                                                    <tr className="bg-slate-50 font-bold">
                                                        <td className="border border-slate-300 p-2 text-slate-800" colSpan={4}>{cat.name}</td>
                                                        <td className="border border-slate-300 p-2 text-right text-slate-800">
                                                            {cat.categoryTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                    {cat.items.map(item => (
                                                        <tr key={item.id}>
                                                            <td className="border border-slate-300 p-2 pl-6 text-slate-600">{item.description}</td>
                                                            <td className="border border-slate-300 p-2 text-center">{item.quantity}</td>
                                                            <td className="border border-slate-300 p-2 text-center">{item.unit}</td>
                                                            <td className="border border-slate-300 p-2 text-right">{item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                            <td className="border border-slate-300 p-2 text-right">{item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-800 text-white font-bold">
                                                <td className="border border-slate-800 p-3 text-right" colSpan={4}>TOTAL GERAL ESTIMADO</td>
                                                <td className="border border-slate-800 p-3 text-right">
                                                    R$ {budget.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* SIGNATURES */}
                                <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between">
                                    <div className="text-center w-1/3">
                                        <div className="border-t border-slate-800 pt-2 font-bold text-slate-800">PMS Construtora</div>
                                        <div className="text-xs text-slate-500">Responsável Técnico</div>
                                    </div>
                                    <div className="text-center w-1/3">
                                        <div className="border-t border-slate-800 pt-2 font-bold text-slate-800">{selectedWork.client || 'Cliente'}</div>
                                        <div className="text-xs text-slate-500">De Acordo</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
