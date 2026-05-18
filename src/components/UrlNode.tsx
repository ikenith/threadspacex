import { NodeResizer } from '@xyflow/react';
import { NoteData, useStore } from '../store';
import { motion } from 'motion/react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NodeHandles } from './NodeHandles';

export function UrlNode({ data, id, selected }: { data: NoteData; id: string; selected: boolean }) {
  const updateNodeData = useStore(state => state.updateNodeData);
  const [loading, setLoading] = useState(false);

  const getHostname = (url: string | undefined) => {
    if (!url) return '';
    try {
      const u = url.startsWith('http') ? url : `https://${url}`;
      return new URL(u).hostname;
    } catch {
      return url;
    }
  };

  useEffect(() => {
    if (data.url && !data.previewUrl && data.label === getHostname(data.url)) {
      fetchMetadata(data.url);
    }
  }, [data.url]);

  const fetchMetadata = async (url: string) => {
    if (!url) return;
    setLoading(true);
    try {
      const u = url.startsWith('http') ? url : `https://${url}`;
      const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(u)}`);
      const json = await res.json();
      if (json.status === 'success') {
        updateNodeData(id, {
          label: json.data.title || data.label,
          text: json.data.description || data.text,
          previewUrl: json.data.image?.url || json.data.logo?.url,
        });
      }
    } catch (e) {
      console.error('Failed to fetch metadata', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NodeResizer 
        minWidth={250} 
        minHeight={200} 
        isVisible={selected} 
        lineClassName="border-orange-500" 
        handleClassName="h-3 w-3 bg-space-800 border-2 border-orange-500 rounded" 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ minWidth: 250, minHeight: 200 }}
        className={`glass-panel flex flex-col rounded-2xl w-full h-full overflow-hidden transition-all duration-300 group cursor-grab ${
          selected ? 'ring-1 ring-orange-500 shadow-[0_8px_32px_rgba(249,115,22,0.3)] border-orange-500/50' : ''
        }`}
      >
      <NodeHandles />
      
      {data.previewUrl ? (
        <div className="h-40 bg-zinc-900 border-b border-white/5 relative flex-shrink-0">
           <img src={data.previewUrl} alt="Preview" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
           {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><RefreshCw size={14} className="text-orange-400 animate-spin" /></div>}
        </div>
      ) : (
        <div className="h-40 bg-zinc-900 flex items-center justify-center border-b border-white/5 relative flex-shrink-0">
          {loading ? (
             <RefreshCw size={14} className="text-orange-400 animate-spin" />
          ) : (
            <div className="text-zinc-700 italic px-4 truncate w-full text-center font-mono">
              {data.url ? getHostname(data.url) : 'No URL'}
            </div>
          )}
        </div>
      )}

      <div className="p-4 relative flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 mb-1 flex-shrink-0">
          <div className="text-[10px] font-mono opacity-40 uppercase truncate flex-1">
            {getHostname(data.url)}
          </div>
          <ExternalLink size={12} className="text-orange-400 opacity-60 hover:opacity-100 cursor-pointer" onClick={() => window.open(data.url?.startsWith('http') ? data.url : `https://${data.url}`, '_blank')} />
        </div>
        <div className="text-sm text-zinc-300 font-light leading-snug line-clamp-3">
          {data.label || 'External Link'}
        </div>
        {data.text && (
          <div className="mt-2 text-[11px] text-zinc-500 line-clamp-3 leading-relaxed">
            {data.text}
          </div>
        )}
      </div>

      <button
        className="absolute top-2 right-2 p-1 rounded-full bg-black/40 text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all border border-white/10"
        onClick={(e) => {
          e.stopPropagation();
          if (data.url) fetchMetadata(data.url);
        }}
        title="Refresh preview"
      >
        <RefreshCw size={12} />
      </button>
    </motion.div>
    </>
  );
}
