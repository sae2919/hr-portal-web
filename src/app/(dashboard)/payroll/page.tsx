'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

import {
  IndianRupee, CreditCard, CheckCircle2, Clock, Mail, Loader2, Send, Check, X, Inbox, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Payroll {
  id: number;
  month: number;
  year: number;
  gross_salary: string;
  total_deductions: string;
  net_salary: string;
  status: string;
  employee: {
    first_name: string;
    last_name: string;
    department?: { name: string };
  };
}

interface PayslipRequest {
  id: number;
  status: string;
  created_at: string;
  employee: {
    first_name: string;
    last_name: string;
    department?: { name: string };
  };
  payroll: {
    month: number;
    year: number;
    net_salary: string;
  };
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string; 
}

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<'register' | 'requests'>('register');
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [requests, setRequests] = useState<PayslipRequest[]>([]);
  const [page, setPage] = useState<number>(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [emailingId, setEmailingId] = useState<number | null>(null);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // ✅ FIX: Get token from auth store for PDF download link
  const { token } = useAuthStore();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await api.get('/v1/user'); 
        setUser(res.data);
      } catch (err) {
        console.error("Failed to load user session profiles", err);
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUser();
  }, []);

  const isAdmin = user?.role === 'admin';

  async function loadPayrollData(currentPage: number = 1) {
    setLoadingData(true);
    try {
      if (isAdmin && activeTab === 'requests') {
        const res = await api.get('/v1/payroll-requests', { params: { page: currentPage, per_page: 10 } });
        setRequests(res.data.data || []);
        setMeta(res.data.meta || null);
      } else {
        const res = await api.get('/v1/payrolls', { params: { page: currentPage, per_page: 10 } });
        setPayrolls(res.data.data || []);
        setMeta(res.data.meta || null);
      }
    } catch (err) {
      console.error("Data tracking failure", err);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (!loadingUser) {
      setPage(1);
      loadPayrollData(1);
    }
  }, [activeTab, loadingUser]);

  useEffect(() => {
    if (!loadingUser) {
      loadPayrollData(page);
    }
  }, [page]);

  async function markPaid(id: number) {
    await api.post(`/v1/payrolls/${id}/mark-paid`);
    toast.success('Payroll record updated as paid.');
    loadPayrollData(page);
  }

  async function sendPayslipEmail(id: number) {
    setEmailingId(id);
    try {
      await api.post(`/v1/payrolls/${id}/send-email`);
      toast.success('Payslip has been successfully emailed.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Email delivery failed.');
    } finally {
      setEmailingId(null);
    }
  }

  async function handleRequestPayslip(id: number) {
    setRequestingId(id);
    try {
      await api.post(`/v1/payrolls/${id}/request-payslip`);
      toast.success('Your payslip request has been forwarded to HR.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit request.');
    } finally {
      setRequestingId(null);
    }
  }

  async function handleFulfillRequest(id: number, status: 'approved' | 'rejected') {
    setProcessingRequestId(id);
    try {
      await api.patch(`/v1/payroll-requests/${id}/fulfill`, { status });
      toast.success(`Request successfully marked as ${status}.`);
      loadPayrollData(page);
    } catch (err) {
      toast.error('Failed to update request actions profile.');
    } finally {
      setProcessingRequestId(null);
    }
  }

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  const totalPayroll = payrolls.reduce((sum, p) => sum + Number(p.net_salary), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isAdmin ? 'Payroll Center' : 'My Salary Slips'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin ? 'Manage payroll records and fulfill employee payslip requests' : 'View and request your historical pay statements'}
          </p>
        </div>

        {/* Dashboard Tabs Toggle Menu for Admin */}
        {isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-xl self-start select-none border border-slate-200">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'register' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Payroll Register
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'requests' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Inbox size={13} /> Employee Requests
            </button>
          </div>
        )}
      </div>

      {/* Metric Cards Grid Layout */}
      {isAdmin && activeTab === 'register' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Page Allocation</p>
              <p className="text-2xl font-bold text-slate-800 mt-2">₹{totalPayroll.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600"><IndianRupee size={22} /></div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Processed</p>
              <p className="text-2xl font-bold text-slate-800 mt-2">{payrolls.filter(p => p.status === 'processed').length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"><Clock size={22} /></div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Completed Payments</p>
              <p className="text-2xl font-bold text-slate-800 mt-2">{payrolls.filter(p => p.status === 'paid').length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 size={22} /></div>
          </div>
        </div>
      )}

      {/* Main Board View Table Wrapper */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : activeTab === 'register' ? (
          /* TAB 1: REGULAR REGISTER TABLE VIEW */
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{isAdmin ? 'Employee' : 'Statement Period'}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Gross</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Deductions</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Net Salary</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payrolls.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">No records allocated.</td></tr>
              ) : (
                payrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <>
                          <p className="font-semibold text-slate-800">{payroll.employee.first_name} {payroll.employee.last_name}</p>
                          <p className="text-sm text-slate-500">{payroll.employee.department?.name}</p>
                        </>
                      ) : (
                        <p className="font-semibold text-slate-800">
                          {new Date(payroll.year, payroll.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">₹{Number(payroll.gross_salary).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-red-600">₹{Number(payroll.total_deductions).toLocaleString()}</td>
                    <td className="px-6 py-4 font-semibold text-green-600">₹{Number(payroll.net_salary).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        payroll.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>{payroll.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && payroll.status !== 'paid' && (
                          <button onClick={() => markPaid(payroll.id)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-sm"><CreditCard size={14} /> Mark Paid</button>
                        )}
                        {isAdmin && (
                          <button onClick={() => sendPayslipEmail(payroll.id)} disabled={emailingId === payroll.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition min-w-[85px] justify-center shadow-sm">
                            {emailingId === payroll.id ? <Loader2 size={14} className="animate-spin" /> : <><Mail size={14} /> Email</>}
                          </button>
                        )}
                        
                        {/* ✅ FIX: token now comes from useAuthStore instead of localStorage */}
                        {!isAdmin && (
                          payroll.status === 'paid' ? (
                            <a 
                              href={`http://127.0.0.1:8000/api/v1/payrolls/${payroll.id}/payslip?token=${token || ''}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition shadow-sm"
                            >
                              <FileText size={14} /> View PDF
                            </a>
                          ) : (
                            <button onClick={() => handleRequestPayslip(payroll.id)} disabled={requestingId === payroll.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition disabled:bg-slate-600 min-w-[130px] justify-center shadow-sm">
                              {requestingId === payroll.id ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Request Payslip</>}
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          /* TAB 2: INCOMING EMPLOYEE REQUESTS INBOX TABLE VIEW */
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Statement Requested</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Net Compensation</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requests.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-sm text-slate-400">No active requests in inbox.</td></tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{req.employee.first_name} {req.employee.last_name}</p>
                      <p className="text-xs text-slate-400">{req.employee.department?.name || 'General Operations'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(req.payroll.year, req.payroll.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">₹{Number(req.payroll.net_salary).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                        req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>{req.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleFulfillRequest(req.id, 'approved')}
                            disabled={processingRequestId === req.id}
                            className="w-8 h-8 rounded-lg border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition"
                            title="Approve & Send Email"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleFulfillRequest(req.id, 'rejected')}
                            disabled={processingRequestId === req.id}
                            className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition"
                            title="Reject Request"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Dynamic Pagination Controls */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{((page - 1) * 10) + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">{Math.min(page * 10, meta.total)}</span> of{' '}
              <span className="font-semibold text-slate-700">{meta.total}</span> entries
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="h-8 px-3 text-xs bg-white border-slate-200"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p < meta.last_page ? p + 1 : p)}
                disabled={page === meta.last_page}
                className="h-8 px-3 text-xs bg-white border-slate-200"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}