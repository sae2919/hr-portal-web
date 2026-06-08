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
  ChevronRight, ArrowRight, DollarSign, Award, X, Sparkles, User,
  Eye, Edit3, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';

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
  
  // View/Edit modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingRevision, setViewingRevision] = useState<SalaryRevision | null>(null);
  const [editingRevision, setEditingRevision] = useState<SalaryRevision | null>(null);
  
  // HRA percentage & Promotion designation states
  const [hraPercentage, setHraPercentage] = useState('');
  const [newDesignationId, setNewDesignationId] = useState('');
  const [annualCTCInput, setAnnualCTCInput] = useState('');
  const [isCtcFocused, setIsCtcFocused] = useState(false);
  const [newEmploymentType, setNewEmploymentType] = useState('');

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
  const isIntern = newEmploymentType === 'intern';
  
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
  const comparisonBaseGross = editingRevision ? Number(editingRevision.old_gross_salary || 0) : (currentGross || 0);
  const grossDiff = revisedGross - comparisonBaseGross;
  const rawPercent = comparisonBaseGross > 0 ? ((grossDiff / comparisonBaseGross) * 100) : (revisedGross > 0 ? 100.00 : 0.00);
  const incrementPercent = isNaN(rawPercent) ? '0.00' : rawPercent.toFixed(2);

  const handleOpenViewModal = (rev: SalaryRevision) => {
    setViewingRevision(rev);
    setViewModalOpen(true);
  };

  const handleOpenEditModal = (rev: SalaryRevision) => {
    setEditingRevision(rev);
    setSelectedEmpId(String(rev.employee_id));
    setNewBasic(String(rev.new_basic_salary));
    setNewHra(String(rev.new_hra));
    
    const basicVal = Number(rev.new_basic_salary) || 0;
    const hraVal = Number(rev.new_hra) || 0;
    const percentage = basicVal > 0 ? Math.round((hraVal / basicVal) * 100) : 0;
    setHraPercentage(String(percentage));
    
    setNewAllowances(String(rev.new_allowances));
    setNewBonus(String(rev.new_bonus));
    setEffectiveDate(rev.effective_date ? rev.effective_date.slice(0, 10) : '');
    setReason(rev.reason || 'Annual Appraisal');
    setNewEmploymentType(rev.new_employment_type || rev.employee?.employment_type || 'full_time');
    setNewDesignationId(rev.new_designation_id ? String(rev.new_designation_id) : '');
    setModalOpen(true);
  };

  const handleDeleteRevision = async (id: number) => {
    if (!confirm('Are you sure you want to delete this salary revision record?')) return;
    try {
      await salaryRevisionService.deleteRevision(id);
      toast.success('Salary revision record deleted successfully');
      fetchRevisions();
    } catch (err) {
      console.error('Failed to delete salary revision:', err);
      toast.error('Failed to delete salary revision');
    }
  };

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
    setNewEmploymentType('');
    setModalOpen(true);
  };

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find(e => e.id === Number(empId));
    if (emp) {
      // Auto fill new fields with current values as a starting base
      const isEmpIntern = emp.employment_type === 'intern';
      setNewBasic(String(emp.basic_salary || ''));
      setNewHra(isEmpIntern ? '0' : String(emp.hra || ''));
      setNewAllowances(isEmpIntern ? '0' : String(emp.total_allowances || emp.allowances || ''));
      setNewBonus(isEmpIntern ? '0' : String(emp.bonus || ''));
      setNewDesignationId(String(emp.designation_id || ''));
      setNewEmploymentType(emp.employment_type || 'full_time');
      
      const basicVal = Number(emp.basic_salary || 0);
      const hraVal = isEmpIntern ? 0 : Number(emp.hra || 0);
      const percentage = basicVal > 0 ? Math.round((hraVal / basicVal) * 100) : 0;
      setHraPercentage(isEmpIntern ? '0' : String(percentage));
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

  const handleHraAmountChange = (val: string) => {
    setNewHra(val);
    const hraVal = Number(val) || 0;
    const basicVal = Number(newBasic) || 0;
    if (basicVal > 0) {
      const pct = Math.round((hraVal / basicVal) * 100);
      setHraPercentage(String(pct));
    } else {
      setHraPercentage('');
    }
  };

  useEffect(() => {
    if (isCtcFocused) return;
    const gross = (Number(newBasic) || 0) + (Number(newHra) || 0) + (Number(newAllowances) || 0) + (Number(newBonus) || 0);
    const annualCTC = gross * 12;
    if (Math.round(annualCTC) !== Number(annualCTCInput)) {
      setAnnualCTCInput(annualCTC > 0 ? String(Math.round(annualCTC)) : '');
    }
  }, [newBasic, newHra, newAllowances, newBonus, annualCTCInput, isCtcFocused]);

  useEffect(() => {
    if (isIntern) {
      setNewHra('0');
      setHraPercentage('0');
      setNewAllowances('0');
      setNewBonus('0');
    }
  }, [isIntern]);

  const handleAnnualCTCChange = (valStr: string) => {
    setAnnualCTCInput(valStr);
    const val = Number(valStr);
    if (!isNaN(val) && val > 0) {
      if (isIntern) {
        const stipendVal = Math.round(val / 12);
        setNewBasic(String(stipendVal));
        setHraPercentage('0');
        setNewHra('0');
        setNewAllowances('0');
        setNewBonus('0');
      } else {
        const monthlyGross = val / 12;
        const basicVal = Math.round(monthlyGross * 0.50);
        const hraVal = Math.round(basicVal * 0.40);
        const allowancesVal = Math.round(monthlyGross - basicVal - hraVal);
        
        setNewBasic(String(basicVal));
        setHraPercentage('40');
        setNewHra(String(hraVal));
        setNewAllowances(String(allowancesVal));
        setNewBonus('0');
      }
    } else {
      setNewBasic('');
      setHraPercentage('');
      setNewHra('');
      setNewAllowances('');
      setNewBonus('');
    }
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
      if (editingRevision) {
        await salaryRevisionService.updateRevision(editingRevision.id, {
          new_basic_salary: Number(newBasic),
          new_hra: Number(newHra),
          new_allowances: Number(newAllowances),
          new_bonus: Number(newBonus),
          effective_date: effectiveDate,
          reason,
          new_employment_type: newEmploymentType,
          ...(reason === 'Promotion' && newDesignationId ? { new_designation_id: Number(newDesignationId) } : {}),
        });
        toast.success('Appraisal revision updated successfully!');
      } else {
        await salaryRevisionService.createRevision({
          employee_id: Number(selectedEmpId),
          new_basic_salary: Number(newBasic),
          new_hra: Number(newHra),
          new_allowances: Number(newAllowances),
          new_bonus: Number(newBonus),
          effective_date: effectiveDate,
          reason,
          new_employment_type: newEmploymentType,
          ...(reason === 'Promotion' && newDesignationId ? { new_designation_id: Number(newDesignationId) } : {}),
        });
        toast.success('Appraisal revision submitted and activated!');
      }
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      fetchRevisions();
      setModalOpen(false);
      setEditingRevision(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit salary revision');
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
                    ₹{(() => {
                      const basic = Number(myEmployeeDetails.basic_salary) || 0;
                      const hra = Number(myEmployeeDetails.hra) || 0;
                      const allowances = Array.isArray(myEmployeeDetails.allowances)
                        ? myEmployeeDetails.allowances.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0)
                        : (Number(myEmployeeDetails.total_allowances || myEmployeeDetails.allowances) || 0);
                      const bonus = Number(myEmployeeDetails.bonus) || 0;
                      return (basic + hra + allowances + bonus).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      });
                    })()}/mo
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
                            ₹{Number(rev.old_gross_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <ArrowRight size={14} className="text-slate-400" />
                          <p className="text-base font-bold text-slate-800">
                            ₹{Number(rev.new_gross_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ml-2 ${
                            Number(rev.increment_percentage) >= 0
                              ? 'text-green-600 bg-green-50'
                              : 'text-red-600 bg-red-50'
                          }`}>
                            {Number(rev.increment_percentage) >= 0 ? '+' : ''}{Number(rev.increment_percentage).toFixed(2)}%
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
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-slate-400">
                            {rev.employee?.employee_code || ''}
                          </span>
                          {rev.old_employment_type && rev.new_employment_type && rev.old_employment_type !== rev.new_employment_type && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold capitalize border border-blue-100">
                              {rev.old_employment_type.replace('_', ' ')} → {rev.new_employment_type.replace('_', ' ')}
                            </span>
                          )}
                          {rev.old_designation && rev.new_designation && rev.old_designation.title !== rev.new_designation.title && (
                            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold border border-amber-100/50">
                              {rev.old_designation.title} → {rev.new_designation.title}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-600 capitalize">
                        {rev.reason}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        ₹{Number(rev.old_gross_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                      </td>
                      <td className="px-5 py-4 text-slate-800 font-semibold text-xs">
                        ₹{Number(rev.new_gross_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                          Number(rev.increment_percentage) >= 0
                            ? 'text-green-600 bg-green-50'
                            : 'text-red-600 bg-red-50'
                        }`}>
                          {Number(rev.increment_percentage) >= 0 ? '+' : ''}{Number(rev.increment_percentage).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {rev.effective_date ? String(rev.effective_date).slice(0, 10) : ''}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenViewModal(rev)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(rev)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors"
                            title="Edit Revision"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRevision(rev.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Revision"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDownload(rev)}
                            disabled={downloadingId === rev.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-green-600 disabled:opacity-50 transition-colors"
                            title="Download Letter"
                          >
                            {downloadingId === rev.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                        </div>
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setModalOpen(false); setEditingRevision(null); }} />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-4xl mx-4 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center animate-pulse">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">{editingRevision ? 'Edit Salary Revision' : 'Apply Salary Revision'}</h2>
                  <p className="text-xs text-slate-400">{editingRevision ? 'Update appraisal increment details.' : 'Submit appraisal increments for employees.'}</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); setEditingRevision(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Left Column: Selection, Info, & Transition metadata */}
                  <div className="space-y-4">
                    {/* Select Employee */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Select Employee <span className="text-red-500">*</span></Label>
                      <SearchableSelect
                        options={[
                          { id: '', label: 'Choose employee...' },
                          ...employees.map((e) => ({
                            id: e.id,
                            label: `${e.full_name || `${e.first_name} ${e.last_name}`} (${e.employee_code})`,
                          }))
                        ]}
                        value={selectedEmpId === '' ? '' : Number(selectedEmpId)}
                        onChange={(val) => handleEmployeeChange(val === '' ? '' : String(val))}
                        disabled={!!editingRevision}
                        placeholder="Choose employee..."
                      />
                    </div>

                    {selectedEmployee && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-2.5 shadow-inner">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Current Employee Details</span>
                        <div className="flex justify-between mt-1">
                          <span className="text-slate-400 font-medium">Current Job Type:</span>
                          <strong className="capitalize text-slate-700 font-semibold">{selectedEmployee.employment_type?.replace('_', ' ') || 'N/A'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Current Annual Package (CTC):</span>
                          <strong className="text-slate-700 font-semibold">₹{(Number(currentGross || 0) * 12).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr</strong>
                        </div>
                        {editingRevision && (
                          <div className="flex justify-between border-t border-slate-200/50 pt-2">
                            <span className="text-slate-400 font-medium">Original Base Package (CTC):</span>
                            <strong className="text-slate-700 font-semibold">₹{(Number(editingRevision.old_gross_salary || 0) * 12).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Job Type Change Picker */}
                    {selectedEmployee && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-3">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Employment Transition</span>
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Current Job Type</Label>
                            <Input
                              value={selectedEmployee.employment_type?.replace('_', ' ').toUpperCase() || 'N/A'}
                              disabled
                              className="h-10 border-slate-200 rounded-xl bg-slate-100 cursor-not-allowed uppercase text-xs font-semibold text-slate-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">New Job Type <span className="text-red-500">*</span></Label>
                            <select
                              value={newEmploymentType}
                              onChange={(e) => {
                                const nextType = e.target.value;
                                const prevType = newEmploymentType;
                                setNewEmploymentType(nextType);
                                if (prevType === 'intern' && nextType !== 'intern') {
                                  const stipend = Number(newBasic) || 0;
                                  if (stipend > 0) {
                                    const basic = Math.round(stipend * 0.50);
                                    const hra = Math.round(basic * 0.40);
                                    const special = Math.max(0, stipend - basic - hra);
                                    
                                    setHraPercentage('40');
                                    setNewBasic(String(basic));
                                    setNewHra(String(hra));
                                    setNewAllowances(String(special));
                                  }
                                }
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm h-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                              required
                            >
                              <option value="full_time">Full Time</option>
                              <option value="part_time">Part Time</option>
                              <option value="contract">Contract</option>
                              <option value="intern">Intern</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Effective Date & Reason / Description */}
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
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm h-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500">Current Designation:</span>
                          <span className="font-bold text-slate-800">
                            {selectedEmployee.designation?.title || 'None'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Promote to Designation <span className="text-red-500">*</span></Label>
                          <SearchableSelect
                            options={[
                              { id: '', label: 'Select target designation...' },
                              ...designations.map((d: any) => ({
                                id: d.id,
                                label: d.title
                              }))
                            ]}
                            value={newDesignationId === '' ? '' : Number(newDesignationId)}
                            onChange={(val) => setNewDesignationId(val === '' ? '' : String(val))}
                            placeholder="Select target designation..."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Salary input grid & Impact Comparison */}
                  <div className="space-y-4">
                    {/* Annual CTC Input */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Annual CTC</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                        <Input
                          type="number"
                          value={annualCTCInput}
                          onFocus={() => setIsCtcFocused(true)}
                          onBlur={() => setIsCtcFocused(false)}
                          onChange={(e) => handleAnnualCTCChange(e.target.value)}
                          placeholder={isIntern ? "e.g. 180000" : "e.g. 360000"}
                          className="h-10 pl-7 border-slate-200 rounded-xl focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    {/* Form Input Grid */}
                    <div className={isIntern ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          {isIntern ? 'New Stipend' : 'New Basic Salary'} <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                          <Input
                            type="number"
                            value={newBasic}
                            onChange={(e) => handleBasicChange(e.target.value)}
                            placeholder={isIntern ? "e.g. 15000" : "e.g. 35000"}
                            className="h-10 pl-7 border-slate-200 rounded-xl focus:ring-blue-500/20"
                            required
                          />
                        </div>
                      </div>

                      {!isIntern && (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <Label className="text-xs font-semibold text-slate-700">New HRA <span className="text-red-500">*</span></Label>
                              {hraPercentage && <span className="text-[10px] font-bold text-slate-500">{hraPercentage}% of Basic</span>}
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                              <Input
                                type="number"
                                value={newHra}
                                onChange={(e) => handleHraAmountChange(e.target.value)}
                                placeholder="e.g. 14000"
                                className="h-10 pl-7 border-slate-200 rounded-xl focus:ring-blue-500/20"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">New Special Allowances <span className="text-red-500">*</span></Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                              <Input
                                type="number"
                                value={newAllowances}
                                onChange={(e) => setNewAllowances(e.target.value)}
                                placeholder="e.g. 10000"
                                className="h-10 pl-7 border-slate-200 rounded-xl focus:ring-blue-500/20"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">New Monthly Bonus <span className="text-red-500">*</span></Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                              <Input
                                type="number"
                                value={newBonus}
                                onChange={(e) => setNewBonus(e.target.value)}
                                placeholder="e.g. 5000"
                                className="h-10 pl-7 border-slate-200 rounded-xl focus:ring-blue-500/20"
                                required
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Real-time Appraisal comparison panel */}
                    {selectedEmpId && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-2.5 shadow-inner">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Revision Impact</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            {editingRevision 
                              ? (isIntern ? 'Previous Stipend:' : 'Previous CTC:') 
                              : (isIntern ? 'Current Stipend:' : 'Current CTC:')}
                          </span>
                          <span className="font-bold text-slate-800">
                            ₹{Number(comparisonBaseGross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                            <Sparkles size={13} className="text-amber-400 animate-pulse" />
                            {isIntern ? 'Proposed Stipend:' : 'Proposed CTC:'}
                          </span>
                          <span className="font-bold text-blue-600 text-sm">
                            ₹{Number(revisedGross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 font-bold text-slate-800">
                          <span>{isIntern ? 'Proposed Stipend Increase:' : 'Proposed Package Increase:'}</span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                            Number(incrementPercent) >= 0 
                              ? 'text-green-700 bg-green-50' 
                              : 'text-red-700 bg-red-50'
                          }`}>
                            {Number(incrementPercent) >= 0 ? '+' : ''}{incrementPercent}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 p-6 border-t border-slate-100 bg-slate-50/50 justify-end">
                <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditingRevision(null); }} className="rounded-xl px-5 h-11">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitPending} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm px-5 h-11 transition-all">
                  {submitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRevision ? 'Save Changes' : 'Confirm Increment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Salary Revision Modal */}
      {viewModalOpen && viewingRevision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg lg:max-w-4xl mx-4 p-6 overflow-hidden border border-slate-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Salary Revision Details</h2>
                  <p className="text-xs text-slate-400">
                    {viewingRevision.employee ? `${viewingRevision.employee.first_name} ${viewingRevision.employee.last_name}` : 'Unknown Employee'}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Metadata and Transition info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Reason</p>
                    <p className="text-sm font-semibold text-slate-700 capitalize">{viewingRevision.reason}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Effective Date</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {viewingRevision.effective_date ? String(viewingRevision.effective_date).slice(0, 10) : '—'}
                    </p>
                  </div>
                </div>

                {viewingRevision.old_employment_type && (
                  <div className="grid grid-cols-2 gap-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Old Job Type</p>
                      <strong className="capitalize text-slate-700 font-semibold">{viewingRevision.old_employment_type.replace('_', ' ')}</strong>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">New Job Type</p>
                      <strong className="capitalize text-blue-600 font-semibold">{viewingRevision.new_employment_type?.replace('_', ' ') || 'N/A'}</strong>
                    </div>
                  </div>
                )}

                {viewingRevision.old_designation && (
                  <div className="grid grid-cols-2 gap-4 bg-amber-50/30 border border-amber-100/50 rounded-2xl p-4 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-amber-700 mb-1">Previous Role</p>
                      <strong className="text-slate-700 font-semibold">{viewingRevision.old_designation.title}</strong>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-amber-700 mb-1">Promoted Role</p>
                      <strong className="text-amber-700 font-semibold">{viewingRevision.new_designation?.title || 'N/A'}</strong>
                    </div>
                  </div>
                )}

                <div className={`border rounded-2xl p-4 flex items-center justify-between ${
                  Number(viewingRevision.increment_percentage) >= 0
                    ? 'bg-green-50/50 border-green-100/50'
                    : 'bg-red-50/50 border-red-100/50'
                }`}>
                  <div>
                    <p className={`text-[10px] uppercase font-bold ${
                      Number(viewingRevision.increment_percentage) >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>Increment percentage</p>
                    <p className={`text-lg font-extrabold ${
                      Number(viewingRevision.increment_percentage) >= 0 ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {Number(viewingRevision.increment_percentage) >= 0 ? '+' : ''}{Number(viewingRevision.increment_percentage).toFixed(2)}%
                    </p>
                  </div>
                  {viewingRevision.approver && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Approved by</p>
                      <p className="text-xs font-semibold text-slate-700">{viewingRevision.approver.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Salary component table and actions */}
              <div className="space-y-4 flex flex-col justify-between h-full">
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 p-4 space-y-3 flex-1">
                  <div className="grid grid-cols-3 text-xs text-slate-400 font-bold border-b border-slate-200/50 pb-2">
                    <span>Salary Component</span>
                    <span className="text-right">Old structure</span>
                    <span className="text-right">New structure</span>
                  </div>
                  
                  {[
                    { label: 'Basic / Stipend', old: viewingRevision.old_basic_salary, new: viewingRevision.new_basic_salary },
                    { label: 'HRA', old: viewingRevision.old_hra, new: viewingRevision.new_hra },
                    { label: 'Special Allowances', old: viewingRevision.old_allowances, new: viewingRevision.new_allowances },
                    { label: 'Bonus', old: viewingRevision.old_bonus, new: viewingRevision.new_bonus },
                  ].map((item) => (
                    <div key={item.label} className="grid grid-cols-3 text-xs py-0.5">
                      <span className="text-slate-500">{item.label}</span>
                      <span className="text-right text-slate-400">₹{Number(item.old || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                      <span className="text-right text-slate-700 font-medium">₹{Number(item.new || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                    </div>
                  ))}

                  <div className="grid grid-cols-3 text-xs font-bold border-t border-slate-200/50 pt-2 text-slate-800">
                    <span>Gross Salary</span>
                    <span className="text-right text-slate-400">₹{Number(viewingRevision.old_gross_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                    <span className="text-right text-blue-600">₹{Number(viewingRevision.new_gross_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 mt-auto">
                  <Button
                    onClick={() => handleDownload(viewingRevision)}
                    disabled={downloadingId === viewingRevision.id}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-sm h-10 gap-1.5"
                  >
                    {downloadingId === viewingRevision.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    Download Revision Letter
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setViewModalOpen(false)} className="flex-1 rounded-xl h-10">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
