'use client';

import { useState, useEffect, Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Laptop, Monitor, Smartphone, Keyboard, Mouse, Headphones,
  Radio, Boxes, Search, Plus, Pencil, Trash2, Loader2,
  X, User, UserPlus, CheckCircle, RotateCcw, Calendar,
  CreditCard, ChevronLeft, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Asset, AssetAllocation } from '@/types/asset';
import { Employee } from '@/types/employee';

// Schema for Asset Form
const assetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.string().min(1, 'Type is required'),
  custom_type: z.string().max(255).optional(),
  brand: z.string().max(255).optional().or(z.literal('')),
  model: z.string().max(255).optional().or(z.literal('')),
  serial_number: z.string().max(255).optional().or(z.literal('')),
  purchase_date: z.string().optional().or(z.literal('')),
  purchase_price: z.string().optional().or(z.literal('')),
  specifications: z.string().max(1000).optional().or(z.literal('')),
  status: z.enum(['available', 'assigned', 'maintenance', 'scrapped']).optional(),
  has_charger: z.boolean().optional(),
  has_sim: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'other' && (!data.custom_type || data.custom_type.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please specify the asset type',
      path: ['custom_type'],
    });
  }
});

type AssetFormData = z.infer<typeof assetSchema>;

// Icon helper by asset type
const getAssetIcon = (type: string) => {
  switch (type) {
    case 'laptop': return Laptop;
    case 'monitor': return Monitor;
    case 'phone': return Smartphone;
    case 'keyboard': return Keyboard;
    case 'mouse': return Mouse;
    case 'headset': return Headphones;
    case 'docking_station': return Radio;
    default: return Boxes;
  }
};

// Formatted asset type labels
const typeLabels: Record<string, string> = {
  laptop: 'Laptop',
  monitor: 'Monitor',
  phone: 'Mobile Phone',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  headset: 'Headset',
  docking_station: 'Docking Station',
  other: 'Other Asset',
};

