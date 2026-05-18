import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';

// Custom IDB storage
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export type NoteData = {
  text: string;
  color?: string;
  label?: string;
  url?: string;
  previewUrl?: string; // For link previews
  imageUrl?: string; // For uploaded images
};

export type AppNode = Node<NoteData>;

export interface SpaceData {
  id: string;
  name: string;
  nodes: AppNode[];
  edges: Edge[];
}

export interface Settings {
  backupReminder: boolean;
  snapToGrid: boolean;
  showActivityLog: boolean;
  darkMode: boolean;
  animatedEdges: boolean;
}

export type ActivityLogEntry = {
  id: string;
  action: string;
  timestamp: number;
  spaceId: string;
};

interface ThreadspaceState {
  spaces: Record<string, SpaceData>;
  currentSpaceId: string;
  
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  addNode: (node: AppNode) => void;
  updateNodeData: (id: string, data: Partial<NoteData>) => void;
  deleteElements: (nodeIds: string[], edgeIds: string[]) => void;
  
  enterSpace: (spaceId: string, spaceName: string) => void;
  goBackSpace: () => void;
  jumpToSpace?: (index: number) => void;
  spaceHistory: { id: string; name: string }[];
  
  clearAll: () => void;
  
  // Minimal UI state
  minimapVisible: boolean;
  toggleMinimap: () => void;
  
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  
  fullscreenImage: string | null;
  setFullscreenImage: (url: string | null) => void;

  // History & Undo/Redo
  past: Record<string, SpaceData>[];
  future: Record<string, SpaceData>[];
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Activity Log
  activityLog: ActivityLogEntry[];
  addLogEntry: (action: string) => void;
  clearLog: () => void;
}

const initialSpaceId = 'root';

