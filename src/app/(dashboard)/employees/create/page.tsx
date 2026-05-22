'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateEmployee } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { useDesignations } from '@/hooks/useDesignations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';

const schema = z.object({
  first_name:      z.string().min(1, 'First name is required'),
  last_name:       z.string().min(1, 'Last name is required'),
  email:           z.string().email('Valid email required'),
  phone:           z.string().optional().or(z.literal('')),
  gender:          z.enum(['male', 'female', 'other']).optional(),
  dob:             z.string().optional().or(z.literal('')),
  joining_date:    z.string().min(1, 'Joining date is required'),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']),
  status:          z.enum(['active', 'inactive', 'terminated']),
  department_id:   z.number().nullable().optional(),
  designation_id:  z.number().nullable().optional(),
  address:         z.string().optional().or(z.literal('')),
  city:            z.string().optional().or(z.literal('')),
  state:           z.string().optional().or(z.literal('')),
  country:         z.string().optional().or(z.literal('')),
  pincode:         z.string().optional().or(z.literal('')),
  emergency_contact_name:     z.string().optional().or(z.literal('')),
  emergency_contact_phone:    z.string().optional().or(z.literal('')),
  emergency_contact_relation: z.string().optional().or(z.literal('')),
  bank_name:           z.string().optional().or(z.literal('')),
  bank_account_number: z.string().optional().or(z.literal('')),
  bank_ifsc:           z.string().optional().or(z.literal('')),
  bank_branch:         z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children, error, fullWidth }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <Label className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

export default function CreateEmployeePage() {
  const router = useRouter();
  const { mutate: createEmployee, isPending } = useCreateEmployee();
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employment_type: 'full_time',
      status: 'active',
      country: 'India',
    },
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      phone:           data.phone || undefined,
      dob:             data.dob || undefined,
      address:         data.address || undefined,
      city:            data.city || undefined,
      state:           data.state || undefined,
      pincode:         data.pincode || undefined,
      department_id:   data.department_id ?? null,
      designation_id:  data.designation_id ?? null,
    };
    createEmployee(payload as any, {
      onSuccess: () => router.push('/employees'),
    });
  };

  return (
    <div className="space-y-5" suppressHydrationWarning>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Add Employee</h2>
            <p className="text-xs text-slate-400">Fill in the details below</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Personal Info */}
        <Section title="Personal Information">
          <Field label="First Name" required error={errors.first_name?.message}>
            <Input placeholder="John" {...register('first_name')} className="h-10" />
          </Field>
          <Field label="Last Name" required error={errors.last_name?.message}>
            <Input placeholder="Doe" {...register('last_name')} className="h-10" />
          </Field>
          <Field label="Email" required error={errors.email?.message}>
            <Input type="email" placeholder="john@company.com" {...register('email')} className="h-10" />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input placeholder="+91 9876543210" {...register('phone')} className="h-10" />
          </Field>
          <Field label="Gender">
            <select {...register('gender')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of Birth">
            <Input type="date" {...register('dob')} className="h-10" />
          </Field>
        </Section>

        {/* Job Info */}
        <Section title="Job Information">
          <Field label="Department">
            <select
              {...register('department_id', { setValueAs: (v) => v === '' ? null : Number(v) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Designation">
            <select
              {...register('designation_id', { setValueAs: (v) => v === '' ? null : Number(v) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select designation</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Joining Date" required error={errors.joining_date?.message}>
            <Input type="date" {...register('joining_date')} className="h-10" />
          </Field>
          <Field label="Employment Type">
            <select {...register('employment_type')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
          </Field>
          <Field label="Status">
            <select {...register('status')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </Field>
        </Section>

        {/* Address */}
        <Section title="Address">
          <Field label="Address" fullWidth>
            <Input placeholder="Street address" {...register('address')} className="h-10" />
          </Field>
          <Field label="City">
            <Input placeholder="Mumbai" {...register('city')} className="h-10" />
          </Field>
          <Field label="State">
            <Input placeholder="Maharashtra" {...register('state')} className="h-10" />
          </Field>
          <Field label="Country">
            <Input placeholder="India" {...register('country')} className="h-10" />
          </Field>
          <Field label="Pincode">
            <Input placeholder="400001" {...register('pincode')} className="h-10" />
          </Field>
        </Section>

        {/* Emergency Contact */}
        <Section title="Emergency Contact">
          <Field label="Contact Name">
            <Input placeholder="Jane Doe" {...register('emergency_contact_name')} className="h-10" />
          </Field>
          <Field label="Contact Phone">
            <Input placeholder="+91 9876543210" {...register('emergency_contact_phone')} className="h-10" />
          </Field>
          <Field label="Relationship">
            <Input placeholder="Spouse / Parent / Sibling" {...register('emergency_contact_relation')} className="h-10" />
          </Field>
        </Section>

        {/* Bank Details */}
        <Section title="Bank Details">
          <Field label="Bank Name">
            <Input placeholder="State Bank of India" {...register('bank_name')} className="h-10" />
          </Field>
          <Field label="Account Number">
            <Input placeholder="1234567890" {...register('bank_account_number')} className="h-10" />
          </Field>
          <Field label="IFSC Code">
            <Input placeholder="SBIN0001234" {...register('bank_ifsc')} className="h-10" />
          </Field>
          <Field label="Branch">
            <Input placeholder="Mumbai Main Branch" {...register('bank_branch')} className="h-10" />
          </Field>
        </Section>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Link href="/employees">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Employee
          </Button>
        </div>
      </form>
    </div>
  );
}