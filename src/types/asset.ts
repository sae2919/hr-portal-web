import { Employee } from './employee';

export interface Asset {
  id: number;
  asset_code: string;
  name: string;
  type: 'laptop' | 'monitor' | 'phone' | 'keyboard' | 'mouse' | 'headset' | 'docking_station' | 'other';
  brand?: string;
  model?: string;
  serial_number?: string;
  color?: string;
  purchase_date?: string;
  purchase_price?: string;
  status: 'available' | 'assigned' | 'maintenance' | 'scrapped';
  specifications?: string;
  image_path?: string;
  created_at: string;
  updated_at: string;
  current_allocation?: AssetAllocation;
  allocations?: AssetAllocation[];
}

export interface AssetAllocation {
  id: number;
  asset_id: number;
  employee_id?: number;
  onboarding_request_id?: number;
  allocated_date: string;
  return_date?: string;
  status: 'allocated' | 'returned' | 'lost' | 'damaged';
  condition_notes?: string;
  return_notes?: string;
  allocated_by: number;
  created_at: string;
  updated_at: string;
  asset?: Asset;
  employee?: Employee;
  allocator?: {
    id: number;
    name: string;
    email: string;
  };
  onboarding_request?: {
    id: number;
    candidate_name: string;
    email: string;
    position: string;
    department: string;
  };
}
