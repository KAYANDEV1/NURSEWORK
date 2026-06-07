/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FormTemplate {
  id: string;
  code: string; // e.g. BHG-FR-GEN-027
  titleAr: string;
  titleEn: string;
  departmentDefault: string;
  version?: string;
  issueDate?: string;
  hasPatientDetails?: boolean;
  items?: Omit<GridRow, "days">[]; // Custom initial items
}

export interface SavedRecord {
  id: string;
  templateId: string;
  date: string;
  time: string;
  department: string;
  staffName: string;
  staffId: string;
  notes?: string;
  createdAt: string;
  shift?: string; // Active clinical tracking shift/period
  status?: string; // status e.g. "Pending", "Submitted by [Employee]", etc.
  // Patient / Custom Info
  patientName?: string;
  patientMRN?: string;
  diagnosis?: string;
  additionalInfo?: Record<string, any>;
  // The actual form data grid
  gridData: GridRow[];
}

export interface GridRow {
  sn?: string; // Serial number
  code?: string; // Item code/ID
  itemAr: string;
  itemEn: string;
  unit?: string;
  qty?: string;
  expiry?: string;
  batch?: string;
  days: Record<string, string>; // Map of "day" (1-31) to status ("✔", "✘", "1", "2.5", empty, etc.)
  extraType?: string; // e.g., 'select', 'text', 'checkbox'
}

export interface Role {
  id: string;
  name?: string;
  nameAr: string;
  nameEn: string;
}

export interface Permission {
  id: string;
  name?: string;
  nameAr: string;
  nameEn: string;
}

export interface AccessMatrix {
  id: string;
  roleId: string;
  permissionId: string;
  enabled: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: number;
}

export type UserRole = "admin" | "head_nurse" | "quality" | "president" | "staff" | "Staff" | "it" | "tech" | "intern" | "assistant" | "secretary" | "supervisor" | "nursing_director" | "ward_clerk";

export interface AppUser {
  id: string;
  nameAr: string;
  nameEn: string;
  role: UserRole; // This appears to be deprecated in favor of roleId? I will keep it for compatibility but add roleId
  roleId?: string; // Dynamic role
  status?: "pending" | "active" | "disabled";
  avatarInitials: string;
  department: string;
  staffId: string;
  pin?: string; 
  email?: string;
  emp_id?: string;
  assigned_dept?: string;
  supervisorId?: string;
  permissions?: string[];
}


export interface DailyDutyTask {
  id: string;
  department: string;
  taskAr: string;
  taskEn: string;
  categoryAr: string;
  categoryEn: string;
  createdAt: string;
}

export interface UnitDailyChecklist {
  id: string;
  department: string;
  date: string;
  completedByStaffName: string;
  completedByStaffId: string;
  completedAt: string;
  status: "completed" | "audited";
  auditedByStaffName?: string;
  auditedByStaffId?: string;
  auditedAt?: string;
  auditNotes?: string;
  answers: Record<string, { done: boolean; note?: string }>;
}

export interface SystemLog {
  id: string;
  event: string;
  type: "info" | "warning" | "success" | "error";
  time: string;
  timestampMs: number;
}

export interface RosterRow {
  employeeId: string;
  employeeNameAr: string;
  employeeNameEn: string;
  roleTitleAr: string;
  roleTitleEn: string;
  employeeCode: string;
  shifts: Record<string, string>; // e.g. "16" -> "DN"
}

export interface DepartmentRoster {
  id: string;
  departmentName: string;
  startDate: string; // "2026-05-16"
  endDate: string;   // "2026-06-15"
  rows: RosterRow[];
}

export interface Notification {
  id: string;
  userId?: string;
  messageAr: string;
  messageEn: string;
  timestamp: string;
  read: boolean;
  type?: string;
  targetDepartment?: string;
  titleAr?: string;
  titleEn?: string;
  bodyAr?: string;
  bodyEn?: string;
}

export interface RosterWish {
  id: string;
  employeeId: string;
  employeeNameAr: string;
  employeeNameEn: string;
  departmentName: string;
  dayKey: string;
  requestedShift: "M" | "A" | "D" | "N" | "DN" | "OFF" | "AL";
  reasonAr?: string;
  reasonEn?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}