export const useStore = create<ThreadspaceState>()(
  persist(
    (set, get) => ({
      spaces: {
        [initialSpaceId]: { id: initialSpaceId, name: 'Root', nodes: [], edges: [] }
      },
      currentSpaceId: initialSpaceId,
      spaceHistory: [{ id: initialSpaceId, name: 'Root' }],
      
      minimapVisible: false,

      past: [],
      future: [],
      activityLog: [],

      saveHistory: () => {
        const state = get();
        // keep last 50 states
        const newPast = [...state.past, state.spaces].slice(-50);
        set({ past: newPast, future: [] });
      },

      undo: () => {
        const state = get();
        if (state.past.length === 0) return;
        
        const previousSpaces = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, state.past.length - 1);
        
        set({
          spaces: previousSpaces,
          past: newPast,
          future: [state.spaces, ...state.future],
        });
        get().addLogEntry('Undid last action');
      },

      redo: () => {
        const state = get();
        if (state.future.length === 0) return;
        
        const nextSpaces = state.future[0];
        const newFuture = state.future.slice(1);
        
        set({
          spaces: nextSpaces,
          past: [...state.past, state.spaces],
          future: newFuture,
        });
        get().addLogEntry('Redid action');
      },

      addLogEntry: (action: string) => {
        const state = get();
        const entry: ActivityLogEntry = {
          id: uuidv4(),
          action,
          timestamp: Date.now(),
          spaceId: state.currentSpaceId,
        };
        // keep last 100 entries
        set({ activityLog: [entry, ...state.activityLog].slice(0, 100) });
      },

      clearLog: () => {
        set({ activityLog: [] });
      },

      onNodesChange: (changes: NodeChange[]) => {
        const state = get();
        const currentSpace = (state.spaces || {})[state.currentSpaceId];
        if (!currentSpace) return;
        
        set({
          spaces: {
            ...state.spaces,
            [state.currentSpaceId]: {
              ...currentSpace,
              nodes: applyNodeChanges(changes, currentSpace.nodes) as AppNode[],
            }
          }
        });
      },

      onEdgesChange: (changes: EdgeChange[]) => {
        const state = get();
        const currentSpace = (state.spaces || {})[state.currentSpaceId];
        if (!currentSpace) return;

        // If it's a structural change (remove), then we save history
        const hasRemoves = changes.some(c => c.type === 'remove');
        if (hasRemoves) {
          get().saveHistory();
        }

        set({
          spaces: {
            ...state.spaces,
            [state.currentSpaceId]: {
              ...currentSpace,
              edges: applyEdgeChanges(changes, currentSpace.edges),
            }
          }
        });
        
        if (hasRemoves) {
          get().addLogEntry(`Removed edges`);
        }
      },

      onConnect: (connection: Connection) => {
        const state = get();
        const currentSpace = (state.spaces || {})[state.currentSpaceId];
        if (!currentSpace) return;

        get().saveHistory();

        set({
          spaces: {
            ...state.spaces,
            [state.currentSpaceId]: {
              ...currentSpace,
              edges: addEdge({ ...connection, type: 'smoothstep', animated: true }, currentSpace.edges),
            }
          }
        });
        get().addLogEntry(`Connected nodes`);
      },

      addNode: (node: AppNode) => {
        const state = get();
        const spaceId = state.currentSpaceId || initialSpaceId;
        const currentSpace = (state.spaces || {})[spaceId] || { id: spaceId, name: 'Root', nodes: [], edges: [] };
        
        get().saveHistory();

        set({
          currentSpaceId: spaceId,
          spaces: {
            ...state.spaces,
            [spaceId]: {
              ...currentSpace,
              nodes: [...currentSpace.nodes, node]
            }
          }
        });
        get().addLogEntry(`Added node: ${node.type}`);
      },

      updateNodeData: (id: string, data: Partial<NoteData>) => {
        const state = get();
        const spaceId = state.currentSpaceId || initialSpaceId;
        const currentSpace = (state.spaces || {})[spaceId];
        if (!currentSpace) return;

        get().saveHistory();

        set({
          spaces: {
            ...state.spaces,
            [spaceId]: {
              ...currentSpace,
              nodes: currentSpace.nodes.map((n) => {
                if (n.id === id) {
                  return { ...n, data: { ...n.data, ...data } };
                }
                return n;
              })
            }
          }
        });
        get().addLogEntry(`Updated node data`);
      },

      deleteElements: (nodeIds: string[], edgeIds: string[]) => {
        const state = get();
        const spaceId = state.currentSpaceId || initialSpaceId;
        const currentSpace = (state.spaces || {})[spaceId];
        if (!currentSpace) return;

        get().saveHistory();

        set({
          spaces: {
            ...state.spaces,
            [spaceId]: {
              ...currentSpace,
              nodes: currentSpace.nodes.filter((n) => !nodeIds.includes(n.id)),
              edges: currentSpace.edges.filter((e) => !edgeIds.includes(e.id) && !nodeIds.includes(e.source) && !nodeIds.includes(e.target)),
            }
          }
        });
        get().addLogEntry(`Deleted ${nodeIds.length} nodes and ${edgeIds.length} edges`);
      },
      
      enterSpace: (spaceId: string, spaceName: string) => {
        const state = get();
        const newSpace = (state.spaces || {})[spaceId] || { id: spaceId, name: spaceName, nodes: [], edges: [] };
        
        // Don't add to history if we are already there
        if (state.currentSpaceId === spaceId) return;

        // Truncate history if we navigated back then entered a new space? 
        // For simplicity, just append to history for now, or build a breadcrumb array.
        // Actually, we want breadcrumbs. We can just append. But if we click a breadcrumb, we slice.
        // We will just let `enterSpace` act as a "drill down" or "jump".
        
        set({
          currentSpaceId: spaceId,
          spaces: {
            ...state.spaces,
            [spaceId]: newSpace,
          },
          spaceHistory: [...state.spaceHistory, { id: spaceId, name: spaceName }]
        });
      },
      
      goBackSpace: () => {
        const state = get();
        if (state.spaceHistory.length <= 1) return; // Can't go back from root
        
        const newHistory = [...state.spaceHistory];
        newHistory.pop(); // remove current
        const previous = newHistory[newHistory.length - 1];
        
        set({
          currentSpaceId: previous.id,
          spaceHistory: newHistory
        });
      },

      jumpToSpace: (index: number) => {
        const state = get();
        if (index < 0 || index >= state.spaceHistory.length) return;
        const target = state.spaceHistory[index];
        set({
          currentSpaceId: target.id,
          spaceHistory: state.spaceHistory.slice(0, index + 1)
        });
      },

      clearAll: () => {
        set({ 
          spaces: { [initialSpaceId]: { id: initialSpaceId, name: 'Root', nodes: [], edges: [] } },
          currentSpaceId: initialSpaceId,
          spaceHistory: [{ id: initialSpaceId, name: 'Root' }]
        });
      },

      toggleMinimap: () => {
        set({ minimapVisible: !get().minimapVisible });
      },

      settings: {
        backupReminder: true,
        snapToGrid: false,
        showActivityLog: false,
        darkMode: true,
        animatedEdges: false,
      },
      updateSettings: (newSettings: Partial<Settings>) => {
        set({ settings: { ...get().settings, ...newSettings } });
      },

      fullscreenImage: null,
      setFullscreenImage: (url: string | null) => {
        set({ fullscreenImage: url });
      },
    }),
    {
      name: 'threadspace-storage',
      storage: createJSONStorage(() => idbStorage),
      version: 3,
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;
        
        // If we don't have spaces or currentSpaceId properly set up (either from v0 or a bad v1)
        if (!state.spaces || !state.currentSpaceId || !state.spaceHistory) {
           state = {
             ...state,
             spaces: {
               [initialSpaceId]: {
                 id: initialSpaceId,
                 name: 'Root',
                 nodes: state.nodes || [],
                 edges: state.edges || []
               }
             },
             currentSpaceId: initialSpaceId,
             spaceHistory: [{ id: initialSpaceId, name: 'Root' }]
           } as ThreadspaceState;
        }

        if (!state.settings) {
          state.settings = {
            backupReminder: true,
            snapToGrid: false,
          };
        }
        
        return state as ThreadspaceState;
      },
      partialize: (state) => ({ 
        spaces: state.spaces, 
        currentSpaceId: state.currentSpaceId,
        spaceHistory: state.spaceHistory,
        settings: state.settings,
      }),
    }
  )
);
