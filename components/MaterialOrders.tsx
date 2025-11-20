
import React, { useState, useMemo } from 'react';
import { MaterialOrder, OrderStatus, ConstructionWork, Task, User, TaskPriority, AppPermissions, Material, MaterialQuote } from '../types';
import { Package, ShoppingCart, Truck, CheckCircle2, Plus, Filter, Copy, FileText, X, Edit2, DollarSign, BarChart3, Trash2, ExternalLink, Save } from 'lucide-react';

interface MaterialOrdersProps {
  orders: MaterialOrder[];
  works: ConstructionWork[];
  tasks: Task[];
  users: User[];
  materials: Material[];
  currentUser: User;
  onAddOrder: (order: MaterialOrder) => void;
  onUpdateOrder: (order: MaterialOrder) => void;
  onOpenMaterialCatalog: () => void;
}

interface BatchItem {
    id: string;
    itemName: string;
    quantity: number | '';
    unit: string;
}

export const MaterialOrders: React.FC<MaterialOrdersProps> = ({ orders, works, tasks, users, materials, currentUser, onAddOrder, onUpdateOrder, onOpenMaterialCatalog }) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'REPORT'>('LIST');
  
  // Filters
  const [filterWork, setFilterWork] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false); // Used for simple Purchase confirmation (fallback)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false); // New Quote Modal

  const [editingOrder, setEditingOrder] = useState<MaterialOrder | null>(null);

  // Creation Form State (Batch)
  const [newWorkId, setNewWorkId] = useState('');
  const [newTaskId, setNewTaskId] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [newSupplierId, setNewSupplierId] = useState('');
  
  // Batch Items State
  const [batchItems, setBatchItems] = useState<BatchItem[]>([
      { id: '1', itemName: '', quantity: '', unit: 'un' }
  ]);

  // Status Update State
  const [statusUpdateCost, setStatusUpdateCost] = useState<string>('');

  // Quotation State
  const [currentQuotes, setCurrentQuotes] = useState<MaterialQuote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');


  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchWork = filterWork === 'ALL' || order.workId === filterWork;
      const matchStatus = filterStatus === 'ALL' || order.status === filterStatus;
      return matchWork && matchStatus;
    });
  }, [orders, filterWork, filterStatus]);

  const groupedByStatus = {
    [OrderStatus.PENDING]: filteredOrders.filter(o => o.status === OrderStatus.PENDING),
    [OrderStatus.QUOTING]: filteredOrders.filter(o => o.status === OrderStatus.QUOTING),
    [OrderStatus.PURCHASED]: filteredOrders.filter(o => o.status === OrderStatus.PURCHASED),
    [OrderStatus.DELIVERED]: filteredOrders.filter(o => o.status === OrderStatus.DELIVERED),
  };

  const suppliers = useMemo(() => users.filter(u => u.category === 'SUPPLIER'), [users]);

  // --- Handlers ---

  const handleOpenCreate = () => {
    setEditingOrder(null);
    // Defaults
    setNewWorkId(works[0]?.id || '');
    setNewTaskId('');
    setNewPriority(TaskPriority.MEDIUM);
    setNewSupplierId('');
    setBatchItems([{ id: Date.now().toString(), itemName: '', quantity: '', unit: 'un' }]);
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
      setBatchItems(prev => [...prev, { id: Date.now().toString(), itemName: '', quantity: '', unit: 'un' }]);
  };

  const handleRemoveItemRow = (id: string) => {
      if (batchItems.length === 1) return;
      setBatchItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof BatchItem, value: any) => {
      setBatchItems(prev => {
          return prev.map(item => {
              if (item.id === id) {
                  // Standard Update
                  const updatedItem = { ...item, [field]: value };
                  
                  // Logic for auto-filling Unit based on Material Selection
                  if (field === 'itemName') {
                      const foundMaterial = materials.find(m => m.name === value);
                      if (foundMaterial) {
                          updatedItem.unit = foundMaterial.unit;
                      }
                  }
                  return updatedItem;
              }
              return item;
          });
      });
  };

  const handleCreateBatch = () => {
    if (!newWorkId) return;
    
    // Filter valid items
    const validItems = batchItems.filter(item => item.itemName.trim() && item.quantity);
    
    if (validItems.length === 0) {
        alert("Adicione pelo menos um item com nome e quantidade.");
        return;
    }

    validItems.forEach(item => {
        const newOrder: MaterialOrder = {
            id: Math.random().toString(36).substr(2, 9),
            workId: newWorkId,
            taskId: newTaskId || undefined,
            requesterId: currentUser.id,
            supplierId: newSupplierId || undefined,
            itemName: item.itemName,
            quantity: Number(item.quantity),
            unit: item.unit,
            status: OrderStatus.PENDING,
            priority: newPriority,
            requestDate: new Date().toISOString().split('T')[0],
            quotes: []
        };
        onAddOrder(newOrder);
    });

    setIsModalOpen(false);
  };

  const handleMoveStatus = (order: MaterialOrder, nextStatus: OrderStatus) => {
    // If currently Quoting and moving to Purchased, open Quote Modal instead of direct move
    if (order.status === OrderStatus.QUOTING && nextStatus === OrderStatus.PURCHASED) {
        handleOpenQuoteModal(order);
        return;
    }

    // Fallback: Simple move
    const updatedOrder = { ...order, status: nextStatus };
    if (nextStatus === OrderStatus.DELIVERED) {
        updatedOrder.deliveryDate = new Date().toISOString().split('T')[0];
    }
    onUpdateOrder(updatedOrder);
  };

  // --- Quotation Logic ---

  const handleOpenQuoteModal = (order: MaterialOrder) => {
      setEditingOrder(order);
      
      // Initialize quotes (ensure 3 slots structure logically, or just map existing)
      // We will render 3 fixed slots in UI
      const existingQuotes = order.quotes || [];
      setCurrentQuotes(existingQuotes);
      setSelectedQuoteId(order.selectedQuoteId || '');

      setIsQuoteModalOpen(true);
  };

  const updateQuoteSlot = (index: number, field: 'supplierId' | 'price', value: any) => {
      const newQuotes = [...currentQuotes];
      
      // Ensure slot exists
      if (!newQuotes[index]) {
          newQuotes[index] = { id: `q_${Date.now()}_${index}`, supplierId: '', price: 0 };
      }

      if (field === 'supplierId') newQuotes[index].supplierId = value;
      if (field === 'price') newQuotes[index].price = parseFloat(value);

      setCurrentQuotes(newQuotes);
  };

  const saveQuotes = () => {
      if (!editingOrder) return;

      // Filter out empty slots for storage
      const validQuotes = currentQuotes.filter(q => q.supplierId && q.price > 0);

      const updatedOrder: MaterialOrder = {
          ...editingOrder,
          quotes: validQuotes,
          selectedQuoteId
      };
      
      onUpdateOrder(updatedOrder);
      setIsQuoteModalOpen(false);
  };

  const approvePurchase = () => {
      if (!editingOrder || !selectedQuoteId) {
          alert("Selecione uma cotação vencedora para aprovar a compra.");
          return;
      }

      const selectedQuote = currentQuotes.find(q => q.id === selectedQuoteId);
      if (!selectedQuote) return;

      const validQuotes = currentQuotes.filter(q => q.supplierId && q.price > 0);

      const updatedOrder: MaterialOrder = {
          ...editingOrder,
          quotes: validQuotes,
          selectedQuoteId,
          status: OrderStatus.PURCHASED,
          purchaseDate: new Date().toISOString().split('T')[0],
          supplierId: selectedQuote.supplierId, // Set the main supplier ID
          finalCost: selectedQuote.price // Set final cost
      };

      onUpdateOrder(updatedOrder);
      setIsQuoteModalOpen(false);
      setEditingOrder(null);
  };


  const copyQuoteList = () => {
    const pendingItems = groupedByStatus[OrderStatus.PENDING];
    if (pendingItems.length === 0) {
        alert("Não há itens solicitados para gerar lista.");
        return;
    }

    let text = `*SOLICITAÇÃO DE ORÇAMENTO - PMS CONSTRUTORA*\n\n`;
    // Group by Work
    const byWork: Record<string, MaterialOrder[]> = {};
    pendingItems.forEach(item => {
        if (!byWork[item.workId]) byWork[item.workId] = [];
        byWork[item.workId].push(item);
    });

    Object.keys(byWork).forEach(workId => {
        const workName = works.find(w => w.id === workId)?.name || 'Obra Desconhecida';
        text += `📍 *OBRA: ${workName}*\n`;
        byWork[workId].forEach(item => {
            const supplier = users.find(u => u.id === item.supplierId);
            const supplierText = supplier ? `(Pref: ${supplier.name})` : '';
            text += `- ${item.quantity} ${item.unit} de ${item.itemName} ${supplierText}\n`;
        });
        text += `\n`;
    });

    navigator.clipboard.writeText(text);
    alert("Lista copiada para a área de transferência!");
  };

  // --- Report Logic ---
  const consumptionReport = useMemo(() => {
      const reportData: Record<string, { name: string, unit: string, quantity: number, cost: number, count: number }> = {};

      orders.forEach(order => {
        if (filterWork !== 'ALL' && order.workId !== filterWork) return;

        const key = `${order.itemName.toLowerCase().trim()}-${order.unit}`;
        
        if (!reportData[key]) {
            reportData[key] = { 
                name: order.itemName, 
                unit: order.unit, 
                quantity: 0, 
                cost: 0,
                count: 0
            };
        }

        reportData[key].quantity += order.quantity;
        reportData[key].cost += (order.finalCost || 0);
        reportData[key].count += 1;
      });

      return Object.values(reportData).sort((a,b) => b.cost - a.cost);
  }, [orders, filterWork]);

  // --- Render ---

  return (
    <div className="p-6 min-h-screen pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Pedidos de Materiais</h2>
            <p className="text-slate-500">Gestão de compras, cotações e entregas.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setActiveTab('LIST')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'LIST' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
                Pedidos
            </button>
            <button 
                onClick={() => setActiveTab('REPORT')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'REPORT' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
                <BarChart3 size={18} /> Relatório de Consumo
            </button>
            {activeTab === 'LIST' && (
                <button 
                    onClick={handleOpenCreate}
                    className="bg-pms-600 hover:bg-pms-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all ml-2"
                >
                    <Plus size={20} />
                    Nova Solicitação
                </button>
            )}
        </div>
      </div>

      {/* WORK FILTER */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center gap-4">
         <Filter size={20} className="text-slate-500" />
         <select 
            className="bg-transparent outline-none font-medium text-slate-700 w-full md:w-auto"
            value={filterWork}
            onChange={(e) => setFilterWork(e.target.value)}
         >
             <option value="ALL">Todas as Obras</option>
             {works.map(w => (
                 <option key={w.id} value={w.id}>{w.name}</option>
             ))}
         </select>
      </div>

      {activeTab === 'LIST' && (
          <div className="space-y-8">
             {/* Action Bar for Quoting */}
             <div className="flex justify-end">
                 <button onClick={copyQuoteList} className="text-pms-600 text-sm font-bold hover:bg-blue-50 px-3 py-1.5 rounded flex items-center gap-2 transition-colors">
                     <Copy size={16} /> Copiar Lista de Pendentes para Cotação
                 </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
                 {/* Column 1: Pending */}
                 <div className="min-w-[280px] bg-slate-50 rounded-xl border border-slate-200 flex flex-col h-full">
                     <div className="p-3 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2 bg-slate-100/50 rounded-t-xl">
                         <Package size={18} /> Solicitado <span className="bg-slate-200 px-2 py-0.5 rounded-full text-xs">{groupedByStatus[OrderStatus.PENDING].length}</span>
                     </div>
                     <div className="p-2 space-y-2 flex-1">
                         {groupedByStatus[OrderStatus.PENDING].map(order => (
                             <OrderItem key={order.id} order={order} works={works} users={users} onNext={() => handleMoveStatus(order, OrderStatus.QUOTING)} />
                         ))}
                     </div>
                 </div>

                 {/* Column 2: Quoting */}
                 <div className="min-w-[280px] bg-yellow-50 rounded-xl border border-yellow-100 flex flex-col h-full">
                     <div className="p-3 border-b border-yellow-200 font-bold text-yellow-800 flex items-center gap-2 bg-yellow-100/50 rounded-t-xl">
                         <FileText size={18} /> Em Cotação <span className="bg-yellow-200 px-2 py-0.5 rounded-full text-xs">{groupedByStatus[OrderStatus.QUOTING].length}</span>
                     </div>
                     <div className="p-2 space-y-2 flex-1">
                         {groupedByStatus[OrderStatus.QUOTING].map(order => (
                             <OrderItem 
                                key={order.id} 
                                order={order} 
                                works={works} 
                                users={users} 
                                // When clicking next on Quoting, we go to Purchased via the modal
                                onNext={() => handleMoveStatus(order, OrderStatus.PURCHASED)} 
                                onClick={() => handleOpenQuoteModal(order)}
                             />
                         ))}
                     </div>
                 </div>

                 {/* Column 3: Purchased */}
                 <div className="min-w-[280px] bg-blue-50 rounded-xl border border-blue-100 flex flex-col h-full">
                     <div className="p-3 border-b border-blue-200 font-bold text-blue-800 flex items-center gap-2 bg-blue-100/50 rounded-t-xl">
                         <ShoppingCart size={18} /> Comprado <span className="bg-blue-200 px-2 py-0.5 rounded-full text-xs">{groupedByStatus[OrderStatus.PURCHASED].length}</span>
                     </div>
                     <div className="p-2 space-y-2 flex-1">
                         {groupedByStatus[OrderStatus.PURCHASED].map(order => (
                             <OrderItem key={order.id} order={order} works={works} users={users} onNext={() => handleMoveStatus(order, OrderStatus.DELIVERED)} />
                         ))}
                     </div>
                 </div>

                 {/* Column 4: Delivered */}
                 <div className="min-w-[280px] bg-green-50 rounded-xl border border-green-100 flex flex-col h-full">
                     <div className="p-3 border-b border-green-200 font-bold text-green-800 flex items-center gap-2 bg-green-100/50 rounded-t-xl">
                         <CheckCircle2 size={18} /> Entregue <span className="bg-green-200 px-2 py-0.5 rounded-full text-xs">{groupedByStatus[OrderStatus.DELIVERED].length}</span>
                     </div>
                     <div className="p-2 space-y-2 flex-1">
                         {groupedByStatus[OrderStatus.DELIVERED].map(order => (
                             <OrderItem key={order.id} order={order} works={works} users={users} isFinal />
                         ))}
                     </div>
                 </div>
             </div>
          </div>
      )}

      {activeTab === 'REPORT' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Relatório Consolidado de Materiais</h3>
                  <p className="text-sm text-slate-500">
                    {filterWork !== 'ALL' 
                        ? `Consumo total para: ${works.find(w => w.id === filterWork)?.name}` 
                        : 'Consumo total em todas as obras'}
                  </p>
              </div>
              <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                      <tr>
                          <th className="px-6 py-4">Material</th>
                          <th className="px-6 py-4 text-center">Unidade</th>
                          <th className="px-6 py-4 text-center">Qtd. Total</th>
                          <th className="px-6 py-4 text-center">Pedidos</th>
                          <th className="px-6 py-4 text-right">Custo Total</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {consumptionReport.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                              <td className="px-6 py-4 text-center text-slate-500 text-sm">{item.unit}</td>
                              <td className="px-6 py-4 text-center font-bold text-slate-800">{item.quantity}</td>
                              <td className="px-6 py-4 text-center text-slate-500">{item.count}</td>
                              <td className="px-6 py-4 text-right font-bold text-green-600">
                                  {item.cost > 0 ? `R$ ${item.cost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                              </td>
                          </tr>
                      ))}
                      {consumptionReport.length === 0 && (
                          <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Nenhum consumo registrado.</td>
                          </tr>
                      )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-800">
                      <tr>
                          <td colSpan={4} className="px-6 py-4 text-right">CUSTO TOTAL GERAL:</td>
                          <td className="px-6 py-4 text-right text-green-700">
                              R$ {consumptionReport.reduce((acc, i) => acc + i.cost, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </td>
                      </tr>
                  </tfoot>
              </table>
          </div>
      )}

      {/* CREATE BATCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
             <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Package className="text-pms-600" /> Nova Solicitação de Materiais
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                   <X size={24} />
                </button>
             </div>

             <div className="overflow-y-auto custom-scroll flex-1 pr-2">
                 {/* Common Fields */}
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                     <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                         <Filter size={16}/> Contexto da Solicitação
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Obra de Destino</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                                value={newWorkId}
                                onChange={e => setNewWorkId(e.target.value)}
                            >
                                {works.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                         </div>

                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Vincular à Tarefa (Opcional)</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                                value={newTaskId}
                                onChange={e => setNewTaskId(e.target.value)}
                                disabled={!newWorkId}
                            >
                                <option value="">Geral (Sem tarefa específica)</option>
                                {tasks.filter(t => t.workId === newWorkId).map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                         </div>

                         <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1">Prioridade</label>
                             <div className="flex gap-2">
                                 {Object.values(TaskPriority).map(p => (
                                     <button
                                       key={p}
                                       onClick={() => setNewPriority(p)}
                                       className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${newPriority === p ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                                     >
                                         {p}
                                     </button>
                                 ))}
                             </div>
                         </div>

                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Fornecedor Preferencial (Opcional)</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                                value={newSupplierId}
                                onChange={e => setNewSupplierId(e.target.value)}
                            >
                                <option value="">Selecione um fornecedor...</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                         </div>
                     </div>
                 </div>

                 {/* Batch Items */}
                 <div>
                     <div className="flex justify-between items-center mb-3">
                         <h4 className="text-sm font-bold text-slate-800 flex items-center justify-between">
                             <span>Itens da Solicitação</span>
                         </h4>
                         <button 
                            onClick={onOpenMaterialCatalog}
                            className="text-xs font-bold text-pms-600 bg-pms-50 px-2 py-1 rounded flex items-center gap-1 hover:bg-pms-100 transition-colors"
                         >
                            Não encontrou? Cadastrar Material <ExternalLink size={10} />
                         </button>
                     </div>
                     
                     <div className="space-y-2">
                         {batchItems.map((item, index) => (
                             <div key={item.id} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2">
                                 <div className="w-8 text-center text-xs font-bold text-slate-400 pt-2">{index + 1}</div>
                                 <div className="flex-1 relative">
                                     <input 
                                       list={`materials-${item.id}`}
                                       className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                                       placeholder="Nome do Material (Selecionar ou Digitar)"
                                       value={item.itemName}
                                       onChange={e => handleItemChange(item.id, 'itemName', e.target.value)}
                                     />
                                     <datalist id={`materials-${item.id}`}>
                                         {materials.map(m => (
                                             <option key={m.id} value={m.name} />
                                         ))}
                                     </datalist>
                                 </div>
                                 <div className="w-24">
                                     <input 
                                       type="number" 
                                       className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                                       placeholder="Qtd"
                                       value={item.quantity}
                                       onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                                     />
                                 </div>
                                 <div className="w-28">
                                     <select 
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                                        value={item.unit}
                                        onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                                     >
                                         {['un', 'kg', 'sacos', 'm', 'm²', 'm³', 'lata', 'caixa', 'milheiro', 'caminhão', 'barras', 'rolo', 'par'].map(u => (
                                             <option key={u} value={u}>{u}</option>
                                         ))}
                                     </select>
                                 </div>
                                 <button 
                                    onClick={() => handleRemoveItemRow(item.id)}
                                    disabled={batchItems.length === 1}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                                    title="Remover item"
                                 >
                                     <Trash2 size={18} />
                                 </button>
                             </div>
                         ))}
                     </div>

                     <button 
                        onClick={handleAddItemRow}
                        className="mt-4 text-sm text-pms-600 font-bold flex items-center gap-1 hover:underline"
                     >
                         <Plus size={16} /> Adicionar outro item
                     </button>
                 </div>
             </div>

             <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                    Cancelar
                </button>
                <button onClick={handleCreateBatch} className="px-6 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-bold shadow-lg">
                    Gerar Solicitação ({batchItems.filter(i => i.itemName).length} itens)
                </button>
             </div>
          </div>
        </div>
      )}

      {/* NEW QUOTATION MODAL */}
      {isQuoteModalOpen && editingOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                     <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText size={24} className="text-yellow-600"/>
                            Cotação de Preços
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Produto: <strong className="text-slate-800">{editingOrder.quantity} {editingOrder.unit} de {editingOrder.itemName}</strong>
                        </p>
                     </div>
                     <button onClick={() => setIsQuoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                         <X size={24} />
                     </button>
                  </div>

                  <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[0, 1, 2].map((index) => {
                              const quote = currentQuotes[index] || { id: `new_${index}`, supplierId: '', price: 0 };
                              const isSelected = selectedQuoteId === quote.id;

                              return (
                                  <div 
                                    key={index} 
                                    className={`border rounded-xl p-4 relative transition-all ${
                                        isSelected ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-slate-200 bg-slate-50'
                                    }`}
                                    onClick={() => {
                                        if (quote.supplierId && quote.price) setSelectedQuoteId(quote.id);
                                    }}
                                  >
                                      <div className="mb-3">
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fornecedor {index + 1}</label>
                                          <select 
                                              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white"
                                              value={quote.supplierId}
                                              onChange={(e) => updateQuoteSlot(index, 'supplierId', e.target.value)}
                                          >
                                              <option value="">Selecione...</option>
                                              {suppliers.map(s => (
                                                  <option key={s.id} value={s.id}>{s.name}</option>
                                              ))}
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço Total (R$)</label>
                                          <div className="relative">
                                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                             <input 
                                                 type="number" 
                                                 className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-yellow-500 outline-none"
                                                 placeholder="0.00"
                                                 value={quote.price || ''}
                                                 onChange={(e) => updateQuoteSlot(index, 'price', e.target.value)}
                                             />
                                          </div>
                                      </div>
                                      
                                      {quote.supplierId && quote.price > 0 && (
                                          <div className="mt-4 flex justify-center">
                                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                  isSelected ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300'
                                              }`}>
                                                  {isSelected && <CheckCircle2 size={16} />}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-slate-100">
                      <button 
                        onClick={saveQuotes}
                        className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium flex items-center gap-2"
                      >
                          <Save size={18} /> Salvar Cotação
                      </button>
                      <button 
                        onClick={approvePurchase}
                        disabled={!selectedQuoteId}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                          <CheckCircle2 size={18} /> Aprovar Compra
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

interface OrderItemProps {
  order: MaterialOrder;
  works: ConstructionWork[];
  users: User[];
  onNext?: () => void;
  onClick?: () => void; // For generic click (open modal)
  isFinal?: boolean;
}

const OrderItem: React.FC<OrderItemProps> = ({ order, works, users, onNext, onClick, isFinal }) => {
    const work = works.find(w => w.id === order.workId);
    const user = users.find(u => u.id === order.requesterId);
    const supplier = users.find(u => u.id === order.supplierId);

    return (
        <div 
            className={`bg-white p-3 rounded-lg shadow-sm border border-slate-200 group hover:shadow-md transition-all relative ${onClick ? 'cursor-pointer hover:border-pms-300' : ''}`}
            onClick={onClick}
        >
             <div className="flex justify-between items-start mb-1">
                 <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                     order.priority === TaskPriority.HIGH ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                 }`}>
                     {order.priority}
                 </span>
                 <span className="text-[10px] text-slate-400">{new Date(order.requestDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
             </div>
             
             <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">
                 {order.quantity} <span className="text-xs font-normal text-slate-500">{order.unit}</span> {order.itemName}
             </h4>
             
             <div className="text-xs text-slate-500 mb-2 flex flex-col gap-0.5">
                 <span className="flex items-center gap-1"><Truck size={12} /> {work?.name}</span>
                 {supplier && (
                     <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-1 rounded self-start">
                         Forn: {supplier.name}
                     </span>
                 )}
                 {/* Quote Indicator */}
                 {order.status === OrderStatus.QUOTING && (order.quotes?.length || 0) > 0 && (
                     <span className="text-xs text-yellow-600 font-bold bg-yellow-50 px-1 rounded w-fit mt-1">
                         {order.quotes?.length} Cotações
                     </span>
                 )}
             </div>

             <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                 <div className="flex items-center gap-1">
                     {user && <img src={user.avatar} className="w-5 h-5 rounded-full" title={`Solicitado por ${user.name}`} />}
                     {order.finalCost ? <span className="text-xs font-bold text-green-600">R$ {order.finalCost}</span> : null}
                 </div>
                 
                 {!isFinal && (
                     <button 
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            if(onNext) onNext();
                        }}
                        className="p-1 rounded bg-slate-100 hover:bg-pms-600 hover:text-white text-slate-400 transition-colors"
                        title="Avançar Status"
                     >
                         <CheckCircle2 size={16} />
                     </button>
                 )}
             </div>
        </div>
    );
};