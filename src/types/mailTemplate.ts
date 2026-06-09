export interface MailTemplate {
  id: number;
  template_name: string;
  type?: string;
  subject: string;
  body: string | null;
  style: string | null;
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
  active_status?: number;
}

export interface UpdateMailTemplatePayload extends Partial<StoreMailTemplatePayload> {
  id: number;
}
