import { NodeResizer } from '@xyflow/react';
import { NoteData, useStore } from '../store';
import { motion } from 'motion/react';
import { Maximize2, Layers } from 'lucide-react';
import { NodeHandles } from './NodeHandles';

export function CanvasNode({ data, id, selected }: { data: NoteData; id: string; selected: boolean }) {
  const enterSpace = useStore((state) => state.enterSpace);

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
        className={`glass-panel p-6 rounded-2xl w-full h-full flex flex-col justify-center border-dashed border-orange-500/30 cursor-pointer hover:bg-orange-500/5 transition-all duration-300 text-center relative overflow-hidden group ${
          selected ? 'ring-1 ring-orange-500 shadow-[0_8px_32px_rgba(249,115,22,0.3)]' : ''
        }`}
        onDoubleClick={() => enterSpace(id, data.label || 'Sub-Space')}
      >
      <NodeHandles />
      
      <div className="text-center py-4">
        <div className="text-[10px] font-mono opacity-40 uppercase mb-4">Sub-Space</div>
        <div className="w-12 h-12 rounded-full border border-orange-500/50 mx-auto flex items-center justify-center mb-4">
          <div className="w-6 h-6 border-2 border-orange-500/50 rounded-sm rotate-45"></div>
        </div>
        <div className="text-lg font-light text-zinc-100">{data.label || 'Nested Canvas'}</div>
        <div className="text-[10px] opacity-40 italic mt-1 font-sans uppercase tracking-[0.2em]">Double click to enter</div>
      </div>
      
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
