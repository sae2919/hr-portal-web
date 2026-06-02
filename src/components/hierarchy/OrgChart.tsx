'use client';

import { useState, useEffect } from 'react';
import { hierarchyService, EmployeeNode, HierarchyStats } from '@/services/hierarchyService';
import { 
  Users, ChevronDown, ChevronRight, Briefcase, Building2, 
  Search, X, User, Crown, Star, Award, Mail, Phone, Network,
  UserCircle, UserPlus, Edit, Save, XCircle, Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const positionConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  c_level: { label: 'C-Level', icon: Crown, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  vp: { label: 'VP', icon: Star, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  director: { label: 'Director', icon: Award, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  senior_manager: { label: 'Sr. Manager', icon: Briefcase, color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  manager: { label: 'Manager', icon: Briefcase, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  team_lead: { label: 'Team Lead', icon: Users, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  staff: { label: 'Staff', icon: User, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  intern: { label: 'Intern', icon: User, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
};

interface OrgChartProps {
  isEditable?: boolean;
}

export default function OrgChart({ isEditable = false }: OrgChartProps) {
  const [orgTree, setOrgTree] = useState<EmployeeNode[]>([]);
  const [stats, setStats] = useState<HierarchyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'cards'>('tree');

  useEffect(() => {
    const fetchOrgTree = async () => {
      try {
        const res = await hierarchyService.getOrgTree();
        if (res.success) {
          setOrgTree(res.data);
          setStats(res.stats);
          // Auto-expand first level
          const topIds = new Set<number>(res.data?.map((e: EmployeeNode) => e.id) || []);
          setExpandedNodes(topIds);
        } else {
          toast.error(res.error || 'Failed to load organization chart');
        }
      } catch (error) {
        console.error('Failed to fetch org tree:', error);
        toast.error('Failed to load organization chart');
      } finally {
        setLoading(false);
      }
    };
    fetchOrgTree();
  }, []);

  const toggleNode = (id: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = new Set<number>();
    const collectIds = (nodes: EmployeeNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.id);
        if (node.children && node.children.length) collectIds(node.children);
      });
    };
    collectIds(orgTree);
    setExpandedNodes(allIds);
    toast.success('All nodes expanded');
  };

  const collapseAll = () => {
    const topIds = new Set(orgTree.map(e => e.id));
    setExpandedNodes(topIds);
    toast.success('Collapsed to top level');
  };

  const filterTree = (nodes: EmployeeNode[]): EmployeeNode[] => {
    return nodes.filter(node => {
      // Always remove inactive employees
      if (node.status !== 'active') return false;

      if (searchTerm) {
        const matches = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       node.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       node.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       node.employee_code.toLowerCase().includes(searchTerm.toLowerCase());

        if (matches) return true;
        if (node.children && node.children.length) {
          const filteredChildren = filterTree(node.children);
          if (filteredChildren.length) {
            node.children = filteredChildren;
            return true;
          }
        }
        return false;
      }

      return true;
    }).map(node => ({
      ...node,
      children: node.children ? filterTree(node.children) : node.children
    }));
  };

  const filteredTree = filterTree([...orgTree]);

  const renderNode = (employee: EmployeeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(employee.id);
    const hasChildren = employee.children && employee.children.length > 0;
    const config = positionConfig[employee.position_level] || positionConfig.staff;
    const Icon = config.icon;

    return (
      <div key={employee.id} className="relative">
        <div 
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
            level === 0 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-white border-slate-200'
          } ${selectedEmployee?.id === employee.id ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
          style={{ marginLeft: `${level * 32}px` }}
          onClick={() => setSelectedEmployee(employee)}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleNode(employee.id); }}
            className={`w-6 h-6 flex items-center justify-center rounded-lg transition ${hasChildren ? 'hover:bg-slate-200' : 'invisible'}`}
          >
            {hasChildren && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>

          {/* Employee Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800">{employee.name}</p>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${config.bg} ${config.color}`}>
                <Icon size={10} />
                {employee.designation || config.label}
              </span>
              <Badge className={`text-xs ${employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border-0`}>
                {employee.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 size={12} />
                {employee.department || 'N/A'}
              </span>
              <span className="font-mono text-slate-400">{employee.employee_code}</span>
            </div>
          </div>

          {/* Stats */}
          {hasChildren && (
            <div className="text-right flex-shrink-0">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users size={12} />
                {employee.children.length} {employee.children.length === 1 ? 'report' : 'reports'}
              </span>
            </div>
          )}

          {/* Edit indicator for editable mode */}
          {isEditable && (
            <div className="text-right flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); /* Open edit modal */ }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition"
                title="Edit reporting structure"
              >
                <Edit size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-8 border-l-2 border-slate-200 pl-4 mt-2">
            {employee.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Network size={20} className="text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-800">Organization Structure</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 text-sm rounded-md transition ${viewMode === 'tree' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
            >
              Tree View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm rounded-md transition ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
            >
              Cards View
            </button>
          </div>
          <Button onClick={expandAll} variant="outline" size="sm">Expand All</Button>
          <Button onClick={collapseAll} variant="outline" size="sm">Collapse All</Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400">Total Employees</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total_employees}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400">Managers</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total_managers}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400">Team Leads</p>
            <p className="text-2xl font-bold text-amber-600">{stats.total_team_leads}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400">Avg Team Size</p>
            <p className="text-2xl font-bold text-green-600">{stats.avg_team_size}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400">Top Level</p>
            <p className="text-2xl font-bold text-purple-600">{stats.orphan_employees}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by name, designation, department, or employee code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Main Content */}
      {orgTree.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <Network size={48} className="mx-auto text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-amber-800 mb-2">No Hierarchy Structure Found</h3>
          <p className="text-amber-700 mb-4">
            The organization chart is empty because no reporting relationships have been set up yet.
          </p>
          {isEditable && (
            <div className="bg-white rounded-xl p-4 text-left max-w-md mx-auto">
              <p className="text-sm font-semibold text-slate-700 mb-2">To set up hierarchy:</p>
              <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Go to <strong>Employees</strong> page</li>
                <li>Edit each employee and set their <strong>Reporting To</strong> field</li>
                <li>Set their <strong>Position Level</strong> (Manager, Team Lead, Staff, etc.)</li>
                <li>Save the employee record</li>
              </ol>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {viewMode === 'tree' ? (
            <div className="p-6">
              {filteredTree.length === 0 ? (
                <div className="text-center py-16">
                  <Network size={64} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-400">No matching employees found</p>
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="text-blue-600 text-sm mt-2">
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredTree.map(root => renderNode(root))
              )}
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderCards(filteredTree)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Card View Render function
function renderCards(employees: EmployeeNode[]) {
  const flattenTree = (nodes: EmployeeNode[]): EmployeeNode[] => {
    let result: EmployeeNode[] = [];
    nodes.forEach(node => {
      result.push(node);
      if (node.children && node.children.length) {
        result = result.concat(flattenTree(node.children));
      }
    });
    return result;
  };

  const allEmployees = flattenTree(employees);

  return allEmployees.map((employee) => {
    const config = positionConfig[employee.position_level] || positionConfig.staff;
    const Icon = config.icon;
    
    return (
      <div
        key={employee.id}
        className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{employee.name}</p>
            <p className="text-xs text-slate-400">{employee.employee_code}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${config.bg} ${config.color}`}>
                <Icon size={10} />
                {employee.designation || config.label}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              <p className="flex items-center gap-1">
                <Building2 size={12} /> {employee.department || 'N/A'}
              </p>
            </div>
          </div>
        </div>
        {employee.team_size > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
            <Users size={12} className="inline mr-1" />
            Manages {employee.team_size} {employee.team_size === 1 ? 'person' : 'people'}
          </div>
        )}
      </div>
    );
  });
}