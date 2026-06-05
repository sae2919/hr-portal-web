'use client';

import { useState, useEffect, use, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle, XCircle, Clock, Shield, 
  FileCheck, File, DollarSign, Briefcase, Trash2, ArrowRight, 
  Phone, Mail, Calendar, Building2, BriefcaseIcon, Check, Loader2, Sparkles,
  User, MapPin, Landmark
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
  personal_details?: {
    dob?: string;
    gender?: string;
    address?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    bank_branch?: string;
    pan_number?: string;
    aadhaar_number?: string;
    passport_number?: string;
    driving_license?: string;
  };
  created_at: string;
}

const documentTypes = [
  { value: 'resume', label: 'Resume/CV', icon: FileText, required: true, desc: 'Your latest resume in PDF format.' },
  { value: 'id_proof', label: 'ID Proof (Passport/Voter ID)', icon: Shield, required: true, desc: 'Government-issued photo identity proof.' },
  { value: 'pan_card', label: 'PAN Card Copy', icon: Shield, required: true, desc: 'Permanent Account Number card copy.' },
  { value: 'aadhaar_card', label: 'Aadhaar Card Copy', icon: Shield, required: true, desc: 'Aadhaar Card (front & back).' },
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
  const [isExpired, setIsExpired] = useState(false);
  
  // Consolidated Form Details State
  const [formData, setFormData] = useState({
    phone: '',
    dob: '',
    gender: 'male',
    address: '',
    permanentAddress: '',
    sameAsPresent: false,
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_branch: '',
    pan_number: '',
    aadhaar_number: '',
    passport_number: '',
    driving_license: '',
  });
  
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
        
        // Populate existing values if present
        const pDetails = data.personal_details || {};
        
        // Split addresses if permanent address is included
        const fullAddr = pDetails.address || '';
        let presentAddr = fullAddr;
        let permAddr = '';
        let sameAs = false;
        
        if (fullAddr.includes('--- PERMANENT ADDRESS ---')) {
          const parts = fullAddr.split('--- PERMANENT ADDRESS ---');
          presentAddr = parts[0].replace('--- PRESENT ADDRESS ---', '').trim();
          permAddr = parts[1].trim();
        } else if (fullAddr) {
          presentAddr = fullAddr;
          permAddr = fullAddr;
          sameAs = true;
        }

        setFormData({
          phone: data.phone || '',
          dob: pDetails.dob || '',
          gender: pDetails.gender || 'male',
          address: presentAddr,
          permanentAddress: permAddr,
          sameAsPresent: sameAs,
          bank_name: pDetails.bank_name || '',
          bank_account_number: pDetails.bank_account_number || '',
          bank_ifsc: pDetails.bank_ifsc || '',
          bank_branch: pDetails.bank_branch || '',
          pan_number: pDetails.pan_number || '',
          aadhaar_number: pDetails.aadhaar_number || '',
          passport_number: pDetails.passport_number || '',
          driving_license: pDetails.driving_license || '',
        });
      } else {
        toast.error('Failed to load onboarding request details');
      }
    } catch (err: any) {
      console.error(err);
      if (err?.response?.status === 403) {
        setIsExpired(true);
      }
      toast.error(err?.response?.data?.message || 'Error fetching onboarding details. Please verify the URL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingDetails();
  }, [id]);

  // Handle address check logic
  useEffect(() => {
    if (formData.sameAsPresent) {
      setFormData(prev => ({ ...prev, permanentAddress: prev.address }));
    }
  }, [formData.address, formData.sameAsPresent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      sameAsPresent: checked,
      permanentAddress: checked ? prev.address : '' 
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit.');
      return;
    }

    const fileData = new FormData();
    fileData.append('document', file);
    fileData.append('document_type', docType);

    setUploadingType(docType);
    try {
      await api.post(`/public/onboarding/${id}/documents`, fileData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`File uploaded successfully!`);
      fetchOnboardingDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingType(null);
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

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if all required docs are uploaded
    const uploadedTypes = request?.documents.map(d => d.document_type) || [];
    const missingRequired = documentTypes
      .filter(t => t.required)
      .filter(t => !uploadedTypes.includes(t.value));

    if (missingRequired.length > 0) {
      toast.error(`Please upload all required files first: ${missingRequired.map(t => t.label).join(', ')}`);
      return;
    }

    // Combine addresses for backend storage
    const combinedAddress = formData.sameAsPresent 
      ? formData.address 
      : `--- PRESENT ADDRESS ---\n${formData.address}\n\n--- PERMANENT ADDRESS ---\n${formData.permanentAddress}`;

    setSubmitting(true);
    try {
      await api.post(`/public/onboarding/${id}/submit`, {
        phone: formData.phone,
        dob: formData.dob,
        gender: formData.gender,
        address: combinedAddress,
        bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number,
        bank_ifsc: formData.bank_ifsc,
        bank_branch: formData.bank_branch,
        pan_number: formData.pan_number || undefined,
        aadhaar_number: formData.aadhaar_number || undefined,
        passport_number: formData.passport_number || undefined,
        driving_license: formData.driving_license || undefined,
      });

      setIsSubmitted(true);
      
      // Confetti celebration
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.6 }
        });
      }, 300);
      
      fetchOnboardingDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit onboarding form details');
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

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center space-y-4">
          <Clock className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
          <h1 className="text-xl font-bold text-slate-800">Onboarding Link Expired</h1>
          <p className="text-slate-500 text-sm">
            This secure onboarding link has expired because it was sent more than 48 hours ago. Please contact the HR team to receive a new link.
          </p>
        </div>
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

  const isApproved = request.status === 'approved' || request.status === 'onboarded';
  const isRejected = request.status === 'rejected';

  // Check if onboarding form PDF is generated
  const onboardingFormDoc = uploadedDocs.find(d => d.document_type === 'onboarding_form');

  if (isSubmitted || onboardingFormDoc) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-lg border border-slate-100 p-10 text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 border border-green-100">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-850">Onboarding Details Submitted!</h1>
            <p className="text-slate-500 text-sm">
              Thank you, <span className="font-semibold text-slate-850">{request.candidate_name}</span>. Your onboarding details and files have been successfully compiled into your employee profile.
            </p>
          </div>
          {onboardingFormDoc && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs flex justify-between items-center text-left">
              <div>
                <p className="font-bold text-blue-800">Generated Onboarding Record:</p>
                <p className="text-blue-650 mt-0.5">{onboardingFormDoc.original_name} ({onboardingFormDoc.file_size})</p>
              </div>
              <Badge className="bg-blue-100 text-blue-700 capitalize border border-blue-200">
                {onboardingFormDoc.status}
              </Badge>
            </div>
          )}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left text-sm space-y-3">
            <h3 className="font-bold text-slate-700">Next Steps</h3>
            <ul className="space-y-2 text-slate-650 text-xs">
              <li className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                <span>The HR team will review your compiled details form and verified documents.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                <span>Upon review completion, your official offer letter package will be verified.</span>
              </li>
            </ul>
          </div>
          <p className="text-xs text-slate-400">
            Target Joining Date: {new Date(request.joining_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <form onSubmit={handleFinalSubmit} className="max-w-4xl mx-auto space-y-8">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative space-y-4">
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="animate-pulse" /> Techsprout Onboarding
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Onboarding Details & Documents</h1>
            <p className="text-indigo-100 text-sm max-w-xl">
              Congratulations, <span className="font-semibold text-white">{request.candidate_name}</span>! Please complete this form to submit your employee details and document copies.
            </p>
          </div>
        </div>

        {/* Position details & summary header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 md:col-span-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Position Allocation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                <Building2 className="text-indigo-600 shrink-0" size={16} />
                <div className="truncate">
                  <p className="text-[9px] text-slate-400 font-semibold uppercase">Department</p>
                  <p className="font-bold text-slate-700 truncate">{request.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                <BriefcaseIcon className="text-indigo-600 shrink-0" size={16} />
                <div className="truncate">
                  <p className="text-[9px] text-slate-400 font-semibold uppercase">Target Role</p>
                  <p className="font-bold text-slate-700 truncate">{request.position}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Files checklist</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xl font-black text-slate-800">{progressPercent}%</span>
                  <span className="text-[10px] text-slate-450 font-bold">{uploadedRequiredDocs.length}/{requiredTypes.length} Uploaded</span>
                </div>
                <Progress value={progressPercent} className="h-1.5 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {isRejected && request.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 flex gap-4 items-start animate-in slide-in-from-top duration-300">
            <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-red-800 text-sm">Action Required: Correction Requested</h3>
              <p className="text-red-700 text-xs leading-relaxed">
                HR notes: <span className="font-bold italic">"{request.rejection_reason}"</span>. Please review the details below, correct any wrong entries/documents, and resubmit.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 1: Personal Details */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <User className="text-indigo-600" size={20} />
            <h2 className="text-base font-bold text-slate-800">1. Personal Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="phone">Contact Mobile Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={formData.phone}
                onChange={handleInputChange}
                className="h-10 rounded-xl border-slate-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={handleInputChange}
                className="h-10 rounded-xl border-slate-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Address Details */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <MapPin className="text-indigo-600" size={20} />
            <h2 className="text-base font-bold text-slate-800">2. Address Details</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Present / Correspondence Address *</Label>
              <textarea
                id="address"
                placeholder="Enter present correspondence address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full min-h-[80px] text-sm rounded-xl border border-slate-200 p-3 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sameAsPresent"
                checked={formData.sameAsPresent}
                onChange={handleCheckboxChange}
                className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="sameAsPresent" className="text-xs font-semibold text-slate-500 cursor-pointer select-none">
                Permanent Address is same as Present Address
              </label>
            </div>

            {!formData.sameAsPresent && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <Label htmlFor="permanentAddress">Permanent Address *</Label>
                <textarea
                  id="permanentAddress"
                  placeholder="Enter permanent address"
                  value={formData.permanentAddress}
                  onChange={handleInputChange}
                  className="w-full min-h-[80px] text-sm rounded-xl border border-slate-200 p-3 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Tax & Identity Details */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Shield className="text-indigo-600" size={20} />
            <h2 className="text-base font-bold text-slate-800">3. Identity & Tax Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="pan_number">PAN Number (Optional)</Label>
              <Input
                id="pan_number"
                placeholder="Enter 10-digit PAN (e.g. ABCDE1234F)"
                value={formData.pan_number}
                onChange={handleInputChange}
                pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                title="Enter a valid PAN code (e.g. ABCDE1234F)"
                className="h-10 rounded-xl border-slate-200 uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadhaar_number">Aadhaar Card Number (Optional)</Label>
              <Input
                id="aadhaar_number"
                placeholder="Enter 12-digit Aadhaar number"
                value={formData.aadhaar_number}
                onChange={handleInputChange}
                pattern="[0-9]{12}"
                title="Enter 12-digit numeric Aadhaar number"
                className="h-10 rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passport_number">Passport Number (Optional)</Label>
              <Input
                id="passport_number"
                placeholder="Enter Passport number"
                value={formData.passport_number}
                onChange={handleInputChange}
                className="h-10 rounded-xl border-slate-200 uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driving_license">Driving License Number (Optional)</Label>
              <Input
                id="driving_license"
                placeholder="Enter DL number"
                value={formData.driving_license}
                onChange={handleInputChange}
                className="h-10 rounded-xl border-slate-200 uppercase"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Bank Account Details */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Landmark className="text-indigo-600" size={20} />
            <h2 className="text-base font-bold text-slate-800">4. Bank Account Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input
                id="bank_name"
                placeholder="e.g. HDFC Bank, ICICI Bank"
                value={formData.bank_name}
                onChange={handleInputChange}
                className="h-10 rounded-xl border-slate-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account_number">Account Number *</Label>
              <Input
                id="bank_account_number"
                placeholder="Enter Account Number"
                value={formData.bank_account_number}
                onChange={handleInputChange}
                className="h-10 rounded-xl border-slate-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_ifsc">Bank IFSC Code *</Label>
              <Input
                id="bank_ifsc"
                placeholder="Enter 11-digit IFSC (e.g. HDFC0000245)"
                value={formData.bank_ifsc}
                onChange={handleInputChange}
                className="h-10 rounded-xl border-slate-200 uppercase"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_branch">Branch Name *</Label>
              <Input
                id="bank_branch"
                placeholder="Enter Bank Branch Location"
                value={formData.bank_branch}
                onChange={handleInputChange}
                className="h-10 rounded-xl border-slate-200"
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: Upload Files */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Upload className="text-indigo-600" size={20} />
            <h2 className="text-base font-bold text-slate-800">5. Upload Required Document Copies</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {documentTypes.map((docType) => {
              const uploadedDoc = uploadedDocs.find(d => d.document_type === docType.value);
              const isUploading = uploadingType === docType.value;
              
              return (
                <div key={docType.value} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50/50 border border-indigo-100/50 flex items-center justify-center shrink-0 mt-0.5">
                      <docType.icon size={18} className="text-indigo-600" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{docType.label}</span>
                        {docType.required && (
                          <Badge className="bg-slate-100 text-slate-500 text-[8px] hover:bg-slate-100 font-bold px-1.5 py-0.5 rounded">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 max-w-md">{docType.desc}</p>
                      {uploadedDoc?.status === 'rejected' && uploadedDoc.verification_notes && (
                        <p className="text-[10px] text-red-650 bg-red-50 border border-red-100 rounded-lg px-2 py-0.5 font-medium mt-1 inline-block">
                          Rejection note: {uploadedDoc.verification_notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center md:justify-end gap-3 self-end md:self-center">
                    {uploadedDoc ? (
                      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 py-1.5 px-3 rounded-xl text-xs">
                        <div className="flex items-center gap-1">
                          {uploadedDoc.status === 'verified' && <CheckCircle size={13} className="text-green-500" />}
                          {uploadedDoc.status === 'rejected' && <XCircle size={13} className="text-red-500" />}
                          {uploadedDoc.status === 'pending' && <Clock size={13} className="text-yellow-500 animate-pulse" />}
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${
                            uploadedDoc.status === 'verified' ? 'text-green-600' : uploadedDoc.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {uploadedDoc.status}
                          </span>
                        </div>

                        <div className="max-w-[120px] sm:max-w-[180px] truncate font-semibold text-slate-650">
                          {uploadedDoc.original_name}
                        </div>

                        {uploadedDoc.status !== 'verified' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(uploadedDoc.id, docType.label)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                          >
                            <Trash2 size={13} />
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
                          className="rounded-xl border-slate-200 hover:bg-slate-50 h-9 px-3 text-xs font-bold gap-1.5 text-slate-600"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload size={13} />
                              Attach File
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
            <h3 className="text-lg font-bold">Ready to complete your onboarding submission?</h3>
            <p className="text-slate-400 text-xs max-w-lg">
              Once submitted, all details and document copies are compiled into a details form PDF, which is stored instantly in your candidate onboarding record.
            </p>
          </div>
          <Button
            type="submit"
            disabled={submitting || progressPercent < 100}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl h-12 px-6 text-sm font-bold gap-2 self-start md:self-center shrink-0 disabled:opacity-40 disabled:hover:bg-blue-600"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting Form...
              </>
            ) : (
              <>
                Submit Onboarding Details
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>

      </form>
    </div>
  );
}
