import api from '@/lib/api';

export interface EmployeeNode {
  id: number;
  name: string;
  employee_code: string;
  designation?: string;
  department?: string;
  position_level: string;
  position_label: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status: string;
  team_size: number;
  children: EmployeeNode[];
}

export interface HierarchyStats {
  total_employees: number;
  total_managers: number;
  total_team_leads: number;
  avg_team_size: number;
  orphan_employees: number;
}

export interface ReportingChainItem {
  id: number;
  name: string;
  designation?: string;
  position_level: string;
  position_label: string;
  level: number;
}

export interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  employee_code: string;
  phone?: string;
  designation?: { id: number; name: string };
  department?: { id: number; name: string };
  joining_date: string;
  status: string;
  position_level: string;
}

export interface TeamStats {
  total: number;
  active: number;
  onLeave: number;
}

export const hierarchyService = {
  /**
   * Get organization tree (Admin/HR only)
   * Returns hierarchical structure of all employees
   */
  getOrgTree: async () => {
    try {
      const response = await api.get('/hierarchy/org-tree');
      return {
        success: true,
        data: response.data?.data || [],
        stats: response.data?.stats || {
          total_employees: 0,
          total_managers: 0,
          total_team_leads: 0,
          avg_team_size: 0,
          orphan_employees: 0,
        },
      };
    } catch (error: any) {
      console.error('Error fetching org tree:', error);
      return {
        success: false,
        data: [],
        stats: {
          total_employees: 0,
          total_managers: 0,
          total_team_leads: 0,
          avg_team_size: 0,
          orphan_employees: 0,
        },
        error: error?.response?.data?.message || 'Failed to load organization chart',
      };
    }
  },

  /**
   * Get my team members (for managers/team leads)
   * Returns all employees who report to current user
   */
  getMyTeam: async () => {
    try {
      const response = await api.get('/hierarchy/my-team');
      return {
        success: true,
        data: response.data?.data || [],
        stats: response.data?.stats || { total: 0, active: 0, onLeave: 0 },
      };
    } catch (error: any) {
      // Gracefully handle 404 (no employee profile linked) without console pollution
      if (error?.response?.status === 404) {
        return {
          success: true,
          data: [],
          stats: { total: 0, active: 0, onLeave: 0 },
        };
      }
      console.error('Error fetching my team:', error);
      return {
        success: false,
        data: [],
        stats: { total: 0, active: 0, onLeave: 0 },
        error: error?.response?.data?.message || 'Failed to load team members',
      };
    }
  },

  /**
   * Get my reporting chain (who I report to)
   * Returns list of managers above current user
   */
  getMyReportingChain: async () => {
    try {
      const response = await api.get('/hierarchy/my-chain');
      return {
        success: true,
        data: response.data?.data || [],
        current: response.data?.current || null,
      };
    } catch (error: any) {
      // Return empty data for 404 (no reporting chain) without console pollution
      if (error?.response?.status === 404) {
        return {
          success: true,
          data: [],
          current: null,
        };
      }
      console.error('Error fetching reporting chain:', error);
      return {
        success: false,
        data: [],
        current: null,
        error: error?.response?.data?.message || 'Failed to load reporting chain',
      };
    }
  },

  /**
   * Get direct reports for a specific employee
   */
  getDirectReports: async (employeeId: number) => {
    try {
      const response = await api.get(`/hierarchy/employees/${employeeId}/direct-reports`);
      return {
        success: true,
        data: response.data?.data || [],
      };
    } catch (error: any) {
      console.error('Error fetching direct reports:', error);
      return {
        success: false,
        data: [],
        error: error?.response?.data?.message || 'Failed to load direct reports',
      };
    }
  },

  /**
   * Update reporting structure (Admin/HR only)
   */
  updateReporting: async (employeeId: number, data: { reporting_to?: number; position_level: string; hierarchy_level: number }) => {
    try {
      const response = await api.put(`/hierarchy/employees/${employeeId}/reporting`, data);
      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message || 'Reporting structure updated successfully',
      };
    } catch (error: any) {
      console.error('Error updating reporting:', error);
      return {
        success: false,
        error: error?.response?.data?.message || 'Failed to update reporting structure',
      };
    }
  },

  /**
   * Get potential managers for dropdown (Admin/HR only)
   */
  getPotentialManagers: async () => {
    try {
      const response = await api.get('/hierarchy/potential-managers');
      return {
        success: true,
        data: response.data?.data || [],
      };
    } catch (error: any) {
      console.error('Error fetching potential managers:', error);
      return {
        success: false,
        data: [],
        error: error?.response?.data?.message || 'Failed to load potential managers',
      };
    }
  },

  /**
   * Get peers (employees with same manager)
   */
  getMyPeers: async () => {
    try {
      const response = await api.get('/hierarchy/my-peers');
      return {
        success: true,
        data: response.data?.data || [],
      };
    } catch (error: any) {
      console.error('Error fetching peers:', error);
      return {
        success: false,
        data: [],
        error: error?.response?.data?.message || 'Failed to load peers',
      };
    }
  },

  /**
   * Search employees within hierarchy (managers see only their team)
   */
  searchTeam: async (params: { search?: string; department_id?: number; position_level?: string; per_page?: number }) => {
    try {
      const response = await api.get('/hierarchy/search', { params });
      return {
        success: true,
        data: response.data?.data || [],
        meta: response.data?.meta,
      };
    } catch (error: any) {
      console.error('Error searching team:', error);
      return {
        success: false,
        data: [],
        error: error?.response?.data?.message || 'Failed to search team members',
      };
    }
  },

  /**
   * Get department hierarchy
   */
  getDepartmentHierarchy: async (departmentId: number) => {
    try {
      const response = await api.get(`/hierarchy/department/${departmentId}/hierarchy`);
      return {
        success: true,
        data: response.data?.data || [],
      };
    } catch (error: any) {
      console.error('Error fetching department hierarchy:', error);
      return {
        success: false,
        data: [],
        error: error?.response?.data?.message || 'Failed to load department hierarchy',
      };
    }
  },
};