// Asset Modal (Add/Edit)
function AssetModal({ open, onClose, asset, onSaveSuccess }: {
  open: boolean;
  onClose: () => void;
  asset?: Asset | null;
  onSaveSuccess: () => void;
}) {
  const isEdit = !!asset;
  const [loading, setLoading] = useState(false);
  const [hasCharger, setHasCharger] = useState<boolean>(true);
  const [hasSim, setHasSim] = useState<boolean>(true);

  const standardTypes = ['laptop', 'monitor', 'phone', 'keyboard', 'mouse', 'headset', 'docking_station'];

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: asset?.name ?? '',
      type: asset?.type ?? 'laptop',
      custom_type: '',
      brand: asset?.brand ?? '',
      model: asset?.model ?? '',
      serial_number: asset?.serial_number ?? '',
      purchase_date: asset?.purchase_date ?? '',
      purchase_price: asset?.purchase_price ?? '',
      specifications: asset?.specifications ?? '',
      status: asset?.status ?? 'available',
    },
  });

  useEffect(() => {
    if (open) {
      const isCustom = asset ? !standardTypes.includes(asset.type) : false;
      reset({
        name: asset?.name ?? '',
        type: asset ? (isCustom ? 'other' : asset.type) : 'laptop',
        custom_type: asset && isCustom ? asset.type : '',
        brand: asset?.brand ?? '',
        model: asset?.model ?? '',
        serial_number: asset?.serial_number ?? '',
        purchase_date: asset?.purchase_date ?? '',
        purchase_price: asset?.purchase_price ?? '',
        specifications: asset?.specifications ?? '',
        status: asset?.status ?? 'available',
      });
      // Pre-populate charger/SIM toggles from existing asset or default true
      setHasCharger(asset?.has_charger !== false);
      setHasSim(asset?.has_sim !== false);
    }
  }, [open, asset, reset]);

  const selectedType = watch('type');

  const onSubmit = async (data: AssetFormData) => {
    setLoading(true);
    try {
      const finalType = data.type === 'other' ? (data.custom_type || 'other').trim() : data.type;
      const payload = {
        name: data.name,
        type: finalType,
        brand: data.brand || null,
        model: data.model || null,
        serial_number: data.serial_number || null,
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price ? Number(data.purchase_price) : null,
        specifications: data.specifications || null,
        status: data.status,
        has_charger: hasCharger,
        has_sim: finalType === 'phone' ? hasSim : null,
      };

      if (isEdit && asset) {
        await api.put(`/assets/${asset.id}`, payload);
        toast.success('Asset updated successfully');
      } else {
        await api.post('/assets', payload);
        toast.success('Asset created successfully');
      }
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save asset';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 overflow-y-auto max-h-[90vh] animate-in fade-in duration-150">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Laptop className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {isEdit ? 'Edit Asset' : 'Add New Asset'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEdit ? 'Update inventory asset details' : 'Register a new asset to inventory'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* First row: Type | [Specify if Other] | Name — 2 or 3 cols */}
          <div className={`grid grid-cols-1 gap-4 ${selectedType === 'other' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Asset Type *</Label>
              <select
                {...register('type')}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm h-9 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="laptop">Laptop</option>
                <option value="monitor">Monitor</option>
                <option value="phone">Mobile Phone</option>
                <option value="keyboard">Keyboard</option>
                <option value="mouse">Mouse</option>
                <option value="headset">Headset</option>
                <option value="docking_station">Docking Station</option>
                <option value="other">Other</option>
              </select>
            </div>

            {selectedType === 'other' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <Label className="text-xs font-medium text-slate-700">Specify Asset Type *</Label>
                <Input placeholder="e.g. UPS, Router, Tablet" {...register('custom_type')} />
                {errors.custom_type && <p className="text-red-500 text-[10px]">{errors.custom_type.message}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Asset Name *</Label>
              <Input placeholder="e.g. MacBook Pro 16" {...register('name')} />
              {errors.name && <p className="text-red-500 text-[10px]">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Brand</Label>
              <Input placeholder="e.g. Apple" {...register('brand')} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Model</Label>
              <Input placeholder="e.g. M2 Max 2023" {...register('model')} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Serial Number</Label>
              <Input placeholder="e.g. C02D1234F2L2" {...register('serial_number')} />
            </div>

            {isEdit && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Status</Label>
                <select
                  {...register('status')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm h-9 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="scrapped">Scrapped</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Purchase Date</Label>
              <Input type="date" {...register('purchase_date')} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Purchase Price (INR)</Label>
              <Input type="number" step="0.01" placeholder="e.g. 150000" {...register('purchase_price')} />
            </div>
          </div>

          {/* Charger & SIM toggles */}
          <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Accessories</h4>
            {/* Charger — all asset types */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-700">Charger</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasCharger(true)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all border ${
                    hasCharger
                      ? 'bg-green-50 text-green-700 border-green-300'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  With Charger
                </button>
                <button
                  type="button"
                  onClick={() => setHasCharger(false)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all border ${
                    !hasCharger
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  No Charger
                </button>
              </div>
            </div>
            {/* SIM — only for mobile phone */}
            {selectedType === 'phone' && (
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-slate-700">SIM Card</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHasSim(true)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all border ${
                      hasSim
                        ? 'bg-green-50 text-green-700 border-green-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    With SIM
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasSim(false)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all border ${
                      !hasSim
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    No SIM
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Specifications / Notes</Label>
            <textarea
              placeholder="e.g. 32GB RAM, 1TB SSD, Space Grey"
              {...register('specifications')}
              className="w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Update Asset' : 'Register Asset'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Allocate Asset Modal
function AllocateModal({ open, onClose, asset, onAllocateSuccess }: {
  open: boolean;
  onClose: () => void;
  asset: Asset | null;
  onAllocateSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [allocateType, setAllocateType] = useState<'employee' | 'onboarding'>('employee');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [onboardings, setOnboardings] = useState<any[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<number | string>('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [chargerGiven, setChargerGiven] = useState<boolean>(true);
  const [simGiven, setSimGiven] = useState<boolean>(true);

  // Fetch employees and onboarding requests
  useEffect(() => {
    if (open) {
      // Get active employees
      api.get('/employees?status=active').then((res) => {
        setEmployees(res.data.data || []);
      });
      // Get pending onboarding requests
      api.get('/onboarding?status=approved').then((res) => {
        setOnboardings(res.data.data?.data || []);
      });
      setSelectedEntityId('');
      setConditionNotes('');
      // Default charger/SIM given to match asset's own accessories
      setChargerGiven(asset?.has_charger !== false);
      setSimGiven(asset?.has_sim !== false);
    }
  }, [open, asset]);

  const handleAllocate = async () => {
    if (!selectedEntityId) {
      toast.error(`Please select a ${allocateType === 'employee' ? 'employee' : 'candidate'}`);
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        condition_notes: conditionNotes || null,
        charger_given: asset?.has_charger !== null ? chargerGiven : null,
        sim_given: asset?.type === 'phone' ? simGiven : null,
      };

      if (allocateType === 'employee') {
        payload.employee_id = Number(selectedEntityId);
      } else {
        payload.onboarding_request_id = Number(selectedEntityId);
      }

      await api.post(`/assets/${asset?.id}/allocate`, payload);
      toast.success('Asset allocated successfully');
      onAllocateSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to allocate asset';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !asset) return null;

  // Options for employees dropdown
  const employeeOptions = employees.map(emp => ({
    id: emp.id,
    label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})`,
    sublabel: emp.designation?.title || 'No designation',
    department: emp.department?.name || ''
  }));

  // Options for onboarding dropdown
  const onboardingOptions = onboardings.map(req => ({
    id: req.id,
    label: `${req.candidate_name} (${req.email})`,
    sublabel: req.position || 'Candidate',
    department: req.department || ''
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-in fade-in duration-150">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Allocate Asset</h2>
              <p className="text-xs text-slate-400">Assign {asset.name} ({asset.asset_code})</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Allocation Target</Label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => { setAllocateType('employee'); setSelectedEntityId(''); }}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                  allocateType === 'employee' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Active Employee
              </button>
              <button
                type="button"
                onClick={() => { setAllocateType('onboarding'); setSelectedEntityId(''); }}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                  allocateType === 'onboarding' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Onboarding Candidate
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              Select {allocateType === 'employee' ? 'Employee' : 'Candidate'} *
            </Label>
            <SearchableSelect
              options={allocateType === 'employee' ? employeeOptions : onboardingOptions}
              value={selectedEntityId}
              onChange={(val) => setSelectedEntityId(val)}
              placeholder={`Search and select ${allocateType === 'employee' ? 'employee' : 'candidate'}...`}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Allocation Condition Notes</Label>
            <textarea
              placeholder="e.g. Brand new, sealed box or minor scratches on lid"
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              className="w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Charger & SIM handing over toggles */}
          <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Handing Over Accessories</h4>
            {/* Charger */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-700">Charger</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChargerGiven(true)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all border ${
                    chargerGiven
                      ? 'bg-green-50 text-green-700 border-green-300'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  Giving Charger
                </button>
                <button
                  type="button"
                  onClick={() => setChargerGiven(false)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all border ${
                    !chargerGiven
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  No Charger
                </button>
              </div>
            </div>
            {/* SIM — only for mobile phone */}
            {asset.type === 'phone' && (
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-slate-700">SIM Card</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSimGiven(true)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all border ${
                      simGiven
                        ? 'bg-green-50 text-green-700 border-green-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Giving SIM
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimGiven(false)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all border ${
                      !simGiven
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    No SIM
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Allocate Asset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Return Asset Modal
function ReturnModal({ open, onClose, allocation, onReturnSuccess }: {
  open: boolean;
  onClose: () => void;
  allocation: AssetAllocation | null;
  onReturnSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [condition, setCondition] = useState('good');

  useEffect(() => {
    if (open) {
      setReturnNotes('');
      setCondition('good');
    }
  }, [open]);

  const handleReturn = async () => {
    if (!allocation) return;
    setLoading(true);
    try {
      await api.post(`/assets/allocations/${allocation.id}/return`, {
        return_notes: returnNotes || null,
        condition: condition
      });
      toast.success('Asset returned to inventory pool');
      onReturnSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to return asset';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !allocation) return null;

  const employee = allocation.employee;
  const onboardingRequest = allocation.onboarding_request || (allocation as any).onboardingRequest;
  const holderName = employee
    ? `${employee.first_name || (employee as any).firstName || ''} ${employee.last_name || (employee as any).lastName || ''}`.trim()
    : onboardingRequest
      ? (onboardingRequest.candidate_name || onboardingRequest.candidateName || 'Candidate')
      : 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-in fade-in duration-150">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Return Asset</h2>
              <p className="text-xs text-slate-400">Collect {allocation.asset?.name} from {holderName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Return Condition</Label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm h-9 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="good">Good Condition (Clean / Normal Wear)</option>
              <option value="damaged">Damaged (Requires Repair / Broken)</option>
              <option value="lost">Lost / Missing</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Return Notes / Comments</Label>
            <textarea
              placeholder="e.g. Charger returned. Mouse is working but shows scuffs."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleReturn} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Return Asset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Assets Page
export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inventory' | 'allocated'>('inventory');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<number | null>(null);
  const [totalRegistered, setTotalRegistered] = useState<number>(0);

  // Modals state
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedAssetForAllocate, setSelectedAssetForAllocate] = useState<Asset | null>(null);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedAllocationForReturn, setSelectedAllocationForReturn] = useState<AssetAllocation | null>(null);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assets', {
        params: {
          search: search || undefined,
          type: type || undefined,
          status: activeTab === 'allocated' ? 'assigned' : (status || 'exclude_assigned'),
          page
        }
      });
      setAssets(res.data.data?.data || []);
      setMeta(res.data.data || null);
      setTotalRegistered(res.data.total_registered ?? 0);
    } catch (err) {
      console.error('Failed to fetch assets', err);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setExpandedAssetId(null);
    fetchAssets();
  }, [search, type, status, page, activeTab]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (filterType: 'type' | 'status', val: string) => {
    if (filterType === 'type') setType(val);
    if (filterType === 'status') setStatus(val);
    setPage(1);
  };

  const handleTabChange = (tab: 'inventory' | 'allocated') => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
    setStatus('');
    setExpandedAssetId(null);
  };

  const openCreateModal = () => {
    setSelectedAsset(null);
    setAssetModalOpen(true);
  };

  const openEditModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetModalOpen(true);
  };

  const openAllocateModal = (asset: Asset) => {
    setSelectedAssetForAllocate(asset);
    setAllocateModalOpen(true);
  };

  const openReturnModal = (asset: Asset) => {
    if (asset.current_allocation) {
      setSelectedAllocationForReturn({
        ...asset.current_allocation,
        asset: asset
      });
      setReturnModalOpen(true);
    } else {
      toast.error('No active allocation found for this asset');
    }
  };

  const handleActionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['employee'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    fetchAssets();
  };

  const handleDelete = async (asset: Asset) => {
    if (window.confirm(`Are you sure you want to remove ${asset.name} (${asset.asset_code}) from inventory?`)) {
      try {
        await api.delete(`/assets/${asset.id}`);
        toast.success('Asset removed successfully');
        queryClient.invalidateQueries({ queryKey: ['employee'] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        fetchAssets();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to remove asset');
      }
    }
  };

  // Pagination meta data
  const total = meta?.total ?? 0;
  const lastPage = meta?.last_page ?? 1;
  const from = meta?.from ?? 0;
  const to = meta?.to ?? 0;

  // Status badges colors
  const statusBadgeColor = (st: string) => {
    switch (st) {
      case 'available': return 'bg-green-50 text-green-700 border-green-200';
      case 'assigned': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'maintenance': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'scrapped': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Assets Inventory</h1>
          <p className="text-slate-400 mt-1">{totalRegistered} assets registered in database</p>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200/80 pb-px select-none">
        <button
          onClick={() => handleTabChange('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all relative ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Boxes size={15} />
          Assets Inventory
        </button>
        <button
          onClick={() => handleTabChange('allocated')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all relative ${
            activeTab === 'allocated'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <UserPlus size={15} />
          Allocated Assets
        </button>
      </div>

      {/* Filter and Search Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search assets by name, code, serial number..."
            value={search}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        <div className="flex w-full md:w-auto gap-3 items-center justify-end">
          <select
            value={type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs h-9 bg-white focus:outline-none text-slate-600 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="laptop">Laptop</option>
            <option value="monitor">Monitor</option>
            <option value="phone">Mobile Phone</option>
            <option value="keyboard">Keyboard</option>
            <option value="mouse">Mouse</option>
            <option value="headset">Headset</option>
            <option value="docking_station">Docking Station</option>
            <option value="other">Other</option>
          </select>

          {activeTab === 'inventory' && (
            <select
              value={status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs h-9 bg-white focus:outline-none text-slate-600 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
              <option value="scrapped">Scrapped</option>
            </select>
          )}

          <Button variant="outline" size="sm" onClick={fetchAssets} className="h-9 px-3 border-slate-200">
            <RefreshCw size={14} className={loading ? 'animate-spin text-slate-500' : 'text-slate-500'} />
          </Button>
        </div>
      </div>

      {/* Assets Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 select-none">
              {activeTab === 'inventory' ? (
                <tr>
                  <th className="w-10 px-6 py-4"></th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset Details</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Serial Number</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="w-10 px-6 py-4"></th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset Details</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Serial Number</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Holder</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Allocated</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'inventory' ? 6 : 7} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'inventory' ? 6 : 7} className="text-center py-12 text-slate-400">
                    No assets found
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const Icon = getAssetIcon(asset.type);
                  const allocation = asset.current_allocation || (asset as any).currentAllocation;
                  const employee = allocation?.employee;
                  const onboardingRequest = allocation?.onboarding_request || (allocation as any)?.onboardingRequest;
                  const holderName = employee
                    ? `${employee.first_name || (employee as any).firstName || ''} ${employee.last_name || (employee as any).lastName || ''}`.trim()
                    : onboardingRequest
                      ? `${onboardingRequest.candidate_name || onboardingRequest.candidateName || ''} (Candidate)`.trim()
                      : null;

                  if (activeTab === 'inventory') {
                    return (
                      <Fragment key={asset.id}>
                        <tr
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                          onClick={() => setExpandedAssetId(expandedAssetId === asset.id ? null : asset.id)}
                        >
                          <td className="px-6 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setExpandedAssetId(expandedAssetId === asset.id ? null : asset.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <ChevronRight
                                size={14}
                                className={`transition-transform duration-200 ${
                                  expandedAssetId === asset.id ? 'rotate-90' : ''
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{asset.name}</p>
                                <p className="text-xs text-slate-400">{asset.asset_code} {asset.brand ? `• ${asset.brand}` : ''} {asset.model ? ` ${asset.model}` : ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-600 text-xs font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                              {typeLabels[asset.type] || asset.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {asset.serial_number || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`rounded-md font-normal text-xs ${statusBadgeColor(asset.status)}`}>
                              {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {asset.status === 'available' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openAllocateModal(asset)}
                                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 h-7 text-xs rounded-md font-medium"
                                >
                                  <UserPlus size={12} className="mr-1" />
                                  Allocate
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(asset)}
                                className="w-8 h-8 p-0 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={asset.status === 'assigned'}
                                onClick={() => handleDelete(asset)}
                                className="w-8 h-8 p-0 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expandedAssetId === asset.id && (
                          <tr className="bg-slate-50/40">
                            <td colSpan={6} className="px-6 py-5 border-t border-b border-slate-100/80">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 animate-in slide-in-from-top-1 duration-150">
                                {/* Specifications */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">Specifications & Notes</h4>
                                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 min-h-[4.5rem]">
                                    {asset.specifications ? (
                                      <p className="whitespace-pre-wrap leading-relaxed">{asset.specifications}</p>
                                    ) : (
                                      <span className="text-slate-400 italic">No specifications provided</span>
                                    )}
                                  </div>
                                </div>
                                {/* Acquisition Details */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">Acquisition Details</h4>
                                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2 min-h-[4.5rem]">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Purchase Date:</span>
                                      <span className="font-medium text-slate-700">{formatDate(asset.purchase_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Purchase Price:</span>
                                      <span className="font-medium text-slate-700">
                                        {asset.purchase_price ? `₹${Number(asset.purchase_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {/* Status Info */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">Status & Info</h4>
                                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2 min-h-[4.5rem]">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Current Status:</span>
                                      <span className="font-semibold text-slate-700 capitalize">{asset.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Registered On:</span>
                                      <span className="font-medium text-slate-700">{formatDate(asset.created_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  } else {
                    return (
                      <Fragment key={asset.id}>
                        <tr
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                          onClick={() => setExpandedAssetId(expandedAssetId === asset.id ? null : asset.id)}
                        >
                          <td className="px-6 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setExpandedAssetId(expandedAssetId === asset.id ? null : asset.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <ChevronRight
                                size={14}
                                className={`transition-transform duration-200 ${
                                  expandedAssetId === asset.id ? 'rotate-90' : ''
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{asset.name}</p>
                                <p className="text-xs text-slate-400">{asset.asset_code} {asset.brand ? `• ${asset.brand}` : ''} {asset.model ? ` ${asset.model}` : ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-600 text-xs font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                              {typeLabels[asset.type] || asset.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {asset.serial_number || '—'}
                          </td>
                          <td className="px-6 py-4">
                            {holderName ? (
                              <div className="flex items-center gap-2">
                                <User size={13} className="text-slate-400" />
                                <span className="text-slate-700 font-medium text-xs">{holderName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {allocation?.allocated_date ? formatDate(allocation.allocated_date) : '—'}
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openReturnModal(asset)}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 h-7 text-xs rounded-md font-medium"
                              >
                                <RotateCcw size={12} className="mr-1" />
                                Return
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(asset)}
                                className="w-8 h-8 p-0 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expandedAssetId === asset.id && (
                          <tr className="bg-slate-50/40">
                            <td colSpan={7} className="px-6 py-5 border-t border-b border-slate-100/80">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 animate-in slide-in-from-top-1 duration-150">
                                {/* Specifications */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">Specifications & Notes</h4>
                                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 min-h-[4.5rem]">
                                    {asset.specifications ? (
                                      <p className="whitespace-pre-wrap leading-relaxed">{asset.specifications}</p>
                                    ) : (
                                      <span className="text-slate-400 italic">No specifications provided</span>
                                    )}
                                  </div>
                                </div>
                                {/* Acquisition Details */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">Acquisition Details</h4>
                                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2 min-h-[4.5rem]">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Purchase Date:</span>
                                      <span className="font-medium text-slate-700">{formatDate(asset.purchase_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Purchase Price:</span>
                                      <span className="font-medium text-slate-700">
                                        {asset.purchase_price ? `₹${Number(asset.purchase_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {/* Allocation Info */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">Allocation Details</h4>
                                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2 min-h-[4.5rem]">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Allocated To:</span>
                                      <span className="font-medium text-slate-700">{holderName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Allocated On:</span>
                                      <span className="font-medium text-slate-700">
                                        {allocation?.allocated_date ? formatDate(allocation.allocated_date) : '—'}
                                      </span>
                                    </div>
                                    {allocation?.allocator && (
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Allocated By:</span>
                                        <span className="font-medium text-slate-700">{allocation.allocator.name || allocation.allocator.email}</span>
                                      </div>
                                    )}
                                    <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-slate-100">
                                      <span className="text-slate-400">Condition Notes:</span>
                                      <span className="font-medium text-slate-700 leading-relaxed italic">
                                        {allocation?.condition_notes ? `"${allocation.condition_notes}"` : 'No condition notes'}
                                      </span>
                                    </div>
                                    {/* Charger status */}
                                    {allocation?.charger_given !== undefined && allocation?.charger_given !== null && (
                                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                                        <span className="text-slate-400">Charger:</span>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                          allocation.charger_given
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-red-50 text-red-600'
                                        }`}>
                                          {allocation.charger_given ? 'Given ✓' : 'Not Given ✗'}
                                        </span>
                                      </div>
                                    )}
                                    {/* SIM status — phones only */}
                                    {asset.type === 'phone' && allocation?.sim_given !== undefined && allocation?.sim_given !== null && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400">SIM Card:</span>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                          allocation.sim_given
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-red-50 text-red-600'
                                        }`}>
                                          {allocation.sim_given ? 'Given ✓' : 'Not Given ✗'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 select-none">
            <p className="text-xs text-slate-400">
              Showing <span className="font-medium text-slate-600">{from}–{to}</span> of <span className="font-medium text-slate-600">{total}</span> assets
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="h-8 text-xs font-normal px-3 border-slate-200 rounded-lg disabled:opacity-40 shadow-none bg-white"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(p + 1, lastPage))}
                disabled={page === lastPage}
                className="h-8 text-xs font-normal px-3 border-slate-200 rounded-lg disabled:opacity-40 shadow-none bg-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Asset create/edit modal */}
      <AssetModal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        asset={selectedAsset}
        onSaveSuccess={handleActionSuccess}
      />

      {/* Allocate modal */}
      <AllocateModal
        open={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        asset={selectedAssetForAllocate}
        onAllocateSuccess={handleActionSuccess}
      />

      {/* Return modal */}
      <ReturnModal
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        allocation={selectedAllocationForReturn}
        onReturnSuccess={handleActionSuccess}
      />
    </div>
  );
}
