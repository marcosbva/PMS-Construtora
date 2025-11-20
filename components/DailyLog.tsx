import React from 'react';
import { DailyLog, User } from '../types';
import { Camera, Calendar, User as UserIcon } from 'lucide-react';

interface DailyLogProps {
  logs: DailyLog[];
  users: User[];
  onAddLog: () => void;
}

export const DailyLogView: React.FC<DailyLogProps> = ({ logs, users, onAddLog }) => {
  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Diário de Obra</h2>
        <button 
            onClick={onAddLog}
            className="bg-pms-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all"
        >
            <Camera size={18} />
            Novo Registro
        </button>
      </div>

      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {logs.length === 0 && (
             <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm relative z-10">
                <p>Nenhum registro encontrado hoje.</p>
             </div>
        )}

        {logs.map((log) => {
          const author = users.find(u => u.id === log.authorId);
          
          return (
            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                
                {/* Icon/Dot on Timeline */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <Calendar size={18} className="text-slate-500" />
                </div>

                {/* Content Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                        {author && <img src={author.avatar} alt={author.name} className="w-6 h-6 rounded-full" />}
                        <span className="text-xs font-bold text-slate-700">{author?.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">{new Date(log.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-slate-600 text-sm mb-3 leading-relaxed">
                        {log.content}
                    </p>
                    {log.images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {log.images.map((img, idx) => (
                                <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-100">
                                    <img src={img} alt="Evidence" className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"/>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-2 flex gap-2">
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
    </div>
  );
};
