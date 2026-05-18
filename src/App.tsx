import { useEffect, useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  useKeyPress,
  ConnectionMode,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { Store, Plus, MousePointer2, Type, Link as LinkIcon, Settings, Compass, Trash2, Search, Layers, ChevronRight, Download, Upload, Image as ImageIcon, Camera, FileText, Undo, Redo, Activity } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

import { useStore, AppNode, NoteData } from './store';
import { TextNode } from './components/TextNode';
import { UrlNode } from './components/UrlNode';
import { CanvasNode } from './components/CanvasNode';
import { ImageNode } from './components/ImageNode';

const nodeTypes = {
  textNode: TextNode,
  urlNode: UrlNode,
  canvasNode: CanvasNode,
  imageNode: ImageNode,
};

function Flow() {
  const { onNodesChange, onEdgesChange, onConnect, addNode, minimapVisible, toggleMinimap, spaces, currentSpaceId, enterSpace, settings, fullscreenImage, setFullscreenImage, undo, redo, past, future, activityLog } = useStore();
  const nodes = (spaces && currentSpaceId && spaces[currentSpaceId]) ? spaces[currentSpaceId].nodes : [];
  const edges = (spaces && currentSpaceId && spaces[currentSpaceId]) 
    ? spaces[currentSpaceId].edges.map(e => ({ ...e, animated: settings?.animatedEdges || false, style: { stroke: '#f97316', strokeWidth: 2 } })) 
    : [];
  const reactFlow = useReactFlow();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  
  // Create node at center of current view
  const createNode = useCallback(
    (type: 'textNode' | 'urlNode' | 'canvasNode', initialData: Partial<NoteData> = {}) => {
      const center = reactFlow.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const newNode: AppNode = {
        id: uuidv4(),
        type,
        position: {
          x: center.x + (Math.random() * 50 - 25),
          y: center.y + (Math.random() * 50 - 25),
        },
        data: {
          text: initialData.text || '',
          ...initialData
        },
      };

      addNode(newNode);
    },
    [reactFlow, addNode]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+K or CTRL+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useStore.getState().settings?.backupReminder && Object.keys(useStore.getState().spaces || {}).length > 0) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Don\'t forget to download your backup JSON!';
        return 'Are you sure you want to leave? Don\'t forget to download your backup JSON!';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const performSearch = () => {
    if (!searchQuery) return [];
    const lowerQ = searchQuery.toLowerCase();
    const results: { spaceId: string; node: AppNode }[] = [];
    Object.values(spaces || {}).forEach((space: any) => {
      (space.nodes || []).forEach((node: any) => {
        if (
          (node.data.text && node.data.text.toLowerCase().includes(lowerQ)) ||
          (node.data.label && node.data.label.toLowerCase().includes(lowerQ)) ||
          (node.data.url && node.data.url.toLowerCase().includes(lowerQ))
        ) {
          results.push({ spaceId: space.id, node });
        }
      });
    });
    return results;
  };

  const executeSearchAction = (spaceId: string, node: AppNode) => {
    setSearchOpen(false);
    setSearchQuery('');
    
    if (spaceId !== currentSpaceId) {
      enterSpace(spaceId, spaces[spaceId].name);
      // Let it render the new space for a moment
      setTimeout(() => {
        reactFlow.setCenter(node.position.x, node.position.y, { zoom: 1, duration: 800 });
      }, 100);
    } else {
      reactFlow.setCenter(node.position.x, node.position.y, { zoom: 1, duration: 800 });
    }
  };

  const handleExport = () => {
    const state = useStore.getState();
    const dataStr = JSON.stringify({ spaces: state.spaces }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'threadspace-backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.spaces) {
            useStore.setState({ spaces: json.spaces, currentSpaceId: 'root', spaceHistory: [{id: 'root', name: 'Root'}] });
          }
        } catch (e) {
          alert('Invalid Threadspace file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const downloadImage = () => {
    const nodesBounds = getNodesBounds(nodes);
    const viewport = getViewportForBounds(
      nodesBounds,
      1920,
      1080,
      0.5,
      2,
      0.1
    );

    const viewportNode = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportNode) return;

    toPng(viewportNode, {
      backgroundColor: '#09090b',
      width: 1920,
      height: 1080,
      pixelRatio: 2,
      style: {
        width: '1920px',
        height: '1080px',
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl) => {
      const a = document.createElement('a');
      a.setAttribute('download', 'threadspacex-canvas.png');
      a.setAttribute('href', dataUrl);
      a.click();
    });
  };

  const downloadPdf = () => {
    const nodesBounds = getNodesBounds(nodes);
    const viewport = getViewportForBounds(
      nodesBounds,
      1920,
      1080,
      0.5,
      2,
      0.1
    );

    const viewportNode = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportNode) return;

    toPng(viewportNode, {
      backgroundColor: '#09090b',
      width: 1920,
      height: 1080,
      pixelRatio: 2,
      style: {
        width: '1920px',
        height: '1080px',
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl) => {
      const pdf = new jsPDF('landscape', 'px', [1920, 1080]);
      pdf.addImage(dataUrl, 'PNG', 0, 0, 1920, 1080);
      pdf.save('threadspacex-canvas.pdf');
    });
  };

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={() => useStore.getState().saveHistory()}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.5 }}
        minZoom={0.1}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={settings?.snapToGrid}
        snapGrid={[20, 20]}
        defaultEdgeOptions={{ 
          type: 'smoothstep', 
          animated: settings?.animatedEdges || false,
          style: { stroke: '#f97316', strokeWidth: 2 }
        }}
      >
        <Background gap={40} size={1} color="rgba(255,255,255,0.05)" />
        
        {minimapVisible && (
          <MiniMap 
            nodeColor={(n) => {
              if (n.type === 'textNode') return 'rgba(249, 115, 22, 0.6)';
              if (n.type === 'urlNode') return 'rgba(249, 115, 22, 0.4)';
              if (n.type === 'canvasNode') return 'rgba(249, 115, 22, 0.2)';
              return 'rgba(255, 255, 255, 0.2)';
            }}
            maskColor="rgba(5, 6, 8, 0.7)"
            className="!bg-space-800 !border !border-white/10 !rounded-xl"
            position="bottom-left"
            style={{ left: 24, bottom: 24 }}
          />
        )}
        
        <Controls 
          className="!bg-glass-panel !border-none !rounded-xl overflow-hidden [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-starlight [&>button:hover]:!bg-white/10" 
          showInteractive={false}
          position="top-right"
        />
        
        <Panel position="top-left" className="m-6 relative z-10 w-full pointer-events-none">
          <div className="flex flex-col gap-3 pointer-events-auto max-w-max">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold tracking-tighter text-starlight drop-shadow-md flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                threadspacex
              </h1>
              
              <div className="h-4 w-px bg-zinc-800 mx-1"></div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSearchOpen(true)}
                  className="glass-panel w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors tooltip group relative"
                >
                  <Search size={14} className="text-starlight" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">Search</span>
                </button>

                <button 
                  onClick={handleImport}
                  className="glass-panel w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors tooltip group relative"
                >
                  <Upload size={14} className="text-starlight" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">Import Backup</span>
                </button>

                <button 
                  onClick={handleExport}
                  className="glass-panel w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors tooltip group relative"
                >
                  <Download size={14} className="text-starlight" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">Export JSON</span>
                </button>

                <button 
                  onClick={downloadImage}
                  className="glass-panel w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors tooltip group relative"
                >
                  <Camera size={14} className="text-starlight" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">Export Image</span>
                </button>

                <button 
                  onClick={downloadPdf}
                  className="glass-panel w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors tooltip group relative"
                >
                  <FileText size={14} className="text-starlight" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">Export PDF</span>
                </button>

                <button 
                  onClick={() => undo()}
                  disabled={past.length === 0}
                  className={`glass-panel w-8 h-8 rounded-full flex items-center justify-center transition-colors tooltip group relative ${past.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                >
                  <Undo size={14} className="text-starlight" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none z-50">Undo</span>
                </button>

                <button 
                  onClick={() => redo()}
                  disabled={future.length === 0}
                  className={`glass-panel w-8 h-8 rounded-full flex items-center justify-center transition-colors tooltip group relative ${future.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                >
                  <Redo size={14} className="text-starlight" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none z-50">Redo</span>
                </button>

                <button 
                  onClick={() => setActivityLogOpen(true)}
                  className="glass-panel w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors tooltip group relative"
                >
                  <Activity size={14} className="text-starlight" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none z-50">Activity Log</span>
                </button>

                <button 
                  onClick={() => setSettingsOpen(true)}
                  className="glass-panel w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors tooltip group relative"
                >
                  <Settings size={14} className="text-starlight" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">Settings</span>
                </button>
              </div>
            </div>
            <Breadcrumbs />
          </div>
        </Panel>

        <Panel position="bottom-center" className="mb-6 relative z-10">
          <Toolbar createNode={createNode} toggleMinimap={toggleMinimap} />
        </Panel>

        {searchOpen && (
          <div className="absolute inset-0 z-50 flex items-start justify-center pt-32 bg-space-900/60 backdrop-blur-sm pointer-events-auto">
            <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <Search size={18} className="text-starlight-dim" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search globally..." 
                  className="bg-transparent border-none text-starlight placeholder:text-starlight-dim focus:outline-none flex-1 text-lg"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button onClick={() => setSearchOpen(false)} className="text-xs text-starlight-dim hover:text-white px-2 py-1 rounded border border-white/10">ESC</button>
              </div>
              {searchQuery && (
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {performSearch().map((res, i) => (
                    <div 
                      key={res.node.id + i} 
                      className="p-3 hover:bg-white/5 rounded-xl cursor-pointer flex items-center gap-3 transition-colors"
                      onClick={() => executeSearchAction(res.spaceId, res.node)}
                    >
                      <div className="w-8 h-8 rounded-full bg-space-800 border border-white/5 flex items-center justify-center flex-shrink-0">
                        {res.node.type === 'textNode' ? <Type size={12}/> : res.node.type === 'urlNode' ? <LinkIcon size={12}/> : <Layers size={12}/>}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm text-starlight font-medium truncate">
                          {res.node.data.label || 'Untitled Note'}
                        </div>
                        <div className="text-[10px] text-starlight-dim truncate">
                          in {spaces[res.spaceId]?.name || 'Root'} • {res.node.data.text || res.node.data.url}
                        </div>
                      </div>
                    </div>
                  ))}
                  {performSearch().length === 0 && (
                    <div className="p-4 text-center text-sm text-starlight-dim">No results found.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </ReactFlow>
      
      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-starlight">Settings</h2>
            </div>
            
            <div className="space-y-6">
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="text-sm text-starlight">Backup Reminder on Exit</div>
                  <div className="text-xs text-starlight-dim mt-1 max-w-[250px]">Show a prompt to download your data before leaving if enabled.</div>
                </div>
                <div className="relative inline-flex items-center">
                  <input type="checkbox" className="sr-only peer" checked={settings.backupReminder} onChange={(e) => useStore.getState().updateSettings({ backupReminder: e.target.checked })} />
                  <div className="w-11 h-6 bg-space-700/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="text-sm text-starlight">Snap to Grid</div>
                  <div className="text-xs text-starlight-dim mt-1 max-w-[250px]">Nodes snap to a fixed grid when moving.</div>
                </div>
                <div className="relative inline-flex items-center">
                  <input type="checkbox" className="sr-only peer" checked={settings.snapToGrid} onChange={(e) => useStore.getState().updateSettings({ snapToGrid: e.target.checked })} />
                  <div className="w-11 h-6 bg-space-700/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="text-sm text-starlight">Animated Edges</div>
                  <div className="text-xs text-starlight-dim mt-1 max-w-[250px]">Show moving dashed lines on connection edges.</div>
                </div>
                <div className="relative inline-flex items-center">
                  <input type="checkbox" className="sr-only peer" checked={settings.animatedEdges} onChange={(e) => useStore.getState().updateSettings({ animatedEdges: e.target.checked })} />
                  <div className="w-11 h-6 bg-space-700/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </div>
              </label>
            </div>

            <div className="mt-8 flex justify-end">
               <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Overlay */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-8" onClick={() => setFullscreenImage(null)}>
           <img src={fullscreenImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Fullscreen preview" />
           <button className="absolute top-8 right-8 text-white/50 hover:text-white p-2" onClick={() => setFullscreenImage(null)}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
           </button>
        </div>
      )}

      {/* Activity Log Modal */}
      {activityLogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setActivityLogOpen(false); }}>
          <div className="glass-panel w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-serif text-starlight flex items-center gap-2">
                <Activity size={18} className="text-orange-500" />
                Activity Log
              </h2>
              <button onClick={() => useStore.getState().clearLog()} className="text-xs text-starlight-dim hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">Clear</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {activityLog.length === 0 ? (
                <div className="p-8 text-center text-starlight-dim text-sm italic">No recent activity.</div>
              ) : (
                <div className="space-y-1">
                  {activityLog.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors">
                      <div className="text-[10px] text-starlight-dim/60 font-mono w-16 pt-0.5 shrink-0">
                        {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(log.timestamp))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-starlight">{log.action}</div>
                        <div className="text-[10px] text-starlight-dim mt-0.5">Space: {spaces[log.spaceId]?.name || log.spaceId}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end shrink-0">
              <button onClick={() => setActivityLogOpen(false)} className="px-4 py-2 bg-space-800 text-white rounded-lg text-sm font-medium hover:bg-space-700 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Breadcrumbs() {
  const { spaceHistory, jumpToSpace } = useStore();

  return (
    <div className="flex items-center gap-2 text-sm font-sans px-3 py-2 glass-panel rounded-xl">
      {spaceHistory.map((space, index) => {
        const isLast = index === spaceHistory.length - 1;
        return (
          <div key={space.id} className="flex items-center gap-2">
            <button
              onClick={() => jumpToSpace(index)}
              className={`hover:text-white transition-colors duration-200 ${
                isLast ? 'text-starlight font-medium' : 'text-starlight-dim'
              }`}
            >
              {space.name}
            </button>
            {!isLast && <ChevronRight size={14} className="text-white/20" />}
          </div>
        );
      })}
    </div>
  );
}

function Toolbar({ createNode, toggleMinimap }: { createNode: any; toggleMinimap: any }) {
  const { deleteElements, spaces, currentSpaceId } = useStore();
  const nodes = (spaces && spaces[currentSpaceId]) ? spaces[currentSpaceId].nodes : [];
  const edges = (spaces && spaces[currentSpaceId]) ? spaces[currentSpaceId].edges : [];
  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = () => {
    deleteElements(selectedNodes.map(n => n.id), selectedEdges.map(e => e.id));
  };
  
  const handleAddUrl = () => {
    if (urlValue) {
      try {
        const u = urlValue.startsWith('http') ? urlValue : `https://${urlValue}`;
        createNode('urlNode', { url: u, label: new URL(u).hostname });
      } catch {
        createNode('urlNode', { url: urlValue, label: urlValue });
      }
      setUrlValue('');
      setUrlOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        createNode('imageNode', { imageUrl: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="glass-panel p-2 rounded-full flex items-center gap-2 shadow-2xl px-4 relative">
      <button 
        className="p-3 rounded-full hover:bg-white/10 text-starlight transition-colors tooltip group relative"
        onClick={() => createNode('textNode')}
      >
        <Type size={18} />
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">New Text Note</span>
      </button>
      
      <div className="relative">
        <button 
          className={`p-3 rounded-full transition-colors tooltip group relative ${urlOpen ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-white/10 text-starlight'}`}
          onClick={() => setUrlOpen(!urlOpen)}
        >
          <LinkIcon size={18} />
          {!urlOpen && <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">Add URL</span>}
        </button>
        {urlOpen && (
          <div className="absolute bottom-[calc(100%+1rem)] left-1/2 -translate-x-1/2 glass-panel p-2 rounded-xl flex items-center gap-2 shadow-xl border border-white/10 w-64 origin-bottom animate-in fade-in zoom-in-95 duration-200">
            <input 
              autoFocus
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              placeholder="Enter URL..." 
              className="bg-transparent border-none text-starlight text-sm w-full outline-none px-2 focus:ring-0" 
            />
            <button onClick={handleAddUrl} className="text-orange-500 hover:text-orange-400 p-1 rounded-md hover:bg-white/5 transition-colors">
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      <button 
        className="p-3 rounded-full hover:bg-white/10 text-starlight transition-colors tooltip group relative"
        onClick={() => createNode('canvasNode')}
      >
        <Layers size={18} />
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">New Canvas</span>
      </button>

      <button 
        className="p-3 rounded-full hover:bg-white/10 text-starlight transition-colors tooltip group relative"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon size={18} />
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">Upload Image</span>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="image/*" 
          className="hidden" 
        />
      </button>
      
      <div className="w-[1px] h-8 bg-white/10 mx-2" />
      
      <button 
        className="p-3 rounded-full hover:bg-white/10 text-starlight transition-colors tooltip group relative"
        onClick={toggleMinimap}
      >
        <Compass size={18} />
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">Toggle Compass</span>
      </button>

      {(selectedNodes.length > 0 || selectedEdges.length > 0) && (
        <>
          <div className="w-[1px] h-8 bg-white/10 mx-2" />
          <button 
            className="p-3 rounded-full hover:bg-red-500/20 text-red-500 transition-colors tooltip group relative"
            onClick={handleDelete}
          >
            <Trash2 size={18} />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-space-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none text-starlight">Delete Selected</span>
          </button>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div className="w-screen h-screen bg-space-900 relative isolate">
      <div className="atmosphere-bg" />
      <div className="canvas-grid opacity-40" />
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
      <NodeEditor />
      
      {/* Lateral UI Elements */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col space-y-6 pointer-events-none">
         <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] uppercase tracking-[0.4em] opacity-20 font-bold text-starlight">Space Metadata {(Math.random() * 5).toFixed(2)}</div>
      </div>
      <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col space-y-6 pointer-events-none">
         <div className="[writing-mode:vertical-lr] text-[10px] uppercase tracking-[0.4em] opacity-20 font-bold text-starlight">Infinite Grid Active</div>
      </div>
    </div>
  );
}

function NodeEditor() {
  const { spaces, currentSpaceId, updateNodeData } = useStore();
  const nodes = (spaces && spaces[currentSpaceId]) ? spaces[currentSpaceId].nodes : [];
  const selectedNode = nodes.find(n => n.selected);

  if (!selectedNode) return null;

  return (
    <div className="absolute right-6 top-6 bottom-24 w-80 glass-panel rounded-2xl p-5 flex flex-col z-20 overflow-y-auto shadow-2xl">
      <h3 className="text-xs uppercase tracking-widest text-starlight-dim mb-4 font-mono">Object Properties</h3>
      
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase text-starlight-dim">Label</label>
          <input 
            type="text"
            className="bg-space-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-starlight focus:outline-none focus:ring-1 focus:ring-orange-500"
            value={selectedNode.data.label || ''}
            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
            placeholder="E.g. Character Idea"
          />
        </div>

        {selectedNode.type === 'textNode' && (
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] uppercase text-starlight-dim">Content</label>
            <textarea 
              className="bg-space-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-starlight focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none min-h-[150px] font-sans"
              value={selectedNode.data.text || ''}
              onChange={(e) => updateNodeData(selectedNode.id, { text: e.target.value })}
              placeholder="Start typing..."
            />
          </div>
        )}

        {selectedNode.type === 'urlNode' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase text-starlight-dim">URL</label>
            <input 
              type="text"
              className="bg-space-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-starlight focus:outline-none focus:ring-1 focus:ring-orange-500"
              value={selectedNode.data.url || ''}
              onChange={(e) => updateNodeData(selectedNode.id, { url: e.target.value })}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5 mt-auto pt-4 border-t border-white/5">
          <label className="text-[10px] uppercase text-starlight-dim">Color Hint</label>
          <div className="flex gap-2">
            {[undefined, '#f97316', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'].map((color, i) => (
              <button
                key={i}
                className={`w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform ${selectedNode.data.color === color ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: color || 'transparent' }}
                onClick={() => updateNodeData(selectedNode.id, { color })}
                title={color || 'Clear color'}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
