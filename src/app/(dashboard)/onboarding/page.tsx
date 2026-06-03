'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  Users, Upload, FileText, Package, CheckCircle, XCircle, 
  Clock, Eye, Download, Send, Plus, Search, Filter,
  ChevronRight, Calendar, Mail, Phone, Briefcase, Building2,
  DollarSign, Trash2, Edit, Check, X, RefreshCw, AlertCircle,
  Shield, Laptop, Monitor, Smartphone, Headphones, Keyboard,
  Mouse, Printer, HardDrive, Camera, MoreVertical, Loader2,
  FileCheck, FileWarning, FileX, Image, File, Video, Sparkles, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import api from '@/lib/api';
import { offboardingService, OffboardingRequest } from '@/services/offboardingService';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface OnboardingRequest {
  id: number;
  candidate_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  joining_date: string;
  ctc: number;
  status: 'pending' | 'approved' | 'rejected' | 'onboarded';
  rejection_reason?: string;
  documents: OnboardingDocument[];
  tasks: OnboardingTask[];
  offer_letters: OfferLetter[];
  created_at: string;
}

interface OnboardingDocument {
  id: number;
  document_type: string;
  original_name: string;
  file_path: string;
  file_size: string;
  status: 'pending' | 'verified' | 'rejected';
  verification_notes?: string;
  created_at: string;
}

interface OnboardingTask {
  id: number;
  task_name: string;
  assigned_to: string;
  description: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completion_notes?: string;
}

interface OfferLetter {
  id: number;
  letter_number: string;
  letter_date: string;
  file_path: string;
  status: 'draft' | 'sent' | 'accepted' | 'expired';
}

interface Asset {
  id: number;
  asset_code: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  status: 'available' | 'assigned' | 'maintenance' | 'scrapped';
  specifications?: string;
  current_allocation?: {
    id: number;
    employee_id: number;
    allocated_date: string;
    status: string;
  } | null;
  currentAllocation?: {
    id: number;
    employee_id: number;
    allocated_date: string;
    status: string;
  } | null;
}

// ────────────────────────────────────────────────────────────────
// Configs
// ────────────────────────────────────────────────────────────────

const documentTypes = [
  { value: 'resume', label: 'Resume/CV', icon: FileText, required: true },
  { value: 'id_proof', label: 'ID Proof', icon: Shield, required: true },
  { value: 'address_proof', label: 'Address Proof', icon: FileCheck, required: true },
  { value: 'degree', label: 'Degree Certificate', icon: File, required: true },
  { value: 'previous_employment', label: 'Previous Employment', icon: Briefcase, required: false },
  { value: 'bank_details', label: 'Bank Details', icon: DollarSign, required: true },
  { value: 'pan_card', label: 'PAN Card', icon: Shield, required: true },
  { value: 'aadhaar_card', label: 'Aadhaar Card', icon: Shield, required: true },
  { value: 'passport', label: 'Passport', icon: File, required: false },
  { value: 'other', label: 'Other', icon: File, required: false },
];

