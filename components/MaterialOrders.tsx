
import React, { useState, useMemo } from 'react';
import { MaterialOrder, OrderStatus, ConstructionWork, Task, User, TaskPriority, AppPermissions } from '../types';
import { Package, ShoppingCart, Truck, CheckCircle2, Plus, Filter, Copy, FileText, X, Edit2, DollarSign, BarChart3 } from 'lucide-react';

interface MaterialOrdersProps {
  orders: MaterialOrder[];
  works: ConstructionWork[];
  tasks: Task[];
  users: User[];
  currentUser: User;
  onAddOrder: (order: MaterialOrder) => void;
  onUpdateOrder: (order: MaterialOrder) => void;
}

export const MaterialOrders: React.FC<MaterialOrdersProps> = ({ orders, works, tasks, users, currentUser, onAddOrder, onUpdateOrder }) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'REPORT'>('LIST');
  
  // Filters
  const [filterWork, setFilterWork] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<MaterialOrder | null>(null);

  // Creation Form
  const [newItemName, setNewItemName] = useState('');
  const [newQuantity, setNewQuantity] = useState<number | ''>('');
  const [newUnit, setNewUnit] = useState('un');
  const [newWorkId, setNewWorkId] = useState('');
  const [newTaskId, setNewTaskId] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);

  // Status Update State
  const [statusUpdateCost, setStatusUpdateCost] = useState<string>('');

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

  // --- Handlers ---

  const handleOpenCreate = () => {
    setEditingOrder(null);
    setNewItemName('');
    setNewQuantity('');
    setNewUnit('un');
    setNewWorkId(works[0]?.id || '');
    setNewTaskId('');
    setNewPriority(TaskPriority.MEDIUM);
    setIsModalOpen(true);
  };

  const handleCreateOrder = () => {
    if (!newItemName || !newQuantity || !newWorkId) return;

    const newOrder: MaterialOrder = {
      id: Math.random().toString(36).substr(2, 9),
      workId: newWorkId,
      taskId: newTaskId || undefined,
      requesterId: currentUser.id,
      itemName: newItemName,
      quantity: Number(newQuantity),
      unit: newUnit,
      status: OrderStatus.PENDING,
      priority: newPriority,
      requestDate: new Date().toISOString().split('T')[0]
    };

    onAddOrder(newOrder);
    setIsModalOpen(false);
  };

  const handleMoveStatus = (order: MaterialOrder, nextStatus: OrderStatus) => {
    // If moving to PURCHASED, we might want to ask for cost
    if (nextStatus === OrderStatus.PURCHASED) {
      setEditingOrder(order);
      setStatusUpdateCost(order.finalCost?.toString() || '');
      setIsStatusModalOpen(true);
      return;
    }

    const updatedOrder = { ...order, status: nextStatus };
    if (nextStatus === OrderStatus.DELIVERED) {
        updatedOrder.deliveryDate = new Date().toISOString().split('T')[0];
    }
    onUpdateOrder(updatedOrder);
  };

  const confirmPurchase = () => {
    if (!editingOrder) return;
    const updatedOrder = { 
        ...editingOrder, 
        status: OrderStatus.PURCHASED,
        purchaseDate: new Date().toISOString().split('T')[0],
        finalCost: statusUpdateCost ? parseFloat(statusUpdateCost) : 0
    };
    onUpdateOrder(updatedOrder);
    setIsStatusModalOpen(false);
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
            text += `- ${item.quantity} ${item.unit} de ${item.itemName}\n`;
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
        // Filter logic can apply here too if needed, currently global or filtered by Work selector in UI
        if (filterWork !== 'ALL' && order.workId !== filterWork) return;

        // Key by Item Name + Unit to avoid merging "Metros of Sand" with "Trucks of Sand"
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
            <p className="text-slate-500">Gestão de compras, entregas e consumo de insumos.</p>
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
                    Novo Pedido
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
                             <OrderItem key={order.id} order={order} works={works} users={users} onNext={() => handleMoveStatus(order, OrderStatus.PURCHASED)} />
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

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Package className="text-pms-600" /> Novo Pedido de Material
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                   <X size={24} />
                </button>
             </div>

             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">O que você precisa?</label>
                   <input 
                     type="text" 
                     className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                     placeholder="Ex: Saco de Cimento CP II"
                     value={newItemName}
                     onChange={e => setNewItemName(e.target.value)}
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Quantidade</label>
                      <input 
                        type="number" 
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                        placeholder="0"
                        value={newQuantity}
                        onChange={e => setNewQuantity(parseInt(e.target.value))}
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Unidade</label>
                      <select 
                         className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                         value={newUnit}
                         onChange={e => setNewUnit(e.target.value)}
                      >
                          {['un', 'kg', 'sacos', 'm', 'm²', 'm³', 'lata', 'caixa', 'milheiro', 'caminhão'].map(u => (
                              <option key={u} value={u}>{u}</option>
                          ))}
                      </select>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Obra de Destino</label>
                   <select 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                      value={newWorkId}
                      onChange={e => setNewWorkId(e.target.value)}
                   >
                       {works.map(w => (
                           <option key={w.id} value={w.id}>{w.name}</option>
                       ))}
                   </select>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Vincular à Tarefa (Opcional)</label>
                   <select 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                      value={newTaskId}
                      onChange={e => setNewTaskId(e.target.value)}
                      disabled={!newWorkId}
                   >
                       <option value="">Sem tarefa específica</option>
                       {tasks.filter(t => t.workId === newWorkId).map(t => (
                           <option key={t.id} value={t.id}>{t.title}</option>
                       ))}
                   </select>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Prioridade</label>
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
             </div>

             <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                    Cancelar
                </button>
                <button onClick={handleCreateOrder} disabled={!newItemName || !newQuantity} className="px-4 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-bold shadow-lg disabled:opacity-50">
                    Solicitar Material
                </button>
             </div>
          </div>
        </div>
      )}

      {/* STATUS / COST UPDATE MODAL */}
      {isStatusModalOpen && editingOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Confirmar Compra</h3>
                  <p className="text-sm text-slate-600 mb-4">
                      Informe o valor final da compra para o item: <br/>
                      <strong>{editingOrder.quantity} {editingOrder.unit} de {editingOrder.itemName}</strong>
                  </p>

                  <div className="mb-6">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Valor Total (R$)</label>
                      <div className="relative">
                          <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="number" 
                            className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pms-500 outline-none"
                            placeholder="0.00"
                            value={statusUpdateCost}
                            onChange={e => setStatusUpdateCost(e.target.value)}
                          />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Deixe em branco se não souber o valor agora.</p>
                  </div>

                  <div className="flex gap-3 justify-end">
                      <button onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                          Cancelar
                      </button>
                      <button onClick={confirmPurchase} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 font-bold shadow-lg">
                          Confirmar Compra
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const OrderItem = ({ order, works, users, onNext, isFinal }: { order: MaterialOrder, works: ConstructionWork[], users: User[], onNext?: () => void, isFinal?: boolean }) => {
    const work = works.find(w => w.id === order.workId);
    const user = users.find(u => u.id === order.requesterId);

    return (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 group hover:shadow-md transition-all relative">
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
             
             <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                 <Truck size={12} /> {work?.name}
             </div>

             <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                 <div className="flex items-center gap-1">
                     {user && <img src={user.avatar} className="w-5 h-5 rounded-full" title={`Solicitado por ${user.name}`} />}
                     {order.finalCost ? <span className="text-xs font-bold text-green-600">R$ {order.finalCost}</span> : null}
                 </div>
                 
                 {!isFinal && (
                     <button 
                        onClick={onNext}
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
