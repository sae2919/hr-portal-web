'use client';

import { useState, useEffect, use, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle, XCircle, Clock, Shield, 
  FileCheck, File, DollarSign, Briefcase, Trash2, ArrowRight, 
  Phone, Mail, Calendar, Building2, BriefcaseIcon, Check, Loader2, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/lib/api';
import confetti from 'canvas-confetti';

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
  created_at: string;
}

const documentTypes = [
  { value: 'resume', label: 'Resume/CV', icon: FileText, required: true, desc: 'Your latest resume in PDF format.' },
  { value: 'id_proof', label: 'ID Proof (Passport/Voter ID)', icon: Shield, required: true, desc: 'Government-issued photo identity proof.' },
  { value: 'pan_card', label: 'PAN Card', icon: Shield, required: true, desc: 'Permanent Account Number card copy.' },
  { value: 'aadhaar_card', label: 'Aadhaar Card', icon: Shield, required: true, desc: 'Aadhaar Card (front & back).' },
  { value: 'address_proof', label: 'Address Proof', icon: FileCheck, required: true, desc: 'Electricity bill, rental agreement, or passport.' },
  { value: 'degree', label: 'Degree Certificate', icon: File, required: true, desc: 'Highest educational degree certificate or mark sheet.' },
  { value: 'bank_details', label: 'Bank Details (Passbook/Cheque)', icon: DollarSign, required: true, desc: 'Cancelled cheque or bank passbook front page.' },
  { value: 'previous_employment', label: 'Previous Employment Proof', icon: Briefcase, required: false, desc: 'Relieving letter or experience certificate (if applicable).' },
];