const assetTypes = [
  { value: 'laptop', label: 'Laptop', icon: Laptop },
  { value: 'monitor', label: 'Monitor', icon: Monitor },
  { value: 'phone', label: 'Phone', icon: Smartphone },
  { value: 'headset', label: 'Headset', icon: Headphones },
  { value: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { value: 'mouse', label: 'Mouse', icon: Mouse },
  { value: 'other', label: 'Other', icon: Package },
];

// ────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user } = useAuthStore();
  const [activeMainTab, setActiveMainTab] = useState<'onboarding' | 'offboarding'>('onboarding');
  
  // Onboarding States
  const [onboardingRequests, setOnboardingRequests] = useState<OnboardingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    candidate_name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    joining_date: '',
    ctc: '',
  });

  // Offboarding States
  const [offboardingRequests, setOffboardingRequests] = useState<OffboardingRequest[]>([]);
  const [selectedOffboarding, setSelectedOffboarding] = useState<OffboardingRequest | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [offboardingSearch, setOffboardingSearch] = useState('');
  const [offboardingStatusFilter, setOffboardingStatusFilter] = useState('all');
  const [showOffboardingModal, setShowOffboardingModal] = useState(false);
  const [exitFormData, setExitFormData] = useState({
    employee_id: '',
    resignation_date: '',
    last_working_day: '',
    reason: '',
  });
  
  // Exit action states
  const [exitSubmitPending, setExitSubmitPending] = useState(false);
  const [checklistPending, setChecklistPending] = useState(false);
  const [allocatedAssets, setAllocatedAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  // Custom action panels in offboarding details modal
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approveLastWorkingDay, setApproveLastWorkingDay] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReasonText, setRejectReasonText] = useState('');

  const isAdmin = user?.role === 'super_admin' || user?.role === 'super admin' || user?.role === 'admin' || user?.role === 'hr';

  // Fetch Onboarding and Offboarding data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [
        api.get('/onboarding'),
        api.get('/assets'),
      ];

      if (isAdmin) {
        promises.push(api.get('/offboarding').catch(() => ({ data: { data: [] } })));
        promises.push(api.get('/employees').catch(() => ({ data: { data: [] } })));
      }

      const results = await Promise.all(promises);
      
      const onboardingRes = results[0];
      const assetsRes = results[1];
      
      setOnboardingRequests(onboardingRes.data?.data?.data || onboardingRes.data?.data || []);
      setAssets(assetsRes.data?.data || []);

      if (isAdmin) {
        const offboardingRes = results[2];
        const employeesRes = results[3];
        setOffboardingRequests(offboardingRes.data?.data?.data || offboardingRes.data?.data || []);
        
        // Filter active employees for exit select dropdown
        const allEmployees = employeesRes.data?.data || [];
        setEmployees(allEmployees.filter((e: any) => e.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to fetch lifecycle data:', error);
      toast.error('Failed to load lifecycle dashboard data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch allocated assets for selected employee on offboarding
  const fetchAllocatedAssets = useCallback(async (employeeId: number) => {
    try {
      setLoadingAssets(true);
      const response = await api.get('/assets');
      const allAssets: Asset[] = response.data?.data?.data || response.data?.data || [];
      const employeeAssets = allAssets.filter((a) => {
        const alloc = a.current_allocation || a.currentAllocation;
        return alloc?.employee_id === employeeId && alloc?.status === 'allocated';
      });
      setAllocatedAssets(employeeAssets);
    } catch (error) {
      console.error('Failed to fetch allocated assets:', error);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOffboarding?.employee_id) {
      fetchAllocatedAssets(selectedOffboarding.employee_id);
      
      // Reset action boxes
      setShowApproveConfirm(false);
      setShowRejectConfirm(false);
      setApproveLastWorkingDay(selectedOffboarding.last_working_day || new Date().toISOString().split('T')[0]);
      setRejectReasonText('');
    } else {
      setAllocatedAssets([]);
    }
  }, [selectedOffboarding, fetchAllocatedAssets]);

  // Return allocated asset
  const handleReturnAsset = async (allocationId: number) => {
    try {
      await api.post(`/assets/allocations/${allocationId}/return`);
      toast.success('Asset returned successfully');
      if (selectedOffboarding?.employee_id) {
        fetchAllocatedAssets(selectedOffboarding.employee_id);
      }
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to return asset');
    }
  };

  // Onboarding Requests Filter
  const filteredRequests = onboardingRequests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Offboarding Requests Filter
  const filteredOffboardings = offboardingRequests.filter(request => {
    const matchesSearch = offboardingSearch === '' || 
      (request.employee ? `${request.employee.first_name} ${request.employee.last_name}`.toLowerCase().includes(offboardingSearch.toLowerCase()) : false) ||
      (request.employee?.employee_code?.toLowerCase().includes(offboardingSearch.toLowerCase()) || false);
    const matchesStatus = offboardingStatusFilter === 'all' || request.status === offboardingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Create new onboarding request
  const createOnboardingRequest = async () => {
    try {
      await api.post('/onboarding', formData);
      toast.success('Onboarding request created successfully');
      setShowRequestModal(false);
      setFormData({
        candidate_name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        joining_date: '',
        ctc: '',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create onboarding request');
    }
  };

  // Create new offboarding request
  const handleCreateOffboarding = async () => {
    if (!exitFormData.employee_id || !exitFormData.resignation_date || !exitFormData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setExitSubmitPending(true);
      await offboardingService.createRequest({
        employee_id: Number(exitFormData.employee_id),
        resignation_date: exitFormData.resignation_date,
        last_working_day: exitFormData.last_working_day || undefined,
        reason: exitFormData.reason,
      });
      toast.success('Offboarding exit request logged!');
      setShowOffboardingModal(false);
      setExitFormData({
        employee_id: '',
        resignation_date: '',
        last_working_day: '',
        reason: '',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to start exit procedure');
    } finally {
      setExitSubmitPending(false);
    }
  };

  // Update Onboarding status
  const updateRequestStatus = async (id: number, status: string, rejectionReason?: string) => {
    try {
      const endpoint = status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'complete';
      await api.post(`/onboarding/${id}/${endpoint}`, rejectionReason ? { rejection_reason: rejectionReason } : {});
      toast.success(`Request ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'completed'} successfully`);
      setSelectedRequest(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update request status');
    }
  };

  // Approve Offboarding
  const handleApproveOffboarding = async () => {
    if (!selectedOffboarding || !approveLastWorkingDay) return;
    try {
      const res = await offboardingService.approveRequest(selectedOffboarding.id, {
        last_working_day: approveLastWorkingDay,
      });
      toast.success('Resignation request approved.');
      setSelectedOffboarding(res.data);
      setShowApproveConfirm(false);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to approve resignation');
    }
  };

  // Reject Offboarding
  const handleRejectOffboarding = async () => {
    if (!selectedOffboarding || !rejectReasonText) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      const res = await offboardingService.rejectRequest(selectedOffboarding.id, {
        rejection_reason: rejectReasonText,
      });
      toast.success('Exit request rejected.');
      setSelectedOffboarding(res.data);
      setShowRejectConfirm(false);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reject exit request');
    }
  };

  // Complete Offboarding (Final settlement & deactivation)
  const handleCompleteOffboarding = async () => {
    if (!selectedOffboarding) return;
    try {
      const res = await offboardingService.completeRequest(selectedOffboarding.id);
      toast.success('Offboarding finalized. Employee status updated to inactive/terminated.');
      setSelectedOffboarding(res.data);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to finalize offboarding');
    }
  };

  // Save Offboarding Checklist
  const handleUpdateChecklist = async () => {
    if (!selectedOffboarding) return;
    try {
      setChecklistPending(true);
      const res = await offboardingService.updateTasks(selectedOffboarding.id, selectedOffboarding.tasks);
      toast.success('Exit checklist status updated.');
      setSelectedOffboarding(res.data);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save exit checklist');
    } finally {
      setChecklistPending(false);
    }
  };

  // Toggle checklist tasks locally before saving
  const handleToggleChecklistTask = (taskId: number) => {
    if (!selectedOffboarding) return;
    const updatedTasks = selectedOffboarding.tasks.map(t => {
      if (t.id === taskId) {
        return { 
          ...t, 
          status: (t.status === 'completed' ? 'pending' : 'completed') as 'pending' | 'completed'
        };
      }
      return t;
    });
    setSelectedOffboarding({ ...selectedOffboarding, tasks: updatedTasks });
  };

  // Upload document
  const uploadDocument = async () => {
    if (!selectedFile || !selectedDocumentType || !selectedRequest) return;
    
    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('document_type', selectedDocumentType);
    
    setUploading(true);
    try {
      await api.post(`/onboarding/${selectedRequest.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded successfully');
      setShowDocumentModal(false);
      setSelectedFile(null);
      setSelectedDocumentType('');
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // Verify document
  const verifyDocument = async (documentId: number, status: string, notes?: string) => {
    try {
      await api.patch(`/onboarding/documents/${documentId}/verify`, {
        status,
        verification_notes: notes,
      });
      toast.success(`Document ${status === 'verified' ? 'verified' : 'rejected'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to verify document');
    }
  };

  // Download document
  const downloadDocument = async (documentId: number, fileName: string) => {
    try {
      const response = await api.get(`/onboarding/documents/${documentId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  // Allocate asset
  const allocateAsset = async (assetId: number, onboardingRequestId: number) => {
    try {
      await api.post(`/assets/${assetId}/allocate`, {
        onboarding_request_id: onboardingRequestId,
      });
      toast.success('Asset allocated successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to allocate asset');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      approved: 'bg-green-50 text-green-700 border border-green-200',
      rejected: 'bg-red-50 text-red-700 border border-red-200',
      onboarded: 'bg-blue-50 text-blue-700 border border-blue-200',
      completed: 'bg-blue-50 text-blue-700 border border-blue-200',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle size={14} className="text-green-500" />;
      case 'rejected': return <XCircle size={14} className="text-red-500" />;
      default: return <Clock size={14} className="text-yellow-500" />;
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={14} className="text-green-500" />;
      case 'in_progress': return <Clock size={14} className="text-yellow-500" />;
      case 'overdue': return <AlertCircle size={14} className="text-red-500" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const getAssetIcon = (type: string) => {
    const asset = assetTypes.find(a => a.value === type);
    const Icon = asset?.icon || Package;
    return <Icon size={16} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lifecycle Management</h1>
          <p className="text-sm text-slate-400 mt-1">Manage employee entry (Onboarding) and exits (Offboarding).</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Tabs value={activeMainTab} onValueChange={(v: any) => setActiveMainTab(v)} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="onboarding" className="rounded-lg text-xs font-semibold px-4 py-2">
                  Onboarding
                </TabsTrigger>
                <TabsTrigger value="offboarding" className="rounded-lg text-xs font-semibold px-4 py-2">
                  Offboarding
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* TAB 1: ONBOARDING SCREEN */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {activeMainTab === 'onboarding' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-700">Onboarding Candidate Pool</h2>
            {isAdmin && (
              <Button onClick={() => setShowRequestModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl gap-2 shadow-sm">
                <Plus size={16} /> New Onboarding Request
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, email, or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 h-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="onboarded">Onboarded</option>
            </select>
            <Button variant="outline" className="rounded-xl h-10 border-slate-200" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
              <RefreshCw size={14} className="mr-2 text-slate-500" /> Reset
            </Button>
          </div>

          {/* Onboarding Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium">Candidate</th>
                    <th className="px-6 py-4 text-left font-medium">Position</th>
                    <th className="px-6 py-4 text-left font-medium">Joining Date</th>
                    <th className="px-6 py-4 text-left font-medium">Documents</th>
                    <th className="px-6 py-4 text-left font-medium">Tasks</th>
                    <th className="px-6 py-4 text-left font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <Users size={48} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-400">No onboarding requests found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => {
                      const verifiedDocs = request.documents.filter(d => d.status === 'verified').length;
                      const completedTasks = request.tasks.filter(t => t.status === 'completed').length;
                      const totalTasks = request.tasks.length;
                      
                      return (
                        <tr key={request.id} className="hover:bg-slate-50/70 transition cursor-pointer" onClick={() => setSelectedRequest(request)}>
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            <div>
                              <p>{request.candidate_name}</p>
                              <p className="text-xs text-slate-400 font-normal">{request.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-800">{request.position}</p>
                              <p className="text-xs text-slate-400">{request.department}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(request.joining_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Progress value={(verifiedDocs / (documentTypes.length || 1)) * 100} className="w-16 h-1.5" />
                              <span className="text-xs text-slate-500 font-semibold">{verifiedDocs}/{documentTypes.length}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Progress value={(completedTasks / (totalTasks || 1)) * 100} className="w-16 h-1.5" />
                              <span className="text-xs text-slate-500 font-semibold">{completedTasks}/{totalTasks}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`rounded-lg capitalize ${getStatusColor(request.status)}`}>
                              {request.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); }}
                              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition"
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* TAB 2: OFFBOARDING SCREEN */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {activeMainTab === 'offboarding' && isAdmin && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-700">Offboarding & Exit Procedure</h2>
            <Button onClick={() => setShowOffboardingModal(true)} className="bg-red-600 hover:bg-red-500 text-white rounded-xl gap-2 shadow-sm">
              <Plus size={16} /> Log Exit Request
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by employee name or employee code..."
                value={offboardingSearch}
                onChange={(e) => setOffboardingSearch(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 h-10"
              />
            </div>
            <select
              value={offboardingStatusFilter}
              onChange={(e) => setOffboardingStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Exit</option>
              <option value="approved">Approved (Notice)</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed Exit</option>
            </select>
            <Button variant="outline" className="rounded-xl h-10 border-slate-200" onClick={() => { setOffboardingSearch(''); setOffboardingStatusFilter('all'); }}>
              <RefreshCw size={14} className="mr-2 text-slate-500" /> Reset
            </Button>
          </div>

          {/* Offboarding Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium">Employee</th>
                    <th className="px-6 py-4 text-left font-medium">Resignation Date</th>
                    <th className="px-6 py-4 text-left font-medium">Last Working Day</th>
                    <th className="px-6 py-4 text-left font-medium">Clearance Progress</th>
                    <th className="px-6 py-4 text-left font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {filteredOffboardings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <Users size={48} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-400">No offboarding requests found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOffboardings.map((request) => {
                      const completedChecklists = (request.tasks || []).filter(t => t.status === 'completed').length;
                      const totalChecklists = (request.tasks || []).length;
                      
                      return (
                        <tr key={request.id} className="hover:bg-slate-50/70 transition cursor-pointer" onClick={() => setSelectedOffboarding(request)}>
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            <div>
                              <p>{request.employee ? `${request.employee.first_name} ${request.employee.last_name}` : 'Unknown'}</p>
                              <p className="text-xs text-slate-400 font-normal">{request.employee?.employee_code || ''}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(request.resignation_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {request.last_working_day 
                              ? new Date(request.last_working_day).toLocaleDateString('en-IN')
                              : <span className="text-slate-400 font-normal italic">Not confirmed yet</span>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Progress value={totalChecklists > 0 ? (completedChecklists / totalChecklists) * 100 : 0} className="w-16 h-1.5" />
                              <span className="text-xs text-slate-500 font-semibold">{completedChecklists}/{totalChecklists}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`rounded-lg capitalize ${getStatusColor(request.status)}`}>
                              {request.status === 'approved' ? 'Approved (Notice)' : request.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedOffboarding(request); }}
                              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded-xl transition"
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* MODAL: ONBOARDING CANDIDATE DETAIL */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800">Candidate Onboarding File</DialogTitle>
              <DialogDescription className="text-xs">
                {selectedRequest.candidate_name} — {selectedRequest.position} ({selectedRequest.department})
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-5 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="details" className="rounded-lg text-xs">Details</TabsTrigger>
                <TabsTrigger value="documents" className="rounded-lg text-xs">Documents</TabsTrigger>
                <TabsTrigger value="tasks" className="rounded-lg text-xs">Tasks</TabsTrigger>
                <TabsTrigger value="assets" className="rounded-lg text-xs">Assets</TabsTrigger>
                <TabsTrigger value="offer" className="rounded-lg text-xs">Offer Letter</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Candidate Name</Label>
                    <p className="font-semibold text-slate-850">{selectedRequest.candidate_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Email Address</Label>
                    <p className="font-semibold text-slate-850">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Phone Number</Label>
                    <p className="font-semibold text-slate-850">{selectedRequest.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Target Position</Label>
                    <p className="font-semibold text-slate-850">{selectedRequest.position}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Department</Label>
                    <p className="font-semibold text-slate-850">{selectedRequest.department}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Target Joining Date</Label>
                    <p className="font-semibold text-slate-850">{new Date(selectedRequest.joining_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Annual CTC</Label>
                    <p className="font-semibold text-slate-850">₹{selectedRequest.ctc?.toLocaleString('en-IN') || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Onboarding Status</Label>
                    <div className="mt-1">
                      <Badge className={`rounded-lg capitalize ${getStatusColor(selectedRequest.status)}`}>
                        {selectedRequest.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedRequest.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm">
                    <p className="font-bold text-red-800">Rejection Reason:</p>
                    <p className="text-red-700 mt-1">{selectedRequest.rejection_reason}</p>
                  </div>
                )}

                {isAdmin && selectedRequest.status === 'pending' && (
                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => updateRequestStatus(selectedRequest.id, 'approved')} className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl">
                      <Check size={16} className="mr-2" /> Approve Candidate
                    </Button>
                    <Button 
                      onClick={() => {
                        const reason = prompt('Enter candidate rejection reason:');
                        if (reason) updateRequestStatus(selectedRequest.id, 'rejected', reason);
                      }} 
                      variant="destructive" 
                      className="flex-1 rounded-xl"
                    >
                      <X size={16} className="mr-2" /> Reject Candidate
                    </Button>
                  </div>
                )}

                {isAdmin && selectedRequest.status === 'approved' && (
                  <Button onClick={() => updateRequestStatus(selectedRequest.id, 'complete')} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
                    <CheckCircle size={16} className="mr-2" /> Finalize Onboarding & Generate Credentials
                  </Button>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4 mt-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-700">Verification Checklists</h3>
                  {isAdmin && (
                    <Button size="sm" onClick={() => setShowDocumentModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white gap-1 rounded-xl">
                      <Upload size={14} /> Upload Doc
                    </Button>
                  )}
                </div>

                <div className="grid gap-3">
                  {documentTypes.map((docType) => {
                    const doc = selectedRequest.documents.find(d => d.document_type === docType.value);
                    return (
                      <div key={docType.value} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                            <docType.icon size={18} className="text-slate-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 text-sm">{docType.label}</p>
                            <p className="text-xs text-slate-400">
                              {doc ? `Uploaded: ${new Date(doc.created_at).toLocaleDateString()}` : 'Missing file'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc && (
                            <>
                              {getDocumentStatusIcon(doc.status)}
                              <button
                                onClick={() => downloadDocument(doc.id, doc.original_name)}
                                className="p-1.5 hover:bg-white text-slate-400 hover:text-blue-600 rounded-lg transition"
                                title="Download"
                              >
                                <Download size={14} />
                              </button>
                              {isAdmin && doc.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => verifyDocument(doc.id, 'verified')}
                                    className="p-1.5 hover:bg-white text-green-500 rounded-lg transition"
                                    title="Verify"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const notes = prompt('Reason for document rejection:');
                                      if (notes) verifyDocument(doc.id, 'rejected', notes);
                                    }}
                                    className="p-1.5 hover:bg-white text-red-500 rounded-lg transition"
                                    title="Reject"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {!doc && <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Required</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="space-y-4 mt-4 animate-in fade-in duration-200">
                <div className="grid gap-3">
                  {selectedRequest.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        {getTaskStatusIcon(task.status)}
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">{task.task_name}</p>
                          <p className="text-xs text-slate-455">
                            Owner: {task.assigned_to} • Deadline: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={`rounded-lg capitalize ${
                        task.status === 'completed' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : task.status === 'overdue' 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Assets Tab */}
              <TabsContent value="assets" className="space-y-4 mt-4 animate-in fade-in duration-200">
                <p className="text-xs text-slate-400">Allocate hardware and IT tools before final onboarding completion.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assets.filter(a => a.status === 'available').map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        {getAssetIcon(asset.type)}
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{asset.name}</p>
                          <p className="text-xs text-slate-400">{asset.asset_code} • {asset.brand} {asset.model}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button size="sm" onClick={() => allocateAsset(asset.id, selectedRequest.id)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
                          Allocate
                        </Button>
                      )}
                    </div>
                  ))}
                  {assets.filter(a => a.status === 'available').length === 0 && (
                    <div className="col-span-2 text-center py-8 text-slate-400">
                      <Package size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No available hardware/assets in stock</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Offer Letter Tab */}
              <TabsContent value="offer" className="space-y-4 mt-4 animate-in fade-in duration-200">
                {selectedRequest.offer_letters.length > 0 ? (
                  selectedRequest.offer_letters.map((letter) => (
                    <div key={letter.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">Offer Document - {letter.letter_number}</p>
                        <p className="text-xs text-slate-400">Generated: {new Date(letter.letter_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadDocument(letter.id, `offer_letter_${selectedRequest.candidate_name}.pdf`)}
                          className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl transition shadow-sm border border-slate-200"
                        >
                          <Download size={14} />
                        </button>
                        {isAdmin && letter.status === 'draft' && (
                          <Button size="sm" onClick={() => api.post(`/onboarding/offer-letters/${letter.id}/send`)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
                            <Send size={12} className="mr-1" /> Send Offer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText size={48} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 text-sm">No offer letter generated yet</p>
                    {isAdmin && (
                      <Button className="mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl" onClick={() => toast.info('Generators are triggered when candidates are approved')}>
                        Check Approval State
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* MODAL: OFFBOARDING EMPLOYEE DETAIL */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {selectedOffboarding && (
        <Dialog open={!!selectedOffboarding} onOpenChange={() => setSelectedOffboarding(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800">Employee Exit Procedure</DialogTitle>
              <DialogDescription className="text-xs">
                {selectedOffboarding.employee ? `${selectedOffboarding.employee.first_name} ${selectedOffboarding.employee.last_name}` : 'Unknown'} 
                {selectedOffboarding.employee?.employee_code ? ` — ${selectedOffboarding.employee.employee_code}` : ''}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="details" className="rounded-lg text-xs">Exit Details</TabsTrigger>
                <TabsTrigger value="checklist" className="rounded-lg text-xs">Clearance Checklist</TabsTrigger>
                <TabsTrigger value="assets" className="rounded-lg text-xs">Allocated Assets</TabsTrigger>
              </TabsList>

              {/* Exit Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Employee Name</Label>
                    <p className="font-semibold text-slate-850">{selectedOffboarding.employee ? `${selectedOffboarding.employee.first_name} ${selectedOffboarding.employee.last_name}` : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Resignation Submitted</Label>
                    <p className="font-semibold text-slate-850">{new Date(selectedOffboarding.resignation_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Last Working Day</Label>
                    <p className="font-semibold text-slate-850">
                      {selectedOffboarding.last_working_day 
                        ? new Date(selectedOffboarding.last_working_day).toLocaleDateString('en-IN')
                        : 'Under Review'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs font-semibold">Exit Status</Label>
                    <div className="mt-1">
                      <Badge className={`rounded-lg capitalize ${getStatusColor(selectedOffboarding.status)}`}>
                        {selectedOffboarding.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-400 text-xs font-semibold">Reason for Resignation</Label>
                    <p className="text-slate-700 mt-0.5 bg-white border border-slate-100 rounded-xl p-3 text-xs leading-relaxed">
                      {selectedOffboarding.reason}
                    </p>
                  </div>
                </div>

                {selectedOffboarding.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm">
                    <p className="font-bold text-red-800">Rejection Feedback:</p>
                    <p className="text-red-700 mt-1">{selectedOffboarding.rejection_reason}</p>
                  </div>
                )}

                {/* Confirm approvals or rejections actions inline */}
                {selectedOffboarding.status === 'pending' && !showApproveConfirm && !showRejectConfirm && (
                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => setShowApproveConfirm(true)} className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl">
                      <Check size={16} className="mr-2" /> Approve Resignation
                    </Button>
                    <Button onClick={() => setShowRejectConfirm(true)} variant="destructive" className="flex-1 rounded-xl">
                      <X size={16} className="mr-2" /> Reject Resignation
                    </Button>
                  </div>
                )}

                {showApproveConfirm && (
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-green-800">Confirm Exit & Notice Period</h4>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-green-700">Confirm/Set Last Working Day</Label>
                      <Input
                        type="date"
                        value={approveLastWorkingDay}
                        onChange={(e) => setApproveLastWorkingDay(e.target.value)}
                        className="bg-white border-green-200 rounded-xl h-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowApproveConfirm(false)} variant="outline" className="flex-1 rounded-xl border-green-200 text-green-800 hover:bg-green-100">
                        Cancel
                      </Button>
                      <Button onClick={handleApproveOffboarding} className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl">
                        Approve & Schedule
                      </Button>
                    </div>
                  </div>
                )}

                {showRejectConfirm && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-red-800">Reject Resignation/Exit Request</h4>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-red-700">Rejection Notes (Sent to employee)</Label>
                      <textarea
                        value={rejectReasonText}
                        onChange={(e) => setRejectReasonText(e.target.value)}
                        placeholder="Please write down comments or feedback for rejection..."
                        className="w-full bg-white border border-red-200 rounded-xl p-3 text-xs leading-normal focus:outline-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowRejectConfirm(false)} variant="outline" className="flex-1 rounded-xl border-red-200 text-red-800 hover:bg-red-100">
                        Cancel
                      </Button>
                      <Button onClick={handleRejectOffboarding} disabled={!rejectReasonText} className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-xl">
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                )}

                {selectedOffboarding.status === 'approved' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
                    <p className="text-xs text-slate-500">
                      Resignation approved. Complete all clearances in the tabs above before final termination deactivation.
                    </p>
                    <Button 
                      onClick={handleCompleteOffboarding} 
                      disabled={selectedOffboarding.tasks.some(t => t.status !== 'completed')}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
                    >
                      <CheckCircle size={16} className="mr-2" /> Complete Exit & Terminate Employee Account
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Exit Clearance Checklist Tab */}
              <TabsContent value="checklist" className="space-y-4 mt-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700">Clearance Checklist</h3>
                  <Badge className="bg-slate-100 text-slate-600 rounded-lg">
                    {selectedOffboarding.tasks.filter(t => t.status === 'completed').length}/{selectedOffboarding.tasks.length} Completed
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {selectedOffboarding.tasks.map((task) => (
                    <div 
                      key={task.id} 
                      onClick={() => selectedOffboarding.status === 'approved' && handleToggleChecklistTask(task.id)}
                      className={`flex items-center justify-between p-3.5 border rounded-2xl transition cursor-pointer ${
                        task.status === 'completed'
                          ? 'bg-green-50/50 border-green-100 text-green-900'
                          : 'bg-slate-50 border-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          task.status === 'completed'
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}>
                          {task.status === 'completed' && <Check size={12} />}
                        </div>
                        <span className="font-semibold text-sm">{task.task_name}</span>
                      </div>
                      <Badge className={`rounded-lg capitalize ${
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-850'
                          : 'bg-yellow-100 text-yellow-850'
                      }`}>
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>

                {selectedOffboarding.status === 'approved' && (
                  <Button 
                    onClick={handleUpdateChecklist} 
                    disabled={checklistPending} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
                  >
                    {checklistPending && <Loader2 size={16} className="animate-spin mr-2" />}
                    Save Clearance Checklist
                  </Button>
                )}
              </TabsContent>

              {/* Allocated Assets Tab */}
              <TabsContent value="assets" className="space-y-4 mt-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700">Currently Allocated Hardware</h3>
                  <Badge className="bg-slate-100 text-slate-600 rounded-lg">
                    {allocatedAssets.length} Assets Found
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {loadingAssets ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={24} className="animate-spin text-slate-400" />
                    </div>
                  ) : allocatedAssets.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl">
                      <Package size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No active hardware allocations for this employee.</p>
                    </div>
                  ) : (
                    allocatedAssets.map((asset) => {
                      const allocId = asset.current_allocation?.id || asset.currentAllocation?.id;
                      return (
                        <div key={asset.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500">
                              {getAssetIcon(asset.type)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{asset.name}</p>
                              <p className="text-xs text-slate-400">{asset.asset_code} • {asset.brand} {asset.model} • S/N: {asset.serial_number}</p>
                            </div>
                          </div>
                          {allocId && (
                            <Button 
                              onClick={() => handleReturnAsset(allocId)} 
                              size="sm" 
                              variant="destructive"
                              className="rounded-xl"
                            >
                              Return Asset
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* MODAL: NEW ONBOARDING REQUEST */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">New Onboarding Request</DialogTitle>
            <DialogDescription className="text-xs">Enter candidate details to start the onboarding process</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm mt-2">
            <div>
              <Label className="text-slate-600">Candidate Name *</Label>
              <Input
                value={formData.candidate_name}
                onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                placeholder="Full name"
                className="rounded-xl border-slate-200 h-10 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-600">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
                className="rounded-xl border-slate-200 h-10 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-600">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
                className="rounded-xl border-slate-200 h-10 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-600">Position *</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Job title"
                  className="rounded-xl border-slate-200 h-10 mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-600">Department *</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Department name"
                  className="rounded-xl border-slate-200 h-10 mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-600">Joining Date *</Label>
                <Input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  className="rounded-xl border-slate-200 h-10 mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-600">CTC (Annual)</Label>
                <Input
                  type="number"
                  value={formData.ctc}
                  onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                  placeholder="Annual compensation"
                  className="rounded-xl border-slate-200 h-10 mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowRequestModal(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={createOnboardingRequest} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl">Create Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* MODAL: LOG OFFBOARDING (EXIT) REQUEST */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <Dialog open={showOffboardingModal} onOpenChange={setShowOffboardingModal}>
        <DialogContent className="rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Log Resignation / Exit Procedure</DialogTitle>
            <DialogDescription className="text-xs">Start exit notice process for active employees</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm mt-2">
            <div>
              <Label className="text-slate-600">Select Employee *</Label>
              <select
                value={exitFormData.employee_id}
                onChange={(e) => setExitFormData({ ...exitFormData, employee_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm h-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 mt-1"
              >
                <option value="">Choose employee...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name || `${e.first_name} ${e.last_name}`} ({e.employee_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-600">Resignation Date *</Label>
                <Input
                  type="date"
                  value={exitFormData.resignation_date}
                  onChange={(e) => setExitFormData({ ...exitFormData, resignation_date: e.target.value })}
                  className="rounded-xl border-slate-200 h-10 mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-600">Proposed Last Day</Label>
                <Input
                  type="date"
                  value={exitFormData.last_working_day}
                  onChange={(e) => setExitFormData({ ...exitFormData, last_working_day: e.target.value })}
                  className="rounded-xl border-slate-200 h-10 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-600">Resignation Reason / Exit Explanation *</Label>
              <textarea
                value={exitFormData.reason}
                onChange={(e) => setExitFormData({ ...exitFormData, reason: e.target.value })}
                placeholder="Details of exit reason or resignation explanation..."
                className="w-full border border-slate-200 rounded-xl p-3 text-xs leading-normal resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowOffboardingModal(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateOffboarding} disabled={exitSubmitPending} className="bg-red-600 hover:bg-red-500 text-white rounded-xl">
              {exitSubmitPending && <Loader2 size={16} className="animate-spin mr-2" />}
              Initiate Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* MODAL: ONBOARDING CANDIDATE UPLOAD DOCUMENT */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
        <DialogContent className="rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Upload Document</DialogTitle>
            <DialogDescription className="text-xs">Upload document for {selectedRequest?.candidate_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm mt-2">
            <div>
              <Label className="text-slate-600">Document Type *</Label>
              <select
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm h-10 bg-white focus:outline-none mt-1"
              >
                <option value="">Select document type</option>
                {documentTypes.map(doc => (
                  <option key={doc.value} value={doc.value}>{doc.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-slate-600">File *</Label>
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="rounded-xl border-slate-200 h-10 mt-1"
              />
              <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG, DOC, DOCX (Max 5MB)</p>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowDocumentModal(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={uploadDocument} disabled={!selectedFile || !selectedDocumentType || uploading} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
              {uploading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}