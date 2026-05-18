import { NodeResizer } from '@xyflow/react';
import { NoteData, useStore } from '../store';
import { motion } from 'motion/react';
import { Maximize2, Layers } from 'lucide-react';
import { NodeHandles } from './NodeHandles';

export function CanvasNode({ data, id, selected }: { data: NoteData; id: string; selected: boolean }) {
  const enterSpace = useStore((state) => state.enterSpace);
  const showSubSpaces = useStore((state) => state.settings?.exportSubSpaces);
  const childNodes = useStore((state) => (state.spaces && state.spaces[id]) ? state.spaces[id].nodes : []);

  // Calculate mini-map scale
  const minX = Math.min(...childNodes.map(n => n.position.x), 0);
  const minY = Math.min(...childNodes.map(n => n.position.y), 0);
  const maxX = Math.max(...childNodes.map(n => n.position.x + 200), 100);
  const maxY = Math.max(...childNodes.map(n => n.position.y + 150), 100);
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  return (
    <>
      <NodeResizer 
        minWidth={200} 
        minHeight={200} 
        isVisible={selected} 
        lineClassName="border-orange-500" 
        handleClassName="h-3 w-3 bg-space-800 border-2 border-orange-500 rounded" 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ minWidth: 200, minHeight: 200 }}
        className={`glass-panel p-4 rounded-2xl w-full h-full flex flex-col border-dashed border-orange-500/30 cursor-pointer hover:bg-orange-500/5 transition-all duration-300 relative overflow-hidden group ${
          selected ? 'ring-1 ring-orange-500 shadow-[0_8px_32px_rgba(249,115,22,0.3)]' : ''
        }`}
        onDoubleClick={() => enterSpace(id, data.label || 'Sub-Space')}
      >
      <NodeHandles />
      
      {!showSubSpaces || childNodes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[10px] font-mono opacity-40 uppercase mb-4">Sub-Space</div>
          <div className="w-12 h-12 rounded-full border border-orange-500/50 mx-auto flex items-center justify-center mb-4">
            <div className="w-6 h-6 border-2 border-orange-500/50 rounded-sm rotate-45"></div>
          </div>
          <div className="text-lg font-light text-zinc-100">{data.label || 'Nested Canvas'}</div>
          <div className="text-[10px] opacity-40 italic mt-1 font-sans uppercase tracking-[0.2em]">{childNodes.length} nodes inside</div>
        </div>
      ) : (
        <div className="flex-1 relative w-full h-full opacity-60 pointer-events-none rounded border border-white/5 bg-black/20 overflow-hidden">
          <div className="absolute top-2 left-2 z-10 text-[8px] uppercase tracking-widest text-orange-500/80 font-mono font-bold bg-space-900/80 px-2 py-0.5 rounded">{data.label || 'Nested Canvas'}</div>
          <div className="absolute inset-0 m-4" style={{ position: 'relative' }}>
             {childNodes.map(n => {
               const leftP = ((n.position.x - minX) / width) * 100;
               const topP = ((n.position.y - minY) / height) * 100;
               const wP = (150 / width) * 100; // rough generic size 150
               const hP = (100 / height) * 100; 
               return (
                 <div 
                   key={n.id} 
                   className="absolute bg-white/20 rounded border border-white/30 backdrop-blur-sm"
                   style={{ left: `${leftP}%`, top: `${topP}%`, width: `${wP}%`, height: `${hP}%` }}
                 />
               );
             })}
          </div>
        </div>
      )}
      
      <button 
        className="absolute bottom-2 right-2 p-1.5 rounded-full hover:bg-white/10 text-starlight-dim opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          enterSpace(id, data.label || 'Sub-Space');
        }}
      >
        <Maximize2 size={14} />
      </button>
    </motion.div>
    </>
  );
}