export default function CandidateOnboardingPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  
  const [request, setRequest] = useState<OnboardingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Phone form state
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  
  // Upload and Action States
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const fetchOnboardingDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/public/onboarding/${id}`);
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setRequest(data);
        setPhone(data.phone || '');
        if (data.status === 'pending' && data.documents?.length > 0 && !data.rejection_reason) {
          // If already has uploaded documents, let's display submission confirmation state or let them edit
        }
      } else {
        toast.error('Failed to load onboarding request details');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Error fetching onboarding details. Please verify the URL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingDetails();
  }, [id]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setSavingPhone(true);
    try {
      await api.put(`/public/onboarding/${id}`, { phone });
      toast.success('Phone number updated successfully!');
      fetchOnboardingDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update phone number');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', docType);

    setUploadingType(docType);
    try {
      await api.post(`/public/onboarding/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Uploaded successfully!`);
      fetchOnboardingDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingType(null);
      // Clear file input
      if (fileInputRefs.current[docType]) {
        fileInputRefs.current[docType]!.value = '';
      }
    }
  };

  const handleDeleteDocument = async (docId: number, typeLabel: string) => {
    if (!confirm(`Are you sure you want to delete the uploaded document for ${typeLabel}?`)) return;
    try {
      await api.delete(`/public/onboarding/documents/${docId}`);
      toast.success('Document deleted successfully');
      fetchOnboardingDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleFinalSubmit = async () => {
    // Check if all required docs are uploaded
    const uploadedTypes = request?.documents.map(d => d.document_type) || [];
    const missingRequired = documentTypes
      .filter(t => t.required)
      .filter(t => !uploadedTypes.includes(t.value));

    if (missingRequired.length > 0) {
      toast.error(`Please upload all required documents: ${missingRequired.map(t => t.label).join(', ')}`);
      return;
    }

    if (!phone) {
      toast.error('Please fill and save your phone number before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/public/onboarding/${id}/submit`);
      setIsSubmitted(true);
      
      // Confetti celebration
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Double tap confetti
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.6 }
        });
      }, 350);
      
      fetchOnboardingDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit onboarding files');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-semibold text-sm">Loading onboarding portal...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center space-y-4">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">Invalid Onboarding Link</h1>
          <p className="text-slate-500 text-sm">
            We couldn't find a valid onboarding request matching this URL. Please verify the link in your email or contact the HR team.
          </p>
        </div>
      </div>
    );
  }

  const requiredTypes = documentTypes.filter(d => d.required).map(d => d.value);
  const uploadedDocs = request.documents || [];
  const uploadedRequiredDocs = uploadedDocs.filter(d => requiredTypes.includes(d.document_type));
  const progressPercent = Math.round((uploadedRequiredDocs.length / requiredTypes.length) * 100);

  // Status mapping
  const isApproved = request.status === 'approved' || request.status === 'onboarded';
  const isRejected = request.status === 'rejected';

  if (isSubmitted || (request.status === 'pending' && uploadedRequiredDocs.length === requiredTypes.length && !request.rejection_reason)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-lg border border-slate-100 p-10 text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 border border-green-100">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-850">Onboarding Documents Submitted!</h1>
            <p className="text-slate-500 text-sm">
              Thank you, <span className="font-semibold text-slate-800">{request.candidate_name}</span>. Your onboarding documents and profile details have been successfully received.
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left text-sm space-y-3">
            <h3 className="font-bold text-slate-700">What happens next?</h3>
            <ul className="space-y-2 text-slate-600 text-xs">
              <li className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                <span>The HR team will review your uploaded documents and verify the details.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                <span>If any information is incomplete or requires correction, we will notify you immediately.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                <span>Upon successful verification, your official Employment Offer Letter will be issued.</span>
              </li>
            </ul>
          </div>
          <p className="text-xs text-slate-400">
            Target Joining Date: {new Date(request.joining_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {request.status === 'rejected' && (
            <Button onClick={() => setIsSubmitted(false)} variant="outline" className="rounded-xl w-full">
              Make Changes / Resubmit
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl"></div>
          <div className="relative space-y-4">
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="animate-pulse" /> Onboarding Portal
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome to Techsprout!</h1>
            <p className="text-indigo-100 text-sm max-w-xl">
              Congratulations on your selection! Please complete your onboarding file by filling in your phone number and uploading all required documents.
            </p>
          </div>
        </div>

        {/* Status and Details Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Details Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 md:col-span-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Your Position Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <Building2 className="text-indigo-600" size={18} />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Department</p>
                  <p className="font-bold text-slate-700">{request.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <BriefcaseIcon className="text-indigo-600" size={18} />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Position Role</p>
                  <p className="font-bold text-slate-700">{request.position}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <Calendar className="text-indigo-600" size={18} />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Joining Date</p>
                  <p className="font-bold text-slate-700">
                    {new Date(request.joining_date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <Mail className="text-indigo-600" size={18} />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Email Address</p>
                  <p className="font-bold text-slate-700 truncate">{request.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Status Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Checklist Progress</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-black text-slate-800">{progressPercent}%</span>
                  <span className="text-xs text-slate-400 font-bold">{uploadedRequiredDocs.length} / {requiredTypes.length} Required</span>
                </div>
                <Progress value={progressPercent} className="h-2 rounded-full" />
              </div>
            </div>
            <div className="pt-2">
              <Badge className={`rounded-xl px-3 py-1 text-xs font-semibold capitalize tracking-wide w-full justify-center flex border ${
                isApproved 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : isRejected 
                    ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-250'
              }`}>
                {request.status === 'pending' ? 'Pending Uploads' : request.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Alert box for rejection comments */}
        {isRejected && request.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 flex gap-4 items-start animate-in slide-in-from-top duration-300">
            <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-red-800 text-sm">Action Required: Document Changes Needed</h3>
              <p className="text-red-700 text-xs leading-relaxed">
                Our HR team reviewed your file and requested corrections: <span className="font-bold italic">"{request.rejection_reason}"</span>. Please review the checklist below, upload correct documents, and submit again.
              </p>
            </div>
          </div>
        )}

        {/* Contact Details Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">1. Verify Contact Number</h2>
            <p className="text-[10px] text-slate-400 font-medium">Required for communication</p>
          </div>
          <form onSubmit={handlePhoneSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input 
                type="tel"
                placeholder="Enter your mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9 h-11 rounded-2xl border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-transparent"
                required
              />
            </div>
            <Button type="submit" disabled={savingPhone || phone === request.phone} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl h-11 px-6 shadow-sm">
              {savingPhone ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Save Number</>
              )}
            </Button>
          </form>
        </div>

        {/* Document Checklists Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">2. Upload Required Documents</h2>
            <p className="text-xs text-slate-400 mt-0.5">Please upload high-quality scanned copies or PDFs. Max 5MB per file.</p>
          </div>

          <div className="divide-y divide-slate-100">
            {documentTypes.map((docType) => {
              const uploadedDoc = uploadedDocs.find(d => d.document_type === docType.value);
              const isUploading = uploadingType === docType.value;
              
              return (
                <div key={docType.value} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex items-center justify-center shrink-0 mt-0.5">
                      <docType.icon size={22} className="text-indigo-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{docType.label}</span>
                        {docType.required && (
                          <Badge className="bg-slate-100 text-slate-500 text-[9px] hover:bg-slate-100 font-bold px-1.5 py-0.5 rounded">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-450 max-w-md">{docType.desc}</p>
                      
                      {uploadedDoc?.status === 'rejected' && uploadedDoc.verification_notes && (
                        <p className="text-[10px] text-red-650 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1 font-medium mt-1">
                          Rejection note: {uploadedDoc.verification_notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center md:justify-end gap-3 self-end md:self-center">
                    {uploadedDoc ? (
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 py-1.5 px-3 rounded-2xl">
                        {/* Doc Status Badge */}
                        <div className="flex items-center gap-1.5">
                          {uploadedDoc.status === 'verified' && <CheckCircle size={14} className="text-green-500" />}
                          {uploadedDoc.status === 'rejected' && <XCircle size={14} className="text-red-500" />}
                          {uploadedDoc.status === 'pending' && <Clock size={14} className="text-yellow-500 animate-pulse" />}
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            uploadedDoc.status === 'verified' 
                              ? 'text-green-650' 
                              : uploadedDoc.status === 'rejected' 
                                ? 'text-red-650' 
                                : 'text-yellow-650'
                          }`}>
                            {uploadedDoc.status}
                          </span>
                        </div>

                        {/* File details */}
                        <div className="max-w-[150px] sm:max-w-[200px] truncate text-xs font-semibold text-slate-600">
                          {uploadedDoc.original_name}
                        </div>

                        {/* Actions */}
                        {uploadedDoc.status !== 'verified' && (
                          <button
                            onClick={() => handleDeleteDocument(uploadedDoc.id, docType.label)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                            title="Delete document"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          ref={(el) => { fileInputRefs.current[docType.value] = el; }}
                          onChange={(e) => handleFileUpload(e, docType.value)}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRefs.current[docType.value]?.click()}
                          disabled={isUploading}
                          className="rounded-2xl border-slate-200 hover:bg-slate-50 h-10 px-4 text-xs font-bold gap-2 text-slate-700"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload size={14} />
                              Choose File
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Action Block */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
          <div className="space-y-1 relative">
            <h3 className="text-lg font-bold">Ready to complete your onboarding file?</h3>
            <p className="text-slate-400 text-xs max-w-lg">
              Once you submit your files, the HR team will begin verification. You won't be able to edit verified documents.
            </p>
          </div>
          <Button
            onClick={handleFinalSubmit}
            disabled={submitting || progressPercent < 100 || !phone || phone !== request.phone}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl h-12 px-6 text-sm font-bold gap-2 self-start md:self-center shrink-0 disabled:opacity-40 disabled:hover:bg-blue-600"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Onboarding File
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
