'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEmployees, useDeleteEmployee } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { Employee } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Department } from '@/types/department';
import { 
  Plus, Search, Pencil, Trash2, Loader2, Users, 
  Eye, Mail, AlertTriangle, X 
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// ── Constant Styling Configurations ──────────────────────────────
const PAGE_SIZE = 10;

const avatarColors = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-rose-500',
];

const statusColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200 shadow-none font-normal rounded-md',
  inactive: 'bg-slate-50 text-slate-600 border-slate-200 shadow-none font-normal rounded-md',
  terminated: 'bg-red-50 text-red-700 border-red-200 shadow-none font-normal rounded-md',
};

const empTypeLabels: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  intern: 'Intern',
};

// ── Helper String Handlers ────────────────────────────────────────
const getInitials = (name?: string) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// ── Working Inline DeleteModal Component ──────────────────────────
function DeleteModal({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const { mutate: deleteEmployee, isPending } = useDeleteEmployee();

  if (!employee) return null;

  const handleConfirmDelete = () => {
    deleteEmployee(employee.id, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5 border border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 text-red-600">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-800">Delete Employee Record</h3>
            <p className="text-sm text-slate-400 mt-1">
              Are you sure you want to remove <span className="font-medium text-slate-700">{employee.full_name}</span>? This structural change cannot be undone.
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending} className="h-9 px-4">
            Cancel
          </Button>
          <Button size="sm" disabled={isPending} onClick={handleConfirmDelete} className="h-9 bg-red-600 hover:bg-red-500 text-white px-4 gap-1.5">
            {isPending && <Loader2 size={14} className="animate-spin" />} Confirm Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page View Component ─────────────────────────────────────
export default function EmployeesPage() {
  const [search, setSearch]             = useState('');
  const [filterDept, setFilterDept]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteEmp, setDeleteEmp]       = useState<Employee | null>(null);
  const [mounted, setMounted]           = useState(false);
  const [page, setPage]                 = useState(1);
  const { hasPermission }               = useAuthStore();

  useEffect(() => setMounted(true), []);

  // Reset pagination back to page 1 whenever search criteria adjust
  useEffect(() => { setPage(1); }, [search, filterDept, filterStatus]);

  const { data: employees = [], isLoading } = useEmployees({
    search,
    department_id: filterDept ? Number(filterDept) : undefined,
    status: filterStatus || undefined,
  });

  const { data: departmentsResponse } = useDepartments();
  const departments = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];

  const canCreate = mounted && hasPermission('create employees');
  const canEdit   = mounted && hasPermission('edit employees');
  const canDelete = mounted && hasPermission('delete employees');

  // ── Client Pagination Calculations ──────────────────────────────
  const totalPages   = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
  const safePage     = Math.min(page, totalPages);
  const paginated    = employees.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const fromIndex = employees.length > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const toIndex = Math.min(safePage * PAGE_SIZE, employees.length);

  return (
    <div className="space-y-5">

      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Employees</h2>
          <p className="text-sm text-slate-400">
            {employees.length} employee{employees.length !== 1 ? 's' : ''} total
          </p>
        </div>
        {canCreate && (
          <Link
            href="/employees/create"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Employee
          </Link>
        )}
      </div>

      {/* Dynamic Filters Bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 w-64 bg-white"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-700 font-medium"
        >
          <option value="">All Departments</option>
         {departments.map((d: Department) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-700 font-medium"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {/* Table Data Matrix */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 select-none">
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Employee</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Code</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Department</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Designation</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Type</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Status</th>
              <th className="text-right px-5 py-3.5 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Users className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm">No employees found</p>
                  {canCreate && (
                    <Link href="/employees/create" className="inline-flex items-center mt-3 text-sm text-blue-600 hover:underline">
                      Add first employee
                    </Link>
                  )}
                </td>
              </tr>
            ) : (
              paginated.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 ${avatarColors[idx % avatarColors.length]} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white text-xs font-semibold">
                          {getInitials(emp.full_name)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{emp.full_name}</p>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Mail size={10} />{emp.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      {emp.employee_code}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-sm">
                    {emp.department?.name ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-sm">
                    {emp.designation?.title ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {empTypeLabels[emp.employment_type] ?? emp.employment_type}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="outline" className={statusColors[emp.status]}>
                      {emp.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Eye size={14} />
                      </Link>
                      {canEdit && (
                        <Link
                          href={`/employees/${emp.id}/edit`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </Link>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteEmp(emp)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── UNIFIED RECRUITMENT STYLE PAGINATION FOOTER ── */}
        {!isLoading && employees.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 select-none">
            <p className="text-xs text-slate-400">
              Showing <span className="font-medium text-slate-600">{fromIndex}–{toIndex}</span> of <span className="font-medium text-slate-600">{employees.length}</span> pipeline files
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="h-8 text-xs font-normal px-3 border-slate-200 rounded-lg disabled:opacity-40 shadow-none"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="h-8 text-xs font-normal px-3 border-slate-200 rounded-lg disabled:opacity-40 shadow-none"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <DeleteModal employee={deleteEmp} onClose={() => setDeleteEmp(null)} />
    </div>
  );
}