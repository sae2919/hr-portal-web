'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useEmployees, useEmployee } from '@/hooks/useEmployees';
import { useDesignations } from '@/hooks/useDesignations';
import { salaryRevisionService, SalaryRevision } from '@/services/salaryRevisionService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { 
  TrendingUp, Plus, Search, Loader2, Download, Calendar, 
  ChevronRight, ArrowRight, DollarSign, Award, X, Sparkles, User
} from 'lucide-react';
import { toast } from 'sonner';

export default function SalaryRevisionsPage() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [revisions, setRevisions] = useState<SalaryRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [newBasic, setNewBasic] = useState('');
  const [newHra, setNewHra] = useState('');
  const [newAllowances, setNewAllowances] = useState('');
  const [newBonus, setNewBonus] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('Annual Appraisal');
  const [submitPending, setSubmitPending] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  
  // HRA percentage & Promotion designation states
  const [hraPercentage, setHraPercentage] = useState('');
  const [newDesignationId, setNewDesignationId] = useState('');

  // Load active employees for admin dropdown
  const { data: employees = [] } = useEmployees();
  
  // Load designations for promotion dropdown
  const { data: designationsRes } = useDesignations({ per_page: 500 });
  const designations = designationsRes?.data || [];

  // Load current user's employee details if they are a regular employee
  const myEmployeeId = user?.employee_id;
  const { data: myEmployeeDetails } = useEmployee(myEmployeeId || 0);

  // Role Checks
  const isAdmin = mounted && (
    user?.role === 'super_admin' || 
    user?.role === 'admin' || 
    user?.role === 'hr' ||
    hasPermission('manage salary revisions')
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchRevisions();
    }
  }, [mounted, page]);

  const fetchRevisions = async () => {
    setLoading(true);
    try {
      const res = await salaryRevisionService.getRevisions({
        page,
        per_page: 10,
      });
      if (res && res.data) {
        setRevisions(res.data);
        setMeta(res);
      }
    } catch (err) {
      console.error('Failed to load salary revisions:', err);
      toast.error('Failed to load appraisals history');
    } finally {
      setLoading(false);
    }
  };

  // Find selected employee to extract their current active salary
  const selectedEmployee = employees.find(e => e.id === Number(selectedEmpId));
  
  const currentBasic = selectedEmployee ? Number(selectedEmployee.basic_salary || 0) : 0;
  const currentHra = selectedEmployee ? Number(selectedEmployee.hra || 0) : 0;
  // total_allowances is the helper returned by resource
  const currentAllowances = selectedEmployee ? Number(selectedEmployee.total_allowances || selectedEmployee.allowances || 0) : 0;
  const currentBonus = selectedEmployee ? Number(selectedEmployee.bonus || 0) : 0;
  const currentGross = currentBasic + currentHra + currentAllowances + currentBonus;

  const revisedBasic = Number(newBasic) || 0;
  const revisedHra = Number(newHra) || 0;
  const revisedAllowances = Number(newAllowances) || 0;
  const revisedBonus = Number(newBonus) || 0;
  const revisedGross = revisedBasic + revisedHra + revisedAllowances + revisedBonus;

  // Real-time calculation of percentage increase
  const grossDiff = revisedGross - currentGross;
  const incrementPercent = currentGross > 0 ? ((grossDiff / currentGross) * 100).toFixed(1) : '0';

  const handleOpenAddModal = () => {
    setSelectedEmpId('');
    setNewBasic('');
    setNewHra('');
    setHraPercentage('');
    setNewDesignationId('');
    setNewAllowances('');
    setNewBonus('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setReason('Annual Appraisal');
    setModalOpen(true);
  };

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find(e => e.id === Number(empId));
    if (emp) {
      // Auto fill new fields with current values as a starting base
      const basicVal = Number(emp.basic_salary || 0);
      const hraVal = Number(emp.hra || 0);
      setNewBasic(String(emp.basic_salary || ''));
      setNewHra(String(emp.hra || ''));
      setNewAllowances(String(emp.total_allowances || emp.allowances || ''));
      setNewBonus(String(emp.bonus || ''));
      setNewDesignationId(String(emp.designation_id || ''));
      
      const percentage = basicVal > 0 ? Math.round((hraVal / basicVal) * 100) : 0;
      setHraPercentage(String(percentage));
    }
  };

  const handleBasicChange = (val: string) => {
    setNewBasic(val);
    const basicVal = Number(val) || 0;
    const percentVal = Number(hraPercentage) || 0;
    if (percentVal > 0) {
      setNewHra(String(Math.round((basicVal * percentVal) / 100)));
    }
  };

  const handleHraPercentageChange = (val: string) => {
    setHraPercentage(val);
    const percentVal = Number(val) || 0;
    const basicVal = Number(newBasic) || 0;
    setNewHra(String(Math.round((basicVal * percentVal) / 100)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      toast.error('Select an employee');
      return;
    }
    if (!newBasic || !effectiveDate || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (reason === 'Promotion' && !newDesignationId) {
      toast.error('Please select a target designation for the promotion');
      return;
    }

    setSubmitPending(true);
    try {
      await salaryRevisionService.createRevision({
        employee_id: Number(selectedEmpId),
        new_basic_salary: Number(newBasic),
        new_hra: Number(newHra),
        new_allowances: Number(newAllowances),
        new_bonus: Number(newBonus),
        effective_date: effectiveDate,
        reason,
        ...(reason === 'Promotion' && newDesignationId ? { new_designation_id: Number(newDesignationId) } : {}),
      });
      toast.success('Appraisal revision submitted and activated!');
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      fetchRevisions();
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to revise salary structure');
    } finally {
      setSubmitPending(false);
    }
  };

  const handleDownload = async (rev: SalaryRevision) => {
    setDownloadingId(rev.id);
    try {
      const code = rev.employee?.employee_code || 'EMP';
      const dateStr = rev.effective_date ? rev.effective_date.slice(0, 10) : 'date';
      await salaryRevisionService.downloadRevisionPdf(rev.id, code, dateStr);
      toast.success('Salary revision letter downloaded');
    } catch (err) {
      console.error('Failed to download salary revision PDF:', err);
      toast.error('Failed to generate PDF letter');
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter revisions by employee name/code
  const filteredRevisions = revisions.filter(r => {
    if (!searchTerm) return true;
    const name = r.employee ? `${r.employee.first_name} ${r.employee.last_name}`.toLowerCase() : '';
    const code = r.employee?.employee_code?.toLowerCase() || '';
    return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
  });

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Employee-only Personal view
  const personalRevisions = revisions.filter(r => r.employee_id === myEmployeeId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 id="appraisals-title" className="text-2xl font-bold text-slate-800">Appraisals & Salary Revisions</h1>
          <p className="text-sm text-slate-400">
            {isAdmin 
              ? 'Manage salary increments, performance appraisals, and official salary letters.' 
              : 'Track your salary history, appraisal cycles, and download revision letters.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenAddModal} className="bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-sm rounded-xl">
            <Plus size={16} /> Revise Salary
          </Button>
        )}
      </div>

      {/* TIMELINE VIEW (FOR REGULAR EMPLOYEES) */}
      {!isAdmin ? (
        <div className="space-y-6">
          {/* Current Salary Stats Card */}
          {myEmployeeDetails && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 opacity-10">
                <DollarSign size={160} />
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                  <TrendingUp className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                    Current Package (CTC)
                  </span>
                  <p className="text-3xl font-extrabold mt-3">
                    ₹{Number(
                      (myEmployeeDetails.basic_salary || 0) + 
                      (myEmployeeDetails.hra || 0) + 
                      (myEmployeeDetails.total_allowances || myEmployeeDetails.allowances || 0) + 
                      (myEmployeeDetails.bonus || 0)
                    ).toLocaleString('en-IN')}/mo
                  </p>
                  <p className="text-xs text-blue-100 mt-2">
                    Joined on {myEmployeeDetails.joining_date ? String(myEmployeeDetails.joining_date).slice(0, 10) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee Timeline of increments */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-800">Your Appraisal Timeline</h2>
            
            {personalRevisions.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm">No salary revision records found yet.</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-100 ml-4 pl-6 space-y-8">
                {personalRevisions.map((rev) => (
                  <div key={rev.id} className="relative">
                    {/* Circle marker */}
                    <span className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    </span>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition rounded-2xl p-4 border border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full capitalize">
                            {rev.reason}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={12} />
                            Effective: {rev.effective_date ? String(rev.effective_date).slice(0, 10) : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <p className="text-sm font-semibold text-slate-400 line-through">
                            ₹{Number(rev.old_gross_salary).toLocaleString('en-IN')}
                          </p>
                          <ArrowRight size={14} className="text-slate-400" />
                          <p className="text-base font-bold text-slate-800">
                            ₹{Number(rev.new_gross_salary).toLocaleString('en-IN')}
                          </p>
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg ml-2">
                            +{rev.increment_percentage}%
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleDownload(rev)}
                        disabled={downloadingId === rev.id}
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-xl text-slate-700 h-9"
                      >
                        {downloadingId === rev.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                        Letter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ADMINISTRATIVE VIEW (FOR SUPER_ADMIN, ADMIN, HR) */
        <div className="space-y-5">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee or code..."
                className="pl-9 h-10 border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Employee</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Reason</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Old Package</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Revised Package</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Increment (%)</th>
                  <th className="text-left px-5 py-3.5 font-medium text-slate-500">Effective Date</th>
                  <th className="text-right px-5 py-3.5 font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                    </td>
                  </tr>
                ) : filteredRevisions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Award className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 text-sm">No appraisals or salary revisions found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRevisions.map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-700">
                          {rev.employee ? `${rev.employee.first_name} ${rev.employee.last_name}` : 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {rev.employee?.employee_code || ''}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-600 capitalize">
                        {rev.reason}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        ₹{Number(rev.old_gross_salary).toLocaleString('en-IN')}/mo
                      </td>
                      <td className="px-5 py-4 text-slate-800 font-semibold text-xs">
                        ₹{Number(rev.new_gross_salary).toLocaleString('en-IN')}/mo
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">
                          +{rev.increment_percentage}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {rev.effective_date ? String(rev.effective_date).slice(0, 10) : ''}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          onClick={() => handleDownload(rev)}
                          disabled={downloadingId === rev.id}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                          title="Download Letter"
                        >
                          {downloadingId === rev.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{(page - 1) * 10 + 1}</strong> to{' '}
                  <strong className="text-slate-700">{Math.min(page * 10, meta.total)}</strong> of{' '}
                  <strong className="text-slate-700">{meta.total}</strong>
                </span>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1} className="h-8 px-3 text-xs bg-white border-slate-200 disabled:opacity-50">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p < meta.last_page ? p + 1 : p)}
                    disabled={page === meta.last_page} className="h-8 px-3 text-xs bg-white border-slate-200 disabled:opacity-50">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revise Salary Modal (Admin Only) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg mx-4 p-6 overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Apply Salary Revision</h2>
                  <p className="text-xs text-slate-400">Submit appraisal increments for employees.</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Select Employee */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Select Employee <span className="text-red-500">*</span></Label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm h-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">Choose employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name || `${e.first_name} ${e.last_name}`} ({e.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Form Input Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">New Basic Salary <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={newBasic}
                    onChange={(e) => handleBasicChange(e.target.value)}
                    placeholder="e.g. 35000"
                    className="h-10 border-slate-200 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-slate-700">New HRA (%) <span className="text-red-500">*</span></Label>
                    {newHra && <span className="text-[10px] font-bold text-slate-500">₹{Number(newHra).toLocaleString('en-IN')}</span>}
                  </div>
                  <Input
                    type="number"
                    value={hraPercentage}
                    onChange={(e) => handleHraPercentageChange(e.target.value)}
                    placeholder="e.g. 40"
                    className="h-10 border-slate-200 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">New Allowances <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={newAllowances}
                    onChange={(e) => setNewAllowances(e.target.value)}
                    placeholder="e.g. 10000"
                    className="h-10 border-slate-200 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">New Monthly Bonus <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={newBonus}
                    onChange={(e) => setNewBonus(e.target.value)}
                    placeholder="e.g. 5000"
                    className="h-10 border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Effective Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="h-10 border-slate-200 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Reason / Description <span className="text-red-500">*</span></Label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm h-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    <option value="Annual Appraisal">Annual Appraisal</option>
                    <option value="Promotion">Promotion</option>
                    <option value="Market Correction">Market Correction</option>
                    <option value="Joining Bonus / Package adjustment">Joining Package Adjustment</option>
                    <option value="Special Increment">Special Increment</option>
                  </select>
                </div>
              </div>

              {/* Promotion designation picker */}
              {reason === 'Promotion' && selectedEmployee && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Current Designation:</span>
                    <span className="font-bold text-slate-800">
                      {selectedEmployee.designation?.title || 'None'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Promote to Designation <span className="text-red-500">*</span></Label>
                    <select
                      value={newDesignationId}
                      onChange={(e) => setNewDesignationId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm h-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    >
                      <option value="">Select target designation...</option>
                      {designations.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Real-time Appraisal comparison panel */}
              {selectedEmpId && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      Employee Current CTC:
                    </span>
                    <span className="font-bold text-slate-800">
                      ₹{currentGross.toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-400" />
                      Proposed New CTC:
                    </span>
                    <span className="font-bold text-blue-600">
                      ₹{revisedGross.toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 font-bold text-slate-800">
                    <span>Proposed Package Increase:</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                      Number(incrementPercent) >= 0 
                        ? 'text-green-700 bg-green-50' 
                        : 'text-red-700 bg-red-50'
                    }`}>
                      {Number(incrementPercent) >= 0 ? '+' : ''}{incrementPercent}%
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-3">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitPending} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm">
                  {submitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Increment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
