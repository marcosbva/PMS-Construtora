
import React, { useState } from 'react';
import { ConstructionWork, MaterialOrder, OrderStatus } from '../types';
import { MessageCircle, Copy, Package, ClipboardList, CheckSquare, X, Check } from 'lucide-react';

interface WhatsAppReportCardProps {
  work: ConstructionWork;
  orders: MaterialOrder[];
}

export const WhatsAppReportCard: React.FC<WhatsAppReportCardProps> = ({ work, orders }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [copied, setCopied] = useState(false);

  // --- TEMPLATE GENERATORS ---

  const openPlanningTemplate = () => {
    setModalTitle('Planejamento Semanal');
    const template = `*📋 Planejamento Semanal - ${work.name}*\n\nOlá! Segue o cronograma previsto para esta semana:\n\n- [Digite aqui a meta 1]\n- [Digite aqui a meta 2]\n- [Digite aqui a meta 3]\n\nQualquer dúvida, estou à disposição!`;
    setReportText(template);
    setIsModalOpen(true);
  };

  const openCompletedTemplate = () => {
    setModalTitle('Concluído na Semana');
    const template = `*✅ Resumo Semanal - ${work.name}*\n\nConfira o que avançamos na obra na última semana:\n\n✅ [Atividade concluída 1]\n✅ [Atividade concluída 2]\n\nSeguimos no cronograma! 🚀`;
    setReportText(template);
    setIsModalOpen(true);
  };

  const copyMaterialReport = () => {
    // Filter relevant orders
    const quoting = orders.filter(o => 
      o.workId === work.id && (o.status === OrderStatus.PENDING || o.status === OrderStatus.QUOTING)
    );
    const incoming = orders.filter(o => 
      o.workId === work.id && (o.status === OrderStatus.PURCHASED)
    );

    if (quoting.length === 0 && incoming.length === 0) {
      alert("Não há materiais em cotação ou a caminho para gerar relatório.");
      return;
    }

    let text = `*📦 Status de Materiais - ${work.name}*\n\n`;

    if (quoting.length > 0) {
      text += `*🛒 Em Cotação / Compra:*\n`;
      quoting.forEach(item => {
        text += `- ${item.itemName} (${item.quantity} ${item.unit})\n`;
      });
      text += `\n`;
    }

    if (incoming.length > 0) {
      text += `*🚚 Chegando em Breve:*\n`;
      incoming.forEach(item => {
        const dateInfo = item.deliveryDate ? ` (Prev: ${new Date(item.deliveryDate).toLocaleDateString('pt-BR')})` : '';
        text += `- ${item.itemName}${dateInfo}\n`;
      });
    }

    // Direct Copy
    navigator.clipboard.writeText(text);
    alert("Relatório de Materiais copiado para a área de transferência!");
  };

  const handleCopyFromModal = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase flex items-center gap-2">
          <MessageCircle size={16} className="text-green-600"/> Comunicação com Cliente
        </h3>

        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={openPlanningTemplate}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-pms-400 hover:bg-slate-50 transition-all group text-left"
          >
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ClipboardList size={20} />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-700">Planejamento Semanal</span>
              <span className="block text-[10px] text-slate-400">Gerar template de metas</span>
            </div>
          </button>

          <button 
            onClick={openCompletedTemplate}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-pms-400 hover:bg-slate-50 transition-all group text-left"
          >
            <div className="bg-green-100 text-green-600 p-2 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
              <CheckSquare size={20} />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-700">Concluído na Semana</span>
              <span className="block text-[10px] text-slate-400">Gerar resumo de avanços</span>
            </div>
          </button>

          <button 
            onClick={copyMaterialReport}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-pms-400 hover:bg-slate-50 transition-all group text-left"
          >
            <div className="bg-orange-100 text-orange-600 p-2 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Package size={20} />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-700">Status de Materiais</span>
              <span className="block text-[10px] text-slate-400">Copiar lista automática</span>
            </div>
          </button>
        </div>
      </div>

      {/* MODAL FOR EDITING TEXT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MessageCircle size={20} className="text-green-600"/> {modalTitle}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Edite antes de enviar</label>
              <textarea 
                className="w-full h-64 border border-slate-300 rounded-lg p-4 text-sm leading-relaxed focus:ring-2 focus:ring-green-500 outline-none resize-none font-sans"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCopyFromModal}
                className={`flex-[2] py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${copied ? 'bg-green-600' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
                {copied ? 'Copiado!' : 'Copiar para WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
