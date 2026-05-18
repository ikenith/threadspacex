import { NodeResizer } from '@xyflow/react';
import { NoteData } from '../store';
import { motion } from 'motion/react';
import { NodeHandles } from './NodeHandles';

export function TextNode({ data, selected }: { data: NoteData; selected: boolean }) {
  return (
    <>
      <NodeResizer 
        minWidth={200} 
        minHeight={150} 
        isVisible={selected} 
        lineClassName="border-orange-500" 
        handleClassName="h-3 w-3 bg-space-800 border-2 border-orange-500 rounded" 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`glass-panel p-6 flex flex-col rounded-2xl w-full h-full transition-all duration-300 group ${
          selected ? 'ring-1 ring-orange-500 shadow-[0_8px_32px_rgba(249,115,22,0.3)] border-orange-500/50' : ''
        }`}
        style={{
          boxShadow: data.color ? `0 8px 32px ${data.color}40` : undefined,
          borderColor: data.color ? `${data.color}80` : undefined,
          minWidth: 200,
          minHeight: 150
        }}
      >
      <NodeHandles />
      
      {data.label && (
        <div className="flex justify-between items-start mb-4">
          <span className="text-[10px] font-mono opacity-40 uppercase">{data.label}</span>
          <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 ml-2"></div>
        </div>
      )}
      
      <div className={`text-xl leading-tight text-zinc-100 flex-1 overflow-auto pointer-events-auto ${data.label ? 'serif-italic mb-2' : 'font-light'}`}>
        {data.text || <span className="opacity-40 italic font-light text-sm">Empty note...</span>}
      </div>
    </motion.div>
    </>
  );
}
