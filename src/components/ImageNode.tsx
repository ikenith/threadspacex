import { NodeResizer } from '@xyflow/react';
import { NoteData, useStore } from '../store';
import { motion } from 'motion/react';
import { Maximize2 } from 'lucide-react';
import { NodeHandles } from './NodeHandles';

export function ImageNode({ data, selected }: { data: NoteData; selected: boolean }) {
  const setFullscreenImage = useStore(state => state.setFullscreenImage);

  return (
    <>
      <NodeResizer 
        minWidth={150} 
        minHeight={150} 
        isVisible={selected} 
        lineClassName="border-orange-500" 
        handleClassName="h-3 w-3 bg-space-800 border-2 border-orange-500 rounded" 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ width: '100%', height: '100%', minWidth: 200, minHeight: 200 }}
        className={`glass-panel p-2 rounded-2xl transition-all duration-300 group flex flex-col relative ${
          selected ? 'ring-1 ring-orange-500 shadow-[0_8px_32px_rgba(249,115,22,0.3)] border-orange-500/50' : ''
        }`}
      >
        <NodeHandles />

        <div className="flex-1 w-full h-full overflow-hidden rounded-xl bg-black/50 border border-white/5 relative">
           {data.imageUrl ? (
             <>
               <img src={data.imageUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="Uploaded" />
               <button 
                 onClick={() => setFullscreenImage(data.imageUrl || null)}
                 className="absolute top-2 right-2 p-2 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-500 z-10"
               >
                 <Maximize2 size={14} />
               </button>
             </>
           ) : (
             <div className="text-zinc-500 flex items-center justify-center w-full h-full font-mono text-xs uppercase relative">No Image</div>
           )}
        </div>
      </motion.div>
    </>
  );
}
