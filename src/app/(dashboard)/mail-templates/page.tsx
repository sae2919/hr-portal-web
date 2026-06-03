'use client';

import { useState, useEffect, useRef } from 'react';
import {
  useMailTemplates,
  useCreateMailTemplate,
  useUpdateMailTemplate,
  useDeleteMailTemplate
} from '@/hooks/useMailTemplates';
import { MailTemplate } from '@/types/mailTemplate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Save,
  Trash2,
  Loader2,
  Mail,
  Eye,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Code,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function MailTemplatesPage() {
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Form states
  const [templateName, setTemplateName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [style, setStyle] = useState('');
  const [activeStatus, setActiveStatus] = useState(1);

  // Error & validation states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Query & Mutations
  const { data: templates = [], isLoading, refetch } = useMailTemplates({ search });
  const createMutation = useCreateMailTemplate();
  const updateMutation = useUpdateMailTemplate();
  const deleteMutation = useDeleteMailTemplate();

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const styleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTextarea, setActiveTextarea] = useState<'body' | 'style'>('body');

  // Load selected template into form states
  useEffect(() => {
    if (selectedTemplate && !isCreating) {
      setTemplateName(selectedTemplate.template_name);
      setSubject(selectedTemplate.subject);
      setBody(selectedTemplate.body || '');
      setStyle(selectedTemplate.style || '');
      setActiveStatus(selectedTemplate.active_status);
      setValidationErrors({});
    }
  }, [selectedTemplate, isCreating]);

  // Handle clicking "+ New Template"
  const handleNewTemplate = () => {
    setIsCreating(true);
    setSelectedTemplate(null);
    setTemplateName('');
    setSubject('');
    setBody('');
    setStyle(`body {
  font-family: Arial, sans-serif;
  background-color: #f4f4f4;
  margin: 0;
  padding: 20px;
}
.container {
  max-width: 600px;
  margin: 0 auto;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.header {
  text-align: center;
  background-color: #3b82f6;
  padding: 15px;
  color: white;
  border-radius: 10px 10px 0 0;
}
.content {
  font-size: 16px;
  line-height: 1.6;
  color: #333333;
}
.footer {
  text-align: center;
  font-size: 12px;
  color: #777777;
  margin-top: 20px;
  border-t: 1px solid #eeeeee;
  padding-top: 10px;
}`);
    setActiveStatus(1);
    setActiveTab('edit');
    setValidationErrors({});
  };

  // Insert template tag helper
  const handleInsertTag = (tag: string) => {
    const textarea = activeTextarea === 'body' ? bodyTextareaRef.current : styleTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const replacement = `{{${tag}}}`;

    if (activeTextarea === 'body') {
      setBody(before + replacement + after);
    } else {
      setStyle(before + replacement + after);
    }

    // Reset cursor position after insert
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

  // Validate form inputs
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!templateName.trim()) {
      errors.template_name = 'Template name is required';
    } else if (!/^[a-zA-Z0-9_]+$/.test(templateName)) {
      errors.template_name = 'Template name must contain only letters, numbers, and underscores (e.g. leave_approved)';
    }

    if (!subject.trim()) {
      errors.subject = 'Subject is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save/Submit changes
  const handleSave = () => {
    if (!validateForm()) return;

    const payload = {
      template_name: templateName,
      subject: subject,
      body: body,
      style: style,
      active_status: activeStatus,
    };

    if (isCreating) {
      createMutation.mutate(payload, {
        onSuccess: (response) => {
          setIsCreating(false);
          setSelectedTemplate(response.data);
          refetch();
        },
        onError: (err: any) => {
          const apiError = err.response?.data?.errors?.template_name?.[0] || 'Failed to create template';
          setValidationErrors({ template_name: apiError });
        }
      });
    } else if (selectedTemplate) {
      updateMutation.mutate(
        { id: selectedTemplate.id, ...payload },
        {
          onSuccess: (response) => {
            setSelectedTemplate(response.data);
            refetch();
          },
          onError: (err: any) => {
            const apiError = err.response?.data?.errors?.template_name?.[0] || 'Failed to update template';
            setValidationErrors({ template_name: apiError });
          }
        }
      );
    }
  };

  // Toggle active status
  const handleToggleStatus = (template: MailTemplate) => {
    updateMutation.mutate(
      {
        id: template.id,
        active_status: template.active_status === 1 ? 0 : 1
      },
      {
        onSuccess: () => {
          if (selectedTemplate?.id === template.id) {
            setSelectedTemplate(prev => prev ? { ...prev, active_status: prev.active_status === 1 ? 0 : 1 } : null);
          }
          refetch();
        }
      }
    );
  };

  // Delete template
  const handleDelete = (template: MailTemplate) => {
    if (window.confirm(`Are you sure you want to delete the template "${template.template_name}"?`)) {
      deleteMutation.mutate(template.id, {
        onSuccess: () => {
          if (selectedTemplate?.id === template.id) {
            setSelectedTemplate(null);
          }
          refetch();
        }
      });
    }
  };

  // Generate dynamic Preview content inside iframe
  const renderPreview = () => {
    let html = body;

    // Get company branding details matching Sidebar settings
    const companyName = (typeof window !== 'undefined' && localStorage.getItem('company_name')) || 'Techsprout';
    const companyLogo = (typeof window !== 'undefined' && localStorage.getItem('company_logo')) || '';

    const logoHtml = companyLogo
      ? `<img src="${companyLogo}" alt="${companyName}" style="max-height: 45px; margin-bottom: 8px;" />`
      : '';

    // Standard simulated variable substitutions
    const sampleData: Record<string, string> = {
      name: 'John Doe',
      employee_name: 'John Doe',
      otp: '482910',
      otp_code: '482910',
      reporting_to: 'Sarah Connor (Manager)',
      leave_type: 'Annual Leave',
      leave_dates: 'June 5, 2026 to June 10, 2026',
      payslip_month: 'May 2026',
      login_url: 'https://hrms.techsprout.com/login',
      current_date: '2026-06-03',
      user_email: 'john.doe@techsprout.com',
      phone: '+1 (555) 019-2834',
      date: '2026-06-03',
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            /* Global Base Email Styles */
            body {
              margin: 0;
              padding: 20px;
              background-color: #f8fafc;
              font-family: 'Outfit', 'Inter', Arial, sans-serif;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
              overflow: hidden;
            }
            .global-header {
              background-color: #0f172a;
              padding: 24px;
              text-align: center;
              color: #ffffff;
              border-bottom: 1px solid #e2e8f0;
            }
            .global-header h1 {
              margin: 0;
              font-size: 18px;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .email-body {
              padding: 30px;
              color: #334155;
              font-size: 15px;
              line-height: 1.6;
            }
            .global-footer {
              background-color: #f8fafc;
              padding: 20px;
              text-align: center;
              color: #64748b;
              font-size: 11px;
              border-top: 1px solid #e2e8f0;
            }
            .global-footer p {
              margin: 4px 0;
            }

            /* Custom Template CSS Overrides */
            ${style || ''}
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="global-header">
              ${logoHtml}
              <h1>${companyName}</h1>
            </div>
            <div class="email-body">
              ${html || '<p style="text-align: center; color: #999;">Email body is empty. Type some HTML in the editor.</p>'}
            </div>
            <div class="global-footer">
              <p>This is an automated notification from ${companyName}.</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Placeholder tags lists for easy UI badge clicks
  const placeholderTags = [
    { label: 'Name', tag: 'name' },
    { label: 'Employee Name', tag: 'employee_name' },
    { label: 'OTP Code', tag: 'otp' },
    { label: 'Reporting To', tag: 'reporting_to' },
    { label: 'Leave Type', tag: 'leave_type' },
    { label: 'Leave Dates', tag: 'leave_dates' },
    { label: 'Payslip Month', tag: 'payslip_month' },
    { label: 'Login URL', tag: 'login_url' },
    { label: 'Current Date', tag: 'current_date' },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      {/* LEFT PANE - Template Browser */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-white h-full flex-shrink-0">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Mail Templates
            </h1>
            <Badge variant="secondary" className="font-semibold text-slate-500 rounded-md">
              {templates.length}
            </Badge>
          </div>
          <Button
            onClick={handleNewTemplate}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm h-10 gap-2"
          >
            <Plus className="w-4 h-4" /> Add Template
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg border-slate-200"
            />
          </div>
        </div>

        {/* List scroll container */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-xs text-slate-400 mt-2">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No templates found. Create one to get started!
            </div>
          ) : (
            templates.map((tmpl) => {
              const isSelected = selectedTemplate?.id === tmpl.id && !isCreating;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplate(tmpl);
                    setIsCreating(false);
                  }}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-all ${
                    isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600 pl-3' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-slate-700 truncate block max-w-[150px]">
                      {tmpl.template_name}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Active Status Badge Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(tmpl);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                          tmpl.active_status === 1
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {tmpl.active_status === 1 ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-1">{tmpl.subject}</p>

                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400">
                      {tmpl.updated_at ? new Date(tmpl.updated_at).toLocaleDateString() : 'Just now'}
                    </span>
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tmpl);
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE - Workspace Editor/Preview */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 h-full">
        {(!selectedTemplate && !isCreating) ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">No Template Selected</h2>
            <p className="text-slate-400 text-sm max-w-sm mt-1">
              Select an email template from the list on the left to configure it, or create a brand new template.
            </p>
            <Button
              onClick={handleNewTemplate}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm h-10 gap-2"
            >
              <Plus className="w-4 h-4" /> Create New Template
            </Button>
          </div>
        ) : (
          /* Editor Workspace */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Area */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {isCreating ? 'Create Mail Template' : `Template: ${selectedTemplate?.template_name}`}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isCreating ? 'Configure new system email' : 'Modify template content and design'}
                  </p>
                </div>
              </div>

              {/* Actions Area */}
              <div className="flex items-center gap-3">
                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm h-10 gap-2"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>

            {/* Mode Tabs bar */}
            <div className="bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`py-3 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === 'edit'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4" /> Edit Template
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`py-3 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === 'preview'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Live Preview
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Changes autosaved locally
                </span>
              </div>
            </div>

            {/* Main Content Workspace Split depending on tab */}
            <div className="flex-1 overflow-hidden p-6">
              {activeTab === 'edit' ? (
                /* Tab: Edit Template Form */
                <div className="h-full flex flex-col gap-6 overflow-y-auto pr-1">
                  {/* Grid fields for attributes */}
                  <div className="grid grid-cols-2 gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex-shrink-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Template Name / Slug <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. employee_onboarding_welcome"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                        className="h-10 text-sm border-slate-200 focus:ring-blue-500"
                        disabled={!isCreating}
                      />
                      {validationErrors.template_name ? (
                        <p className="text-red-500 text-xs flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {validationErrors.template_name}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Lowercase alphanumeric with underscores. Key lookup code for codebase integrations.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Active Status
                      </Label>
                      <div className="flex items-center gap-3 h-10 px-3 border border-slate-200 rounded-lg">
                        <input
                          type="checkbox"
                          id="active-status-toggle"
                          checked={activeStatus === 1}
                          onChange={(e) => setActiveStatus(e.target.checked ? 1 : 0)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <Label htmlFor="active-status-toggle" className="text-sm text-slate-600 font-medium cursor-pointer">
                          Enabled (Allow system to trigger emails using this template)
                        </Label>
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Email Subject Line <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. Welcome to the team, {{name}}!"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="h-10 text-sm border-slate-200 focus:ring-blue-500"
                      />
                      {validationErrors.subject && (
                        <p className="text-red-500 text-xs flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {validationErrors.subject}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Placeholder tags helper widget */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex-shrink-0 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Dynamic Template Tags Helper
                      </h4>
                      <p className="text-[11px] text-blue-700/80">
                        Select a editor textarea (Body or Style), then click a tag below to insert it at your cursor.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-w-[60%] justify-end">
                      {placeholderTags.map((item) => (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => handleInsertTag(item.tag)}
                          className="text-[10px] font-mono bg-white hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-700 px-2 py-1 rounded-md transition-all font-semibold shadow-sm hover:scale-105 active:scale-95"
                          title={`Click to insert {{${item.tag}}}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HTML Body and CSS Style Editors split */}
                  <div className="flex-1 grid grid-cols-2 gap-6 min-h-[350px]">
                    {/* HTML Body Area */}
                    <div className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm h-full">
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-blue-600" />
                          Email Content (HTML Body)
                        </span>
                        <Badge variant="secondary" className="font-mono text-[9px] rounded px-1.5 py-0">HTML</Badge>
                      </div>
                      <textarea
                        ref={bodyTextareaRef}
                        onFocus={() => setActiveTextarea('body')}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Write your email HTML layout here... e.g. <p>Hello {{name}},</p>"
                        className="flex-1 p-4 font-mono text-xs text-slate-700 bg-slate-900/5 focus:bg-white focus:outline-none resize-none overflow-y-auto leading-relaxed border-0"
                      />
                    </div>

                    {/* CSS Style Area */}
                    <div className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm h-full">
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-indigo-600" />
                          Template Styling (CSS Stylesheet)
                        </span>
                        <Badge variant="secondary" className="font-mono text-[9px] rounded px-1.5 py-0">CSS</Badge>
                      </div>
                      <textarea
                        ref={styleTextareaRef}
                        onFocus={() => setActiveTextarea('style')}
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        placeholder="Define your CSS stylesheet rules... e.g. .container { background-color: #ffffff; }"
                        className="flex-1 p-4 font-mono text-xs text-slate-700 bg-slate-900/5 focus:bg-white focus:outline-none resize-none overflow-y-auto leading-relaxed border-0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab: Live Sandbox Preview */
                <div className="h-full flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  {/* Simulated Email Header Wrapper */}
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex-shrink-0 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-400 w-12 flex-shrink-0">From:</span>
                      <span className="bg-slate-200/60 px-2 py-0.5 rounded text-slate-700 font-medium font-sans">
                        Techsprout HR System &lt;hr@techsprout.com&gt;
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-400 w-12 flex-shrink-0">To:</span>
                      <span className="bg-slate-200/60 px-2 py-0.5 rounded text-slate-700 font-medium font-sans">
                        John Doe &lt;john.doe@techsprout.com&gt;
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs pt-1">
                      <span className="font-semibold text-slate-400 w-12 flex-shrink-0">Subject:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {subject.replace(/{{\s*name\s*}}/g, 'John Doe').replace(/{{\s*employee_name\s*}}/g, 'John Doe')}
                      </span>
                    </div>
                  </div>

                  {/* Sandboxed iframe content area */}
                  <div className="flex-1 p-4 bg-slate-100/50 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full max-w-4xl bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
                      {/* Iframe element */}
                      <iframe
                        srcDoc={renderPreview()}
                        className="w-full h-full border-none bg-white"
                        title="Isolated Sandbox Email Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
