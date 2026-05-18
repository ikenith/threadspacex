import { Handle, Position } from '@xyflow/react';

export function NodeHandles() {
  const commonClasses = "!w-2.5 !h-2.5 !bg-zinc-800 !border-2 !border-orange-500/80 hover:!bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity z-10";
  
  return (
    <>
      <Handle type="source" position={Position.Top} id="t-l" style={{ left: '25%' }} className={commonClasses} />
      <Handle type="source" position={Position.Top} id="t-c" style={{ left: '50%' }} className={commonClasses} />
      <Handle type="source" position={Position.Top} id="t-r" style={{ left: '75%' }} className={commonClasses} />

      <Handle type="source" position={Position.Bottom} id="b-l" style={{ left: '25%' }} className={commonClasses} />
      <Handle type="source" position={Position.Bottom} id="b-c" style={{ left: '50%' }} className={commonClasses} />
      <Handle type="source" position={Position.Bottom} id="b-r" style={{ left: '75%' }} className={commonClasses} />

      <Handle type="source" position={Position.Left} id="l-t" style={{ top: '25%' }} className={commonClasses} />
      <Handle type="source" position={Position.Left} id="l-c" style={{ top: '50%' }} className={commonClasses} />
      <Handle type="source" position={Position.Left} id="l-b" style={{ top: '75%' }} className={commonClasses} />

      <Handle type="source" position={Position.Right} id="r-t" style={{ top: '25%' }} className={commonClasses} />
      <Handle type="source" position={Position.Right} id="r-c" style={{ top: '50%' }} className={commonClasses} />
      <Handle type="source" position={Position.Right} id="r-b" style={{ top: '75%' }} className={commonClasses} />
    </>
  );
}
