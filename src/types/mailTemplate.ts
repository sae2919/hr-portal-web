export interface MailTemplate {
  id: number;
  template_name: string;
  type?: string;
  subject: string;
  body: string | null;
  style: string | null;
  pdf_path?: string | null;
  pdf_fields?: any[] | null;
  active_status: number; // 1 for active, 0 for inactive
  created_at?: string;
  updated_at?: string;
}

export interface StoreMailTemplatePayload {
  template_name: string;
  type?: string;
  subject: string;
  body?: string;
  style?: string;
  pdf_file?: File | null;
  pdf_fields?: any[] | string | null;
  delete_pdf_file?: boolean;
  active_status?: number;
}

export interface UpdateMailTemplatePayload extends Partial<StoreMailTemplatePayload> {
  id: number;
}
