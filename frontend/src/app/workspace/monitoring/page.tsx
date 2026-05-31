"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  History, 
  Database, 
  Cpu, 
  Clock, 
  RefreshCw, 
  Search, 
  ChevronRight,
  TrendingUp,
  FileText,
  User,
  Wrench,
  Shield,
  EyeOff,
  Code,
  MessagesSquare
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  Handle,
  Position,
  Panel
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

import { fetch as fetchWithAuth } from "@/core/api/fetcher";

// --- API Helpers ---
const fetchThreads = async () => {
  const res = await fetchWithAuth("/api/threads/all");
  return res.json();
};

const fetchThreadState = async (id: string) => {
  const res = await fetchWithAuth(`/api/threads/${id}/state`);
  return res.json();
};

const fetchThreadUsage = async (id: string) => {
  const res = await fetchWithAuth(`/api/threads/${id}/token-usage`);
  return res.json();
};

const fetchThreadHistory = async (id: string) => {
  const res = await fetchWithAuth(`/api/threads/${id}/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 50 })
  });
  return res.json();
};

// --- Components ---

const JsonTree = ({ data }: { data: any }) => (
  <pre className="text-[11px] font-mono bg-slate-950 p-4 rounded-xl overflow-auto max-h-[600px] text-emerald-400/90 border border-slate-800 shadow-2xl leading-relaxed">
    {JSON.stringify(data, null, 2)}
  </pre>
);

// --- Custom Graph Nodes ---

const AgentNode = ({ data }: any) => (
  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-[300px] shadow-2xl relative overflow-hidden group">
    <Handle type="target" position={Position.Top} className="!bg-slate-600 !border-none" />
    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
        <Cpu size={18} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logic Node</p>
        <p className="text-sm font-bold text-white uppercase tracking-tight">{data.label}</p>
      </div>
    </div>
    <div className="space-y-2">
      <div className="bg-black/40 rounded-xl p-2 border border-slate-800">
        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Packet ID</p>
        <p className="text-[9px] font-mono text-blue-400/80 truncate">{data.id}</p>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !border-none shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
  </div>
);

const ToolNode = ({ data }: any) => (
  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-[280px] shadow-2xl relative overflow-hidden group">
    <Handle type="target" position={Position.Top} className="!bg-slate-600 !border-none" />
    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50" />
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
        <Wrench size={18} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tool Execution</p>
        <p className="text-sm font-bold text-white uppercase tracking-tight">{data.label}</p>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !border-none shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
  </div>
);

const TerminalNode = ({ data }: any) => (
  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-[200px] shadow-2xl relative overflow-hidden text-center group">
    <Handle type="target" position={Position.Top} className="!bg-slate-600 !border-none" />
    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50" />
    <div className="flex flex-col items-center gap-2">
      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full group-hover:scale-110 transition-transform">
        <Shield size={20} />
      </div>
      <p className="text-xs font-black text-white uppercase tracking-widest">TERMINAL</p>
    </div>
  </div>
);

const UserNode = ({ data }: any) => (
  <div className="bg-slate-900 border border-emerald-700/50 rounded-2xl p-4 w-[250px] shadow-2xl relative overflow-hidden group">
    <Handle type="target" position={Position.Left} className="!bg-slate-600 !border-none" />
    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
        <User size={18} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">User Input</p>
        <p className="text-xs font-bold text-white line-clamp-1">{data.label}</p>
      </div>
    </div>
    <Handle type="source" position={Position.Right} className="!bg-emerald-500 !border-none shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
  </div>
);

const ResultNode = ({ data }: any) => (
  <div className="bg-slate-900 border border-blue-700/50 rounded-2xl p-4 w-[250px] shadow-2xl relative overflow-hidden group">
    <Handle type="target" position={Position.Left} className="!bg-slate-600 !border-none" />
    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
        <Code size={18} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tool Result</p>
        <p className="text-xs font-bold text-white line-clamp-1">Data Returned</p>
      </div>
    </div>
    <Handle type="source" position={Position.Right} className="!bg-blue-500 !border-none" />
  </div>
);

const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  terminal: TerminalNode,
  user: UserNode,
  result: ResultNode
};

const TraceVisualizer = ({ messages }: { messages: any[] }) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 100 });

  const nodes: any[] = [];
  const edges: any[] = [];

  const safeMessages = Array.isArray(messages) ? messages : [];

  // Group to handle tool call/result pairs
  const toolCallNodes = new Map<string, string>(); // tool_call_id -> node_id

  safeMessages.forEach((m, i) => {
    const type = m.type || m.role || 'unknown';
    const nodeId = m.id || `m-${i}`;
    const isAI = type === 'ai' || type === 'assistant';
    const isHuman = type === 'human' || type === 'user';
    const isTool = type === 'tool';
    
    let label = '';
    if (typeof m.content === 'string') {
      label = m.content.slice(0, 50) + (m.content.length > 50 ? '...' : '');
    } else if (Array.isArray(m.content)) {
      label = m.content.map((c: any) => c.text || '').join(' ').slice(0, 50) + '...';
    }

    if (isHuman) {
      nodes.push({
        id: nodeId,
        type: 'user',
        data: { label: label || 'User Input', id: nodeId },
        position: { x: 0, y: 0 }
      });
    } else if (isAI) {
      nodes.push({
        id: nodeId,
        type: 'agent',
        data: { label: label || 'AI Reasoning', id: nodeId },
        position: { x: 0, y: 0 }
      });

      // Handle Tool Calls
      if (m.tool_calls?.length > 0) {
        m.tool_calls.forEach((tc: any, tcIdx: number) => {
          const tcNodeId = `tc-${nodeId}-${tcIdx}`;
          toolCallNodes.set(tc.id || tc.tool_call_id, tcNodeId);
          
          nodes.push({
            id: tcNodeId,
            type: 'tool',
            data: { label: tc.name, id: tcNodeId, args: tc.args },
            position: { x: 0, y: 0 }
          });
          
          edges.push({
            id: `e-${nodeId}-${tcNodeId}`,
            source: nodeId,
            target: tcNodeId,
            animated: true,
            style: { stroke: '#a855f7', strokeWidth: 2 }
          });
        });
      }
    } else if (isTool) {
      const tcNodeId = toolCallNodes.get(m.tool_call_id);
      nodes.push({
        id: nodeId,
        type: 'result',
        data: { label: 'Tool Result', id: nodeId, content: label },
        position: { x: 0, y: 0 }
      });

      if (tcNodeId) {
        edges.push({
          id: `e-${tcNodeId}-${nodeId}`,
          source: tcNodeId,
          target: nodeId,
          style: { stroke: '#6366f1', strokeWidth: 2 }
        });
      }
    }

    // Connect sequential messages (if not already connected by tool flow)
    if (i > 0) {
      const prevNodeId = safeMessages[i-1].id || `m-${i-1}`;
      
      // Don't draw sequential edge if previous was AI with tool calls and this is a tool result
      const wasAIWithTools = safeMessages[i-1].type === 'ai' && safeMessages[i-1].tool_calls?.length > 0;
      const isToolResult = type === 'tool';
      
      if (!(wasAIWithTools && isToolResult)) {
         // Special case: connect to tool results back to next AI reasoning
         if (safeMessages[i-1].type === 'tool') {
           edges.push({
             id: `e-seq-${prevNodeId}-${nodeId}`,
             source: prevNodeId,
             target: nodeId,
             style: { stroke: '#94a3b8', strokeDasharray: '5,5' }
           });
         } else {
           edges.push({
             id: `e-seq-${prevNodeId}-${nodeId}`,
             source: prevNodeId,
             target: nodeId,
             style: { stroke: '#94a3b8', strokeDasharray: '5,5' }
           });
         }
      }
    }
  });

  nodes.forEach((node) => {
    let w = 250;
    if (node.type === 'terminal') w = 150;
    dagreGraph.setNode(node.id, { width: w, height: 120 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: (nodeWithPosition?.x || 0) - 125,
        y: (nodeWithPosition?.y || 0) - 60,
      },
    };
  });

  const [flowNodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(edges);
  }, [messages]);

  return (
    <div className="h-[600px] w-full bg-slate-950/20 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-inner relative" style={{ height: '600px', minHeight: '600px' }}>
      <ReactFlow
        key={`trace-${layoutedNodes.length}`}
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode="dark"
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls />
        <Panel position="top-right" className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl backdrop-blur-xl text-[10px] font-black uppercase tracking-widest text-slate-500">
          Interaction Trace
        </Panel>
      </ReactFlow>
    </div>
  );
};

const MessageVisualizer = ({ messages }: { messages: any[] }) => {
  if (!Array.isArray(messages)) return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
      <EyeOff size={32} className="mb-2 opacity-20" />
      <p>No messages in current state</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {messages.map((m, idx) => {
        const type = m.type || m.role || 'unknown';
        const isAI = type === 'ai' || type === 'assistant';
        const isHuman = type === 'human' || type === 'user';
        const isTool = type === 'tool';
        const isSystem = type === 'system';
        const isHidden = m.additional_kwargs?.hide_from_ui;

        let content = '';
        if (typeof m.content === 'string') {
          content = m.content;
        } else if (Array.isArray(m.content)) {
          content = m.content.map((c: any) => c.text || (c.type === 'tool_use' ? `[Tool Use: ${c.name}]` : JSON.stringify(c))).join('\n');
        }

        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={m.id || idx} 
            className={`relative group border rounded-2xl overflow-hidden transition-all duration-300 ${
              isAI ? 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40' : 
              isHuman ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' : 
              isTool ? 'bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40' :
              'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`h-1 w-full ${
              isAI ? 'bg-blue-500/30' : 
              isHuman ? 'bg-emerald-500/30' : 
              isTool ? 'bg-purple-500/30' : 
              'bg-slate-700/30'
            }`} />

            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    isAI ? 'bg-blue-500/20 text-blue-400' : 
                    isHuman ? 'bg-emerald-500/20 text-emerald-400' : 
                    isTool ? 'bg-purple-500/20 text-purple-400' : 
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {isAI && <Cpu size={16} />}
                    {isHuman && <User size={16} />}
                    {isTool && <Wrench size={16} />}
                    {isSystem && <Shield size={16} />}
                  </div>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                      isAI ? 'text-blue-400' : isHuman ? 'text-emerald-400' : isTool ? 'text-purple-400' : 'text-slate-500'
                    }`}>
                      {type} {isHidden && <span className="ml-2 text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">INTERNAL</span>}
                    </span>
                    <p className="text-[9px] text-slate-600 font-mono mt-0.5">{m.id || `msg_${idx}`}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {m.additional_kwargs?.timestamp && (
                    <span className="text-[10px] text-slate-500 font-mono bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800">
                      {new Date(m.additional_kwargs.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              <div className={`text-sm leading-relaxed ${isHidden ? 'text-slate-500 italic font-mono text-xs' : 'text-slate-200'}`}>
                {content || <span className="opacity-30 italic">No content</span>}
              </div>

              {m.tool_calls?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {m.tool_calls.map((tc: any, i: number) => (
                    <div key={i} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench size={12} className="text-purple-400" />
                        <span className="text-xs font-bold text-purple-300">Tool Call: {tc.name}</span>
                      </div>
                      <pre className="text-[10px] text-purple-400/80 bg-black/40 p-2 rounded overflow-x-auto border border-purple-500/10">
                        {JSON.stringify(tc.args, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {(m.additional_kwargs?.run_id || m.response_metadata?.finish_reason) && (
                <div className="mt-4 pt-3 border-t border-slate-800/50 flex flex-wrap gap-2">
                   {m.additional_kwargs?.run_id && (
                     <span className="text-[9px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
                       RUN: {m.additional_kwargs.run_id.slice(0, 8)}...
                     </span>
                   )}
                   {m.response_metadata?.model_name && (
                     <span className="text-[9px] text-blue-500/70 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 font-mono">
                       MODEL: {m.response_metadata.model_name}
                     </span>
                   )}
                   {m.response_metadata?.finish_reason && (
                     <span className="text-[9px] text-amber-500/70 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 font-mono uppercase">
                       FINISH: {m.response_metadata.finish_reason}
                     </span>
                   )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 hover:border-slate-700 transition-colors shadow-lg">
    <div className={`p-3 rounded-xl bg-slate-800 text-white ${colorClass}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black">{title}</p>
      <p className="text-xl font-bold text-white tracking-tight">{value}</p>
    </div>
  </div>
);

const SwimlaneTimeline = ({ history }: { history: any[] }) => {
  const entries = useMemo(
    () => (Array.isArray(history) ? [...history].reverse() : []),
    [history],
  );

  const lanes = useMemo(() => {
    const laneMap = new Map<string, { index: number; entry: any }[]>();

    entries.forEach((entry, index) => {
      const source = entry.metadata?.source || "step";
      if (!laneMap.has(source)) {
        laneMap.set(source, []);
      }
      laneMap.get(source)?.push({ index, entry });
    });

    return Array.from(laneMap.entries()).map(([source, items]) => ({
      source,
      items,
      byIndex: new Map(items.map((item) => [item.index, item.entry])),
    }));
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="h-[360px] flex flex-col items-center justify-center bg-slate-950/20 border border-dashed border-slate-800 rounded-3xl text-slate-500">
        <History size={32} className="mb-4 opacity-20" />
        <p className="text-sm font-medium">No checkpoint history available</p>
      </div>
    );
  }

  const gridTemplateColumns = `repeat(${entries.length}, minmax(240px, 1fr))`;
  const minWidth = Math.max(entries.length * 260 + 180, 760);

  return (
    <div className="overflow-x-auto custom-scrollbar rounded-3xl border border-slate-800/50 bg-slate-950/30">
      <div className="p-4" style={{ minWidth }}>
        <div className="grid grid-cols-[160px_1fr] border-b border-slate-800/60 pb-3">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
            Lane
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns }}>
            {entries.map((entry, index) => (
              <div key={entry.checkpoint_id} className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                  Step {index + 1}
                </div>
                <div className="mt-1 truncate text-[10px] font-mono text-slate-500">
                  {entry.created_at ? new Date(entry.created_at).toLocaleTimeString() : "n/a"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-800/50">
          {lanes.map((lane) => (
            <div key={lane.source} className="grid grid-cols-[160px_1fr] py-4">
              <div className="pr-4">
                <div className="sticky left-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                      {lane.source}
                    </p>
                    <p className="mt-1 text-[9px] font-mono text-slate-600">
                      {lane.items.length} checkpoints
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns }}>
                {entries.map((entry, index) => {
                  const laneEntry = lane.byIndex.get(index);

                  if (!laneEntry) {
                    return (
                      <div
                        key={`${lane.source}-${entry.checkpoint_id}-empty`}
                        className="min-h-[118px] rounded-2xl border border-dashed border-slate-900/80 bg-black/10"
                      />
                    );
                  }

                  return (
                    <div
                      key={`${lane.source}-${laneEntry.checkpoint_id}`}
                      className="min-h-[118px] rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-lg transition-colors hover:border-purple-500/40"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black uppercase tracking-wider text-white">
                            {laneEntry.metadata?.source || "step"}
                          </p>
                          <p className="mt-1 truncate font-mono text-[9px] text-slate-600">
                            {laneEntry.checkpoint_id}
                          </p>
                        </div>
                        {laneEntry.next?.length > 0 ? (
                          <span className="shrink-0 rounded-lg border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-blue-400">
                            Transition
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-400">
                            Final
                          </span>
                        )}
                      </div>

                      <div className="mb-3 flex flex-wrap gap-2">
                        {laneEntry.next?.map((next: string) => (
                          <span
                            key={next}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-2 py-1 text-[9px] font-bold text-emerald-400/70"
                          >
                            <ChevronRight size={10} /> {next}
                          </span>
                        ))}
                      </div>

                      <details className="group/details">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400/70 transition-colors hover:text-emerald-400">
                          <FileText size={12} /> Inspect
                        </summary>
                        <div className="mt-4">
                          <JsonTree data={laneEntry.values} />
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function MonitoringDashboard() {
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const selectedThreadIdRef = React.useRef<string | null>(null);
  
  // Sync ref with state
  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  const [state, setState] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"state" | "history" | "metrics" | "trace">("state");
  const [stateViewMode, setStateViewMode] = useState<"visual" | "json">("visual");

  const refreshData = async () => {
    setLoading(true);
    try {
      const threadList = await fetchThreads();
      const threadsArray = Array.isArray(threadList) ? threadList : (threadList?.threads || []);
      setThreads(threadsArray);
      
      // Use ref to check current selection without stale closure
      if (!selectedThreadIdRef.current && threadsArray.length > 0) {
        setSelectedThreadId(threadsArray[0].thread_id);
      }
    } catch (e) {
      console.error("Failed to fetch threads:", e);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedThreadId) {
      const loadThreadDetails = async () => {
        try {
          const [s, u, h] = await Promise.all([
            fetchThreadState(selectedThreadId),
            fetchThreadUsage(selectedThreadId),
            fetchThreadHistory(selectedThreadId)
          ]);
          setState(s);
          setUsage(u);
          setHistory(Array.isArray(h) ? h : (h?.history || []));
        } catch (e) {
          console.error("Failed to load thread details:", e);
          setHistory([]);
        }
      };
      loadThreadDetails();
    }
  }, [selectedThreadId]);

  const usageData = useMemo(() => usage ? [
    { name: "Input", tokens: usage.total_input_tokens, color: "#3b82f6" },
    { name: "Output", tokens: usage.total_output_tokens, color: "#10b981" },
  ] : [], [usage]);

  return (
    <div className="min-h-screen bg-black text-slate-200 p-6 font-sans selection:bg-emerald-500/30">
      <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-5 rounded-3xl border border-slate-800/50 backdrop-blur-2xl sticky top-6 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Activity className="text-black" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-none tracking-tight">DEERFLOW MONITOR</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1.5 opacity-60">System Observability Node</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-full flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Engine</span>
          </div>
          <button 
            onClick={refreshData}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black transition-all px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            REFRESH
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <aside className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl overflow-hidden backdrop-blur-md">
            <div className="p-5 border-b border-slate-800/50 bg-slate-900/50 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Database size={14} className="text-emerald-400" />
                Channels
              </h2>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/20 font-black">
                {threads.length}
              </span>
            </div>
            <div className="max-h-[65vh] overflow-y-auto custom-scrollbar p-2 space-y-1">
              {threads.length === 0 && !loading && (
                <div className="p-8 text-center text-slate-600">
                  <p className="text-xs italic">No active threads</p>
                </div>
              )}
              {threads.map((t) => (
                <button
                  key={t.thread_id}
                  onClick={() => setSelectedThreadId(t.thread_id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group relative overflow-hidden ${
                    selectedThreadId === t.thread_id ? "bg-emerald-500/10 border border-emerald-500/20" : "hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <div className="min-w-0 flex-1 relative z-10">
                    <p className={`text-xs font-bold truncate mb-1.5 ${selectedThreadId === t.thread_id ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {t.values?.title || t.metadata?.title || "Untitled Workflow"}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'busy' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse' : 'bg-slate-700'}`}></div>
                      <p className="text-[9px] text-slate-500 font-mono truncate uppercase tracking-tighter opacity-70">
                        {t.thread_id.split('-')[0]}...{t.thread_id.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`text-slate-700 transition-transform group-hover:translate-x-1 ${selectedThreadId === t.thread_id ? "text-emerald-400" : ""}`} />
                  
                  {selectedThreadId === t.thread_id && (
                    <motion.div layoutId="active-thread" className="absolute inset-0 bg-emerald-500/5 z-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-9 space-y-8">
          {selectedThreadId ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                  title="Compute Cost" 
                  value={usage?.total_tokens?.toLocaleString() || 0} 
                  icon={Cpu} 
                  colorClass="!text-blue-400" 
                />
                <MetricCard 
                  title="Intelligence" 
                  value={usage?.total_output_tokens?.toLocaleString() || 0} 
                  icon={TrendingUp} 
                  colorClass="!text-emerald-400" 
                />
                <MetricCard 
                  title="Iterations" 
                  value={usage?.total_runs || 0} 
                  icon={RefreshCw} 
                  colorClass="!text-purple-400" 
                />
                <MetricCard 
                  title="Node Status" 
                  value={state?.status?.toUpperCase() || "IDLE"} 
                  icon={Clock} 
                  colorClass={state?.status === 'busy' ? "!text-amber-400" : "!text-slate-500"} 
                />
              </div>

              <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl overflow-hidden flex flex-col min-h-[700px] shadow-2xl backdrop-blur-md">
                <div className="flex border-b border-slate-800/50 bg-slate-900/50 p-3 gap-2">
                  <button 
                    onClick={() => setActiveTab("state")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'state' ? "bg-slate-800 text-white shadow-xl border border-slate-700" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}`}
                  >
                    <Activity size={14} /> LIVE STATE
                  </button>
                  <button 
                    onClick={() => setActiveTab("trace")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'trace' ? "bg-slate-800 text-white shadow-xl border border-slate-700" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}`}
                  >
                    <TrendingUp size={14} className="rotate-90" /> INTERACTION TRACE
                  </button>
                  <button 
                    onClick={() => setActiveTab("history")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'history' ? "bg-slate-800 text-white shadow-xl border border-slate-700" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}`}
                  >
                    <History size={14} /> TIMELINE
                  </button>
                  <button 
                    onClick={() => setActiveTab("metrics")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'metrics' ? "bg-slate-800 text-white shadow-xl border border-slate-700" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}`}
                  >
                    <TrendingUp size={14} /> TELEMETRY
                  </button>
                </div>

                <div className="p-8 flex-1 overflow-auto custom-scrollbar">
                  <AnimatePresence mode="wait">
                    {activeTab === "state" && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-8"
                      >
                        <div className="flex items-center justify-between bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                              <Activity size={20} className="text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-white uppercase tracking-wider">Graph Inspection</h3>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Real-time state channels</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                            <button 
                              onClick={() => setStateViewMode("visual")}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${stateViewMode === 'visual' ? 'bg-emerald-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              <Search size={12} /> VISUAL
                            </button>
                            <button 
                              onClick={() => setStateViewMode("json")}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${stateViewMode === 'json' ? 'bg-emerald-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              <Code size={12} /> RAW JSON
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/50 group hover:border-emerald-500/30 transition-colors">
                             <p className="text-[9px] text-slate-600 uppercase font-black mb-2 tracking-widest group-hover:text-emerald-400 transition-colors">Target Edge</p>
                             <p className="text-white font-mono text-sm flex items-center gap-2">
                               <ChevronRight size={14} className="text-emerald-500" />
                               {state?.next?.join(", ") || "Terminal State"}
                             </p>
                           </div>
                           <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/50 group hover:border-blue-500/30 transition-colors">
                             <p className="text-[9px] text-slate-600 uppercase font-black mb-2 tracking-widest group-hover:text-blue-400 transition-colors">Source Node</p>
                             <p className="text-white font-mono text-sm flex items-center gap-2">
                               <Cpu size={14} className="text-blue-500" />
                               {state?.metadata?.source || "Initial Root"}
                             </p>
                           </div>
                           <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/50 group hover:border-purple-500/30 transition-colors">
                             <p className="text-[9px] text-slate-600 uppercase font-black mb-2 tracking-widest group-hover:text-purple-400 transition-colors">Packet ID</p>
                             <p className="text-white font-mono text-[10px] truncate opacity-80">
                               {state?.checkpoint_id}
                             </p>
                           </div>
                        </div>

                        {stateViewMode === "visual" ? (
                          <div className="space-y-8">
                             {state?.values?.messages && (
                               <div className="space-y-4">
                                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 ml-1">
                                   <MessagesSquare size={12} className="text-emerald-500" />
                                   Message Stack
                                 </h4>
                                 <MessageVisualizer messages={state.values.messages} />
                               </div>
                             )}
                             
                             <div className="grid grid-cols-1 gap-6">
                               {Object.entries(state?.values || {}).filter(([k]) => k !== 'messages').map(([key, value]) => (
                                 <div key={key} className="space-y-3">
                                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 ml-1">
                                      <Code size={12} className="text-blue-400" />
                                      Channel: {key}
                                   </h4>
                                   <JsonTree data={value} />
                                 </div>
                               ))}
                             </div>
                          </div>
                        ) : (
                          <JsonTree data={state?.values || {}} />
                        )}
                      </motion.div>
                    )}

                    {activeTab === "trace" && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6 h-full"
                      >
                         <h3 className="text-sm font-black text-white flex items-center gap-3 uppercase tracking-wider">
                           <TrendingUp size={20} className="text-emerald-400 rotate-90" />
                           Interaction Logic Trace
                         </h3>
                         <TraceVisualizer messages={state?.values?.messages || []} />
                      </motion.div>
                    )}

                    {activeTab === "history" && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-8"
                      >
                        <h3 className="text-sm font-black text-white flex items-center gap-3 uppercase tracking-wider">
                          <History size={20} className="text-purple-400" />
                          Checkpoint Swimlane
                        </h3>
                        <SwimlaneTimeline history={history} />
                      </motion.div>
                    )}

                    {activeTab === "metrics" && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-8"
                      >
                        <h3 className="text-sm font-black text-white flex items-center gap-3 uppercase tracking-wider">
                          <TrendingUp size={20} className="text-blue-400" />
                          Compute Distribution
                        </h3>
                        
                        <div className="h-[350px] w-full bg-slate-950/40 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-sm shadow-inner" style={{ height: '350px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={usageData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}
                                itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                                cursor={{ fill: '#ffffff05' }}
                              />
                              <Bar dataKey="tokens" radius={[8, 8, 8, 8]} barSize={40}>
                                {usageData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                              <Cpu size={14} className="text-blue-400" /> Model Performance
                            </h4>
                            <div className="space-y-4">
                              {Object.entries(usage?.by_model || {}).map(([model, data]: [string, any]) => (
                                <div key={model} className="flex flex-col gap-2 p-3 rounded-2xl hover:bg-slate-900/50 transition-colors border border-transparent hover:border-slate-800">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-200 font-mono tracking-tighter">{model}</span>
                                    <span className="text-blue-400 font-black text-xs">{data.tokens.toLocaleString()} <span className="text-[9px] opacity-50 uppercase ml-0.5">Tokens</span></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-500/50" style={{ width: `${Math.min(100, (data.tokens / (usage.total_tokens || 1)) * 100)}%` }} />
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-bold">{data.runs} runs</span>
                                  </div>
                                </div>
                              ))}
                              {Object.keys(usage?.by_model || {}).length === 0 && (
                                <p className="text-xs italic text-slate-600 text-center py-4">No model telemetry available</p>
                              )}
                            </div>
                          </div>
                          <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                              <Activity size={14} className="text-emerald-400" /> Caller Allocation
                            </h4>
                            <div className="space-y-6">
                               {[
                                 { label: 'Lead Agent', val: usage?.by_caller?.lead_agent, color: 'bg-emerald-500' },
                                 { label: 'Subagents', val: usage?.by_caller?.subagent, color: 'bg-blue-500' },
                                 { label: 'Middleware', val: usage?.by_caller?.middleware, color: 'bg-purple-500' }
                               ].map((item) => (
                                 <div key={item.label} className="space-y-2">
                                   <div className="flex justify-between items-center text-[11px] font-bold">
                                     <span className="text-slate-400 uppercase tracking-widest">{item.label}</span>
                                     <span className="text-white font-mono">{item.val?.toLocaleString() || 0}</span>
                                   </div>
                                   <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                                      <div className={`h-full ${item.color} opacity-60`} style={{ width: `${Math.min(100, ((item.val || 0) / (usage.total_tokens || 1)) * 100)}%` }} />
                                   </div>
                                 </div>
                               ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[75vh] flex flex-col items-center justify-center text-center bg-slate-900/20 border-2 border-dashed border-slate-800/50 rounded-[3rem] p-12 backdrop-blur-sm group">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="bg-slate-800/50 p-8 rounded-full mb-8 relative shadow-2xl group-hover:bg-slate-800 transition-colors"
              >
                <Search size={64} className="text-slate-600 group-hover:text-emerald-500/50 transition-colors" />
                <div className="absolute inset-0 border-2 border-dashed border-emerald-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
              </motion.div>
              <h3 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Signal Lost</h3>
              <p className="text-slate-500 max-w-sm text-sm font-medium leading-relaxed">
                Connect to an active compute thread from the command console on the left to intercept real-time neural data.
              </p>
              <div className="mt-8 flex gap-3">
                 <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
                 <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
                 <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
              </div>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