// Helper function to flatten hierarchy (useful for search results)
export const flattenHierarchy = (nodes: EmployeeNode[]): EmployeeNode[] => {
  let result: EmployeeNode[] = [];
  nodes.forEach(node => {
    result.push(node);
    if (node.children && node.children.length) {
      result = result.concat(flattenHierarchy(node.children));
    }
  });
  return result;
};

// Helper function to find employee by ID in hierarchy
export const findEmployeeInHierarchy = (nodes: EmployeeNode[], id: number): EmployeeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children && node.children.length) {
      const found = findEmployeeInHierarchy(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper function to get position badge color
export const getPositionBadgeColor = (positionLevel: string): string => {
  const colors: Record<string, string> = {
    c_level: 'bg-purple-100 text-purple-700',
    vp: 'bg-indigo-100 text-indigo-700',
    director: 'bg-blue-100 text-blue-700',
    senior_manager: 'bg-cyan-100 text-cyan-700',
    manager: 'bg-emerald-100 text-emerald-700',
    team_lead: 'bg-amber-100 text-amber-700',
    staff: 'bg-slate-100 text-slate-600',
    intern: 'bg-slate-50 text-slate-400',
  };
  return colors[positionLevel] || colors.staff;
};

// Helper function to get position label
export const getPositionLabel = (positionLevel: string): string => {
  const labels: Record<string, string> = {
    c_level: 'C-Level Executive',
    vp: 'Vice President',
    director: 'Director',
    senior_manager: 'Senior Manager',
    manager: 'Manager',
    team_lead: 'Team Lead',
    staff: 'Staff',
    intern: 'Intern',
  };
  return labels[positionLevel] || 'Staff';
};

// Helper function to get position icon
export const getPositionIcon = (positionLevel: string): string => {
  const icons: Record<string, string> = {
    c_level: 'Crown',
    vp: 'Star',
    director: 'Award',
    senior_manager: 'Briefcase',
    manager: 'Briefcase',
    team_lead: 'Users',
    staff: 'User',
    intern: 'User',
  };
  return icons[positionLevel] || 'User';
};