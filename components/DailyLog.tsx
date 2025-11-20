
import React, { useState } from 'react';
import { DailyLog, User, Task } from '../types';
import { Camera, Calendar, User as UserIcon, Sun, Cloud, CloudRain, CloudSnow, Briefcase, CheckCircle2, X, AlertTriangle, FileText, Upload, Link as LinkIcon, Image as ImageIcon, Trash2, Plus } from 'lucide-react';

interface DailyLogProps {
  logs: DailyLog[];
  users: User[];
  tasks: Task[];
  workId: string;
  currentUser: User;
  onAddLog: (log: DailyLog) => void;
}

export const DailyLogView: React.FC<DailyLogProps> = ({ logs, users, tasks, workId, currentUser, onAddLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState<'Sol' | 'Nublado' | 'Chuva' | 'Neve'>('Sol');
  const [relatedTaskId, setRelatedTaskId] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [type, setType] = useState<'Diário' | 'Vistoria' | 'Alerta'>('Diário');
  const [content, setContent] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]); // Stores Base64 strings or URLs

  // Upload Modal State
  const [tempLink, setTempLink] = useState('');

  const handleOpenModal = () => {
      setDate(new Date().toISOString().split('T')[0]);
      setWeather('Sol');
      setRelatedTaskId('');
      setSelectedTeamIds([]); 
      setType('Diário');
      setContent('');
      setFormImages([]);
      setIsModalOpen(true);
  };

  const toggleTeamMember = (userId: string) => {
      setSelectedTeamIds(prev => 
          prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
  };

  // Handle Local File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        Array.from(e.target.files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setFormImages(prev => [...prev, reader.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
        // Close upload modal automatically if just picking files, or keep open? 
        // Keeping open allows adding links too.
    }
  };

  const handleAddLink = () => {
      if (tempLink) {
          setFormImages(prev => [...prev, tempLink]);
          setTempLink('');
      }
  };

  const removeImage = (index: number) => {
      setFormImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
      if (!content) {
          alert("A descrição é obrigatória.");
          return;
      }

      const newLog: DailyLog = {
          id: `log_${Date.now()}`,
          workId,
          authorId: currentUser.id,
          date,
          content,
          images: formImages,
          type,
          weather,
          relatedTaskId: relatedTaskId || undefined,
          teamIds: selectedTeamIds
      };

      onAddLog(newLog);
      setIsModalOpen(false);
  };

  const getWeatherIcon = (w?: string) => {
      switch(w) {
          case 'Sol': return <Sun className="text-orange-500" size={18} />;
          case 'Nublado': return <Cloud className="text-slate-500" size={18} />;
          case 'Chuva': return <CloudRain className="text-blue-500" size={18} />;
          case 'Neve': return <CloudSnow className="text-cyan-500" size={18} />;
          default: return <Sun className="text-slate-400" size={18} />;
      }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Diário de Obra</h2>
        <button 
            onClick={handleOpenModal}
            className="bg-pms-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all"
        >
            <Camera size={18} />
            Novo Registro
        </button>
      </div>

      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {logs.length === 0 && (
             <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm relative z-10">
                <p>Nenhum registro encontrado para esta obra.</p>
             </div>
        )}

        {logs.map((log) => {
          const author = users.find(u => u.id === log.authorId);
          const relatedTask = log.relatedTaskId ? tasks.find(t => t.id === log.relatedTaskId) : null;
          
          return (
            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                
                {/* Icon/Dot on Timeline */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {getWeatherIcon(log.weather)}
                </div>

                {/* Content Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                        {author && <img src={author.avatar} alt={author.name} className="w-6 h-6 rounded-full" />}
                        <span className="text-xs font-bold text-slate-700">{author?.name.split(' ')[0]}</span>
                        <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
                            <Calendar size={10}/> {new Date(log.date).toLocaleDateString('pt-BR')}
                        </span>
                    </div>

                    {/* Metadata Chips */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {log.weather && (
                            <span className="text-[10px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1 text-slate-600">
                                {getWeatherIcon(log.weather)} {log.weather}
                            </span>
                        )}
                        {relatedTask && (
                             <span className="text-[10px] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1 text-blue-700 max-w-[150px] truncate">
                                <Briefcase size={10} /> {relatedTask.title}
                             </span>
                        )}
                        {log.teamIds && log.teamIds.length > 0 && (
                            <span className="text-[10px] bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded flex items-center gap-1 text-purple-700">
                                <UserIcon size={10} /> {log.teamIds.length} func.
                            </span>
                        )}
                    </div>

                    <p className="text-slate-600 text-sm mb-3 leading-relaxed whitespace-pre-wrap">
                        {log.content}
                    </p>

                    {log.images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {log.images.map((img, idx) => (
                                <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-100 relative group/img">
                                    <img src={img} alt="Evidence" className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"/>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-2 flex gap-2 justify-end">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold
                             ${log.type === 'Alerta' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                            {log.type}
                        </span>
                    </div>
                </div>
            </div>
          );
        })}
      </div>

      {/* New Log Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Camera size={24} className="text-pms-600"/> Novo Registro
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="overflow-y-auto flex-1 pr-2 space-y-4">
                      {/* Date & Type */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                              <input 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Registro</label>
                              <select 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                              >
                                  <option value="Diário">Diário Comum</option>
                                  <option value="Vistoria">Vistoria Técnica</option>
                                  <option value="Alerta">Alerta / Problema</option>
                              </select>
                          </div>
                      </div>

                      {/* Weather */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">Clima / Tempo</label>
                          <div className="grid grid-cols-4 gap-2">
                              {(['Sol', 'Nublado', 'Chuva', 'Neve'] as const).map((w) => (
                                  <button
                                    key={w}
                                    onClick={() => setWeather(w)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${weather === w ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                  >
                                      {getWeatherIcon(w)}
                                      <span className="text-[10px] mt-1 font-medium">{w}</span>
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Related Task */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Vincular Tarefa (Opcional)</label>
                          <select 
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                            value={relatedTaskId}
                            onChange={(e) => setRelatedTaskId(e.target.value)}
                          >
                              <option value="">Sem vínculo específico</option>
                              {tasks.filter(t => t.workId === workId).map(t => (
                                  <option key={t.id} value={t.id}>{t.title}</option>
                              ))}
                          </select>
                      </div>

                      {/* Employees Working */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">Equipe Presente</label>
                          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                              {users.filter(u => u.category === 'EMPLOYEE').map(u => (
                                  <div 
                                    key={u.id} 
                                    onClick={() => toggleTeamMember(u.id)}
                                    className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${selectedTeamIds.includes(u.id) ? 'bg-pms-100 border border-pms-300' : 'hover:bg-white'}`}
                                  >
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedTeamIds.includes(u.id) ? 'bg-pms-600 border-pms-600' : 'border-slate-400 bg-white'}`}>
                                          {selectedTeamIds.includes(u.id) && <CheckCircle2 size={12} className="text-white"/>}
                                      </div>
                                      <span className="text-xs text-slate-700 font-medium">{u.name.split(' ')[0]}</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Content */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Descrição do Dia / Ocorrência</label>
                          <textarea 
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pms-500 outline-none resize-none h-24"
                            placeholder="Descreva o que foi feito, problemas encontrados, etc..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                          />
                      </div>

                      {/* Photo Attachments Area */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Evidências Fotográficas</label>
                        
                        {/* Trigger Button */}
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-pms-400 hover:text-pms-600 cursor-pointer transition-all"
                        >
                            <Camera size={24} className="mb-1"/>
                            <span className="text-xs font-bold">Adicionar Fotos ou Arquivos</span>
                            <span className="text-[10px] text-slate-300">PC, Celular ou Google Drive</span>
                        </button>

                        {/* Image Preview Grid */}
                        {formImages.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mt-3">
                                {formImages.map((img, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg border border-slate-200 bg-slate-100 overflow-hidden group">
                                        <img src={img} alt={`Attachment ${index}`} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://placehold.co/100?text=Link')} />
                                        <button 
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                          Cancelar
                      </button>
                      <button onClick={handleSave} className="px-6 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-bold shadow-lg">
                          Salvar Registro
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* UPLOAD / FILE SELECTION POPUP */}
      {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800">Adicionar Arquivos</h3>
                      <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="space-y-4">
                      {/* Option 1: Local Device */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                          <label className="cursor-pointer block">
                              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <Upload size={24} />
                              </div>
                              <span className="block font-bold text-slate-700 text-sm">Do seu Dispositivo</span>
                              <span className="block text-xs text-slate-400 mt-1">PC, Galeria ou Câmera</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                multiple 
                                className="hidden" 
                                onChange={handleFileSelect}
                              />
                          </label>
                      </div>

                      <div className="relative flex items-center py-2">
                          <div className="flex-grow border-t border-slate-200"></div>
                          <span className="flex-shrink-0 mx-4 text-xs text-slate-400 font-bold uppercase">OU</span>
                          <div className="flex-grow border-t border-slate-200"></div>
                      </div>

                      {/* Option 2: External Link / Drive */}
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Link Externo (Google Drive / Dropbox)</label>
                          <div className="flex gap-2">
                              <div className="relative flex-1">
                                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                  <input 
                                    type="text" 
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-pms-500 outline-none"
                                    placeholder="Cole o link aqui..."
                                    value={tempLink}
                                    onChange={(e) => setTempLink(e.target.value)}
                                  />
                              </div>
                              <button 
                                onClick={handleAddLink}
                                disabled={!tempLink}
                                className="px-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50"
                              >
                                  <Plus size={18} />
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="mt-6">
                      <button 
                        onClick={() => setIsUploadModalOpen(false)}
                        className="w-full py-2 bg-pms-600 text-white rounded-lg font-bold hover:bg-pms-500"
                      >
                          Concluir Seleção
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
