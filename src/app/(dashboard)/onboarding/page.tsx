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
  FileCheck, FileWarning, FileX, Image, File, Video
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import api from '@/lib/api';

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
}

// ────────────────────────────────────────────────────────────────
// Document Type Config
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
  const [onboardingRequests, setOnboardingRequests] = useState<OnboardingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
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

  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [onboardingRes, assetsRes] = await Promise.all([
        api.get('/onboarding'),
        api.get('/assets'),
      ]);
      setOnboardingRequests(onboardingRes.data?.data?.data || onboardingRes.data?.data || []);
      setAssets(assetsRes.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter onboarding requests
  const filteredRequests = onboardingRequests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Create new onboarding request
  const createOnboardingRequest = async () => {
    try {
      const response = await api.post('/onboarding', formData);
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

  // Update request status
  const updateRequestStatus = async (id: number, status: string, rejectionReason?: string) => {
    try {
      const endpoint = status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'complete';
      await api.post(`/onboarding/${id}/${endpoint}`, rejectionReason ? { rejection_reason: rejectionReason } : {});
      toast.success(`Request ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'completed'} successfully`);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update request status');
    }
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
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      onboarded: 'bg-blue-100 text-blue-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employee Onboarding</h1>
          <p className="text-sm text-slate-400 mt-1">Manage new employee onboarding process</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowRequestModal(true)} className="gap-2">
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
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="onboarded">Onboarded</option>
        </select>
        <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
          <RefreshCw size={14} className="mr-2" /> Reset
        </Button>
      </div>

      {/* Onboarding Requests List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Candidate</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Position</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Joining Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Documents</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Tasks</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Users size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400">No onboarding requests found</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const verifiedDocs = request.documents.filter(d => d.status === 'verified').length;
                  const totalDocs = request.documents.length;
                  const completedTasks = request.tasks.filter(t => t.status === 'completed').length;
                  const totalTasks = request.tasks.length;
                  
                  return (
                    <tr key={request.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => setSelectedRequest(request)}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{request.candidate_name}</p>
                          <p className="text-xs text-slate-400">{request.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-slate-700">{request.position}</p>
                          <p className="text-xs text-slate-400">{request.department}</p>
                        </div>
                       </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(request.joining_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Progress value={(verifiedDocs / (documentTypes.length || 1)) * 100} className="w-20 h-1.5" />
                          <span className="text-xs text-slate-500">{verifiedDocs}/{documentTypes.length}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Progress value={(completedTasks / (totalTasks || 1)) * 100} className="w-20 h-1.5" />
                          <span className="text-xs text-slate-500">{completedTasks}/{totalTasks}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition"
                        >
                          <Eye size={16} />
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

      {/* Request Detail Modal */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Onboarding Details</DialogTitle>
              <DialogDescription>
                {selectedRequest.candidate_name} - {selectedRequest.position}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
                <TabsTrigger value="offer">Offer Letter</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Full Name</Label>
                    <p className="font-medium">{selectedRequest.candidate_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Email</Label>
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Phone</Label>
                    <p className="font-medium">{selectedRequest.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Position</Label>
                    <p className="font-medium">{selectedRequest.position}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Department</Label>
                    <p className="font-medium">{selectedRequest.department}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Joining Date</Label>
                    <p className="font-medium">{new Date(selectedRequest.joining_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">CTC</Label>
                    <p className="font-medium">₹{selectedRequest.ctc?.toLocaleString('en-IN') || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Status</Label>
                    <Badge className={getStatusColor(selectedRequest.status)}>{selectedRequest.status}</Badge>
                  </div>
                </div>

                {selectedRequest.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                    <p className="text-sm text-red-600">{selectedRequest.rejection_reason}</p>
                  </div>
                )}

                {isAdmin && selectedRequest.status === 'pending' && (
                  <div className="flex gap-3 pt-4">
                    <Button onClick={() => updateRequestStatus(selectedRequest.id, 'approved')} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Check size={16} className="mr-2" /> Approve
                    </Button>
                    <Button 
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) updateRequestStatus(selectedRequest.id, 'rejected', reason);
                      }} 
                      variant="destructive" 
                      className="flex-1"
                    >
                      <X size={16} className="mr-2" /> Reject
                    </Button>
                  </div>
                )}

                {isAdmin && selectedRequest.status === 'approved' && (
                  <Button onClick={() => updateRequestStatus(selectedRequest.id, 'complete')} className="w-full bg-blue-600">
                    <CheckCircle size={16} className="mr-2" /> Complete Onboarding
                  </Button>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Required Documents</h3>
                  {isAdmin && (
                    <Button size="sm" onClick={() => setShowDocumentModal(true)} className="gap-1">
                      <Upload size={14} /> Upload Document
                    </Button>
                  )}
                </div>

                <div className="grid gap-3">
                  {documentTypes.map((docType) => {
                    const doc = selectedRequest.documents.find(d => d.document_type === docType.value);
                    return (
                      <div key={docType.value} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                            <docType.icon size={20} className="text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{docType.label}</p>
                            <p className="text-xs text-slate-400">
                              {doc ? `Uploaded: ${new Date(doc.created_at).toLocaleDateString()}` : 'Not uploaded yet'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc && (
                            <>
                              {getDocumentStatusIcon(doc.status)}
                              <button
                                onClick={() => downloadDocument(doc.id, doc.original_name)}
                                className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-blue-600 transition"
                              >
                                <Download size={14} />
                              </button>
                              {isAdmin && doc.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => verifyDocument(doc.id, 'verified')}
                                    className="p-1.5 rounded-lg hover:bg-white text-green-500 transition"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const notes = prompt('Enter rejection reason:');
                                      if (notes) verifyDocument(doc.id, 'rejected', notes);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-white text-red-500 transition"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {!doc && <span className="text-xs text-slate-400">Required</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="space-y-4 mt-4">
                <div className="grid gap-3">
                  {selectedRequest.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        {getTaskStatusIcon(task.status)}
                        <div>
                          <p className="font-medium text-slate-800">{task.task_name}</p>
                          <p className="text-xs text-slate-400">
                            Assigned to: {task.assigned_to} • Due: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={task.status === 'completed' ? 'bg-green-100 text-green-800' : task.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Assets Tab */}
              <TabsContent value="assets" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assets.filter(a => a.status === 'available').map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        {getAssetIcon(asset.type)}
                        <div>
                          <p className="font-medium text-slate-800">{asset.name}</p>
                          <p className="text-xs text-slate-400">{asset.asset_code} • {asset.brand} {asset.model}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button size="sm" onClick={() => allocateAsset(asset.id, selectedRequest.id)}>
                          Allocate
                        </Button>
                      )}
                    </div>
                  ))}
                  {assets.filter(a => a.status === 'available').length === 0 && (
                    <div className="col-span-2 text-center py-8 text-slate-400">
                      <Package size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No available assets</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Offer Letter Tab */}
              <TabsContent value="offer" className="space-y-4 mt-4">
                {selectedRequest.offer_letters.length > 0 ? (
                  selectedRequest.offer_letters.map((letter) => (
                    <div key={letter.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-800">Offer Letter - {letter.letter_number}</p>
                        <p className="text-xs text-slate-400">Generated: {new Date(letter.letter_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadDocument(letter.id, `offer_letter_${selectedRequest.candidate_name}.pdf`)}
                          className="p-2 rounded-lg bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition shadow-sm"
                        >
                          <Download size={16} />
                        </button>
                        {isAdmin && letter.status === 'draft' && (
                          <Button size="sm" onClick={() => api.post(`/onboarding/offer-letters/${letter.id}/send`)}>
                            <Send size={14} className="mr-1" /> Send
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400">No offer letter generated yet</p>
                    {isAdmin && (
                      <Button className="mt-4" onClick={() => toast.info('Offer letter generation coming soon')}>
                        Generate Offer Letter
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Onboarding Request</DialogTitle>
            <DialogDescription>Enter candidate details to start the onboarding process</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Candidate Name *</Label>
              <Input
                value={formData.candidate_name}
                onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label>Position *</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Job title"
              />
            </div>
            <div>
              <Label>Department *</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Department name"
              />
            </div>
            <div>
              <Label>Joining Date *</Label>
              <Input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
              />
            </div>
            <div>
              <Label>CTC (Annual)</Label>
              <Input
                type="number"
                value={formData.ctc}
                onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                placeholder="Annual compensation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</Button>
            <Button onClick={createOnboardingRequest}>Create Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Modal */}
      <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload document for {selectedRequest?.candidate_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Type *</Label>
              <select
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="">Select document type</option>
                {documentTypes.map(doc => (
                  <option key={doc.value} value={doc.value}>{doc.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>File *</Label>
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOC (Max 5MB)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentModal(false)}>Cancel</Button>
            <Button onClick={uploadDocument} disabled={!selectedFile || !selectedDocumentType || uploading}>
              {uploading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}