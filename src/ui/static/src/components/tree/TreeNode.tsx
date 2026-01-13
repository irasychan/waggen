import { useState } from 'react';
import { ChevronRight, ChevronDown, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { D3TreeNode } from '@/types';

interface TreeNodeProps {
  node: D3TreeNode;
  onSelect: (stateId: string) => void;
  depth: number;
}

export function TreeNode({ node, onSelect, depth }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleClick = () => {
    onSelect(node.id);
  };


  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-accent/50 text-sm',
          node.isCurrent && 'bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]',
          node.isEntry && !node.isCurrent && 'text-[hsl(var(--success))]'
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-accent rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <Circle className="h-2 w-2 mx-1 opacity-30" />
        )}
        <span className="truncate" title={node.state.description}>
          {node.id.slice(0, 12)}
        </span>
        {node.isEntry && (
          <span className="text-xs text-[hsl(var(--success))] ml-1">(entry)</span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
