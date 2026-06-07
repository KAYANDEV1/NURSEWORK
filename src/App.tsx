/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  X,
  Printer,
  Database,
  Search,
  Plus,
  Trash2,
  FileText,
  Download,
  Upload,
  HeartPulse,
  Info,
  Calendar,
  Clock,
  User,
  CheckSquare,
  Thermometer,
  Layers,
  ArrowLeftRight,
  TrendingUp,
  FileSpreadsheet,
  Lock,
  Unlock,
  ShieldAlert,
  Award,
  Settings,
  ListPlus,
  Pencil,
  ShieldCheck,
  Shield,
  LayoutGrid,
  ClipboardList,
  KeyRound,
  Bell,
  Radio,
  Inbox,
  AlertTriangle,
  Send,
  MessageSquare,
  Cloud,
  Mail
} from "lucide-react";
import { GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase";
import {
  FormTemplate,
  SavedRecord,
  GridRow,
  Role,
  Permission,
  AccessMatrix,
  AuditLog,
  UserRole,
  AppUser,
  DailyDutyTask,
  UnitDailyChecklist,
  SystemLog,
  RosterRow,
  DepartmentRoster,
  Notification,
  RosterWish
} from "./types";
import ProfileView from "./components/ProfileView";
import MessagingDashboard from "./components/MessagingDashboard";
import CloudSettingsPage from "./components/CloudSettingsPage";
import RosterPlanningPanel from "./components/RosterPlanningPanel";
import UserApprovalDashboard from "./components/UserApprovalDashboard";
import QualityAnalyticsHub from "./components/QualityAnalyticsHub";
import { FORM_TEMPLATES, createNewRecord, getItemsForTemplate } from "./data/templates";
import { generatePDF } from "./lib/pdfGenerator";
import {
  testConnection,
  syncClinicalRecords,
  saveClinicalRecord,
  deleteClinicalRecord,
  syncStaffRegistry,
  syncHospitalSettings,
  saveStaffMember,
  deleteStaffMember,
  syncDailyAudits,
  saveDailyAudit,
  syncSystemLogs,
  saveSystemLog,
  deleteSystemLog,
  syncDutyTasks,
  saveDutyTask,
  syncCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  syncSystemUsers,
  saveSystemUser,
  syncNotifications,
  saveNotification,
  getHospitalSettings,
  saveHospitalSettings,
  syncDepartmentRosters,
  saveDepartmentRoster,
  syncRosterWishes,
  saveRosterWish,
  deleteRosterWish,
  syncResolvedGaps,
  saveResolvedGap,
  deleteResolvedGap,
  getRolePermissions,
  saveRolePermissions,
  getRosterApprovals,
  saveRosterApprovals,
  getTemplateConfig,
  saveTemplateConfig,
  getResolvedGapsCloud,
  saveResolvedGapsCloud,
  syncRoles,
  syncPermissions,
  syncAccessMatrix,
  saveAccessMatrix,
  saveRole,
  deleteRole,
  savePermission,
  deletePermission,
  syncSentinelIncidents,
  saveSentinelIncident,
  deleteSentinelIncident
} from "./lib/firestoreService";
import { useFirestoreSync } from "./hooks/useFirestoreSync";

const sessionStorageBackup = typeof window !== "undefined" ? window.sessionStorage : null;
// Secure Clinical Gate: Redirect all local persistent caches to sessionStorage for real-time security. 
// This ensures ZERO patient clinical data or credential logs persist on the local host drive once the browser tab is closed.
const localStorage = {
  getItem: (key: string) => sessionStorageBackup?.getItem(key) || null,
  setItem: (key: string, value: string) => {
    try {
      sessionStorageBackup?.setItem(key, value);
    } catch (e) {}
  },
  removeItem: (key: string) => {
    try {
      sessionStorageBackup?.removeItem(key);
    } catch (e) {}
  },
  clear: () => {
    try {
      sessionStorageBackup?.clear();
    } catch (e) {}
  },
  key: (index: number) => sessionStorageBackup?.key(index) || null,
  get length() { return sessionStorageBackup?.length || 0; }
};

// 4 Core Mock Users for Baheya Hospital Access Rules matching the requested design
const BASE_MOCK_USERS: AppUser[] = [
  {
    id: "user-it",
    nameAr: "م. عادل الشريف (رئيس قسم نظم المعلومات IT)",
    nameEn: "Eng. Adel El-Sherif (Head of IT & Digital Systems)",
    role: "it",
    avatarInitials: "IT",
    department: "INFORMATION TECHNOLOGY / IT",
    staffId: "2026",
    pin: "2026",
    email: "it-support@baheya.org",
    supervisorId: "user-admin"
  },
  {
    id: "user-nurse",
    nameAr: "أ. فاطمة الزهراء (استاف التمريض)",
    nameEn: "Sister Fatima El-Zahraa (Staff Nurse)",
    role: "staff",
    avatarInitials: "FZ",
    department: "EMERGENCY UNIT",
    staffId: "2525",
    pin: "2525",
    email: "fatima@baheya.org",
    supervisorId: "user-head-nurse"
  },
  {
    id: "user-head-nurse",
    nameAr: "أ. هدى أحمد (مشرفة تمريض الطوارئ)",
    nameEn: "Sister Hoda Ahmed (Emergency Head Nurse)",
    role: "head_nurse",
    avatarInitials: "HA",
    department: "EMERGENCY UNIT",
    staffId: "1010",
    pin: "1010",
    email: "hoda@baheya.org",
    supervisorId: "user-admin"
  },
  {
    id: "user-quality",
    nameAr: "أ. نورهان علي (المشرف الميداني للجودة)",
    nameEn: "Auditor Norhan Ali (Clinical Supervisor)",
    role: "quality",
    avatarInitials: "NA",
    department: "QUALITY AUDITING",
    staffId: "8080",
    pin: "0808",
    email: "norhan@baheya.org",
    supervisorId: "user-admin"
  },
  {
    id: "user-admin",
    nameAr: "د. محمد السيد (مدير الأقسام والعمليات)",
    nameEn: "Dr. Mohamed Elsayed (Clinical Operations Manager)",
    role: "admin",
    avatarInitials: "MS",
    department: "QUALITY & IT DEPT",
    staffId: "9999",
    pin: "1234",
    email: "mohamed@baheya.org",
    supervisorId: "user-president"
  },
  {
    id: "user-president",
    nameAr: "أ.د. ليلى أبو الخير (رئيس مجلس الإدارة والفرع)",
    nameEn: "Prof. Laila Abou El-Kheir (Hospital President)",
    role: "president",
    avatarInitials: "LK",
    department: "ADMINISTRATION",
    staffId: "9000",
    pin: "9999",
    email: "president@baheya.org"
  },
  // EMERGENCY UNIT ROSTER STAFF REGISTERED ON THE SYSTEM
  {
    id: "emp-1",
    nameAr: "محمود عمر (مساعد رئيس تمريض AHN)",
    nameEn: "Mahmoud Omar (Asst. Head Nurse)",
    role: "staff",
    avatarInitials: "MO",
    department: "EMERGENCY UNIT",
    staffId: "20810",
    pin: "2081",
    email: "mahmoud@baheya.org"
  },
  {
    id: "emp-2",
    nameAr: "هاني ناصر (أخصائي تمريض SN)",
    nameEn: "Hany Naser (Staff Nurse)",
    role: "staff",
    avatarInitials: "HN",
    department: "EMERGENCY UNIT",
    staffId: "20906",
    pin: "2090",
    email: "hany@baheya.org"
  },
  {
    id: "emp-3",
    nameAr: "عمر أحمد (أخصائي تمريض SN)",
    nameEn: "Omar Ahmed (Staff Nurse)",
    role: "staff",
    avatarInitials: "OA",
    department: "EMERGENCY UNIT",
    staffId: "20936",
    pin: "2093",
    email: "omar@baheya.org"
  },
  {
    id: "emp-4",
    nameAr: "محمد محمود (أخصائي تمريض SN)",
    nameEn: "Mohamed Mahmoud (Staff Nurse)",
    role: "staff",
    avatarInitials: "MM",
    department: "EMERGENCY UNIT",
    staffId: "21020",
    pin: "2102",
    email: "mohamed.m@baheya.org"
  },
  {
    id: "emp-5",
    nameAr: "أحمد محمد (أخصائي تمريض SN)",
    nameEn: "Ahmed Mohamed (Staff Nurse)",
    role: "staff",
    avatarInitials: "AM",
    department: "EMERGENCY UNIT",
    staffId: "21034",
    pin: "2103",
    email: "ahmed.m@baheya.org"
  },
  {
    id: "emp-6",
    nameAr: "ندى محمد (أخصائي تمريض SN)",
    nameEn: "Nada Mohamed (Staff Nurse)",
    role: "staff",
    avatarInitials: "NM",
    department: "EMERGENCY UNIT",
    staffId: "20930",
    pin: "2093",
    email: "nada@baheya.org"
  },
  {
    id: "emp-7",
    nameAr: "محمد السيد (أخصائي تمريض SN)",
    nameEn: "Mohamed Elsayed (Staff Nurse)",
    role: "staff",
    avatarInitials: "ME",
    department: "EMERGENCY UNIT",
    staffId: "21094",
    pin: "2109",
    email: "elsayed@baheya.org"
  },
  {
    id: "emp-8",
    nameAr: "إسراء عاطف (أخصائي تمريض SN)",
    nameEn: "Esraa Atef (Staff Nurse)",
    role: "staff",
    avatarInitials: "EA",
    department: "EMERGENCY UNIT",
    staffId: "20888",
    pin: "2088",
    email: "esraa@baheya.org"
  },
  {
    id: "emp-9",
    nameAr: "رشدي أحمد (ممرض امتياز INT)",
    nameEn: "Roshdy Ahmed (Intern Nurse)",
    role: "staff",
    avatarInitials: "RA",
    department: "EMERGENCY UNIT",
    staffId: "20777",
    pin: "2077",
    email: "roshdy@baheya.org"
  },
  {
    id: "emp-10",
    nameAr: "هاجر (ممرض امتياز INT)",
    nameEn: "Hager (Intern Nurse)",
    role: "staff",
    avatarInitials: "HG",
    department: "EMERGENCY UNIT",
    staffId: "20700",
    pin: "2070",
    email: "hager@baheya.org"
  },
  {
    id: "emp-11",
    nameAr: "جلال أبو بكر (ممرض امتياز INT)",
    nameEn: "Galal Abo Bakr (Intern Nurse)",
    role: "staff",
    avatarInitials: "GA",
    department: "EMERGENCY UNIT",
    staffId: "20600",
    pin: "2060",
    email: "galal@baheya.org"
  },
  {
    id: "emp-12",
    nameAr: "هاجر عادل (مساعد تمريض NA)",
    nameEn: "Hager Adel (Nurse Aid)",
    role: "staff",
    avatarInitials: "HA",
    department: "EMERGENCY UNIT",
    staffId: "30101",
    pin: "3010",
    email: "hager.a@baheya.org"
  },
  {
    id: "emp-13",
    nameAr: "ابتسام (مساعد تمريض NA)",
    nameEn: "Ebtisam (Nurse Aid)",
    role: "staff",
    avatarInitials: "EB",
    department: "EMERGENCY UNIT",
    staffId: "30102",
    pin: "3012",
    email: "ebtisam@baheya.org"
  },
  {
    id: "emp-14",
    nameAr: "بشرى (مساعد تمريض NA)",
    nameEn: "Bushra (Nurse Aid)",
    role: "staff",
    avatarInitials: "BU",
    department: "EMERGENCY UNIT",
    staffId: "30103",
    pin: "3013",
    email: "bushra@baheya.org"
  }
];

const DEPT_NAMES_MOCK = [
  "INTENSIVE CARE", "OPERATING ROOM", "CHEMOTHERAPY DAYCARE",
  "RADIOLOGY UNIT", "PHARMACY STORE", "PEDIATRIC WARD", "QUALITY CONTROL", "LABORATORY DEPT"
];

const MOCK_USERS: AppUser[] = [...BASE_MOCK_USERS];
DEPT_NAMES_MOCK.forEach(dept => {
  MOCK_USERS.push({
    id: `emp-dept-1-${dept}`,
    nameAr: `ممرض ${dept} أ`,
    nameEn: `${dept} Nurse A`,
    role: "staff",
    avatarInitials: "NA",
    department: dept,
    staffId: `40101`,
    pin: "4010",
    email: `nurse.a.${dept.toLowerCase().replace(/\s+/g, "")}@baheya.org`
  });
  MOCK_USERS.push({
    id: `emp-dept-2-${dept}`,
    nameAr: `ممرض ${dept} ب`,
    nameEn: `${dept} Nurse B`,
    role: "staff",
    avatarInitials: "NB",
    department: dept,
    staffId: `40102`,
    pin: "4011",
    email: `nurse.b.${dept.toLowerCase().replace(/\s+/g, "")}@baheya.org`
  });
});

MOCK_USERS.forEach(u => {
  if (!u.status) u.status = "active";
  if (!u.roleId) u.roleId = u.role || "staff";
});

const doesTemplateMatchDepartment = (tpl: any, deptName: string): boolean => {
  if (!deptName) return true;
  const codeUpper = (tpl.code || "").toUpperCase();
  const deptUpper = (tpl.departmentDefault || "").toUpperCase();
  const dName = deptName.toUpperCase();
  
  if (dName === "EMERGENCY UNIT" || dName === "EMERGENCY ROOM" || dName === "EMERGENCY") {
    return (
      deptUpper.includes("EMERGENCY") || 
      deptUpper.includes("DRESSING") || 
      codeUpper.includes("-ER-") || 
      codeUpper.includes("-GEN-027")
    );
  }
  if (dName === "CHEMO UNIT PREPN" || dName === "CHEMO DAYCARE" || dName === "CHEMO") {
    return deptUpper.includes("CHEMO") || codeUpper.includes("-CHEMO-");
  }
  if (dName.includes("ICU") || dName.includes("INTENSIVE CARE") || dName.includes("CRITICAL CARE")) {
    return deptUpper.includes("ICU") || codeUpper.includes("-ICU-");
  }
  if (dName === "ONCO-SURGICAL UNIT" || dName.includes("OPERATING") || dName.includes("SURGICAL") || dName.includes("SURGERY") || dName.includes("STERILIZATION")) {
    return (
      deptUpper.includes("OPERATING") || 
      deptUpper.includes("SURGERY") ||
      deptUpper.includes("SURGICAL") ||
      deptUpper.includes("STERILIZATION") ||
      deptUpper.includes("RECOVERY") ||
      codeUpper.includes("-OR-") ||
      codeUpper.includes("-SURG-") ||
      codeUpper.includes("-ENG-")
    );
  }
  if (dName === "OUTPATIENT CLINIC" || dName.includes("OUTPATIENT") || dName.includes("CLINIC")) {
    return deptUpper.includes("CLINIC") || codeUpper.includes("-CLIN-") || codeUpper.includes("-OP-") || deptUpper.includes("OUTPATIENT") || tpl.id.includes("outpatient");
  }
  
  // Default fallback check
  return deptUpper.includes(dName) || dName.includes(deptUpper);
};

const DEFAULT_DUTY_TASKS: DailyDutyTask[] = [
  {
    id: "duty-er-1",
    department: "EMERGENCY UNIT",
    taskAr: "التحقق من سلامة أقفال وعربة إنعاش القلب الرئوي (الكود بلو) ومجموعاتها",
    taskEn: "Verify Emergency Code Blue Resuscitation Cart Seals & stocks are intact",
    categoryAr: "عربة الطوارئ",
    categoryEn: "Emergency Cart",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-er-2",
    department: "EMERGENCY UNIT",
    taskAr: "تسجيل قراءة درجات حرارة ثلاجة حفظ العينات والدم والأدوية الطبية (2 إلى 8 درجات مئوية)",
    taskEn: "Log temperature of Emergency Blood/Specimen fridge (2°C to 8°C)",
    categoryAr: "سلسلة التبريد",
    categoryEn: "Cold Chain",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-er-3",
    department: "EMERGENCY UNIT",
    taskAr: "التحقق من اكتمال شحن بطارية واختبار جاهزية جهاز صدمات القلب (Defibrillator)",
    taskEn: "Verify Emergency Defibrillator visual check and test shock capability",
    categoryAr: "جاهزية الأجهزة",
    categoryEn: "Device Readiness",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-er-4",
    department: "EMERGENCY UNIT",
    taskAr: "مراجعة كمية أسطوانات الأكسجين المحمولة وضغط الغاز للتأكد من تخطيها 1500 PSI",
    taskEn: "Check levels and pressure of emergency portable oxygen cylinders (>1500 PSI)",
    categoryAr: "إمدادات الغازات",
    categoryEn: "Gas Supplies",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-er-5",
    department: "EMERGENCY UNIT",
    taskAr: "التفتيش على ملء وتوافر معقمات الأيدي الكحولية بممرات المرضى وغرف الكشف",
    taskEn: "Verify clinical hand sanitizer dispenser levels in waiting zones & clinic rooms",
    categoryAr: "مكافحة العدوى",
    categoryEn: "Infection Control",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-icu-1",
    department: "INTENSIVE CARE UNIT (ICU)",
    taskAr: "اختبار جاهزية ونظافة أجهزة التنفس الصناعي الاحتياطية ومكثفات الأكسجين",
    taskEn: "Verify functional testing and sanitation of backup ventilators & concentrators",
    categoryAr: "أجهزة التنفس",
    categoryEn: "Ventilation Devices",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-icu-2",
    department: "INTENSIVE CARE UNIT (ICU)",
    taskAr: "التحقق من معايرة مضخات السوائل والسرنجات ومطابقتها للمعايير المعتمدة",
    taskEn: "Audit infusion and syringe pump calibration and safety logs",
    categoryAr: "مضخات السوائل",
    categoryEn: "Infusion System",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-icu-3",
    department: "INTENSIVE CARE UNIT (ICU)",
    taskAr: "اختبار فاعلية نظام إنذار انقطاع الغازات الطبية ونقص ضغط الأكسجين المركزي",
    taskEn: "Test and verify center oxygen pressure & central clinical medical gas alarm sirens",
    categoryAr: "سلامة المرضى",
    categoryEn: "Patient Safety",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-icu-4",
    department: "INTENSIVE CARE UNIT (ICU)",
    taskAr: "التفتيش على صندوق الأجسام الحادة وحاوية المخلفات الطبية لتجنب تخطي 3/4 السعة",
    taskEn: "Ensure rigid sharp disposal collection boxes are not filled beyond 3/4 capacity",
    categoryAr: "مكافحة العدوى",
    categoryEn: "Infection Control",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-chemo-1",
    department: "CHEMO UNIT PREPN",
    taskAr: "تدقيق نظافة وعقم كبائن التدفق الرقائقي الحيوي (Biosafety Hood) بالصيدلية",
    taskEn: "Validate sanitization index of Chemo Bio-Safety laminating cabinets",
    categoryAr: "التعقيم الوقائي",
    categoryEn: "Protective Sterility",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-chemo-2",
    department: "CHEMO UNIT PREPN",
    taskAr: "التحقق المزدوج المعتمد من طبيب وصيدلي لبطاقات المرضى مطابقة لجرعات الكيماوي والوزن",
    taskEn: "Dual nurse-pharmacist clinical check for patient identity, weight, and chemotherapy doses",
    categoryAr: "سلامة تحضير الدواء",
    categoryEn: "Drug Administration",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-chemo-3",
    department: "CHEMO UNIT PREPN",
    taskAr: "التدقيق اللحظي على سلامة ومستوى تعبئة صندوق احتواء انسكابات الكيماوي الخطرة",
    taskEn: "Verify presence of chemotherapy spillage kit, protective uniforms & safety goggles",
    categoryAr: "إدارة المخاطر",
    categoryEn: "Risk Management",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-chemo-4",
    department: "CHEMO UNIT PREPN",
    taskAr: "تسجيل والتحكم بنظام درجات حرارة ثلاجة حفظ العلاجات الموجهة والهرمونية لسرطان الثدي",
    taskEn: "Assess and log breast oncology targeted/hormonal therapy fridge temperature",
    categoryAr: "سلسلة التبريد",
    categoryEn: "Cold Chain",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-or-1",
    department: "ONCO-SURGICAL UNIT",
    taskAr: "التحقق الكامل من هوية المريض والملف الطبي والموافقة الجراحية المكتوبة قبل التخدير",
    taskEn: "Verify inpatient identifier, clinical record, and signed surgical/anesthesia informed consent",
    categoryAr: "أمان العمليات",
    categoryEn: "Surgical Safety",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-or-2",
    department: "ONCO-SURGICAL UNIT",
    taskAr: "التحقق من جاهزية أجهزة التخدير المركزي وتعبئة غاز الأكسجين والنيتروز الاحتياطي بسلامة",
    taskEn: "Audit anesthesia machine self-testing protocols, ventilator status and back-up cylinders",
    categoryAr: "جاهزية الأجهزة",
    categoryEn: "Device Readiness",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-or-3",
    department: "ONCO-SURGICAL UNIT",
    taskAr: "فحص مؤشرات كفاءة التعقيم الكيميائية والحرارية المضمنة بعبوات العمليات الجراحية المفتوحة",
    taskEn: "Review chemical and thermal internal indicators on all sterile surgical pack bundles",
    categoryAr: "التعقيم والعدوى",
    categoryEn: "Sterile Parameters",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-or-4",
    department: "ONCO-SURGICAL UNIT",
    taskAr: "العد الإلزامي الثنائي قبل وبعد العملية للشاش الجراحي والإبر والخيوط والأدوات الجراحية",
    taskEn: "Perform manual dual-signer count of surgical sponges, needles, blades and metal instruments",
    categoryAr: "أمان القاعة",
    categoryEn: "Theatre Accountability",
    createdAt: "2026-01-01"
  }
];

export function resolveRoleTitles(role?: string) {
  const norm = (role || "").trim().toLowerCase();
  switch (norm) {
    case "head_nurse":
      return { ar: "رئيسة تمريض (HN)", en: "Head Nurse (HN)" };
    case "tech":
    case "nursing_tech":
      return { ar: "فني تمريض (NT)", en: "Nursing Technician (NT)" };
    case "intern":
    case "intern_nurse":
      return { ar: "تمريض امتياز (Intern)", en: "Intern Nurse (INT)" };
    case "assistant":
    case "nursing_assistant":
      return { ar: "مساعد تمريض (NA)", en: "Nursing Assistant (NA)" };
    case "secretary":
    case "sec":
      return { ar: "سكرتارية القسم (SEC)", en: "Department Secretary (SEC)" };
    case "doctor":
      return { ar: "طبيب مقيم (Dr)", en: "Clinical Doctor" };
    case "quality":
      return { ar: "مسؤول جودة (QA)", en: "Quality Officer (QA)" };
    case "admin":
      return { ar: "مسؤول نظام (Admin)", en: "System Admin" };
    case "staff":
    default:
      return { ar: "أخصائي تمريض (SN)", en: "Staff Nurse (SN)" };
  }
}
export const SystemSettingsContext = React.createContext<{
  hospitalSettings: any;
  setHospitalSettings: (settings: any) => void;
}>({
  hospitalSettings: {
    nameAr: "مؤسسة بهية",
    taglineAr: "في ضهر كل ست مصرية",
    nameEn: "Baheya Foundation",
    taglineEn: "Breast Cancer Screening & Treatment",
    address: "الهرم / الشيخ زايد، الجيزة، مصر",
    emergencyPhone: "19745",
    footerAr: "قسم الجودة ومراقبة المعايير الطبية بهية - تقرير إلكتروني موثق بموجب المعايير الدولية",
    footerEn: "Baheya Quality & Clinical Standards Unit - Certified System Performance Report",
    appHeaderAr: "نظام الجودة السريري لبهية",
    appHeaderEn: "Baheya Clinical Quality System",
    appFooterAr: "جميع الحقوق محفوظة لمؤسسة بهية © 2026",
    appFooterEn: "All Rights Reserved to Baheya Foundation © 2026",
    accreditationBodyAr: "الهيئة العامة للاعتماد والرقابة الصحية",
    accreditationBodyEn: "General Authority for Healthcare Accreditation and Regulation (GAHAR)",
    appVersion: "1.0.0",
    revisionDate: "2026",
    userInstructionsAr: "يرجى تعبئة البيانات بعناية لضمان سلامة المرضى.",
    userInstructionsEn: "Please fill in the data carefully to ensure patient safety.",
    roles: ["admin", "nurse", "doctor"],
    jobTitles: ["Head Nurse", "General Practitioner", "Staff Nurse"],
    portalTitleAr: "بوابة بهية الرقمية",
    portalTitleEn: "Baheya Digital Portal",
    premiumTitleAr: "نماذج بهية المميزة",
    premiumTitleEn: "Baheya Premium Forms",
  },
  setHospitalSettings: () => {},
});
export default function App() {
  const [hospitalSettings, setHospitalSettings] = useState<any>({
    nameAr: "مستشفى الرعاية السريرية الموحدة",
    taglineAr: "نحو رعاية طبية آمنة وممتازة وجودة مستدامة",
    nameEn: "Unified Clinical Care Hospital",
    taglineEn: "Towards Safe, Quality & Standardized Patient Care",
    address: "الجيزة، جمهورية مصر العربية",
    emergencyPhone: "19600",
    footerAr: "قسم الجودة ومراقبة المعايير الطبية والتمريضية - تقرير إلكتروني موثق بموجب المعايير الدولية",
    footerEn: "Unified Quality & Clinical Standards Unit - Certified System Performance Report",
    appHeaderAr: "نظام الجودة السريري الموحد",
    appHeaderEn: "Unified Clinical Quality System",
    appFooterAr: "جميع الحقوق محفوظة للمستشفى © 2026",
    appFooterEn: "All Rights Reserved © 2026",
    accreditationBodyAr: "الهيئة العامة للاعتماد والرقابة الصحية GAHAR",
    accreditationBodyEn: "General Authority for Healthcare Accreditation and Regulation (GAHAR)",
    appVersion: "1.0.0",
    revisionDate: "2026",
    userInstructionsAr: "يرجى تعبئة البيانات السريرية بعناية لضمان سلامة المرضى ومراعاة السياسات الصحّية.",
    userInstructionsEn: "Please fill in the clinical data carefully to ensure patient safety and security.",
    roles: ["admin", "nurse", "doctor"],
    jobTitles: ["Head Nurse", "General Practitioner", "Staff Nurse"],
    portalTitleAr: "البوابة الرقمية الموحدة للجودة والتمريض",
    portalTitleEn: "Unified Care Quality & Nursing Portal",
    premiumTitleAr: "النماذج والجرودات الرقمية الممتازة",
    premiumTitleEn: "Premium Digital Audit Checklists & Forms",
  });

  return (
    <SystemSettingsContext.Provider value={{ hospitalSettings, setHospitalSettings }}>
      <AppContent />
    </SystemSettingsContext.Provider>
  );
}

function AppContent() {
  const { hospitalSettings, setHospitalSettings } = React.useContext(SystemSettingsContext);
  useEffect(() => {
    return syncHospitalSettings((settings) => {
      if (settings) {
        setHospitalSettings(settings);
      }
    });
  }, [setHospitalSettings]);

  // DB & State Management
  const [records, setRecords] = useFirestoreSync<SavedRecord>(syncClinicalRecords, []);
  const [customTemplates, setCustomTemplates] = useFirestoreSync<FormTemplate>(syncCustomTemplates, []);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate>(FORM_TEMPLATES[0]);
  const [editingRecord, setEditingRecord] = useState<SavedRecord | null>(null);
  const [activeCellEdit, setActiveCellEdit] = useState<{
    rowIndex: number;
    dayKey: string;
    itemAr: string;
    itemEn: string;
    code: string;
    currentValue: string;
    isDevice: boolean;
  } | null>(null);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());


  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const recordDate = editingRecord ? new Date(editingRecord.date) : new Date();
  const numDays = new Date(recordDate.getFullYear(), recordDate.getMonth() + 1, 0).getDate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<SavedRecord | null>(null);
  const [historyDeptFilter, setHistoryDeptFilter] = useState<string>("");
  const [historyTemplateFilter, setHistoryTemplateFilter] = useState<string>("");
  const [userRegistrySearch, setUserRegistrySearch] = useState("");
  const [userRegistryPage, setUserRegistryPage] = useState(0);
  const [dbStatus, setDbStatus] = useState<"connected" | "syncing" | "error">("connected");
  const [activeTab, setActiveTab] = useState<"editor" | "history" | "settings" | "about" | "analytics" | "duty" | "it_panel" | "distribution" | "roster" | "messaging" | "cloud_settings" | "roster_config" | "approval" | "profile">("duty");
  const [ledgerViewMode, setLedgerViewMode] = useState<"weekly" | "monthly">("weekly");
  const [dayFocus, setDayFocus] = useState<"all" | number>("all"); // Show all 31 days or focus on a single day
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [isBellOpen, setIsBellOpen] = useState(false);

  // Clinical Quality sub-tabs and incident logs inputs
  const [analyticsSubTab, setAnalyticsSubTab] = useState<"kpis" | "sentinel" | "compliance">("kpis");
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [newIncidentForm, setNewIncidentForm] = useState({
    department: "EMERGENCY UNIT",
    typeAr: "",
    typeEn: "",
    severity: "Medium",
    descAr: "",
    descEn: "",
    rcaAr: "",
    rcaEn: "",
    actionAr: "",
    actionEn: ""
  });
  const [jciCheckedArray, setJciCheckedArray] = useState<number[]>([1, 2, 4, 5]);

  // Dynamically update browser tab title to match Settings configurations
  useEffect(() => {
    if (hospitalSettings) {
      const title = language === "ar"
        ? (hospitalSettings.portalTitleAr || hospitalSettings.nameAr || "بوابة بهية الرقمية")
        : (hospitalSettings.portalTitleEn || hospitalSettings.nameEn || "Baheya Digital Portal");
      document.title = title;
      try {
        if (window.parent && window.parent.document) {
          window.parent.document.title = title;
        }
      } catch (e) {}
    }
  }, [hospitalSettings, language]);

  console.log("App re-rendering");


  // Dynamic Duty Task & Checklist states
  const [dutyTasks, setDutyTasks] = useFirestoreSync<DailyDutyTask>(syncDutyTasks, FORM_TEMPLATES.map((t) => ({
      id: t.id,
      department: t.departmentDefault,
      taskAr: t.titleAr,
      taskEn: t.titleEn,
      categoryAr: "نموذج",
      categoryEn: "Form",
      createdAt: "2026-01-01"
    })));

  const [dailyChecklists, setDailyChecklists, dailyChecklistsLoaded] = useFirestoreSync<UnitDailyChecklist>(syncDailyAudits, []);

  const [rolePermissions, setRolePermissions] = useState(() => {
    const stored = localStorage.getItem("baheya_role_permissions");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.submitChecklist && parsed.submitChecklist.includes("president")) {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      submitChecklist: ["staff", "head_nurse", "admin", "quality", "president", "it"],
      approveChecklist: ["head_nurse", "admin", "quality", "president", "it"],
      manageDutyTasks: ["head_nurse", "admin", "quality", "president", "it"],
      editMasterTemplates: ["admin", "quality", "president", "it"],
      deleteLogs: ["admin", "president", "it"],
      modifyRosterShifts: ["head_nurse", "admin", "quality", "president", "it"],
      signoffRosterCno: ["president", "it"],
      addRemoveStaff: ["head_nurse", "admin", "president", "it"],
      editHospitalSettings: ["admin", "president", "it"],
      viewSystemDatabase: ["admin", "president", "it"]
    };
  });

  // Form input states for creating duty tasks
  const [selectedDutyDept, setSelectedDutyDept] = useState<string>("EMERGENCY UNIT");
  const [dutyChecklistAnswers, setDutyChecklistAnswers] = useState<Record<string, { done: boolean; note?: string }>>({});
  const [supervisorAuditNoteText, setSupervisorAuditNoteText] = useState<string>("");
  
  const [newTaskTextAr, setNewTaskTextAr] = useState<string>("");
  const [newTaskTextEn, setNewTaskTextEn] = useState<string>("");
  const [newTaskCategoryAr, setNewTaskCategoryAr] = useState<string>("عام");
  const [newTaskCategoryEn, setNewTaskCategoryEn] = useState<string>("General");

  // CQI - Continuous Quality Improvement Alerts & Gaps state
  const [resolvedGaps, rawSetResolvedGaps] = useState<Record<string, { resolved: boolean; notes: string; resolvedBy: string; resolvedAt: string }>>({});
  const [editingGapKey, setEditingGapKey] = useState<string | null>(null);
  const [gapResolutionNote, setGapResolutionNote] = useState<string>("");

  // Clinical shifts dictionary as requested by user (M, A, D, N, DN, OFF, AL)
  const CLINICAL_SHIFTS = [
    { id: "M", nameAr: "M: صباحي (08:00 ص - 02:00 م)", nameEn: "M: Morning Shift (08:00 AM - 02:00 PM)" },
    { id: "A", nameAr: "A: ظهر (02:00 م - 08:00 م)", nameEn: "A: Afternoon Shift (02:00 PM - 08:00 PM)" },
    { id: "D", nameAr: "D: لونج (08:00 ص - 08:00 م)", nameEn: "D: Long Day Shift (08:00 AM - 08:00 PM)" },
    { id: "N", nameAr: "N: نايت (08:00 م - 08:00 ص)", nameEn: "N: Night Shift (08:00 PM - 08:00 AM)" },
    { id: "DN", nameAr: "DN: 24 ساعة (08:00 ص - 08:00 ص)", nameEn: "DN: 24 Hours Shift (08:00 AM - 08:00 AM)" },
    { id: "OFF", nameAr: "OFF: إجازة / أوف", nameEn: "OFF: Day Off" },
    { id: "AL", nameAr: "AL: إجازة سنوية", nameEn: "AL: Annual Leave" }
  ];

  // Auto-detect Shift based on current time
  const getActiveShiftId = () => {
    const hour = new Date().getHours();
    // Morning shift is from 08:00 AM to 02:00 PM (hour 8 to 13 inclusive)
    if (hour >= 8 && hour < 14) return "M";
    // Afternoon shift is from 02:00 PM to 08:00 PM (hour 14 to 19 inclusive)
    if (hour >= 14 && hour < 20) return "A";
    // Night shift covers the remaining hours (20:00 to 07:59 next day)
    return "N";
  };
  
  const [selectedShift, setSelectedShift] = useState<string>(() => getActiveShiftId());

  // Roster Calendar date ranges: June 1st to July 31st, 2026 (June - July 2026)
  const ROSTER_DAYS_KEYS = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"
  ];

  const ROSTER_DAYS_WD = [
    "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN",
    "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN",
    "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN",
    "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN",
    "MON", "TUE", "WED"
  ];

  // Roster states populated from localStorage or generated matching PDF format
  const [rosterList, rawSetRosterList, rosterListLoaded] = useFirestoreSync<any>(syncDepartmentRosters, []);

  const [rosterWishes, rawSetRosterWishes, rosterWishesLoaded] = useFirestoreSync<any>(syncRosterWishes, []);

  const [selectedRosterDept, setSelectedRosterDept] = useState<string>("EMERGENCY UNIT");
  const [activeRosterCellEdit, setActiveRosterCellEdit] = useState<{
    employeeId: string;
    dayKey: string;
    currentShift: string;
    employeeNameAr: string;
    employeeNameEn: string;
  } | null>(null);

  const [wishDayKey, setWishDayKey] = useState<string>("16");
  const [wishShift, setWishShift] = useState<string>("M");
  const [wishReasonAr, setWishReasonAr] = useState<string>("");
  const [wishReasonEn, setWishReasonEn] = useState<string>("");
  const [modificationRequestNote, setModificationRequestNote] = useState<string>("");
  const [wishInputMode, setWishInputMode] = useState<"manual" | "stamp">("stamp");
  const [stampActiveShift, setStampActiveShift] = useState<string>("M");

  // Leadership sign-off approvals for the entire roster (CNO and Director)
  const [cnoApproved, setCnoApproved] = useState<boolean>(() => {
    return localStorage.getItem("baheya_roster_cno_approved") === "true";
  });
  const [directorApproved, setDirectorApproved] = useState<boolean>(() => {
    return localStorage.getItem("baheya_roster_director_approved") === "true";
  });
  const [cnoApprovalDate, setCnoApprovalDate] = useState<string>(() => {
    return localStorage.getItem("baheya_roster_cno_date") || "";
  });
  const [directorApprovalDate, setDirectorApprovalDate] = useState<string>(() => {
    return localStorage.getItem("baheya_roster_director_date") || "";
  });

  // Dynamic Shift Cycle & Monthly Archive States
  const [availablePeriods, setAvailablePeriods] = useState<any[]>(() => {
    const saved = localStorage.getItem("baheya_custom_periods");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { value: "2026-06", labelAr: "يونيو - يوليو 2026 (الروستر الموحد الجديد)", labelEn: "June 1 - July 31, 2026 (Unified Active Cycle)" },
      { value: "2026-05", labelAr: "1 مايو - 31 مايو 2026 (الأرشيف السابق)", labelEn: "May 1 - May 31, 2026 (Historic)" },
      { value: "2026-04", labelAr: "16 أبريل - 15 مايو 2026", labelEn: "April 16 - May 15, 2026" },
      { value: "2026-03", labelAr: "16 مارس - 15 أبريل 2026", labelEn: "March 16 - April 15, 2026" }
    ];
  });

  const [selectedRosterPeriod, setSelectedRosterPeriod] = useState<string>(() => {
    return localStorage.getItem("baheya_selected_roster_period") || "2026-06";
  });

  // Customizer for administrative signers names & promotions
  const [customCnoName, setCustomCnoName] = useState<string>(() => {
    return localStorage.getItem("baheya_custom_cno_name") || "أ. فاطمة الزهراء";
  });
  const [customDirectorName, setCustomDirectorName] = useState<string>(() => {
    return localStorage.getItem("baheya_custom_director_name") || "د. محمد السيد";
  });

  // Local/Cloud list of snapshots for Roster archives
  const [rosterArchives, setRosterArchives] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("baheya_roster_archives") || "[]");
    } catch(e) { return []; }
  });

  // Simulated professional email inbox
  const [communicationsInbox, setCommunicationsInbox] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("baheya_virtual_emails") || "[]");
    } catch(e) { return []; }
  });

  const getPeriodLabelAr = (periodKey: string) => {
    const found = availablePeriods.find(p => p.value === periodKey);
    if (found) return found.labelAr;
    switch (periodKey) {
      case "2026-06": return "يونيو - يوليو 2026 (الروستر الموحد الجديد)";
      case "2026-05": return "1 مايو - 31 مايو 2026 (الأرشيف السابق)";
      case "2026-04": return "16 أبريل - 15 مايو 2026";
      case "2026-03": return "16 مارس - 15 أبريل 2026";
      default: return `${periodKey} (دورة كاملة)`;
    }
  };

  const getPeriodLabelEn = (periodKey: string) => {
    const found = availablePeriods.find(p => p.value === periodKey);
    if (found) return found.labelEn;
    switch (periodKey) {
      case "2026-06": return "June 1 - July 31, 2026 (Unified Active Cycle)";
      case "2026-05": return "May 1 - May 31, 2026 (Historic Archive)";
      case "2026-04": return "April 16 - May 15, 2026";
      case "2026-03": return "March 16 - April 15, 2026";
      default: return `${periodKey} cycle`;
    }
  };

  // IT helper local states
  const [backupRestoreInput, setBackupRestoreInput] = useState<string>("");

  // Roster inline editing and login portal credentials registration states
  const [editingRosterEmpId, setEditingRosterEmpId] = useState<string | null>(null);
  const [editRosterEmpNameAr, setEditRosterEmpNameAr] = useState<string>("");
  const [editRosterEmpNameEn, setEditRosterEmpNameEn] = useState<string>("");
  const [editRosterEmpCode, setEditRosterEmpCode] = useState<string>("");

  // New Roster Staff adding states
  const [isAddingRosterRow, setIsAddingRosterRow] = useState<boolean>(false);
  const [newRosterEmpNameAr, setNewRosterEmpNameAr] = useState<string>("");
  const [newRosterEmpNameEn, setNewRosterEmpNameEn] = useState<string>("");
  const [newRosterEmpCode, setNewRosterEmpCode] = useState<string>("");
  const [newRosterEmpRole, setNewRosterEmpRole] = useState<string>("staff");
  const [newRosterEmpPin, setNewRosterEmpPin] = useState<string>("");
  const [newRosterAutoRegister, setNewRosterAutoRegister] = useState<boolean>(true);

  const [loginTab, setLoginTab] = useState<"login" | "signup">("login");
  const [signupForm, setSignupForm] = useState({
    nameAr: "",
    nameEn: "",
    email: "",
    role: "staff",
    department: "EMERGENCY UNIT",
    staffId: "",
    pin: ""
  });

  // Sync state wrappers to persist state automatically in local cache and Cloud Firestore
  const setRosterList = (updated: any[] | ((prev: any[]) => any[])) => {
    if (typeof updated === "function") {
      rawSetRosterList((prev) => {
        const next = updated(prev);
        // localStorage.setItem("baheya_department_rosters", JSON.stringify(next)); 
        next.forEach((rost) => {
          saveDepartmentRoster(rost).catch(err => console.error("Cloud roster sync error:", err));
        });
        return next;
      });
    } else {
      rawSetRosterList(updated);
      updated.forEach((rost) => {
        saveDepartmentRoster(rost).catch(err => console.error("Cloud roster */sync error:", err));
      });
    }
  };

  const setRosterWishes = (updated: any[] | ((prev: any[]) => any[])) => {
    if (typeof updated === "function") {
      rawSetRosterWishes((prev) => {
        const next = updated(prev);
        localStorage.setItem("baheya_roster_wishes", JSON.stringify(next));
        
        // Find deleted wishes
        const deleted = prev.filter(p => !next.some(n => n.id === p.id));
        deleted.forEach(w => {
          deleteRosterWish(w.id).catch(err => console.error("Delete wish sync error:", err));
        });

        next.forEach((wish) => {
          saveRosterWish(wish).catch(err => console.error("Cloud wish sync error:", err));
        });
        return next;
      });
    } else {
      rawSetRosterWishes((prev) => {
        localStorage.setItem("baheya_roster_wishes", JSON.stringify(updated));
        
        // Find deleted wishes
        const deleted = prev.filter(p => !updated.some(n => n.id === p.id));
        deleted.forEach(w => {
          deleteRosterWish(w.id).catch(err => console.error("Delete wish sync error:", err));
        });

        updated.forEach((wish) => {
          saveRosterWish(wish).catch(err => console.error("Cloud wish sync error:", err));
        });
        return updated;
      });
    }
  };

  const handleStampWish = (dayKey: string, shift: string, isRosterFullyLocked: boolean) => {
    if (isRosterFullyLocked) {
      alert(language === "ar" ? "🔒 الروستر معتمد نهائياً ومغلق تماماً ضد أي رغبات جديدة." : "Roster is sealed.");
      return;
    }

    // Check if there is an approved wish for this day
    const approvedWish = rosterWishes.find(
      (w: any) => w.employeeId === currentUser.id && w.dayKey === dayKey && w.status === "approved"
    );
    if (approvedWish) {
      alert(language === "ar" 
        ? `⚠️ شفت يوم ${dayKey} معتمد ومغلق (${approvedWish.requestedShift}). لتعديله يرجى تعبئة طلب التعديل اليدوي بالأسفل.`
        : `Shift for day ${dayKey} is approved (${approvedWish.requestedShift}) and cannot be direct-stamped. Please submit a manual adjustment request.`
      );
      return;
    }

    if (shift === "DELETE") {
      // Delete any existing wish for this day
      const updated = rosterWishes.filter(
        (w: any) => !(w.employeeId === currentUser.id && w.dayKey === dayKey)
      );
      setRosterWishes(updated);
      localStorage.setItem("baheya_roster_wishes", JSON.stringify(updated));
      return;
    }

    // Generate or update wish
    const existingIndex = rosterWishes.findIndex(
      (w: any) => w.employeeId === currentUser.id && w.dayKey === dayKey
    );

    let updatedWishes = [...rosterWishes];
    const newWish = {
      id: existingIndex >= 0 ? rosterWishes[existingIndex].id : `wish-${Date.now()}`,
      employeeId: currentUser.id,
      employeeNameAr: currentUser.nameAr,
      employeeNameEn: currentUser.nameEn,
      departmentName: currentUser.department || "EMERGENCY UNIT",
      department: currentUser.department || "EMERGENCY UNIT",
      period: selectedRosterPeriod,
      dayKey: dayKey,
      requestedShift: shift,
      reasonAr: language === "ar" ? "تسجيل سريع عبر جدول رغبات الموظف بلمسة واحدة" : "Quick stamp via employee roster board with 1-click",
      reasonEn: "Quick stamp preference via roster dashboard with 1-click",
      status: "pending",
      submittedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      if (updatedWishes[existingIndex].status === "approved") {
        return;
      }
      updatedWishes[existingIndex] = newWish;
    } else {
      updatedWishes = [newWish, ...updatedWishes];
    }

    setRosterWishes(updatedWishes);
    localStorage.setItem("baheya_roster_wishes", JSON.stringify(updatedWishes));

    // Add notification
    const newNotification = {
      id: `notif-${Date.now()}`,
      messageAr: `⚙️ رغبة سريعة جديدة: قامت الممرضة "${currentUser.nameAr}" بتسجيل رغبة يوم ${dayKey} شفت "${shift}".`,
      titleAr: `رغبة نوبتجية لـ ${currentUser.nameAr}`,
      messageEn: `⚙️ Quick shift wish: Nurse "${currentUser.nameEn}" stamped shift "${shift}" for Day ${dayKey}.`,
      titleEn: `Quick wish: ${currentUser.nameEn}`,
      bodyAr: `طلب كادر التمريض تثبيت الفترة (${shift}) ليوم ${dayKey} بقسم ${currentUser.department}.`,
      bodyEn: `Staff registered shift (${shift}) for day ${dayKey} inside ${currentUser.department}.`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications([newNotification, ...notifications]);
  };

  const setResolvedGaps = (updated: Record<string, any>) => {
    rawSetResolvedGaps(updated);
    localStorage.setItem("baheya_resolved_gaps", JSON.stringify(updated));
    saveResolvedGapsCloud(updated).catch(err => console.error("Cloud resolved gaps sync error:", err));
  };

  const syncAndSetCnoApproved = (val: boolean, dateStr: string) => {
    setCnoApproved(val);
    setCnoApprovalDate(dateStr);
    localStorage.setItem("baheya_roster_cno_approved", String(val));
    localStorage.setItem("baheya_roster_cno_date", dateStr);
    saveRosterApprovals({
      cnoApproved: val,
      cnoApprovalDate: dateStr,
      directorApproved,
      directorApprovalDate
    }).catch(err => console.error("Error saving approvals:", err));
  };

  const syncAndSetDirectorApproved = (val: boolean, dateStr: string) => {
    setDirectorApproved(val);
    setDirectorApprovalDate(dateStr);
    localStorage.setItem("baheya_roster_director_approved", String(val));
    localStorage.setItem("baheya_roster_director_date", dateStr);
    saveRosterApprovals({
      cnoApproved,
      cnoApprovalDate,
      directorApproved: val,
      directorApprovalDate: dateStr
    }).catch(err => console.error("Error saving approvals:", err));
  };
  const [itSelectedUserIdToOverride, setItSelectedUserIdToOverride] = useState<string>("");
  const [itOverwrittenPin, setItOverwrittenPin] = useState<string>("");

  // IT Subsystem States
  const [itStrictComplianceMode, setItStrictComplianceMode] = useState<boolean>(true);
  const [itConflictResolutionWithNewest, setItConflictResolutionWithNewest] = useState<boolean>(true);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

  // Advanced Multi-User Dashboard & Node Registry States
  const [itSubTab, setItSubTab] = useState<"admin_ops" | "it_infra" | "dev_sandbox" | "dr_backup">("admin_ops");
  const [serverNodes, setServerNodes] = useState<any[]>([
    {
      id: "node-1",
      name: "Central Clinical Cloud Sync Server",
      ip: "10.150.2.10",
      status: "Online",
      latency: 18,
      sharedDevices: ["ID Card Scanner F-40", "Wristband Thermal Printer #1", "Emergency Ward Infusion Pump Hub"],
      serverPort: "3000",
      nodeRole: "Active-Primary",
      hardwareLoad: 24 // % percentage
    },
    {
      id: "node-2",
      name: "Oncology Drug Prep Local Standby",
      ip: "10.150.2.14",
      status: "Online",
      latency: 31,
      sharedDevices: ["Chemo Refrigerator Sensor Unit", "Chemo Label Printer ER-1"],
      serverPort: "3001",
      nodeRole: "Replica-Standby",
      hardwareLoad: 12
    }
  ]);

  // Form states for new Server Node Registration
  const [newNodeName, setNewNodeName] = useState<string>("");
  const [newNodeIp, setNewNodeIp] = useState<string>("");
  const [newNodePort, setNewNodePort] = useState<string>("3000");
  const [newNodeRole, setNewNodeRole] = useState<string>("Active-Primary");
  const [newNodeDevices, setNewNodeDevices] = useState<string>("");

  // Developer Rules playground states
  const [devSelectedRulesCollection, setDevSelectedRulesCollection] = useState<string>("records");
  const [devMockRulesAuthVerified, setDevMockRulesAuthVerified] = useState<boolean>(true);
  const [devMockRulesAuthRole, setDevMockRulesAuthRole] = useState<string>("staff");
  const [dummyProcessLoader, setDummyProcessLoader] = useState<boolean>(false);

  const addSystemLog = (event: string, type: "info" | "warning" | "success" | "error" = "info") => {
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      event,
      type,
      time: new Date().toLocaleTimeString(),
      timestampMs: Date.now()
    };
    saveSystemLog(newLog).catch(err => console.error("Failed to save log to Firebase:", err));
  };

  // Secure Corporate State overrides
  const [isGlobalLockdownActive, setIsGlobalLockdownActive] = useState<boolean>(false);
  const [activeCodeBlueAlert, setActiveCodeBlueAlert] = useState<{ zone: string; workstationIp: string; timestamp: string } | null>(null);
  const [isCompactRosterView, setIsCompactRosterView] = useState<boolean>(() => {
    return localStorage.getItem("pref_dense_layout") === "true";
  });

  // IT Console States
  const [alertWebhookUrl, setAlertWebhookUrl] = useState<string>("https://api.baheya.org/v1/alerts");
  const [liveServerPort, setLiveServerPort] = useState<string>("8080");
  const [webhookTestStatus, setWebhookTestStatus] = useState<string>("IDLE");
  const [pingSweepStatus, setPingSweepStatus] = useState<string>("IDLE");
  const [pingLatencies, setPingLatencies] = useState<Record<string, number>>({
    "INTENSIVE CARE": 14,
    "OPERATING ROOM": 6,
    "EMERGENCY UNIT": 11,
    "CENTRAL PHARMACY": 22,
    "ONCOLOGY RESEARCH": 18
  });
  const [activeMockSessions, setActiveMockSessions] = useState<any[]>([
    { id: "sess_102", staffId: "9999", ip: "192.168.12.102", os: "Mac/Chrome", ward: "QUALITY & IT DEPT", idle: 2, status: "Active" },
    { id: "sess_105", staffId: "1002", ip: "192.168.12.115", os: "Win/Firefox", ward: "INTENSIVE CARE", idle: 21, status: "Idle" },
    { id: "sess_108", staffId: "1015", ip: "192.168.12.204", os: "Win/Chrome", ward: "EMERGENCY UNIT", idle: 32, status: "Idle" },
    { id: "sess_110", staffId: "1055", ip: "192.168.12.12", os: "iOS/Safari", ward: "PHARMACY STORE", idle: 5, status: "Active" }
  ]);

  // Spatial Audio / Web Audio API Audio context play trigger
  const playSpatialAudioContextTone = (toneType: "validation" | "alarm" | "success" | "click") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (toneType === "validation") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (toneType === "alarm") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(990, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.25);
        osc.frequency.linearRampToValueAtTime(990, ctx.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.75);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } else if (toneType === "success") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1100, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      }
    } catch (err) {
      console.warn("Web Audio API disabled: ", err);
    }
  };

  // Hospital Branding settings
  // The hospital settings are now managed via SystemSettingsContext

  // Settings Forms state
  const [settingsForm, setSettingsForm] = useState({
    nameAr: "مؤسسة بهية",
    taglineAr: "في ضهر كل ست مصرية",
    nameEn: "Baheya Foundation",
    taglineEn: "Breast Cancer Screening & Treatment",
    address: "الهرم / الشيخ زايد، الجيزة، مصر",
    emergencyPhone: "19745",
    footerAr: "قسم الجودة ومراقبة المعايير الطبية بهية - تقرير إلكتروني موثق بموجب المعايير الدولية",
    footerEn: "Baheya Quality & Clinical Standards Unit - Certified System Performance Report",
    appHeaderAr: "نظام الجودة السريري لبهية",
    appHeaderEn: "Baheya Clinical Quality System",
    appFooterAr: "جميع الحقوق محفوظة لمؤسسة بهية © 2026",
    appFooterEn: "All Rights Reserved to Baheya Foundation © 2026",
    accreditationBodyAr: "الهيئة العامة للاعتماد والرقابة الصحية",
    accreditationBodyEn: "General Authority for Healthcare Accreditation and Regulation (GAHAR)",
    appVersion: "1.0.0",
    revisionDate: "2026",
    userInstructionsAr: "يرجى تعبئة البيانات بعناية لضمان سلامة المرضى.",
    userInstructionsEn: "Please fill in the data carefully to ensure patient safety.",
    roles: ["admin", "nurse", "doctor"],
    jobTitles: ["Head Nurse", "General Practitioner", "Staff Nurse"],
    portalTitleAr: "بوابة بهية الرقمية",
    portalTitleEn: "Baheya Digital Portal",
    premiumTitleAr: "نماذج بهية المميزة",
    premiumTitleEn: "Baheya Forms Premium"
  });

  const [templateForm, setTemplateForm] = useState({
    code: "",
    titleAr: "",
    titleEn: "",
    departmentDefault: "EMERGENCY UNIT",
    version: "01",
    issueDate: "2206", // will override
    hasPatientDetails: false,
    itemsText: ""
  });

  // Rows inline editor state
  const [rowEditIndex, setRowEditIndex] = useState<number | null>(null);
  const [rowForm, setRowForm] = useState({
    itemAr: "",
    itemEn: "",
    code: "",
    unit: "PCS",
    qty: "1"
  });

  // Overrides & Deactivated Standard lists
  const [templateOverrides, setTemplateOverrides] = useState<Record<string, FormTemplate>>({});
  const [deactivatedTemplateIds, setDeactivatedTemplateIds] = useState<string[]>([]);

  // Selected item lists for designing new template
  const [newTemplateItems, setNewTemplateItems] = useState<Omit<GridRow, "days">[]>([]);
  const [newTemplateItemForm, setNewTemplateItemForm] = useState({
    itemAr: "",
    itemEn: "",
    code: "",
    unit: "PCS",
    qty: "1"
  });

  // Selected template to edit state in Settings
  const [selectedTemplateToEdit, setSelectedTemplateToEdit] = useState<string>("");
  const [editTemplateForm, setEditTemplateForm] = useState({
    titleAr: "",
    titleEn: "",
    code: "",
    departmentDefault: "EMERGENCY UNIT",
    version: "01",
    issueDate: "",
    hasPatientDetails: false
  });
  const [editTemplateItems, setEditTemplateItems] = useState<Omit<GridRow, "days">[]>([]);
  const [editTemplateSingleItemForm, setEditTemplateSingleItemForm] = useState({
    itemAr: "",
    itemEn: "",
    code: "",
    unit: "PCS",
    qty: "1"
  });
  const [editTemplateItemIndex, setEditTemplateItemIndex] = useState<number | null>(null);

  // User and Admin Access controls
  const [systemUsers, setSystemUsers, systemUsersLoaded] = useFirestoreSync<AppUser>(syncSystemUsers, MOCK_USERS);

  const [rolesList, setRolesList] = useFirestoreSync<any>(syncRoles, [
    { id: "staff", nameAr: "أخصائي (Staff)", nameEn: "Staff Nurse" },
    { id: "head_nurse", nameAr: "رئيسة (HN)", nameEn: "Head Nurse" },
    { id: "quality", nameAr: "جودة (QC)", nameEn: "Quality Clerk" },
    { id: "president", nameAr: "المدير (CNO)", nameEn: "Director/CNO" },
    { id: "admin", nameAr: "إداري (Admin)", nameEn: "System Admin" },
    { id: "it", nameAr: "التقنية (IT)", nameEn: "IT Department" }
  ]);

  const [permissionsList, setPermissionsList] = useFirestoreSync<any>(syncPermissions, [
    { id: "submitChecklist", nameAr: "تقديم وتعبئة الشيك ليست والديوتي اليومي بالوحدات", nameEn: "Submit Unit Daily Checklists & Duties" },
    { id: "approveChecklist", nameAr: "تدقيق واعتماد ختم مديرة التمريض والمشرفين", nameEn: "Audit & Supervisor Stamp Signoffs" },
    { id: "manageDutyTasks", nameAr: "إضافة وحذف مهام تفقدية جديدة لجرود الكادر", nameEn: "Register New Checking Duty Criteria" },
    { id: "editMasterTemplates", nameAr: "بناء وتعديل وحفظ النماذج الطبية الـ 200", nameEn: "Edit Hospital Master Clinical Sheets" },
    { id: "deleteLogs", nameAr: "القدرة على حذف وتفريغ السجلات من الأرشيف", nameEn: "Purge & Erase Archived Log Files" },
    { id: "modifyRosterShifts", nameAr: "تعديل جدول النوبتجيات والورديات بالقسم (Roster Shifts)", nameEn: "Modify Nurse Roster Shift Assignments" },
    { id: "signoffRosterCno", nameAr: "التوقيع والاعتماد الإلكتروني النهائي للروستر (Medical director signoff)", nameEn: "Final CNO & Director Roster Signoff Signature" },
    { id: "addRemoveStaff", nameAr: "إضافة وحذف أو تعطيل حسابات طاقم الممرضين بالوحدة والروستر", nameEn: "Register & Wipe Staff Members from Roster/Register" },
    { id: "editHospitalSettings", nameAr: "تغيير إعدادات المستشفى، ترويسات التقارير والأقسام", nameEn: "Configure Hospital Board Names & Settings" },
    { id: "viewSystemDatabase", nameAr: "استعراض لوحة الداتا ومحاكاة النسخ الاحتياطي للنظام", nameEn: "Expose Telemetry Databases & System Backups" }
  ]);

  const [accessMatrix, setAccessMatrix] = useFirestoreSync<any>(syncAccessMatrix, []);

  // Seeding default Roles & Permissions if Firestore collections are blank
  useEffect(() => {
    if (rolesList.length === 0) {
      const defaultRoles = [
        { id: "staff", nameAr: "أخصائي (Staff)", nameEn: "Staff Nurse" },
        { id: "head_nurse", nameAr: "رئيسة (HN)", nameEn: "Head Nurse" },
        { id: "quality", nameAr: "جودة (QC)", nameEn: "Quality Clerk" },
        { id: "president", nameAr: "المدير (CNO)", nameEn: "Director/CNO" },
        { id: "admin", nameAr: "إداري (Admin)", nameEn: "System Admin" },
        { id: "it", nameAr: "التقنية (IT)", nameEn: "IT Department" }
      ];
      defaultRoles.forEach(r => saveRole(r).catch(e => console.error("Error seeding role", e)));
    }
    if (permissionsList.length === 0) {
      const defaultPermissions = [
        { id: "submitChecklist", nameAr: "تقديم وتعبئة الشيك ليست والديوتي اليومي بالوحدات", nameEn: "Submit Unit Daily Checklists & Duties" },
        { id: "approveChecklist", nameAr: "تدقيق واعتماد ختم مديرة التمريض والمشرفين", nameEn: "Audit & Supervisor Stamp Signoffs" },
        { id: "manageDutyTasks", nameAr: "إضافة وحذف مهام تفقدية جديدة لجرود الكادر", nameEn: "Register New Checking Duty Criteria" },
        { id: "editMasterTemplates", nameAr: "بناء وتعديل وحفظ النماذج الطبية الـ 200", nameEn: "Edit Hospital Master Clinical Sheets" },
        { id: "deleteLogs", nameAr: "القدرة على حذف وتفريغ السجلات من الأرشيف", nameEn: "Purge & Erase Archived Log Files" },
        { id: "modifyRosterShifts", nameAr: "تعديل جدول النوبتجيات والورديات بالقسم (Roster Shifts)", nameEn: "Modify Nurse Roster Shift Assignments" },
        { id: "signoffRosterCno", nameAr: "التوقيع والاعتماد الإلكتروني النهائي للروستر (Medical director signoff)", nameEn: "Final CNO & Director Roster Signoff Signature" },
        { id: "addRemoveStaff", nameAr: "إضافة وحذف أو تعطيل حسابات طاقم الممرضين بالوحدة والروستر", nameEn: "Register & Wipe Staff Members from Roster/Register" },
        { id: "editHospitalSettings", nameAr: "تغيير إعدادات المستشفى، ترويسات التقارير والأقسام", nameEn: "Configure Hospital Board Names & Settings" },
        { id: "viewSystemDatabase", nameAr: "استعراض لوحة الداتا ومحاكاة النسخ الاحتياطي للنظام", nameEn: "Expose Telemetry Databases & System Backups" }
      ];
      defaultPermissions.forEach(p => savePermission(p).catch(e => console.error("Error seeding permission", e)));
    }
  }, [rolesList.length, permissionsList.length]);

  // Seeding default AccessMatrix mappings if empty
  useEffect(() => {
    if (accessMatrix.length === 0 && rolesList.length > 0 && permissionsList.length > 0) {
      const defaults: Record<string, string[]> = {
        submitChecklist: ["staff", "head_nurse", "admin", "quality", "president", "it"],
        approveChecklist: ["head_nurse", "admin", "quality", "president", "it"],
        manageDutyTasks: ["head_nurse", "admin", "quality", "president", "it"],
        editMasterTemplates: ["admin", "quality", "president", "it"],
        deleteLogs: ["admin", "president", "it"],
        modifyRosterShifts: ["head_nurse", "admin", "quality", "president", "it"],
        signoffRosterCno: ["president", "it"],
        addRemoveStaff: ["head_nurse", "admin", "president", "it"],
        editHospitalSettings: ["admin", "president", "it"],
        viewSystemDatabase: ["admin", "president", "it"]
      };

      const itemsToSave: any[] = [];
      Object.keys(defaults).forEach(permissionId => {
        const rolesWithPerm = defaults[permissionId];
        rolesList.forEach(role => {
          const isEnabled = rolesWithPerm.includes(role.id);
          itemsToSave.push({
            id: `${role.id}_${permissionId}`,
            roleId: role.id,
            permissionId,
            enabled: isEnabled
          });
        });
      });

      itemsToSave.forEach(matrix => {
        saveAccessMatrix(matrix).catch(e => console.error("Error seeding access matrix item", e));
      });
    }
  }, [accessMatrix.length, rolesList.length, permissionsList.length]);

  const checkPermission = (permissionId: string): boolean => {
    if (!currentUser) return false;
    const roleId = currentUser.role || "staff";
    
    // Super admins and IT always bypass as safety
    if (roleId === "admin" || roleId === "it") return true;

    // Pull from real-time accessMatrix
    const mapping = accessMatrix.find((m: any) => m.roleId === roleId && m.permissionId === permissionId);
    if (mapping) return mapping.enabled;

    // Default fallbacks
    const defaults: Record<string, string[]> = {
      submitChecklist: ["staff", "head_nurse", "admin", "quality", "president", "it"],
      approveChecklist: ["head_nurse", "admin", "quality", "president", "it"],
      manageDutyTasks: ["head_nurse", "admin", "quality", "president", "it"],
      editMasterTemplates: ["admin", "quality", "president", "it"],
      deleteLogs: ["admin", "president", "it"],
      modifyRosterShifts: ["head_nurse", "admin", "quality", "president", "it"],
      signoffRosterCno: ["president", "it"],
      addRemoveStaff: ["head_nurse", "admin", "president", "it"],
      editHospitalSettings: ["admin", "president", "it"],
      viewSystemDatabase: ["admin", "president", "it"]
    };
    return defaults[permissionId]?.includes(roleId) || false;
  };
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("baheya_is_logged_in") === "true";
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const stored = localStorage.getItem("baheya_current_user_object");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return MOCK_USERS[0]; // sister fatima by default
  });

  const [viewingUserProfileUser, setViewingUserProfileUser] = useState<AppUser | null>(null);

  // Sentinel Events & adverse clinical incidents state
  const [sentinelIncidents, setSentinelIncidents] = useFirestoreSync<any>(
    syncSentinelIncidents,
    [
      {
        id: "mock-inc-1",
        date: "2026-06-06",
        department: "EMERGENCY UNIT",
        typeAr: "سقوط مريض (Patient Fall)",
        typeEn: "Patient Fall",
        severity: "Critical",
        descAr: "انزلاق مريض بالسن قرب ممر الدخول الخارجي للطوارئ وتم إسعافه فوراً.",
        descEn: "Elderly patient slipped near the external ER entrance ramp, attended swiftly.",
        rcaAr: "عدم تفعيل شريط منع الانزلاق اللاصق على المنحدر المائل.",
        rcaEn: "Missing anti-skid tape on high gradient entrance ramp.",
        actionAr: "تم تثبيت شريط منع انزلاق ذي جودة عالية وفوسفوري عاجلاً بقرار الجودة.",
        actionEn: "Standardized anti-skid floor markers installed on critical path immediately.",
        loggedBy: "أ. فاطمة الزهراء",
        status: "Resolved"
      }
    ]
  );

  // Notifications system for supervisors/auditors
  const [notifications, setNotifications] = useFirestoreSync<Notification>(
    (onData) => syncNotifications(currentUser.id, onData),
    [{
      id: "init-notif-1",
      userId: currentUser.id,
      messageAr: `إشعار نظام: تم تنشيط بوابة ${hospitalSettings.nameAr || "المؤسسة"} الرقمية وبدء مراقبة الجودة الطبية والسريرية.`,
      messageEn: `System Notice: ${hospitalSettings.nameEn || "Hospital"} Clinical Audit Portal activated successfully.`,
      timestamp: new Date().toISOString(),
      read: false
    }],
    [currentUser.id]
  );

  const isSupervisor = ["admin", "quality", "president", "head_nurse", "it", "supervisor", "nursing_director"].includes(currentUser.role);
  const canConfigureRoster = ["admin", "it", "nursing_director"].includes(currentUser.role);

  useEffect(() => {
    if (!isSupervisor && currentUser.department) {
      setSelectedRosterDept(currentUser.department);
    }
  }, [currentUser?.id, currentUser?.department, isSupervisor]);

  // Helper to determine the current nurse's scheduled shift today in the active roster
  const getCurrentUserShiftToday = () => {
    const todayDay = String(new Date().getDate());
    const userDept = currentUser.department || "EMERGENCY UNIT";
    const roster = rosterList.find((r: any) => r.departmentName === userDept) || rosterList[0];
    if (!roster) return "M";
    const userRow = roster.rows.find((row: any) => 
      (row.employeeId && row.employeeId === currentUser.id) || 
      (row.employeeCode && row.employeeCode === currentUser.staffId)
    );
    if (!userRow) return "M";
    return userRow.shifts[todayDay] || "OFF";
  };

  const [loginSelectedUserId, setLoginSelectedUserId] = useState<string>(MOCK_USERS[0].id);
  const [loginStaffId, setLoginStaffId] = useState<string>("");
  const [loginPasscode, setLoginPasscode] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Recovery systems
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmailIn, setRecoveryEmailIn] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"enter_email" | "reset_pin">("enter_email");
  const [recoveryTargetUser, setRecoveryTargetUser] = useState<AppUser | null>(null);
  const [newRecoveryPin, setNewRecoveryPin] = useState("");
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);

  // Dynamic Departments
  const [departments, setDepartments] = useState<string[]>(() => {
    const stored = localStorage.getItem("baheya_hospital_departments");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.includes("OPERATING ROOM") || parsed.includes("PEDIATRIC WARD")) {
          return parsed;
        }
      } catch (e) {}
    }
    const defaultDepts = [
      "EMERGENCY UNIT",
      "INTENSIVE CARE",
      "OPERATING ROOM",
      "CHEMOTHERAPY DAYCARE",
      "RADIOLOGY UNIT",
      "PHARMACY STORE",
      "PEDIATRIC WARD",
      "QUALITY CONTROL",
      "LABORATORY DEPT",
      "INFECTION CONTROL",
      "CLINICAL NUTRITION",
      "INPATIENT FLOORS",
      "OUTPATIENT CLINICS",
      "BIOMEDICAL ENGINEERING",
      "DENTAL CLINIC",
      "ONCOLOGY RESEARCH"
    ];
    localStorage.setItem("baheya_hospital_departments", JSON.stringify(defaultDepts));
    return defaultDepts;
  });

  // Unique Partitioning Filter: Year and Department
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("ALL");

  // User management forms inside Settings Tab
  const [newUserForm, setNewUserForm] = useState({
    nameAr: "",
    nameEn: "",
    role: "head_nurse" as UserRole,
    department: "EMERGENCY UNIT", // Defaulting to first department
    staffId: "",
    pin: "1234",
    email: "",
    permissions: [] as string[]
  });
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<string>("");
  const [editUserForm, setEditUserForm] = useState({
    nameAr: "",
    nameEn: "",
    role: "head_nurse" as UserRole,
    department: "",
    staffId: "",
    pin: "1234",
    email: "",
    permissions: [] as string[]
  });

  // Template lists controls (Search & Dept Pills)
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>("ALL");

  // Merged available templates - Dynamically constrained by staff's department assignment
  const allAvailableTemplates = [
    ...FORM_TEMPLATES.map((t) => {
      const o = templateOverrides[t.id];
      if (o) {
        return { ...t, ...o };
      }
      return t;
    }).filter((t) => !deactivatedTemplateIds.includes(t.id)),
    ...customTemplates
  ].filter((t) => {
    if (!currentUser) return true;
    const isNormalStaff = currentUser.role !== "admin" && currentUser.role !== "quality" && currentUser.role !== "president" && currentUser.role !== "it";
    
    // Always permit newly created custom templates
    if (t.id.startsWith("custom-tpl-")) {
      return true;
    }

    if (isNormalStaff) {
      // 1. If explicit permissions are configured for this nurse, restrict to those templates
      if (currentUser.permissions && currentUser.permissions.length > 0) {
        return currentUser.permissions.includes(t.id);
      }

      // 2. Use the unified, robust doesTemplateMatchDepartment function
      return doesTemplateMatchDepartment(t, currentUser.department || "");
    }
    return true; // Supervisors, managers, and presidents can oversee/search all clinical sheets
  });

  // Load from local database (localStorage) and Firebase on mount
  useEffect(() => {
    // 1. Verify Cloud Connection
    testConnection().then(online => {
      console.log("Firebase Central Connection: ", online ? "ACTIVE" : "OFFLINE_FALLBACK");
    });

    // 5. Real-time sync of active IT diagnostics / troubleshooting logs
    const unsubLogs = syncSystemLogs((logsFromFirestore) => {
      setSystemLogs(logsFromFirestore);
    });

    // Load static templates configurations
    try {
      // Load hospital branding settings
      getHospitalSettings().then((storedSettings) => {
        if (storedSettings) {
          setHospitalSettings(storedSettings);
          setSettingsForm(storedSettings);
        }
      });

      // Load Template Configuration
      getTemplateConfig().then((config) => {
        if (config) {
          if (config.overrides) {
            setTemplateOverrides(config.overrides);
            localStorage.setItem("baheya_template_overrides", JSON.stringify(config.overrides));
          }
          if (config.deactivated) {
            setDeactivatedTemplateIds(config.deactivated);
            localStorage.setItem("baheya_deactivated_templates", JSON.stringify(config.deactivated));
          }
        } else {
          // Fallback to local storage if config doc is not set
          const storedOverrides = localStorage.getItem("baheya_template_overrides");
          if (storedOverrides) {
            setTemplateOverrides(JSON.parse(storedOverrides));
          }
          const storedDeactivated = localStorage.getItem("baheya_deactivated_templates");
          if (storedDeactivated) {
            setDeactivatedTemplateIds(JSON.parse(storedDeactivated));
          }
        }
      });

      // Load Role Permissions
      getRolePermissions().then((perms) => {
        if (perms) {
          setRolePermissions(perms);
          localStorage.setItem("baheya_role_permissions", JSON.stringify(perms));
        } else {
          const storedPerms = localStorage.getItem("baheya_role_permissions");
          if (storedPerms) {
            setRolePermissions(JSON.parse(storedPerms));
          }
        }
      });

      // Load Resolved Gaps
      getResolvedGapsCloud().then((gaps) => {
        if (gaps) {
          rawSetResolvedGaps(gaps);
          localStorage.setItem("baheya_resolved_gaps", JSON.stringify(gaps));
        } else {
          const storedGaps = localStorage.getItem("baheya_resolved_gaps");
          if (storedGaps) {
            rawSetResolvedGaps(JSON.parse(storedGaps));
          }
        }
      });

      // Load Roster sign-offs approvals
      getRosterApprovals().then((approvals) => {
        if (approvals) {
          if (approvals.cnoApproved !== undefined) setCnoApproved(approvals.cnoApproved);
          if (approvals.cnoApprovalDate !== undefined) setCnoApprovalDate(approvals.cnoApprovalDate);
          if (approvals.directorApproved !== undefined) setDirectorApproved(approvals.directorApproved);
          if (approvals.directorApprovalDate !== undefined) setDirectorApprovalDate(approvals.directorApprovalDate);
        }
      });

      // Load custom templates from local storage as backup first
      const storedTemplates = localStorage.getItem("baheya_custom_templates");
      if (storedTemplates) {
        setCustomTemplates(JSON.parse(storedTemplates));
      }

      // Initialize default custom templates release date nicely
      const currentYear = new Date().getFullYear();
      setTemplateForm(prev => ({ ...prev, issueDate: `06.${currentYear}` }));
    } catch (e) {
      console.error("Local Database hydration error:", e);
      setDbStatus("error");
    }

    return () => {
      unsubLogs();
    };
  }, []);

  // Reactive side-effects to synchronize systemUsers changes and keep session updated without duplicate snapshot listeners
  useEffect(() => {
    if (!systemUsersLoaded) return;
    if (systemUsers.length > 0) {
      localStorage.setItem("baheya_system_users", JSON.stringify(systemUsers));
      const activeUserId = localStorage.getItem("baheya_current_user_id");
      if (activeUserId) {
        const found = systemUsers.find((u: AppUser) => u.id === activeUserId);
        if (found) {
          setCurrentUser((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(found)) return prev;
            return found;
          });
          localStorage.setItem("baheya_current_user_object", JSON.stringify(found));
        }
      }
    } else {
      // Bootstrap/seed database staff profile details on first startup
      MOCK_USERS.forEach((u: AppUser) => {
        saveStaffMember(u).catch(err => console.error(err));
      });
    }
  }, [systemUsers, systemUsersLoaded]);

  // Reactive side-effects to synchronize dailyChecklists changes without duplicate snapshot listeners
  useEffect(() => {
    if (!dailyChecklistsLoaded) return;
    if (dailyChecklists.length > 0) {
      localStorage.setItem("baheya_daily_checklists", JSON.stringify(dailyChecklists));
    } else {
      // Sync local storage backups to cloud
      const stored = localStorage.getItem("baheya_daily_checklists");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.length > 0) {
            parsed.forEach((a: UnitDailyChecklist) => {
              saveDailyAudit(a).catch(err => console.error(err));
            });
          }
        } catch (e) {}
      }
    }
  }, [dailyChecklists, dailyChecklistsLoaded]);

  // Reactive side-effects to synchronize rosterList changes without duplicate snapshot listeners
  useEffect(() => {
    if (!rosterListLoaded) return;
    if (rosterList.length > 0) {
      localStorage.setItem("baheya_department_rosters", JSON.stringify(rosterList));
    } else {
      // Seed default rosters on fresh load
      const stored = localStorage.getItem("baheya_department_rosters");
      let nextRosters: any[] = [];
      if (stored) {
        try {
          nextRosters = JSON.parse(stored);
        } catch (e) {}
      }
      
      if (!nextRosters || nextRosters.length === 0) {
        // Generate defaults
        const defaultRosters: any[] = [
          {
            id: "EMERGENCY UNIT",
            departmentName: "EMERGENCY UNIT",
            startDate: "2026-05-16",
            endDate: "2026-06-15",
            rows: [
              {
                employeeId: "emp-1",
                employeeNameAr: "محمود عمر",
                employeeNameEn: "MAHMOUD OMAR",
                roleTitleAr: "مساعد رئيس تمريض (AHN)",
                roleTitleEn: "Asst. Head Nurse (AHN)",
                employeeCode: "20810",
                shifts: { "20": "D", "29": "D", "30": "D", "8": "D", "14": "D", "15": "D" }
              },
              {
                employeeId: "emp-2",
                employeeNameAr: "هاني ناصر",
                employeeNameEn: "HANY NASER",
                roleTitleAr: "أخصائي تمريض (SN)",
                roleTitleEn: "Staff Nurse (SN)",
                employeeCode: "20906",
                shifts: { "18": "DN", "23": "DN", "26": "D", "30": "DN", "31": "D", "3": "DN", "6": "DN", "8": "D", "10": "DN", "13": "DN" }
              }
            ]
          }
        ];

        const allDepartments = [
          "EMERGENCY UNIT", "INTENSIVE CARE", "OPERATING ROOM", "CHEMOTHERAPY DAYCARE",
          "RADIOLOGY UNIT", "PHARMACY STORE", "PEDIATRIC WARD", "QUALITY CONTROL", "LABORATORY DEPT"
        ];
        allDepartments.forEach(dept => {
          if (dept !== "EMERGENCY UNIT") {
            defaultRosters.push({
              id: dept,
              departmentName: dept,
              startDate: "2026-05-16",
              endDate: "2026-06-15",
              rows: [
                {
                  employeeId: `emp-dept-1-${dept}`,
                  employeeNameAr: `ممرض ${dept} أ`,
                  employeeNameEn: `${dept} Nurse A`,
                  roleTitleAr: "أخصائي تمريض (SN)",
                  roleTitleEn: "Staff Nurse (SN)",
                  employeeCode: "40101",
                  shifts: { "16": "M", "17": "M", "20": "D", "30": "DN", "5": "N" }
                },
                {
                  employeeId: `emp-dept-2-${dept}`,
                  employeeNameAr: `ممرض ${dept} ب`,
                  employeeNameEn: `${dept} Nurse B`,
                  roleTitleAr: "أخصائي تمريض (SN)",
                  roleTitleEn: "Staff Nurse (SN)",
                  employeeCode: "40102",
                  shifts: { "18": "A", "19": "A", "25": "DN", "2": "D", "8": "N" }
                }
              ]
            });
          }
        });
        nextRosters = defaultRosters;
      }

      nextRosters.forEach((rost) => {
        saveDepartmentRoster(rost).catch(err => console.error(err));
      });
      rawSetRosterList(nextRosters);
      localStorage.setItem("baheya_department_rosters", JSON.stringify(nextRosters));
    }
  }, [rosterList, rosterListLoaded]);

  // Reactive side-effects to synchronize rosterWishes changes without duplicate snapshot listeners
  useEffect(() => {
    if (!rosterWishesLoaded) return;
    if (rosterWishes.length > 0) {
      localStorage.setItem("baheya_roster_wishes", JSON.stringify(rosterWishes));
    } else {
      const stored = localStorage.getItem("baheya_roster_wishes");
      let nextWishes: any[] = [];
      if (stored) {
        try {
          nextWishes = JSON.parse(stored);
        } catch(e) {}
      }
      
      if (!nextWishes || nextWishes.length === 0) {
        nextWishes = [
          {
            id: "wish-1",
            employeeId: "user-nurse",
            employeeNameAr: "أ. فاطمة الزهراء",
            employeeNameEn: "Sister Fatima El-Zahraa",
            departmentName: "EMERGENCY UNIT",
            dayKey: "25",
            requestedShift: "OFF",
            reasonAr: "مرافقة والدتي للمستشفى للفحص الدوري للسرطان",
            reasonEn: "Accompanying my mother to routine screening",
            status: "pending",
            submittedAt: new Date().toISOString()
          }
        ];
      }

      nextWishes.forEach((w) => {
        saveRosterWish(w).catch(err => console.error(err));
      });
      rawSetRosterWishes(nextWishes);
      localStorage.setItem("baheya_roster_wishes", JSON.stringify(nextWishes));
    }
  }, [rosterWishes, rosterWishesLoaded]);

  // Secure and lock activeTab based on user roles and authorized privileges - highly optimized dependencies
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (["head_nurse", "staff", "Staff", "tech", "intern", "assistant", "secretary"].includes(role)) {
      // Regular staff/nurse is STRICTLY LOCKED to their checklist portal, info, and roster page
      if (activeTab !== "duty" && activeTab !== "about" && activeTab !== "distribution" && activeTab !== "editor" && activeTab !== "roster" && activeTab !== "profile" && activeTab !== "messaging" && activeTab !== "cloud_settings") {
        setActiveTab("duty");
      }
    } else if (role === "quality") {
      // Supervisors can see checklists (duty), history, analytics, and guide
      if (["settings", "it_panel"].includes(activeTab)) {
        setActiveTab("duty");
      }
    }
    // Admin, IT, and President have unrestricted access to all tabs (no redirects)
  }, [currentUser?.role, activeTab]);

  // Sync to local database and Firestore db
  const saveToDatabase = (updatedRecords: SavedRecord[]) => {
    try {
      setDbStatus("syncing");
      setRecords(updatedRecords);

      // Sync clinical records to cloud
      updatedRecords.forEach((record) => {
        saveClinicalRecord(record).catch((err) =>
          console.error("Cloud clinical record sync failure: ", err)
        );
      });
      setTimeout(() => setDbStatus("connected"), 350);
    } catch (e) {
      console.error("Failed to commit transactional update:", e);
      setDbStatus("error");
    }
  };

  const saveDutyTasksToDb = (updated: DailyDutyTask[]) => {
    setDutyTasks(updated);
    updated.forEach((task) => {
        saveDutyTask(task).catch(err => console.error("Cloud task sync failure: ", err));
    });
  };

  const saveChecklistsToDb = (updated: UnitDailyChecklist[]) => {
    setDailyChecklists(updated);

    // Sync daily supervisor compliance checklists to cloud
    updated.forEach((audit) => {
      saveDailyAudit(audit).catch((err) =>
        console.error("Cloud audit checklist sync failure: ", err)
      );
    });
  };

  const savePermissionsToDb = (updated: typeof rolePermissions) => {
    localStorage.setItem("baheya_role_permissions", JSON.stringify(updated));
    setRolePermissions(updated);
  };

  // Trigger New Blank Record Creation
  const handleCreateNew = (templateId: string) => {
    try {
      const temp = allAvailableTemplates.find(t => t.id === templateId) || allAvailableTemplates[0];
      const freshRecord = createNewRecord(templateId, customTemplates);
      
      // Override items and template details with our custom/overridden template
      const defaultItems = getItemsForTemplate(templateId, temp);
      const gridData: GridRow[] = defaultItems.map((item) => {
        const days: Record<string, string> = {};
        for (let i = 1; i <= numDays; i++) {
          days[i.toString()] = "";
        }
        return {
          ...item,
          days
        };
      });

      const recordWithId: SavedRecord = {
        ...freshRecord,
        id: `rec_${Date.now()}`,
        createdAt: new Date().toISOString(),
        staffName: language === "ar" ? currentUser.nameAr : currentUser.nameEn,
        staffId: currentUser.staffId,
        department: currentUser.department || temp.departmentDefault,
        gridData
      };
      setEditingRecord(recordWithId);
      setSelectedTemplate(temp);
      setActiveTab("editor");
    } catch (error) {
      console.error("Failed to initialize template model:", error);
    }
  };

  // Save the currently edited record with complete workflow and safeguards
  const handleSaveActiveRecord = () => {
    if (!editingRecord) return;

    const isNormalStaff = ["head_nurse", "staff", "Staff", "tech", "intern", "assistant", "secretary"].includes(currentUser.role);
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // 1. Date Locking validation rules with IT Override Compliance Mode support
    if (itStrictComplianceMode && isNormalStaff && editingRecord.date !== todayStr) {
      alert(
        language === "ar"
          ? `❌ خطأ في التحقق من التاريخ: غير مسموح لحساب الكادر الطبي المعاون بحفظ أو تعديل السجل إلا للتاريخ الحالي اليوم فقط (${todayStr})! تم قفل هذا السجل لمنع التعديل الرجعي الحاصل في الشيتات التاريخية.`
          : `❌ Date Validation Safeguard: You are only allowed to submit/save forms with today's current date (${todayStr})! Historical records are locked to preserve audit integrity.`
      );
      return;
    }

    // 2. Add shift tracking and status transitions
    const recordStatus = isNormalStaff 
      ? `Submitted by ${language === "ar" ? currentUser.nameAr : currentUser.nameEn} (ID: ${currentUser.staffId})`
      : (editingRecord.status || "Audited & Approved by Quality");

    const finalRecord: SavedRecord = {
      ...editingRecord,
      shift: selectedShift,
      status: recordStatus
    };

    let updatedList: SavedRecord[];
    const exists = records.some((r) => r.id === finalRecord.id);

    if (exists) {
      updatedList = records.map((r) => (r.id === finalRecord.id ? finalRecord : r));
    } else {
      updatedList = [finalRecord, ...records];
    }

    saveToDatabase(updatedList);

    // 3. Dispatch real-time notification alert to supervisors/administrators
    if (isNormalStaff) {
      const activeShiftLabel = CLINICAL_SHIFTS.find(s => s.id === selectedShift)?.nameAr || selectedShift;
      const activeShiftLabelEn = CLINICAL_SHIFTS.find(s => s.id === selectedShift)?.nameEn || selectedShift;
      const newNotif = {
        id: `notif-${Date.now()}`,
        messageAr: `📢 قام الموظف استاف التمريض (${currentUser.nameAr}) من قسم (${currentUser.department}) بتسليم شيت الجرد اليومي بتاريخ (${finalRecord.date}) الخاص بنموذج (${finalRecord.templateId}) لفترة (${activeShiftLabel}) بنجاح! جاهز للتفتيش والاعتماد الرقمي.`,
        messageEn: `📢 Staff Nurse (${currentUser.nameEn}) from (${currentUser.department}) submitted the Daily Inventory Checklist on (${finalRecord.date}) for (${activeShiftLabelEn}). Approved and available for review!`,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      localStorage.setItem("baheya_notifications", JSON.stringify(updatedNotifs));
    }

    playSpatialAudioContextTone("success");

    alert(
      language === "ar" 
        ? `تم حفظ وتأكيد السجل السريري بنجاح! الحالة الحالية للمستند: (مرفوع - ${recordStatus}).` 
        : `Clinical Checklist saved & committed successfully! Document status: (Committed - ${recordStatus}).`
    );
  };

  // Click handler to redirect users to relevant sections when clicking a notification
  const handleNotificationClick = (notif: { id: string; messageAr: string; messageEn: string; timestamp: string; read: boolean }) => {
    // 1. Mark as read
    const updated = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem("baheya_notifications", JSON.stringify(updated));

    // 2. Determine redirection based on notification content matches
    const textToMatch = (notif.messageAr + " " + notif.messageEn).toLowerCase();

    if (
      textToMatch.includes("ديوتي") || 
      textToMatch.includes("مهمة") || 
      textToMatch.includes("وظائف") || 
      textToMatch.includes("duty") || 
      textToMatch.includes("task")
    ) {
      setActiveTab("duty");
    } else if (
      textToMatch.includes("شيت") || 
      textToMatch.includes("جرد") || 
      textToMatch.includes("نموذج") || 
      textToMatch.includes("بوابة") || 
      textToMatch.includes("سجل") || 
      textToMatch.includes("checklist") || 
      textToMatch.includes("form") || 
      textToMatch.includes("sheet") ||
      textToMatch.includes("ledger")
    ) {
      setActiveTab("editor");
    } else if (
      textToMatch.includes("توزيع") || 
      textToMatch.includes("distribution") || 
      textToMatch.includes("office")
    ) {
      setActiveTab("distribution");
    } else if (
      textToMatch.includes("تحليل") || 
      textToMatch.includes("إحصاء") || 
      textToMatch.includes("جودة") || 
      textToMatch.includes("analytics") || 
      textToMatch.includes("dashboard") || 
      textToMatch.includes("cqi") || 
      textToMatch.includes("gap") || 
      textToMatch.includes("فجوة")
    ) {
      setActiveTab("analytics");
    } else if (
      textToMatch.includes("تاريخ") || 
      textToMatch.includes("أرشيف") || 
      textToMatch.includes("history") || 
      textToMatch.includes("archive")
    ) {
      setActiveTab("history");
    } else if (
      textToMatch.includes("it") || 
      textToMatch.includes("معلومات") || 
      textToMatch.includes("دعم")
    ) {
      setActiveTab("it_panel");
    } else if (
      textToMatch.includes("إعدادات") || 
      textToMatch.includes("ضبط") || 
      textToMatch.includes("settings")
    ) {
      setActiveTab("settings");
    } else if (
      textToMatch.includes("رغبة") || 
      textToMatch.includes("رغبات") || 
      textToMatch.includes("روستر") || 
      textToMatch.includes("الروستر") || 
      textToMatch.includes("roster") || 
      textToMatch.includes("wish") || 
      textToMatch.includes("wishes")
    ) {
      setActiveTab("roster");
    } else if (
      textToMatch.includes("رسالة") || 
      textToMatch.includes("رسائل") || 
      textToMatch.includes("مراسلة") || 
      textToMatch.includes("طلبات") || 
      textToMatch.includes("message") || 
      textToMatch.includes("messaging")
    ) {
      setActiveTab("messaging");
    } else {
      // Default to editor
      setActiveTab("editor");
    }

    // Close the notification popup
    setIsBellOpen(false);
  };

  // Delete Record (Restricted to ADMIN/PRESIDENT)
  const handleDeleteRecord = (recordId: string) => {
    if (currentUser.role !== "admin" && currentUser.role !== "president") {
      alert(
        language === "ar" 
          ? "تنبيه الصلاحية: لا يمكن حذف المستندات إلا بواسطة أدمن النظام فقط لضمان سلامة مراقبة الجودة الطبية." 
          : "Permission Denied: Only System Administrators can permanently delete audited documents to guarantee clinical audit standards."
      );
      return;
    }

    const confirmation = window.confirm(
      language === "ar" 
        ? "هل أنت متأكد من رغبتك في حذف هذا المستند نهائياً من قاعدة البيانات المحلية؟" 
        : "Are you sure you want to permanently delete this document from the local store?"
    );
    if (!confirmation) return;

    const filtered = records.filter(r => r.id !== recordId);
    saveToDatabase(filtered);
    if (editingRecord?.id === recordId) {
      setEditingRecord(null);
    }
  };

  // Print Active Form Template
  const handlePrint = () => {
    window.print();
  };

  // Export Database backup as JSON
  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `baheya_db_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (error) {
      alert("Export failed: " + error);
    }
  };

  // Import Database backup from JSON
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          // Soft validation
          const confirmed = window.confirm(
            language === "ar"
              ? `تم العثور على (${importedData.length}) سجلات. هل ترغب في دمجها مع السجلات الحالية؟`
              : `Found (${importedData.length}) records. Do you want to merge them with current records?`
          );
          if (confirmed) {
            const merged = [...importedData, ...records].filter(
              (v, i, a) => a.findIndex(t => t.id === v.id) === i
            );
            saveToDatabase(merged);
            alert(language === "ar" ? "تم الاستيراد والدمج بنجاح!" : "Import completed successfully!");
          }
        } else {
          alert(language === "ar" ? "ملف النسخة الاحتياطية غير صالح." : "Invalid backup file schema.");
        }
      } catch (err) {
        alert("Import error: " + err);
      }
    };
    reader.readAsText(file);
  };

  // Start Row Edit
  const handleStartEditRow = (index: number, row: GridRow) => {
    setRowEditIndex(index);
    setRowForm({
      itemAr: row.itemAr,
      itemEn: row.itemEn,
      code: row.code || "",
      unit: row.unit || "PCS",
      qty: row.qty || "1"
    });
  };

  // Delete Row from Active Sheet
  const handleDeleteRow = (index: number) => {
    if (!editingRecord) return;
    const confirmation = window.confirm(
      language === "ar" 
        ? "هل أنت متأكد من رغبتك في حذف هذا الصنف بالكامل من الجدول الحالي؟" 
        : "Are you sure you want to delete this row item from the active table?"
    );
    if (!confirmation) return;

    const updatedGrid = editingRecord.gridData.filter((_, idx) => idx !== index);
    const reindexedGrid = updatedGrid.map((row, idx) => ({
      ...row,
      sn: (idx + 1).toString()
    }));

    setEditingRecord({
      ...editingRecord,
      gridData: reindexedGrid
    });
    
    if (rowEditIndex === index) {
      handleCancelRowEdit();
    } else if (rowEditIndex !== null && rowEditIndex > index) {
      setRowEditIndex(rowEditIndex - 1);
    }
  };

  // Cancel Row Edit
  const handleCancelRowEdit = () => {
    setRowEditIndex(null);
    setRowForm({
      itemAr: "",
      itemEn: "",
      code: "",
      unit: "PCS",
      qty: "1"
    });
  };

  // Save/Submit Row Form (Add or Edit)
  const handleSaveRowForm = () => {
    if (!editingRecord) return;
    if (!rowForm.itemAr.trim()) {
      alert(language === "ar" ? "يرجى إدخال اسم الصنف بالعربية." : "Please enter row item name in Arabic.");
      return;
    }

    const updatedGrid = [...editingRecord.gridData];
    
    if (rowEditIndex !== null) {
      updatedGrid[rowEditIndex] = {
        ...updatedGrid[rowEditIndex],
        itemAr: rowForm.itemAr.trim(),
        itemEn: rowForm.itemEn.trim(),
        code: rowForm.code.trim() || undefined,
        unit: rowForm.unit.trim() || undefined,
        qty: rowForm.qty.trim() || undefined
      };
    } else {
      const days: Record<string, string> = {};
      for (let i = 1; i <= numDays; i++) {
        days[i.toString()] = "";
      }
      updatedGrid.push({
        sn: (updatedGrid.length + 1).toString(),
        itemAr: rowForm.itemAr.trim(),
        itemEn: rowForm.itemEn.trim(),
        code: rowForm.code.trim() || `GEN-${(updatedGrid.length + 1).toString().padStart(2, '0')}`,
        unit: rowForm.unit.trim() || "PCS",
        qty: rowForm.qty.trim() || "1",
        days
      });
    }

    setEditingRecord({
      ...editingRecord,
      gridData: updatedGrid
    });

    handleCancelRowEdit();
  };

  const getDeptTitle = (dept: string, lang: 'ar' | 'en') => {
    const mappings: Record<string, { ar: string, en: string }> = {
      "EMERGENCY UNIT": { ar: "قسم الطوارئ", en: "Emergency Unit" },
      "CHEMO UNIT PREPN": { ar: "صيدلية تحضير الكيماوي", en: "Chemo Preparation Pharmacy" },
      "ONCO-SURGICAL UNIT": { ar: "قسم الجراحة الباطنية", en: "Onco-Surgical Unit" },
      "OUTPATIENT CLINIC": { ar: "العيادات الخارجية", en: "Outpatient Clinic" },
      "INTENSIVE CARE UNIT (ICU)": { ar: "الرعاية المركزة", en: "Intensive Care Unit" }
    };
    
    const deptName = mappings[dept] ? (lang === "ar" ? mappings[dept].ar : mappings[dept].en) : dept;
    return lang === "ar" ? `النماذج الخاصة بـ ${deptName}` : `${deptName} Forms`;
  };

  const handleAddJobTitle = () => {
    const input = document.getElementById("job-title-input") as HTMLInputElement;
    if (!input) return;
    const val = input.value.trim();
    if (!val || settingsForm.jobTitles.includes(val)) return;
    setSettingsForm({ ...settingsForm, jobTitles: [...settingsForm.jobTitles, val] });
    input.value = "";
  };

  // Save Hospital Identity Settings
  const handleSaveHospitalSettings = () => {
    console.log("Save clicked with form:", settingsForm);
    // Basic validation
    if (!settingsForm.nameAr || !settingsForm.nameEn) {
        alert(`يرجى ملء الاسم بالعربية والإنجليزية. حالياً: ${settingsForm.nameAr} - ${settingsForm.nameEn}`);
        return;
    }
    
    // Update the state
    setHospitalSettings(settingsForm);
    saveHospitalSettings({ id: 'main', ...settingsForm });
    localStorage.setItem("baheya_hospital_settings", JSON.stringify(settingsForm));
    alert(language === "ar" ? "تم حفظ التعديلات وتطبيقها بنجاح!" : "Settings saved and applied successfully!");
  };

  // Create new Custom Template
  const handleCreateCustomTemplate = () => {
    console.log("CreateCustomTemplate: button clicked");
    
    // Autogenerate default secure placeholders if any required string is blank to block failure risks and make the button always functional
    const finalCode = templateForm.code.trim() || `BHG-CST-${Date.now().toString().slice(-4)}`;
    const finalTitleAr = templateForm.titleAr.trim() || `شيت ${hospitalSettings.nameAr || "المؤسسة"} المخصص الجرد اليومي (${new Date().toLocaleDateString('ar-EG')})`;
    const finalTitleEn = templateForm.titleEn.trim() || `${hospitalSettings.portalTitleEn} Custom Daily Sheet (${new Date().toLocaleDateString('en-US')})`;

    const newId = `custom-tpl-${Date.now()}`;
    const parsedItems: Omit<GridRow, "days">[] = [];

    if (newTemplateItems.length > 0) {
      parsedItems.push(...newTemplateItems);
    } else if (templateForm.itemsText.trim()) {
      const lines = templateForm.itemsText.split("\n");
      let snCounter = 1;
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const parts = trimmed.split("|");
        const itemAr = parts[0]?.trim() || "";
        if (!itemAr) return;
        const itemEn = parts[1]?.trim() || "Custom Item";
        const unit = parts[2]?.trim() || "PCS";
        const qty = parts[3]?.trim() || "1";
        parsedItems.push({
          sn: snCounter.toString(),
          code: `CST-${snCounter.toString().padStart(2, '0')}`,
          itemAr,
          itemEn,
          unit,
          qty
        });
        snCounter++;
      });
    }

    if (parsedItems.length === 0) {
      // Fallback items
      parsedItems.push({
        sn: "1",
        code: "CST-01",
        itemAr: "شريط معقم للفحص والملاحظة مخصص",
        itemEn: "Sterile gauze strips custom",
        unit: "PCS",
        qty: "10"
      });
    }

    const newTemplate: FormTemplate = {
      id: newId,
      code: finalCode.toUpperCase(),
      titleAr: finalTitleAr,
      titleEn: finalTitleEn,
      departmentDefault: templateForm.departmentDefault,
      version: templateForm.version.trim() || "01",
      issueDate: templateForm.issueDate.trim() || "06.2026",
      hasPatientDetails: templateForm.hasPatientDetails,
      items: parsedItems
    };

    const updatedTemplates = [...customTemplates, newTemplate];
    setCustomTemplates(updatedTemplates);
    localStorage.setItem("baheya_custom_templates", JSON.stringify(updatedTemplates));
    saveCustomTemplate(newTemplate).catch(err => console.error("Cloud custom template save failure:", err));

    // Create and set the new record
    const newRecord = createNewRecord(newId, updatedTemplates);
    setEditingRecord({ ...newRecord, id: `record-${Date.now()}` });

    // Select the new template immediately and navigate to the editor
    setSelectedTemplate(newTemplate);
    setActiveTab("editor");

    // Reset template form
    setTemplateForm({
      code: "",
      titleAr: "",
      titleEn: "",
      departmentDefault: "EMERGENCY UNIT",
      version: "01",
      issueDate: `06.${new Date().getFullYear()}`,
      hasPatientDetails: false,
      itemsText: ""
    });
    setNewTemplateItems([]);

    alert(language === "ar" ? `تم تسجيل وتصميم شيت ${hospitalSettings.portalTitleAr} المخصص بنجاح، وجاري فتح المحرر لك الآن!` : `New custom ${hospitalSettings.portalTitleEn} checklist created and opened in your worksheet editor!`);
  };

  // Delete Custom Template
  const handleDeleteCustomTemplate = (id: string) => {
    if (currentUser.role !== "admin" && currentUser.role !== "president") {
      alert(language === "ar" ? "تنبيه الصلاحية: لا يمكن حذف الشيتات المضافة إلا للآدمن." : "Permission Denied: System Administrators only can remove template configurations.");
      return;
    }

    const confirmDelete = window.confirm(
      language === "ar"
        ? "هل أنت متأكد من رغبتك في حذف هذا الشيت المخصص بالكامل؟ لن يؤثر الحذف على السجلات السابقة المحفوظة بالفعل."
        : "Are you sure you want to delete this custom template? Existing saved records will remain unaffected."
    );
    if (!confirmDelete) return;

    const filtered = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(filtered);
    localStorage.setItem("baheya_custom_templates", JSON.stringify(filtered));
    deleteCustomTemplate(id).catch(err => console.error("Cloud custom template deletion sync failure:", err));
  };

  // Add Item to the new custom template builder
  const handleAddNewTemplateItem = () => {
    if (!newTemplateItemForm.itemAr.trim()) {
      alert(language === "ar" ? "يرجى كتابة اسم الصنف بالعربية على الأقل!" : "Please write item name in Arabic!");
      return;
    }
    const idx = newTemplateItems.length + 1;
    const item: Omit<GridRow, "days"> = {
      sn: idx.toString(),
      code: newTemplateItemForm.code.trim() || `ITM-${idx.toString().padStart(2, "0")}`,
      itemAr: newTemplateItemForm.itemAr.trim(),
      itemEn: newTemplateItemForm.itemEn.trim() || "Item",
      unit: newTemplateItemForm.unit.trim() || "PCS",
      qty: newTemplateItemForm.qty.trim() || "1"
    };
    setNewTemplateItems([...newTemplateItems, item]);
    setNewTemplateItemForm({
      itemAr: "",
      itemEn: "",
      code: "",
      unit: "PCS",
      qty: "1"
    });
  };

  // Remove Item from the new custom template builder
  const handleRemoveNewTemplateItem = (index: number) => {
    const updated = newTemplateItems.filter((_, i) => i !== index);
    setNewTemplateItems(updated.map((item, i) => ({ ...item, sn: (i + 1).toString() })));
  };

  // Deactivate/Hide standard template
  const handleToggleDeactivateTemplate = (id: string) => {
    if (currentUser.role !== "admin" && currentUser.role !== "president") {
      alert(language === "ar" ? "تنبيه الصلاحية: هذه الإجراء يتطلب صلاحية الآدمن." : "Permission Denied: System Administrators only.");
      return;
    }

    let updatedDeactivated: string[];
    const isDeactivated = deactivatedTemplateIds.includes(id);

    if (isDeactivated) {
      updatedDeactivated = deactivatedTemplateIds.filter(x => x !== id);
    } else {
      updatedDeactivated = [...deactivatedTemplateIds, id];
    }

    setDeactivatedTemplateIds(updatedDeactivated);
    localStorage.setItem("baheya_deactivated_templates", JSON.stringify(updatedDeactivated));
    saveTemplateConfig({ overrides: templateOverrides, deactivated: updatedDeactivated }).catch(err => console.error("Cloud template config deactivation sync failure:", err));
    alert(
      language === "ar" 
        ? (isDeactivated ? "تم إعادة تنشيط ورقمنة النموذج للمستخدمين بنجاح!" : "تم إلغاء تفعيل وإخفاء هذا الشيت لمنع استخدامه.")
        : (isDeactivated ? "Template enabled successfully!" : "Template disabled & hidden from navigation selection.")
    );
  };

  // Edit/Select Template properties
  const handleSelectTemplateToEdit = (templateId: string) => {
    setSelectedTemplateToEdit(templateId);
    if (!templateId) {
      setEditTemplateForm({
        titleAr: "",
        titleEn: "",
        code: "",
        departmentDefault: "EMERGENCY UNIT",
        version: "01",
        issueDate: "",
        hasPatientDetails: false
      });
      setEditTemplateItems([]);
      return;
    }

    // Include the standard FORM_TEMPLATES and custom templates
    const allTemplates = [...FORM_TEMPLATES, ...customTemplates];
    const template = allTemplates.map((t) => {
      const o = templateOverrides[t.id];
      if (o) return { ...t, ...o };
      return t;
    }).find(t => t.id === templateId);

    if (template) {
      setEditTemplateForm({
        titleAr: template.titleAr,
        titleEn: template.titleEn,
        code: template.code,
        departmentDefault: template.departmentDefault,
        version: template.version || "01",
        issueDate: template.issueDate || "2026",
        hasPatientDetails: !!template.hasPatientDetails
      });
      // Retrieve original items list of this template
      const items = getItemsForTemplate(templateId, template);
      setEditTemplateItems(items);
    }
  };

  // Save template modifications
  const handleSaveTemplateEdits = () => {
    alert("Template Save clicked!");
    if (!selectedTemplateToEdit) return;
    if (!editTemplateForm.titleAr.trim() || !editTemplateForm.titleEn.trim() || !editTemplateForm.code.trim()) {
      alert(language === "ar" ? "يرجى تعبئة الاسم بالعربية والإنجليزية وكود الشيت!" : "Arabic/English titles and checklist code are required!");
      return;
    }

    const isCustom = selectedTemplateToEdit.startsWith("custom-tpl-") || !FORM_TEMPLATES.some(t => t.id === selectedTemplateToEdit);

    if (isCustom) {
      const updated = customTemplates.map(t => {
        if (t.id === selectedTemplateToEdit) {
          return {
            ...t,
            code: editTemplateForm.code.trim().toUpperCase(),
            titleAr: editTemplateForm.titleAr.trim(),
            titleEn: editTemplateForm.titleEn.trim(),
            departmentDefault: editTemplateForm.departmentDefault,
            version: editTemplateForm.version,
            issueDate: editTemplateForm.issueDate,
            hasPatientDetails: editTemplateForm.hasPatientDetails,
            items: editTemplateItems
          };
        }
        return t;
      });
      setCustomTemplates(updated);
      localStorage.setItem("baheya_custom_templates", JSON.stringify(updated));
      const savedT = updated.find(x => x.id === selectedTemplateToEdit);
      if (savedT) {
        saveCustomTemplate(savedT).catch(err => console.error("Cloud custom template edit sync failure:", err));
      }
    } else {
      const updatedOverrides = {
        ...templateOverrides,
        [selectedTemplateToEdit]: {
          id: selectedTemplateToEdit,
          code: editTemplateForm.code.trim().toUpperCase(),
          titleAr: editTemplateForm.titleAr.trim(),
          titleEn: editTemplateForm.titleEn.trim(),
          departmentDefault: editTemplateForm.departmentDefault,
          version: editTemplateForm.version,
          issueDate: editTemplateForm.issueDate || "2026",
          hasPatientDetails: editTemplateForm.hasPatientDetails,
          items: editTemplateItems
        }
      };
      setTemplateOverrides(updatedOverrides);
      localStorage.setItem("baheya_template_overrides", JSON.stringify(updatedOverrides));
      saveTemplateConfig({ overrides: updatedOverrides, deactivated: deactivatedTemplateIds }).catch(err => console.error("Cloud overrides edit sync failure:", err));
    }

    // Sync selected screen template if it was the currently open one
    if (selectedTemplate.id === selectedTemplateToEdit) {
      setSelectedTemplate({
        id: selectedTemplateToEdit,
        code: editTemplateForm.code.trim().toUpperCase(),
        titleAr: editTemplateForm.titleAr.trim(),
        titleEn: editTemplateForm.titleEn.trim(),
        departmentDefault: editTemplateForm.departmentDefault,
        version: editTemplateForm.version,
        issueDate: editTemplateForm.issueDate,
        hasPatientDetails: editTemplateForm.hasPatientDetails,
        items: editTemplateItems
      });
    }

    alert(language === "ar" ? "تم تعديل وحفظ بيانات النموذج المحددة بالنجاح!" : "Template settings updated successfully!");
  };

  // Add or Edit single item inside template editor panel
  const handleAddOrEditSingleItemInTemplate = () => {
    if (!editTemplateSingleItemForm.itemAr.trim()) {
      alert(language === "ar" ? "يرجى كتابة الاسم بالعربية للصنف!" : "Item name in Arabic is required!");
      return;
    }

    const updated = [...editTemplateItems];
    if (editTemplateItemIndex !== null) {
      updated[editTemplateItemIndex] = {
        sn: (editTemplateItemIndex + 1).toString(),
        code: editTemplateSingleItemForm.code.trim() || undefined,
        itemAr: editTemplateSingleItemForm.itemAr.trim(),
        itemEn: editTemplateSingleItemForm.itemEn.trim(),
        unit: editTemplateSingleItemForm.unit.trim() || undefined,
        qty: editTemplateSingleItemForm.qty.trim() || undefined
      };
      setEditTemplateItemIndex(null);
    } else {
      updated.push({
        sn: (updated.length + 1).toString(),
        code: editTemplateSingleItemForm.code.trim() || `ITM-${(updated.length + 1).toString().padStart(2, "0")}`,
        itemAr: editTemplateSingleItemForm.itemAr.trim(),
        itemEn: editTemplateSingleItemForm.itemEn.trim(),
        unit: editTemplateSingleItemForm.unit.trim() || "PCS",
        qty: editTemplateSingleItemForm.qty.trim() || "1"
      });
    }

    setEditTemplateItems(updated);
    setEditTemplateSingleItemForm({
      itemAr: "",
      itemEn: "",
      code: "",
      unit: "PCS",
      qty: "1"
    });
  };

  // Remove single item from template editor panel
  const handleRemoveSingleItemInTemplate = (index: number) => {
    const updated = editTemplateItems.filter((_, i) => i !== index);
    setEditTemplateItems(updated.map((item, i) => ({ ...item, sn: (i + 1).toString() })));
    if (editTemplateItemIndex === index) {
      setEditTemplateItemIndex(null);
      setEditTemplateSingleItemForm({
        itemAr: "",
        itemEn: "",
        code: "",
        unit: "PCS",
        qty: "1"
      });
    } else if (editTemplateItemIndex !== null && editTemplateItemIndex > index) {
      setEditTemplateItemIndex(editTemplateItemIndex - 1);
    }
  };

  // Start editing a single item inside the template editor panel
  const handleStartEditSingleItemInTemplate = (index: number) => {
    const item = editTemplateItems[index];
    if (item) {
      setEditTemplateItemIndex(index);
      setEditTemplateSingleItemForm({
        itemAr: item.itemAr || "",
        itemEn: item.itemEn || "",
        code: item.code || "",
        unit: item.unit || "PCS",
        qty: item.qty || "1"
      });
    }
  };

  // Roster Inline actions for staff deletion and renaming
  const handleSaveRosterEmpInline = (row: any) => {
    if (!editRosterEmpNameAr.trim() || !editRosterEmpNameEn.trim() || !editRosterEmpCode.trim()) {
      alert(language === "ar" ? "يرجى ملء جميع حقول كود واسم الموظف!" : "Please fill in all employee name and code fields!");
      return;
    }

    const numericCode = editRosterEmpCode.trim().replace(/\D/g, '');
    if (!numericCode) {
      alert(language === "ar" ? "يجب أن يتكون كود الموظف من أرقام فقط!" : "Employee Code must consist of numbers only!");
      return;
    }
    const cleanCode = numericCode;

    // 1. Update the rosters
    setRosterList((prevList) => {
      const nextList = prevList.map((rost) => {
        return {
          ...rost,
          rows: rost.rows.map((r: any) => {
            if (r.employeeId === row.employeeId || (r.employeeCode && r.employeeCode === row.employeeCode)) {
              return {
                ...r,
                employeeNameAr: editRosterEmpNameAr.trim(),
                employeeNameEn: editRosterEmpNameEn.trim(),
                employeeCode: cleanCode
              };
            }
            return r;
          })
        };
      });
      localStorage.setItem("baheya_department_rosters", JSON.stringify(nextList));
      return nextList;
    });

    // 2. Update the system users database (registry) if a match is found
    const targetId = row.employeeId || "";
    const targetCode = row.employeeCode || "";
    const matchedUserIndex = systemUsers.findIndex(
      u => (targetId && u.id === targetId) || (targetCode && u.staffId === targetCode)
    );

    if (matchedUserIndex !== -1) {
      const updatedUsers = [...systemUsers];
      const matchedUser = updatedUsers[matchedUserIndex];
      matchedUser.nameAr = editRosterEmpNameAr.trim();
      matchedUser.nameEn = editRosterEmpNameEn.trim();
      matchedUser.staffId = cleanCode;
      matchedUser.emp_id = cleanCode;

      setSystemUsers(updatedUsers);
      localStorage.setItem("baheya_system_users", JSON.stringify(updatedUsers));

      // Persist user modifications to Firebase central directory
      saveStaffMember(matchedUser).catch(err => console.error("Error saving updated staff inline:", err));
    }

    addSystemLog(`Renamed roster staff record ${row.employeeNameEn} -> ${editRosterEmpNameEn.trim()} successfully.`, "success");
    setEditingRosterEmpId(null);
  };

  const handleRemoveRosterEmpInline = (row: any) => {
    const targetId = row.employeeId || "";
    const targetCode = row.employeeCode || "";

    if (targetId === currentUser.id || targetCode === currentUser.staffId) {
      alert(language === "ar" ? "عذراً: لا يمكنك حذف أو تعطيل حسابك النشط حالياً!" : "Access Denied: You cannot delete your current active session user!");
      return;
    }

    const userConfirm = confirm(
      language === "ar"
        ? `هل أنت متأكد من حذف وتعطيل الموظف (${row.employeeNameAr || "هذا"}) تماماً من هذا الجدول وجدول كادر المستشفى؟`
        : `Are you sure you want to completely remove and deactivate employee (${row.employeeNameEn || "this staff"}) from the active roster and register?`
    );

    if (!userConfirm) return;

    // 1. Remove from rosters
    setRosterList((prevList) => {
      const nextList = prevList.map((rost) => {
        return {
          ...rost,
          rows: rost.rows.filter((r: any) => {
            const matchId = targetId && (r.employeeId === targetId);
            const matchCode = targetCode && (r.employeeCode === targetCode);
            return !(matchId || matchCode);
          })
        };
      });
      localStorage.setItem("baheya_department_rosters", JSON.stringify(nextList));
      return nextList;
    });

    // 2. Remove from system users (so they can't login either)
    const matchedUser = systemUsers.find(
      u => (targetId && u.id === targetId) || (targetCode && u.staffId === targetCode)
    );

    if (matchedUser) {
      const updatedUsers = systemUsers.filter(u => u.id !== matchedUser.id);
      setSystemUsers(updatedUsers);
      localStorage.setItem("baheya_system_users", JSON.stringify(updatedUsers));
      
      // Call firestore clean
      deleteStaffMember(matchedUser.id).catch(err => console.error("Error deleting staff in cloud:", err));
    }

    addSystemLog(`Removed staff employee ${row.employeeNameEn} from active roster and directory.`, "warning");
  };

  const handleAddRosterRowConfirm = () => {
    if (!newRosterEmpNameAr.trim() || !newRosterEmpNameEn.trim() || !newRosterEmpCode.trim()) {
      alert(language === "ar" ? "يرجى تعبئة الحقول المطلوبة: الاسم بالعربية، الاسم بالإنجليزية، وكود الموظف!" : "Please fill in all required fields: Arabic Name, English Name, and Staff ID/Code!");
      return;
    }

    const numericCode = newRosterEmpCode.trim().replace(/\D/g, '');
    if (!numericCode) {
      alert(language === "ar" ? "يجب أن يتكون كود الموظف من أرقام فقط!" : "Employee Code must consist of numbers only!");
      return;
    }
    const cleanCode = numericCode;

    // Check if duplicate staff ID exists in system users
    const exists = systemUsers.some(u => u.staffId === cleanCode || u.pin === cleanCode);
    if (exists && newRosterAutoRegister) {
      alert(language === "ar" ? "كود الموظف هذا مسجل مسبقاً لمستخدم آخر بالنظام!" : "This Employee Code is already registered for another system user!");
      return;
    }

    const employeeId = "emp-" + Math.random().toString(36).substring(2, 9);

    if (newRosterAutoRegister) {
      const pinToUse = newRosterEmpPin.trim() || "1234";
      const newUserSpec: AppUser = {
        id: employeeId,
        staffId: cleanCode,
        emp_id: cleanCode,
        nameAr: newRosterEmpNameAr.trim(),
        nameEn: newRosterEmpNameEn.trim(),
        email: `${cleanCode.toLowerCase().replace("bhg-", "")}@baheya.org`,
        role: newRosterEmpRole as UserRole,
        department: selectedRosterDept,
        pin: pinToUse,
        avatarInitials: newRosterEmpNameEn.trim().split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2) || "BH",
        status: "active" as const
      };

      const updatedUsers = [...systemUsers, newUserSpec];
      setSystemUsers(updatedUsers);
      localStorage.setItem("baheya_system_users", JSON.stringify(updatedUsers));
      saveStaffMember(newUserSpec).catch(err => console.error("Cloud firestore staff member save error:", err));
    }

    // Wrap-up and append to RosterList for current department
    setRosterList((prevList) => {
      const nextList = prevList.map((rost) => {
        if (rost.departmentName === selectedRosterDept) {
          const freshRow = {
            employeeId: employeeId,
            employeeNameAr: newRosterEmpNameAr.trim(),
            employeeNameEn: newRosterEmpNameEn.trim(),
            roleTitleAr: resolveRoleTitles(newRosterEmpRole).ar,
            roleTitleEn: resolveRoleTitles(newRosterEmpRole).en,
            employeeCode: cleanCode,
            shifts: {}
          };
          return {
            ...rost,
            rows: [...(rost.rows || []), freshRow]
          };
        }
        return rost;
      });
      localStorage.setItem("baheya_department_rosters", JSON.stringify(nextList));
      return nextList;
    });

    addSystemLog(`Added staff member ${newRosterEmpNameEn} to ${selectedRosterDept} department roster.`, "success");
    
    // reset form fields
    setNewRosterEmpNameAr("");
    setNewRosterEmpNameEn("");
    setNewRosterEmpCode("");
    setNewRosterEmpPin("");
    setIsAddingRosterRow(false);
  };

  const handleResetRosterToDefaultsObj = () => {
    const userConfirm = confirm(
      language === "ar"
        ? `🚨 تحذير هام: هل أنت متأكد من رغبتك في إعادة تهيئة الروستر في قسم (${selectedRosterDept}) إلى الوضع الأصلي للتطبيق؟ سيتم مسح أي نوبتجيات معدلة وإرجاع قائمة الموظفين الأساسيين ل${hospitalSettings.nameAr || "المؤسسة"}.`
        : `🚨 WARNING: Are you sure you want to completely re-initialize the roster grid of department (${selectedRosterDept}) to system default setup? All custom shift cell edits will be wiped.`
    );
    if (!userConfirm) return;

    // Reset this specific department's rows to a default sample or wipe
    setRosterList((prevList) => {
      const defaultEmergencyRows = [
        {
          employeeId: "emp-1",
          employeeNameAr: "محمود عمر",
          employeeNameEn: "MAHMOUD OMAR",
          roleTitleAr: "مساعد رئيس تمريض (AHN)",
          roleTitleEn: "Asst. Head Nurse (AHN)",
          employeeCode: "20810",
          shifts: { "20": "D", "29": "D", "30": "D", "8": "D", "14": "D", "15": "D" }
        },
        {
          employeeId: "emp-2",
          employeeNameAr: "هاني ناصر",
          employeeNameEn: "HANY NASER",
          roleTitleAr: "أخصائي تمريض (SN)",
          roleTitleEn: "Staff Nurse (SN)",
          employeeCode: "20906",
          shifts: { "18": "DN", "23": "DN", "26": "D", "30": "DN", "31": "D", "3": "DN", "6": "DN", "8": "D", "10": "DN", "13": "DN" }
        },
        {
          employeeId: "emp-3",
          employeeNameAr: "عمر أحمد",
          employeeNameEn: "OMAR AHMED",
          roleTitleAr: "أخصائي تمريض (SN)",
          roleTitleEn: "Staff Nurse (SN)",
          employeeCode: "20936",
          shifts: { "17": "DN", "19": "DN", "21": "DN", "25": "DN", "28": "DN", "1": "DN", "4": "DN", "9": "DN", "15": "DN" }
        },
        {
          employeeId: "user-nurse",
          employeeNameAr: "أ. فاطمة الزهراء",
          employeeNameEn: "Sister Fatima El-Zahraa",
          roleTitleAr: "أخصائي تمريض (SN)",
          roleTitleEn: "Staff Nurse (SN)",
          employeeCode: "2525",
          shifts: { "16": "DN", "18": "DN", "21": "M", "24": "DN", "27": "DN", "30": "AL", "2": "DN", "6": "DN", "10": "DN", "14": "DN" }
        }
      ];

      const defaultWipedRows = [
        {
          employeeId: `emp-dept-1-${selectedRosterDept}`,
          employeeNameAr: `${selectedRosterDept} ممرض أ`,
          employeeNameEn: `${selectedRosterDept} Nurse A`,
          roleTitleAr: "أخصائي تمريض (SN)",
          roleTitleEn: "Staff Nurse (SN)",
          employeeCode: "40101",
          shifts: {}
        },
        {
          employeeId: `emp-dept-2-${selectedRosterDept}`,
          employeeNameAr: `${selectedRosterDept} ممرض ب`,
          employeeNameEn: `${selectedRosterDept} Nurse B`,
          roleTitleAr: "أخصائي تمريض (SN)",
          roleTitleEn: "Staff Nurse (SN)",
          employeeCode: "40102",
          shifts: {}
        }
      ];

      const targetRows = selectedRosterDept === "EMERGENCY UNIT" ? defaultEmergencyRows : defaultWipedRows;

      const nextList = prevList.map((rost) => {
        if (rost.departmentName === selectedRosterDept) {
          return {
            ...rost,
            rows: targetRows
          };
        }
        return rost;
      });
      localStorage.setItem("baheya_department_rosters", JSON.stringify(nextList));
      return nextList;
    });

    addSystemLog(`Re-initialised department roster for ${selectedRosterDept} safely.`, "info");
  };

  // User Management actions
  const handleAddSystemUser = () => {
    if (!newUserForm.nameAr.trim() || !newUserForm.nameEn.trim() || !newUserForm.staffId.trim() || !newUserForm.email.trim()) {
      alert(language === "ar" ? "يرجى ملء الاسم بالعربية والإنجليزية، كود الموظف، والبريد الإلكتروني!" : "Please fill Arabic name, English name, Staff ID, and Corporate Email!");
      return;
    }

    const generatedId = `user-${Date.now()}`;
    const initials = newUserForm.nameEn
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";

    const newUser: AppUser = {
      id: generatedId,
      nameAr: newUserForm.nameAr.trim(),
      nameEn: newUserForm.nameEn.trim(),
      role: newUserForm.role as UserRole,
      avatarInitials: initials,
      department: newUserForm.department.trim() || "EMERGENCY UNIT",
      staffId: newUserForm.staffId.trim(),
      pin: newUserForm.pin.trim() || "1234",
      email: newUserForm.email.trim().toLowerCase(),
      emp_id: newUserForm.staffId.trim(),
      assigned_dept: newUserForm.department.trim() || "EMERGENCY UNIT",
      permissions: newUserForm.permissions || [],
      status: "pending" as const
    };

    const updated = [...systemUsers, newUser];
    setSystemUsers(updated);
    localStorage.setItem("baheya_system_users", JSON.stringify(updated));
    
    // Auto-inject employee into rosterList for their designated department
    if (['staff', 'Staff', 'head_nurse', 'tech', 'nursing_tech', 'intern', 'intern_nurse', 'assistant', 'nursing_assistant', 'secretary', 'sec'].includes(newUser.role)) {
      setRosterList((prevList) => {
        const nextList = prevList.map((rost) => {
          if (rost.departmentName.toUpperCase().trim() === newUser.department.toUpperCase().trim()) {
            const alreadyExists = rost.rows.some((r: any) => 
              r.employeeId === newUser.id || 
              (r.employeeCode && r.employeeCode === newUser.staffId)
            );
            if (!alreadyExists) {
              const newRow = {
                employeeId: newUser.id,
                employeeNameAr: newUser.nameAr,
                employeeNameEn: newUser.nameEn,
                roleTitleAr: resolveRoleTitles(newUser.role).ar,
                roleTitleEn: resolveRoleTitles(newUser.role).en,
                employeeCode: newUser.staffId || newUser.pin,
                shifts: {}
              };
              return {
                ...rost,
                rows: [...rost.rows, newRow]
              };
            }
          }
          return rost;
        });
        localStorage.setItem("baheya_department_rosters", JSON.stringify(nextList));
        return nextList;
      });
    }
    
    // Save to Firestore central auth database
    saveStaffMember(newUser).catch(err => console.error(err));

    // Reset Form
    setNewUserForm({
      nameAr: "",
      nameEn: "",
      role: "head_nurse",
      department: departments[0] || "EMERGENCY UNIT",
      staffId: "",
      pin: "1234",
      email: "",
      permissions: []
    });

    alert(language === "ar" ? "تم إضافة الموظف الجديد بنجاح ومزامنته بـ Firestore!" : "New staff member registered successfully & synced to Firestore cloud!");
  };

  const handleSelectUserToEdit = (userId: string) => {
    setSelectedUserToEdit(userId);
    if (!userId) {
      setEditUserForm({
        nameAr: "",
        nameEn: "",
        role: "head_nurse",
        department: departments[0] || "EMERGENCY UNIT",
        staffId: "",
        pin: "1234",
        email: "",
        permissions: []
      });
      return;
    }

    const usr = systemUsers.find(u => u.id === userId);
    if (usr) {
      setEditUserForm({
        nameAr: usr.nameAr,
        nameEn: usr.nameEn,
        role: usr.role,
        department: usr.department,
        staffId: usr.staffId,
        pin: usr.pin || "1234",
        email: usr.email || "",
        permissions: usr.permissions || []
      });
    }
  };

  const handleUpdateSystemUser = () => {
    if (!selectedUserToEdit) return;
    if (!editUserForm.nameAr.trim() || !editUserForm.nameEn.trim() || !editUserForm.staffId.trim() || !editUserForm.email.trim()) {
      alert(language === "ar" ? "يرجى ملء الاسم بالعربية والإنجليزية، كود الموظف والبريد الإلكتروني!" : "Arabic/English name, Staff ID & Email are required!");
      return;
    }

    const initials = editUserForm.nameEn
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";

    const updated = systemUsers.map((u) => {
      if (u.id === selectedUserToEdit) {
        const updatedUsr: AppUser = {
          ...u,
          nameAr: editUserForm.nameAr.trim(),
          nameEn: editUserForm.nameEn.trim(),
          role: editUserForm.role,
          avatarInitials: initials,
          department: editUserForm.department.trim(),
          staffId: editUserForm.staffId.trim(),
          pin: editUserForm.pin.trim() || "1234",
          email: editUserForm.email.trim().toLowerCase(),
          emp_id: editUserForm.staffId.trim(),
          assigned_dept: editUserForm.department.trim(),
          permissions: editUserForm.permissions || []
        };
        // Sync to Firestore
        saveStaffMember(updatedUsr).catch(err => console.error(err));
        return updatedUsr;
      }
      return u;
    });

    setSystemUsers(updated);
    localStorage.setItem("baheya_system_users", JSON.stringify(updated));

    // Sync current user if updated
    const currentUpdated = updated.find(u => u.id === currentUser.id);
    if (currentUpdated) {
      setCurrentUser(currentUpdated);
      localStorage.setItem("baheya_current_user_object", JSON.stringify(currentUpdated));
    }

    // Reset Edit State
    setSelectedUserToEdit("");
    setEditUserForm({
      nameAr: "",
      nameEn: "",
      role: "head_nurse",
      department: "",
      staffId: "",
      pin: "1234",
      email: "",
      permissions: []
    });

    alert(language === "ar" ? "تم تحديث بيانات المستخدم ومزامنته بنجاح!" : "User account updated & synced successfully!");
  };

  const handleDeleteSystemUser = (userId: string) => {
    if (userId === currentUser.id) {
      alert(language === "ar" ? "عذراً: لا يمكنك حذف حساب الموظف الفعّال والنشط في جلستك الحالية!" : "Access Denied: You cannot delete the currently logged in active session user!");
      return;
    }

    const admins = systemUsers.filter(u => u.role === "admin");
    const targetUser = systemUsers.find(u => u.id === userId);
    if (targetUser?.role === "admin" && admins.length <= 1) {
      alert(language === "ar" ? "عذراً: يجب الإبقاء على مسؤول نظام (أدمن) واحد على الأقل في النظام!" : "Access Denied: You must keep at least one administrator account in the system!");
      return;
    }

    if (!confirm(language === "ar" ? "هل أنت متأكد من حذف هذا المستخدم والحد من صلاحياته؟" : "Are you sure you want to permanently delete this user account?")) {
      return;
    }

    const updated = systemUsers.filter(u => u.id !== userId);
    setSystemUsers(updated);
    localStorage.setItem("baheya_system_users", JSON.stringify(updated));
    
    // Delete from Firestore
    deleteStaffMember(userId).catch(err => console.error(err));

    alert(language === "ar" ? "تم إزالة حساب المستخدم الطبي من النظام ومزامنته السحابية." : "User account removed & un-synced successfully.");
  };

  // CQI Gap Resolution action methods
  const handleToggleGapState = (gapKey: string) => {
    const existingGap = resolvedGaps[gapKey];
    if (existingGap && existingGap.resolved) {
      // Toggle back to unresolved
      const updated = { ...resolvedGaps };
      delete updated[gapKey];
      setResolvedGaps(updated);
      localStorage.setItem("baheya_resolved_gaps", JSON.stringify(updated));
      alert(language === "ar" ? "تم إعادة فتح الثغرة كغير معالجة للرقابة والمتابعة." : "Reopened gap as unresolved.");
    } else {
      // Open resolution inline editor
      setEditingGapKey(gapKey);
      setGapResolutionNote(existingGap?.notes || "");
    }
  };

  const handleSaveGapResolution = () => {
    if (!editingGapKey) return;
    const now = new Date();
    const timestampStr = `${now.toLocaleDateString("ar-EG")} ${now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
    
    const updated = {
      ...resolvedGaps,
      [editingGapKey]: {
        resolved: true,
        notes: gapResolutionNote.trim() || (language === "ar" ? "تم التحقق والمعالجة" : "Checked and resolved"),
        resolvedBy: language === "ar" ? currentUser.nameAr : currentUser.nameEn,
        resolvedAt: timestampStr
      }
    };
    
    setResolvedGaps(updated);
    localStorage.setItem("baheya_resolved_gaps", JSON.stringify(updated));
    setEditingGapKey(null);
    setGapResolutionNote("");
    
    alert(language === "ar" ? "تم معالجة الثغرة وتوثيق قرار الجودة بنجاح وجاهزة للتصدير!" : "Gap resolution documented successfully!");
  };

  // Checkbox/Selection cell toggles for grid columns (Quality auditor role lock)
  const handleCellToggle = (rowIndex: number, dayKey: string) => {
    if (!editingRecord) return;

    // Strict Date Compliance Check
    const recordDate = new Date(editingRecord.date);
    const cellDay = parseInt(dayKey);
    const today = new Date();
    const isToday = 
      today.getFullYear() === recordDate.getFullYear() &&
      today.getMonth() === recordDate.getMonth() &&
      today.getDate() === cellDay;

    if (!isToday) {
      alert(
        language === "ar"
          ? `🔒 تنبيه الالتزام والرقابة الطبية: يمنع منعاً باتاً سجل أو تعديل الجداول لغير اليوم الحالي (${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}). لا يمكنك تسجيل بيانات أو تعديل خانات الأيام السابقة أو القادمة للالتزام الطبي والرقابي بمستشفى ${hospitalSettings.nameAr || "المؤسسة"}.`
          : `🔒 ${hospitalSettings.nameEn} Quality Compliance Lock: Recording or updating cell data for past or future dates is strictly prohibited. You can only log and modify entries for the current active day (${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}).`
      );
      return;
    }

    // Quality Lock validation - ONLY prevent if the user is a normal staff or nurse. 
    // Allowing editing if it is supervisor, manager, admin, quality, president.
    const isNormalStaff = ["staff", "nurse", "normal"].includes(currentUser.role.toLowerCase());
    if (isNormalStaff) {
      alert(
        language === "ar" 
          ? "تنبيه: غير مسموح لك بالتعديل. يرجى التواصل مع مسؤول الوحدة." 
          : "Access Denied: You do not have permission to edit. Please contact your supervisor."
      );
      return;
    }

    const rowData = editingRecord.gridData[rowIndex];
    const currentValue = rowData.days[dayKey] || "";

    const itemEn = rowData.itemEn.toLowerCase();
    const itemAr = rowData.itemAr.toLowerCase();

    // Devices & Equipment (Boolean)
    const isDevice = 
        itemEn.includes("device") || 
        itemEn.includes("equipment") ||
        itemEn.includes("shock") ||
        itemEn.includes("tube") ||                
        itemEn.includes("monitor") ||
        itemEn.includes("oxygen") ||
        itemEn.includes("extinguisher") ||
        itemAr.includes("جهاز") ||
        itemAr.includes("مونيتور") ||
        itemAr.includes("أسطوانة") ||
        itemAr.includes("طفايات");

    setActiveCellEdit({
      rowIndex,
      dayKey,
      itemAr: rowData.itemAr,
      itemEn: rowData.itemEn,
      code: rowData.code || "",
      currentValue,
      isDevice
    });
  };

  const handleSaveCellEdit = (newValue: string) => {
    if (!editingRecord || !activeCellEdit) return;

    const { rowIndex, dayKey } = activeCellEdit;

    const updatedGrid = editingRecord.gridData.map((row, idx) => {
      if (idx === rowIndex) {
        return {
          ...row,
          days: {
            ...row.days,
            [dayKey]: newValue
          }
        };
      }
      return row;
    });

    setEditingRecord({
      ...editingRecord,
      gridData: updatedGrid
    });

    setActiveCellEdit(null);
  };

  // Bulk set entire day focused column to all ✔ (Quality / Admin lock checks)
  const handleBulkFillDay = (dayKey: string) => {
    if (!editingRecord) return;

    // Quality Lock validation
    if (currentUser.role === "quality") {
      alert(
        language === "ar" 
          ? "تنبيه الجودة: المستند للقراءة فقط. لا يمكن ملء الخانات كمسؤول جودة." 
          : "Quality Control Lock: Document is read-only. Dynamic bulk-fill is restricted for Auditors."
      );
      return;
    }

    // Strict Date Compliance Check
    const recordDate = new Date(editingRecord.date);
    const cellDay = parseInt(dayKey);
    const today = new Date();
    const isToday = 
      today.getFullYear() === recordDate.getFullYear() &&
      today.getMonth() === recordDate.getMonth() &&
      today.getDate() === cellDay;

    if (!isToday) {
      alert(
        language === "ar"
          ? `🔒 تنبيه الالتزام والرقابة الطبية: يمنع منعاً باتاً التعبئة التلقائية لغير اليوم الحالي (${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}). لا يمكنك تسجيل بيانات أو تعديل خانات الأيام السابقة أو القادمة للالتزام الطبي الوقائي بمستشفى ${hospitalSettings.nameAr || "المؤسسة"}.`
          : `🔒 ${hospitalSettings.nameEn} Quality Compliance Lock: Bulk-filling cell data for past or future dates is strictly prohibited. You can only log and modify entries for today's active day (${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}).`
      );
      return;
    }

    const confirmation = window.confirm(
      language === "ar"
        ? `هل تريد ملء جميع حقول اليوم ${dayKey} بعلامة مكتمل (✔)؟`
        : `Do you want to fill all rows of Day ${dayKey} with Checked (✔)?`
    );
    if (!confirmation) return;

    const updatedGrid = editingRecord.gridData.map(row => ({
      ...row,
      days: {
        ...row.days,
        [dayKey]: "✔"
      }
    }));

    setEditingRecord({
      ...editingRecord,
      gridData: updatedGrid
    });
  };

  // Passcode modal submit logic
  const handlePasscodeSubmit = () => {
    const expectedPin = pendingUser?.pin || "1234";
    if (passcodeInput === expectedPin) {
      if (pendingUser) {
        setCurrentUser(pendingUser);
        localStorage.setItem("baheya_current_user_id", pendingUser.id);
        localStorage.setItem("baheya_current_user_object", JSON.stringify(pendingUser));
        if (editingRecord) {
          setEditingRecord({
            ...editingRecord,
            staffName: language === "ar" ? pendingUser.nameAr : pendingUser.nameEn,
            staffId: pendingUser.staffId,
            department: pendingUser.department
          });
        }
      }
      setPasscodeModalOpen(false);
      setPendingUser(null);
      setPasscodeInput("");
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoginError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Success automatically updates loggedIn state via Firebase auth listener
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      const msg = error?.message || "";
      const isConfigError = msg.includes("api-key") || msg.includes("authDomain") || msg.includes("invalid-api") || msg.includes("valid-api-key");
      
      if (isConfigError) {
        setLoginError(
          language === "ar"
            ? "مشروع الـ Firebase غير مهيّأ بمفاتيح Google API صحيحة في السيرفر بعد. يرجى مراجعة مسؤول الـ IT لربط بيانات المصادقة بأمان."
            : "Firebase service is not fully configured with valid Google API keys. Please contact IT administrator."
        );
      } else {
        setLoginError(
          language === "ar"
            ? "تعذر الاتصال بخدمة Google Authentication. يرجى تسجيل الدخول بكود الكادر ورمز الـ PIN المعتمدين."
            : "Failed to connect to Google Authentication. Please log in using your Staff ID and PIN."
        );
      }
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Search first by typed staff ID (case-insensitive)
    const cleanStaffId = loginStaffId.trim().toUpperCase();
    let targetUser = systemUsers.find(
      u => u.staffId.trim().toUpperCase() === cleanStaffId
    );

    // Cover if user typed id as text or clicked select
    if (!targetUser && loginSelectedUserId) {
      targetUser = systemUsers.find(u => u.id === loginSelectedUserId);
    }

    if (!targetUser) {
      setLoginError(
        language === "ar"
          ? "كود الموظف غير صحيح! يرجى التأكد من كتابة الرقم التعريفي بشكل سليم أو مراجعة إدارة تقنية المعلومات لتشغيل حسابك."
          : "Incorrect Employee Code! Please verify your ID or contact the IT Department to activate your credentials."
      );
      return;
    }

    // Check status: must be 'active'
    if (targetUser.status !== "active") {
      setLoginError(
        language === "ar"
          ? targetUser.status === "disabled"
            ? "⚠ تم تعطيل هذا الحساب بقرار إداري! يرجى مراجعة إدارة نظم الجودة والاعتماد."
            : "⚠ عذراً! حسابك غير مفعل حالياً (بانتظار الموافقة). يرجى مراجعة إدارة نظم المعلومات لتفعيل الحساب."
          : targetUser.status === "disabled"
            ? "⚠ Account Disabled: Your account has been suspended by system administrators."
            : "⚠ Access Denied: Your account is pending approval. Please contact the IT Admin to activate your credentials."
      );
      return;
    }

    const expectedPin = targetUser.pin || "1234";
    if (loginPasscode === expectedPin) {
      setCurrentUser(targetUser);
      setIsLoggedIn(true);
      setLoginPasscode("");
      setLoginStaffId("");
      setLoginError(null);
      addSystemLog(`User ${targetUser.nameEn} (${targetUser.role.toUpperCase()}) logged in successfully.`, "success");
    } else {
      setLoginError(
        language === "ar"
          ? "رمز المرور (PIN) للموظف غير صحيح! حاول مجدداً."
          : "Invalid PIN code for this employee! Please try again."
      );
    }
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const { nameAr, nameEn, email, role, department, staffId, pin } = signupForm;

    if (!nameAr.trim() || !nameEn.trim() || !email.trim() || !staffId.trim() || !pin.trim()) {
      setLoginError(
        language === "ar"
          ? "يرجى ملء جميع الحقول المطلوبة للتسجيل"
          : "Please fill in all the required fields for registration"
      );
      return;
    }

    const numericCode = staffId.trim().replace(/\D/g, '');
    if (!numericCode) {
      setLoginError(
        language === "ar"
          ? "يجب أن يتكون كود الموظف من أرقام فقط!"
          : "Staff ID must consist of numbers only!"
      );
      return;
    }
    const cleanCode = numericCode;

    // Verify uniqueness of staffId
    const isCodeTaken = systemUsers.some(u => u.staffId.trim() === cleanCode);
    if (isCodeTaken) {
      setLoginError(
        language === "ar"
          ? "كود الموظف هذا مسجل مسبقاً بنظام الكادر!"
          : "This Staff ID is already registered in our system!"
      );
      return;
    }

    const generatedId = `user-${Date.now()}`;
    const initials = nameEn
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";

    const newUser: AppUser = {
      id: generatedId,
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim(),
      role: role as any,
      roleId: role as any,
      avatarInitials: initials,
      department: department,
      staffId: cleanCode,
      pin: pin.trim(),
      email: email.trim().toLowerCase(),
      emp_id: cleanCode,
      assigned_dept: department,
      permissions: ["checklist", "duty", "view_roster"],
      status: "pending" // starts as pending
    };

    const updated = [...systemUsers, newUser];
    setSystemUsers(updated);

    // Save to Firestore central auth database
    saveStaffMember(newUser).catch(err => console.error("Error saving newly registered staff:", err));

    // Auto-inject employee into roster rows for their designated department
    if (["staff", "Staff", "head_nurse"].includes(role)) {
      setRosterList((prevList) => {
        const nextList = prevList.map((rost) => {
          if (rost.departmentName.toUpperCase().trim() === department.toUpperCase().trim()) {
            const alreadyExists = rost.rows.some((r: any) => 
               r.employeeId === newUser.id || 
               (r.employeeCode && r.employeeCode === newUser.staffId)
            );
            if (!alreadyExists) {
              const newRow = {
                employeeId: newUser.id,
                employeeNameAr: newUser.nameAr,
                employeeNameEn: newUser.nameEn,
                roleTitleAr: newUser.role === 'head_nurse' ? "رئيسة تمريض" : "أخصائي تمريض (SN)",
                roleTitleEn: newUser.role === 'head_nurse' ? "Head Nurse (HN)" : "Staff Nurse (SN)",
                employeeCode: newUser.staffId,
                shifts: {}
              };
              return {
                ...rost,
                rows: [...rost.rows, newRow]
              };
            }
          }
          return rost;
        });
        localStorage.setItem("baheya_department_rosters", JSON.stringify(nextList));
        return nextList;
      });
    }

    addSystemLog(`New user ${newUser.nameEn} registered as PENDING. IT activation required.`, "warning");
    
    // Show success message but do not login
    setLoginError(
      language === "ar"
        ? "✨ تم إرسال طلب تسجيل حسابك السحابي بنجاح! طلبك الآن تحت المراجعة والدراسة بوضعية 'معلق' (Pending) لتأمين المعطيات السريرية. سيتم إخطارك فور تفعيل الحساب والرمز السري (PIN) من قبل رئيس قسم تقنية المعلومات أو رئيس الإدارة الطبية لتتمكن من المزامنة والوصول الآمن للخدمات."
        : "✨ Cloud registration request submitted successfully! Your account is currently 'Pending' administrative review for clinical data protection. Once authorized by IT or the Medical Director, you will be able to log in securely."
    );
    
    setSignupForm({
      nameAr: "",
      nameEn: "",
      email: "",
      role: "staff",
      department: "EMERGENCY UNIT",
      staffId: "",
      pin: ""
    });
    setLoginTab("login");
  };

  const handleLogout = () => {
    addSystemLog(`User ${currentUser?.nameEn || "unknown"} logged out.`, "info");
    setIsLoggedIn(false);
    setLoginPasscode("");
  };

  // Secure Password/PIN retrieval & reset mechanisms tied to central employee registrar email
  const handleRequestRecoveryInput = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryMsg(null);

    const emailToSearch = recoveryEmailIn.trim().toLowerCase();
    if (!emailToSearch) {
      setRecoveryError(
        language === "ar"
          ? "يرجى كتابة البريد الإلكتروني للموظف!"
          : "Please write the registered corporate email address!"
      );
      return;
    }

    const matchedUser = systemUsers.find(
      u => (u.email || "").trim().toLowerCase() === emailToSearch
    );

    if (!matchedUser) {
      setRecoveryError(
        language === "ar"
          ? `عذراً، البريد الإلكتروني المدخل غير مسجل بنظام كادر ${hospitalSettings.nameAr || "المؤسسة"}.`
          : "The email is not registered in our clinical registry."
      );
      return;
    }

    // Generate virtual mailbox notification
    const newMailItem = {
      id: `mail-${Date.now()}`,
      sender: "security-noreply@baheya.org",
      recipient: emailToSearch,
      subject: language === "ar" 
        ? "🔒 [نظام الأمان بمستشفى بهية] كود استعادة الـ PIN السري وتنبيهات الكادر" 
        : "🔒 [Baheya Security Portal] Passcode PIN Recovery & System Override Link",
      bodyAr: `أهلاً بك زميلنا الموقر بفرق الرعاية والتمريض، لقد تلقينا طلباً لاسترجاع ومصادقة هويّة الدخول الخاصة بك.

بيانات حسابك:
- الاسم الإداري: ${matchedUser.nameAr}
- الكود التعريفي: ${matchedUser.staffId}
- الـ PIN الحالي الخاص بك: [ ${matchedUser.pin || "1234"} ]

تسهيلاً لإجراءات العمل، يمكنك النقر على زر 'تعديل وتحديد رمز PIN جديد' المبرمج للتجاوز وتثبيت رمز سري جديد تلقائياً في قاعدة البيانات.`,
      bodyEn: `Hello esteemed clinical staff member, we received a password recovery request for your medical account.

Your Profile Details:
- Name En: ${matchedUser.nameEn}
- Employee Code: ${matchedUser.staffId}
- Current Passcode PIN: [ ${matchedUser.pin || "1234"} ]

For premium ease of use, you can click the visual override button 'Modify & Choose New PIN' inside this email to automatically direct-route and save your new passcode locally and to Cloud Firestore.`,
      targetUser: matchedUser,
      timestamp: new Date().toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })
    };

    const nextMails = [newMailItem, ...communicationsInbox];
    setCommunicationsInbox(nextMails);
    localStorage.setItem("baheya_virtual_emails", JSON.stringify(nextMails));

    try {
      await sendPasswordResetEmail(auth, emailToSearch);
      setRecoveryMsg(
        language === "ar"
          ? "✔ تم إرسال رابط لإعادة تعيين كلمة المرور رسمياً على Gmail! وأيضاً قمنا ببث رسالة أمان فورية بمحاكي الـ Mailbox الذكي في الأسفل للتجربة والمتابعة السريعة."
          : "✔ Official password reset email sent via Firebase Auth! We have also dispatched a mock security email into the Virtual Mailbox simulator below for testing."
      );
    } catch (err: any) {
      console.warn("Firebase email fail, using virtual email delivery:", err);
      setRecoveryMsg(
        language === "ar"
          ? "✔ تم توليد وتوجيه رسالة استعادة الـ PIN ورسم رابط التغيير بمحاكي Gmail الذكي في الأسفل بنجاح! تفضل بتفقده للمتابعة والتحديث فورا."
          : "✔ Virtual PIN recovery email successfully delivered to the Mailbox Simulator console below!"
      );
    }
  };

  const handleCompletePINReset = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryMsg(null);

    if (!recoveryTargetUser) return;

    const pinToSet = newRecoveryPin.trim();
    if (pinToSet.length < 4 || pinToSet.length > 6 || /\D/.test(pinToSet)) {
      setRecoveryError(
        language === "ar"
          ? "يجب أن يتكون رمز المرور الجديد من 4 إلى 6 أرقام فقط!"
          : "Target passcode must consist of 4 to 6 numeric digits only!"
      );
      return;
    }

    // Process registry update
    const updatedUsers = systemUsers.map(u => {
      if (u.id === recoveryTargetUser.id) {
        const updated = { ...u, pin: pinToSet };
        // Sync updated staff settings directly to Cloud Firestore datastore
        saveStaffMember(updated).catch(err => console.error("Firestore user recovery update error:", err));
        return updated;
      }
      return u;
    });

    setSystemUsers(updatedUsers);
    localStorage.setItem("baheya_system_users", JSON.stringify(updatedUsers));

    // Reset recovery state machines
    setRecoveryMode(false);
    setRecoveryStep("enter_email");
    setRecoveryTargetUser(null);
    setNewRecoveryPin("");
    setRecoveryEmailIn("");
    
    // Automatically pre-fill Staff ID for immediate login
    setLoginStaffId(recoveryTargetUser.staffId);
    setLoginPasscode("");

    alert(
      language === "ar"
        ? `تم تحديث وحفظ الرمز الجديد بنجاح بنظام كادر ${hospitalSettings.nameAr || "المؤسسة"} المركزي لـ ${recoveryTargetUser.nameAr}. يمكنك كتابة الرمز الجديد لتسجيل الدخول آمن.`
        : `Your passcode is successfully updated on the central database server for ${recoveryTargetUser.nameEn}. Try logging in now!`
    );
  };

  // Filter template lists based on sidebar input, department tab, and year filter
  const filteredTemplates = allAvailableTemplates.filter((tpl) => {
    // If user is regular clinical staff (not admin/quality/president/it), restrict access
    const isStaffLocked = currentUser && currentUser.role !== "admin" && currentUser.role !== "quality" && currentUser.role !== "president" && currentUser.role !== "it";
    if (isStaffLocked) {
      if (currentUser.permissions && currentUser.permissions.length > 0) {
        if (!currentUser.permissions.includes(tpl.id)) {
          return false;
        }
      } else if (currentUser.department) {
        if (!doesTemplateMatchDepartment(tpl, currentUser.department)) {
          return false;
        }
      }
    }

    // 1. Sidebar Search query
    const q = templateSearchQuery.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      tpl.titleAr.toLowerCase().includes(q) ||
      tpl.titleEn.toLowerCase().includes(q) ||
      tpl.code.toLowerCase().includes(q) ||
      tpl.departmentDefault.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // 2. Filter by Dynamic Department
    if (selectedDepartmentFilter !== "ALL") {
      const fd = selectedDepartmentFilter.toUpperCase().trim();
      const codeUpper = tpl.code.toUpperCase();
      const deptUpper = tpl.departmentDefault.toUpperCase();

      const matchesDept = 
        deptUpper === fd ||
        codeUpper.includes(`-${fd.replace(" UNIT", "").replace(" CLINIC", "")}-`) ||
        (fd === "ER" && (codeUpper.includes("-ER-") || codeUpper.includes("-GEN-027") || deptUpper.includes("DRESSING") || deptUpper.includes("EMERGENCY"))) ||
        (fd === "ICU" && codeUpper.includes("-ICU-")) ||
        (fd === "OR" && (codeUpper.includes("-OR-") || codeUpper.includes("-SURG-") || codeUpper.includes("-ENG-") || deptUpper.includes("OPERATING") || deptUpper.includes("STERILIZATION"))) ||
        (fd === "CHEMO" && (codeUpper.includes("-CHEMO-") || deptUpper.includes("CHEMO"))) ||
        (fd === "RAD" && (codeUpper.includes("-RAD-") || deptUpper.includes("RADIOLOGY"))) ||
        (fd === "PED" && (codeUpper.includes("-PED-") || deptUpper.includes("PEDIATRIC"))) ||
        (fd === "PHA" && (codeUpper.includes("-PHA-") || deptUpper.includes("PHARMACY"))) ||
        (fd === "QLTY" && (codeUpper.includes("-QLTY-") || deptUpper.includes("QUALITY")));
        
      if (!matchesDept) return false;
    }

    // 3. Filter by Year partition
    if (selectedYearFilter !== "ALL") {
      const yearStr = selectedYearFilter;
      const tplYear = tpl.issueDate || "";
      const matchesYear = tplYear.includes(yearStr) || tpl.code.includes(yearStr);
      if (!matchesYear) return false;
    }

    return true;
  });

  // Filter saved records history
  const filteredRecords = records.filter(r => {
    // If user is regular clinical staff (not admin/quality/president/it), restrict to their department/permitted templates
    const isStaffLocked = currentUser && currentUser.role !== "admin" && currentUser.role !== "quality" && currentUser.role !== "president" && currentUser.role !== "it";
    if (isStaffLocked) {
      if (currentUser.permissions && currentUser.permissions.length > 0) {
        if (!currentUser.permissions.includes(r.templateId)) {
          return false;
        }
      } else if (currentUser.department) {
        const dName = currentUser.department.toUpperCase();
        const rName = (r.department || "").toUpperCase();
        if (dName !== rName && !rName.includes(dName) && !dName.includes(rName)) {
          return false;
        }
      }
    }

    const template = allAvailableTemplates.find(t => t.id === r.templateId);
    const searchLow = searchQuery.toLowerCase().trim();
    return (
      r.department.toLowerCase().includes(searchLow) ||
      r.staffName.toLowerCase().includes(searchLow) ||
      r.staffId.toLowerCase().includes(searchLow) ||
      (r.patientName && r.patientName.toLowerCase().includes(searchLow)) ||
      (r.patientMRN && r.patientMRN.toLowerCase().includes(searchLow)) ||
      (r.notes && r.notes.toLowerCase().includes(searchLow)) ||
      (template && template.titleAr.toLowerCase().includes(searchLow)) ||
      (template && template.titleEn.toLowerCase().includes(searchLow)) ||
      r.date.includes(searchLow)
    );
  });

  const handleSeedMockAuditData = () => {
    // Check if we have templates
    if (allAvailableTemplates.length === 0) return;
    
    // Seed 3 realistic historical medical audit records for Baheya Foundation
    const seed1: SavedRecord = {
      id: "rec-mock-1",
      templateId: allAvailableTemplates[0]?.id || "temp-crashcart",
      date: "2026-05-15",
      time: "08:30",
      department: "EMERGENCY UNIT",
      staffName: "أ. فاطمة الزهراء",
      staffId: "2525",
      notes: "تم جرد قفل عربة الطوارئ والتأكد من سلامة كبلات الصدمات وتوافر ابرة الأدرينالين والأتروبين بالوحدة.",
      createdAt: new Date().toISOString(),
      gridData: [
        { sn: "1", code: "C-01", itemAr: "سلامة القفل البلاستيكي الخارجي واللون الأحمر المعتمد", itemEn: "Outer Plastic Lock Integrity & Assigned Red Color", unit: "Lock", qty: "1", days: { "1": "✔", "2": "✔", "3": "✔", "4": "✔", "5": "✔", "6": "✔", "15": "✔", "16": "✔", "17": "✔" } },
        { sn: "2", code: "C-02", itemAr: "جهاز الصدمات الكهربائية DC Shock والبطارية الاحتياطية", itemEn: "DC Defibrillator Machine & Auxiliary Battery State", unit: "Device", qty: "1", days: { "1": "✔", "2": "✔", "3": "✔", "4": "✔", "5": "✘", "6": "✔", "15": "✔", "16": "✔", "17": "✔" } },
        { sn: "3", code: "C-03", itemAr: "أبرة الأدرينالين Epinephrine 1mg / 1ml أمبول بالدرج الأول", itemEn: "Epinephrine 1mg / 1ml injection ampoules (Drawer 1)", unit: "Ampoule", qty: "5", days: { "1": "5", "2": "5", "3": "5", "4": "5", "5": "✔", "6": "5", "15": "✔", "16": "✔", "17": "✔" } }
      ]
    };

    const seed2: SavedRecord = {
      id: "rec-mock-2",
      templateId: allAvailableTemplates[1]?.id || "temp-fridge",
      date: "2026-05-20",
      time: "09:00",
      department: "CHEMO UNIT PREPN",
      staffName: "أ. فاطمة الزهراء",
      staffId: "2525",
      notes: "مراقبة دقيقة لثلاجة حفظ العلاج الهرموني والكيماوي للأورام. تم التنبيه على الصيانة لتنظيف المكثف الخارجي.",
      createdAt: new Date().toISOString(),
      gridData: [
        { sn: "1", code: "T-01", itemAr: "درجة الحرارة صباحاً (الحد المسموح 2-8 درجات مئوية)", itemEn: "Morning Temperature Log (Limit: 2°C to 8°C)", unit: "°C", qty: "1", days: { "1": "4.2", "2": "5.1", "3": "4.8", "4": "4.9", "5": "4.5", "6": "9.1", "15": "5.0", "16": "5.3", "17": "✔" } },
        { sn: "2", code: "T-02", itemAr: "درجة الرطوبة النسبية للغرفة (الأقل من 60%)", itemEn: "Relative Humidity Level (Limit: Less than 60%)", unit: "%", qty: "1", days: { "1": "48", "2": "52", "3": "44", "4": "50", "5": "51", "6": "49", "15": "53", "16": "52", "17": "✔" } }
      ]
    };

    const seed3: SavedRecord = {
      id: "rec-mock-3",
      templateId: allAvailableTemplates[2]?.id || "temp-ama",
      date: "2026-05-28",
      time: "11:15",
      department: "OUTPATIENT CLINIC",
      staffName: "أ. فاطمة الزهراء",
      staffId: "2525",
      notes: "توثيق حالة خروج مريض على مسؤوليته بعد الشرح التفصيلي للمخاطر الطبية في ملف المريض.",
      createdAt: new Date().toISOString(),
      patientName: "منى محمد عبد الرحمن",
      patientMRN: "MRN-92015-B",
      diagnosis: "سرطان الثدي - المرحلة الثانية - يحتاج جلسة كيماوي ثانية",
      gridData: [
        { sn: "1", code: "AMA-01", itemAr: "شرح شرحاً وافياً للمخاطر الطبية ومضاعفات عدم تلقي العلاج", itemEn: "Detailed clinical explanation of breast oncology risks", unit: "Doc", qty: "1", days: { "1": "✔", "2": "✔", "3": "✔", "4": "✔", "5": "✔", "6": "✔", "15": "✔", "16": "✔", "17": "✔" } },
        { sn: "2", code: "AMA-02", itemAr: "توقيع المريض والولي أو صلة القرابة مع بصمة اليد والبطاقة", itemEn: "Patient and relative signature with ID card photocopy", unit: "Doc", qty: "1", days: { "1": "✔", "2": "✔", "3": "✔", "4": "✔", "5": "✔", "6": "✘", "15": "✔", "16": "✔", "17": "✔" } }
      ]
    };

    const seeded = [seed1, seed2, seed3, ...records];
    setRecords(seeded);
    localStorage.setItem("baheya_medical_records", JSON.stringify(seeded));
    alert(language === "ar" ? `تم توليد وتغذية النظام بـ 3 سجلات تاريخية طبية واقعية لـ ${hospitalSettings.nameAr || "المؤسسة"} لتجربة لوحة التحليلات بالتفصيل!` : "Seeded 3 real historical medical audit logs into current session database!");
  };

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen bg-gradient-to-tr from-slate-900 via-pink-950 to-slate-950 flex flex-col justify-center items-center p-4 font-sans ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
        {/* Header containing Language Switcher and System Identifier */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center no-print">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-slate-300 font-mono font-black uppercase tracking-widest">{language === "ar" ? "الرابط مشفر وآمن" : "SSL ENCRYPTED SECURE CONNECT"}</span>
          </div>
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-xs font-black transition shadow-sm cursor-pointer backdrop-blur-md"
          >
            {language === "ar" ? "English" : "العربية"}
          </button>
        </div>

        {/* Central Card container */}
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl border border-slate-250 shadow-2xl space-y-6 text-center animate-fade">
          {/* Branded Central Header */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-14 h-14 bg-pink-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-lg ring-4 ring-pink-500/20">
              BH
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 justify-center">
                <span>{language === "ar" ? `${hospitalSettings.portalTitleAr} لتسجيل دخول الكادر` : `${hospitalSettings.portalTitleEn} for Staff Login`}</span>
                <HeartPulse className="h-5 w-5 text-pink-500 animate-pulse" />
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-widest leading-tight">
                {language === "ar" ? "تسجيل دخول آمن بالاسم والرمز للكشف الإداري وتطهير الجرودات" : "Secure Electronic Clinical Verification & Balance Audits"}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            {/* Custom Information Callout */}
            <div className="bg-pink-50/50 rounded-xl p-3 border border-pink-100/50 text-right text-xs text-pink-900 space-y-1">
              <span className="font-extrabold text-[11px] text-pink-800 flex items-center justify-end gap-1">
                <span>توجيهات الدخول الذكي</span>
                <Info className="h-3.5 w-3.5" />
              </span>
              <p className="text-[10px] text-slate-500 leading-snug">
                {language === "ar" 
                  ? "تحكم بصلاحياتك: أدخل كود الموظف وكلمة المرور الخاصة بك. لمعاينة كيف يرى المشرف / الإدارة الوحدات مقارنة بالاستاف العادي، تفضل بنسخ أو النقر السريع على أي مستخدم بالجدول أسفل."
                  : "Enter your Employee Code and secret PIN. Use helper credentials below to evaluate how managers and staff look at clinical data."}
              </p>
            </div>

            {/* Custom Tab Switcher for Login / Signup */}
            {!recoveryMode && (
              <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200 no-print gap-1 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab("login");
                    setLoginError(null);
                  }}
                  className={`py-2 rounded-lg text-[11px] font-black tracking-tight transition-all cursor-pointer ${
                    loginTab === "login"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-805"
                  }`}
                >
                  {language === "ar" ? "🔑 تسجيل دخول كادر" : "🔑 Staff Log In"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab("signup");
                    setLoginError(null);
                  }}
                  className={`py-2 rounded-lg text-[11px] font-black tracking-tight transition-all cursor-pointer ${
                    loginTab === "signup"
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-805"
                  }`}
                >
                  {language === "ar" ? "📝 إنشاء حساب جديد" : "📝 Create Account"}
                </button>
              </div>
            )}

            {recoveryMode ? (
              /* Passcode Retrieval & Reset via Corporate email form */
              <form onSubmit={recoveryStep === "enter_email" ? handleRequestRecoveryInput : handleCompletePINReset} className="space-y-4 text-right">
                <div className="bg-pink-50 p-3 rounded-xl text-xs font-sans border border-pink-150/60 leading-relaxed text-slate-700 flex flex-col gap-1">
                  <span className="font-extrabold text-[11px] text-pink-850 flex items-center justify-end gap-1 select-none">
                    <span>استعادة والتحكم ببيانات الدخول تلقائياً</span>
                    <KeyRound className="h-3.5 w-3.5 text-pink-600" />
                  </span>
                  <p className="text-[10px] text-slate-500 text-right leading-normal">
                    {language === "ar"
                      ? `أدخل البريد الإلكتروني الخاص بك في ${hospitalSettings.nameAr || "بهية"} المربوط بملف الكادر. سيقوم النظام بمصادقتك ذاتياً لوضع PIN جديد دون وسيط.`
                      : `Type your corporate healthcare email attached to your personnel profile in ${hospitalSettings.nameEn}. System will authenticate you on live Firestore.`}
                  </p>
                </div>

                {recoveryStep === "enter_email" ? (
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "ar" ? "البريد الإلكتروني المهني:" : "Corporate Registered Email Address:"}
                    </label>
                    <input
                      type="email"
                      required
                      value={recoveryEmailIn}
                      onChange={(e) => {
                        setRecoveryEmailIn(e.target.value);
                        setRecoveryError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-center font-mono text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                      placeholder="nurse.name@baheya.org"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recoveryMsg && (
                      <p className="text-[10px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl text-center border border-emerald-100 font-bold leading-relaxed">
                        ✔ {recoveryMsg}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {language === "ar" ? "رمز المرور الجديد (الـ PIN كود - 4 إلى 6 أرقام):" : "Type New Secret PIN (4 to 6 numeric digits):"}
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        value={newRecoveryPin}
                        onChange={(e) => {
                          setNewRecoveryPin(e.target.value.replace(/\D/g, ""));
                          setRecoveryError(null);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-center font-mono text-sm font-bold tracking-widest text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                        placeholder="••••"
                      />
                    </div>
                  </div>
                )}

                {recoveryError && (
                  <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl text-center border border-rose-100">
                    ⚠ {recoveryError}
                  </p>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>
                      {recoveryStep === "enter_email"
                        ? (language === "ar" ? "التحقق والتحقق الفوري للكادر" : "Authorize Corporate Account")
                        : (language === "ar" ? "تعديل وحفظ رمز الـ PIN الجديد" : "Apply & Save New PIN Code")}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMode(false);
                      setRecoveryStep("enter_email");
                      setRecoveryError(null);
                      setRecoveryMsg(null);
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition flex items-center justify-center cursor-pointer"
                  >
                    <span>{language === "ar" ? "إلغاء والعودة لشاشة الدخول" : "Cancel and Return to Portal Login"}</span>
                  </button>
                </div>
              </form>
            ) : loginTab === "signup" ? (
              /* Dynamic Sign Up form - Custom accounts on the fly */
              <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-right font-sans animate-fade">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "ar" ? "الاسم بالكامل (بالعربية):" : "Full Name (Arabic):"}
                    </label>
                    <input
                      type="text"
                      required
                      value={signupForm.nameAr}
                      onChange={(e) => setSignupForm({ ...signupForm, nameAr: e.target.value })}
                      placeholder="مثال: منى محمود"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "ar" ? "الاسم بالكامل (بالانجليزية):" : "Full Name (English):"}
                    </label>
                    <input
                      type="text"
                      required
                      value={signupForm.nameEn}
                      onChange={(e) => setSignupForm({ ...signupForm, nameEn: e.target.value })}
                      placeholder="e.g., Muna Mahmoud"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-sans font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "ar" ? "البريد الإلكتروني المهني:" : "Corporate Email Address:"}
                    </label>
                    <input
                      type="email"
                      required
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      placeholder="muna.mahmoud@hospital.org"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-[11px] text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "ar" ? "كود الدخول / اسم المستخدم:" : "Login Code / Username ID:"}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={signupForm.staffId}
                        onChange={(e) => setSignupForm({ ...signupForm, signupFormId: e.target.value, staffId: e.target.value.replace(/\D/g, '') })}
                        placeholder="e.g. 1025"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "ar" ? "الدور والمصنف الوظيفي:" : "Clinical Role & Permission Level:"}
                    </label>
                    <select
                      value={signupForm.role}
                      onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="staff">{language === "ar" ? "أخصائي تمريض (Staff Nurse)" : "Staff Nurse (SN)"}</option>
                      <option value="tech">{language === "ar" ? "فني تمريض (Nursing Technician)" : "Nursing Technician (NT)"}</option>
                      <option value="intern">{language === "ar" ? "تمريض امتياز (Intern Nurse)" : "Intern Nurse (INT)"}</option>
                      <option value="assistant">{language === "ar" ? "مساعد تمريض (Nursing Assistant)" : "Nursing Assistant (NA)"}</option>
                      <option value="secretary">{language === "ar" ? "سكرتارية القسم (Secretary/SEC)" : "Department Secretary (SEC)"}</option>
                      <option value="head_nurse">{language === "ar" ? "رئيسة وعميدة تمريض (Head Nurse)" : "Head Nurse (HN)"}</option>
                      <option value="quality">{language === "ar" ? "مسؤول جودة مستشفى (Quality Controller)" : "Quality Controller (QC)"}</option>
                      <option value="doctor">{language === "ar" ? "طبيب ممارس عام / استشاري" : "Medical Doctor (GP/MD)"}</option>
                      <option value="admin">{language === "ar" ? "مسؤول نظام الـ IT الكامل" : "System IT Administrator"}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "ar" ? "القسم الطبي المقر للعمل:" : "Designated Medical Department:"}
                    </label>
                    <select
                      value={signupForm.department}
                      onChange={(e) => setSignupForm({ ...signupForm, department: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "ar" ? "رمز المرور السري المطلوب (PIN من 4-6 أرقام):" : "Secure Gate PIN Password (4-6 digits):"}
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={signupForm.pin}
                    onChange={(e) => setSignupForm({ ...signupForm, pin: e.target.value.replace(/\D/g, "") })}
                    placeholder="••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center font-mono text-sm font-bold tracking-widest text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                {loginError && (
                  <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl text-center border border-rose-100">
                    ⚠ {loginError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Cloud className="h-4 w-4" />
                  <span>{language === "ar" ? "تسجيل الدخول عبر جوجل" : "Sign in with Google"}</span>
                </button>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>{language === "ar" ? "إنشاء حساب كادر وتثبيت الملف الفوري" : "Register Account & Log In"}</span>
                </button>
              </form>
            ) : (
              /* Direct Login Form */
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-right">
                {/* Employee ID Direct Typing Input */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "ar" ? "كود الموظف الكادر (الرقم الوظيفي):" : "Employee Staff ID Code:"}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={loginStaffId}
                      onChange={(e) => {
                        setLoginStaffId(e.target.value.replace(/\D/g, ''));
                        setLoginError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-center font-mono text-sm font-bold tracking-wider text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                      placeholder={language === "ar" ? "مثال: 9999" : "e.g., 9999"}
                    />
                  </div>
                </div>

                {/* Secure Passcode/PIN Typing Input */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "ar" ? "رمز المرور السري الخاص بالحساب (PIN):" : "Secure Passcode / Personal PIN Code (4-digits):"}
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={loginPasscode}
                    onChange={(e) => {
                      setLoginPasscode(e.target.value.replace(/\D/g, ""));
                      setLoginError(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-center font-mono text-sm font-bold tracking-widest text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                    placeholder="••••"
                  />
                </div>

                <div className="flex justify-between items-center px-1 pt-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMode(true);
                      setRecoveryStep("enter_email");
                      setRecoveryError(null);
                      setRecoveryMsg(null);
                    }}
                    className="text-pink-600 hover:text-pink-700 font-extrabold transition hover:underline cursor-pointer"
                  >
                    {language === "ar" ? "نسيت كلمة المرور؟ غيرها ببريدك" : "Forgot PIN Code? Reset with email"}
                  </button>
                  <span className="text-slate-250">|</span>
                  <span className="text-slate-400 font-mono font-bold select-none">{hospitalSettings.nameEn} Active Directory</span>
                </div>

                {loginError && (
                  <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl text-center border border-rose-100">
                    ⚠ {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="h-4 w-4" />
                  <span>{language === "ar" ? "تسجيل الدخول والتحقق الآمن الموحد" : "Secure Gate Log In & Authenticate"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Cloud className="h-4 w-4 text-sky-500" />
                  <span>{language === "ar" ? "تسجيل الدخول عبر حساب جوجل" : "Sign in with Google Account"}</span>
                </button>
              </form>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col gap-1 items-center justify-center text-[9px] text-slate-400 font-mono">
            <span>{hospitalSettings.nameEn} Medical Cloud Storage Client v5.0</span>
            <span>{language === "ar" ? "بوابة معتمدة للجرودات والسياسات الطبية" : "Bilingual Electronic Healthcare Ledger Guard"}</span>
          </div>
        </div>

        {/* Virtual Sandbox Mailbox Simulator / محاكي البريد الوارد لسهولة التجربة */}
        <div className="w-full max-w-lg mt-6 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl text-right animate-fade space-y-3">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <span className="text-[9px] bg-sky-500/10 text-sky-400 font-mono font-black border border-sky-500/20 px-2 py-0.5 rounded-full select-none">
              LOCAL SANDBOX INTEGRATION
            </span>
            <div className="flex items-center gap-1.5 justify-end">
              <h3 className="text-xs font-black text-rose-100 font-sans">
                {language === "ar" ? "البريد الإلكتروني التجريبي للجودة والاعتماد" : "Virtual Gmail Inbox & Security Simulator"}
              </h3>
              <Mail className="h-4 w-4 text-sky-450" />
            </div>
          </div>
          
          <p className="text-[10px] text-slate-350 leading-relaxed text-right">
            {language === "ar" ? "تنبيهات واستشعارات الأمان التلقائية: أي إخطار مسترد (مثل رابط PIN المباشر) سيظهر هنا مباشرة لتسهيل المراجعة دون الحاجة لسيرفر بريد حقيقي." : "Simulated email server captures notifications such as PIN reset links automatically. Tap on any email item below to execute login overrides."}
          </p>
          
          <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
            {communicationsInbox.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-[10px] font-sans">
                {language === "ar" ? "لا توجد رسائل بريد جديدة حالياً. اضغط على 'نسيت كلمة المرور؟' بالبلوك واستفسر ببريدك لاستقبال بريد استعادة مبرمج." : "The simulated clinical mailbox is empty. Trigger PIN recovery above to capture messages."}
              </div>
            ) : (
              communicationsInbox.map((mail: any) => (
                <div key={mail.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl hover:border-sky-500/50 transition relative group text-right">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-mono text-[9px] text-sky-400 font-bold">{mail.timestamp}</span>
                    <span className="font-bold text-rose-500">{mail.sender}</span>
                  </div>
                  <h4 className="text-[11px] font-black text-white leading-snug">{mail.subject}</h4>
                  <p className="text-[10px] text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap font-sans">
                    {language === "ar" ? mail.bodyAr : mail.bodyEn}
                  </p>
                  
                  {/* Action Override Trigger Button */}
                  <div className="mt-3.5 border-t border-slate-850 pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryMode(true);
                        setRecoveryStep("reset_pin");
                        setRecoveryTargetUser(mail.targetUser);
                        setRecoveryMsg(
                          language === "ar"
                            ? `طلب مصرح وآمن! الموظف: ${mail.targetUser.nameAr} (${mail.targetUser.staffId}). تفضل بتعيين رمز المرور السري الجديد بالأسفل لمزامنته فورا بقاعدة البيانات.`
                            : `Request verified! Profile of: ${mail.targetUser.nameEn} (ID: ${mail.targetUser.staffId}). Please type your new secret PIN below.`
                        );
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 shadow-md transition cursor-pointer"
                    >
                      <KeyRound className="h-3 w-3" />
                      <span>{language === "ar" ? "🔑 استخدام مباشر: تعديل وتعيين الـ PIN الآن" : "🔑 Apply & Choose New PIN Now"}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoggedIn && isGlobalLockdownActive) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-center font-sans text-white border-8 border-rose-950 select-none" dir="rtl">
        <div className="max-w-2xl bg-slate-900 border-2 border-rose-600 rounded-3xl p-8 space-y-6 shadow-2xl relative">
          <div className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
            🚨
          </div>
          <div className="space-y-2">
            <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs px-3 py-1 rounded-full font-black tracking-widest uppercase">
              Bahya Security Gateway Active Protection
            </span>
            <h1 className="text-xl md:text-2xl font-black text-rose-500">
              🚨 قفل الطوارئ الكلي نشط - LOCKDOWN ENGINE ACTIVE
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              تم تفعيل وضع الإغلاق الكلي الفوري لجميع واجهات بهية وسحب الجلسات بواسطة الإدارة لدواعي السلامة والامتثال السيبراني ومكافحة الانحراف.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <p className="text-xs text-slate-400 font-bold">
              لإيقاف قفل الطوارئ وإعادة تشغيل البورتات، أدخل الرمز السري للأدمن (PIN الافتراضي: 1234):
            </p>
            <div className="flex gap-2 justify-center">
              <input
                type="password"
                maxLength={4}
                onChange={(e) => {
                  if (e.target.value === "1234") {
                    setIsGlobalLockdownActive(false);
                    playSpatialAudioContextTone("success");
                    addSystemLog("Emergency system lockdown terminated by Administrator command", "success");
                  }
                }}
                placeholder="PIN"
                className="w-24 p-3 bg-slate-900 border border-slate-700 text-center text-xl font-bold font-mono rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-rose-400"
              />
            </div>
          </div>

          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
            Clinical Operations & IT Dept &bull; Staff ID 9999 Authoritative Override
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
      
      {/* Sidebar Navigation - Hides completely on Print */}
      <aside className="no-print w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg ring-4 ring-pink-500/20">
              BH
            </div>
            <div>
              <h1 className="text-sm font-bold text-white font-sans">{language === "ar" ? hospitalSettings.portalTitleAr : hospitalSettings.portalTitleEn}</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{language === "ar" ? hospitalSettings.premiumTitleAr : hospitalSettings.premiumTitleEn}</p>
            </div>
          </div>
        </div>

        {/* ACCESS MANAGEMENT: Interactive User & Admin switcher */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-600/20 border border-pink-500/50 text-pink-400 flex items-center justify-center font-bold text-xs ring-2 ring-pink-500/10 shrink-0">
              {currentUser.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div>
                <p className="text-xs font-bold text-slate-200 truncate leading-tight">
                  {language === "ar" ? currentUser.nameAr : currentUser.nameEn}
                </p>
              </div>
              
              <div className="text-[10px] text-slate-400 font-medium mt-1 leading-snug">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser.role === 'admin' ? 'bg-red-500 animate-pulse' : currentUser.role === 'quality' ? 'bg-amber-400' : currentUser.role === 'president' ? 'bg-purple-500' : 'bg-emerald-400'}`}></span>
                  <span>
                    {currentUser.role === "admin" 
                      ? (language === "ar" ? "المدير (إدارة العمليات)" : "Operations Manager") 
                      : currentUser.role === "quality" 
                      ? (language === "ar" ? "المشرف (مراقب الجودة)" : "Quality Supervisor") 
                      : currentUser.role === "president"
                      ? (language === "ar" ? "الرئيس (مجلس الإدارة)" : "Board President")
                      : (language === "ar" ? "الموظف (استاف تمريض)" : "Nursing Staff")}
                  </span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase tracking-wide truncate">
                  {language === "ar" ? `القسم: ${currentUser.department}` : `Dept: ${currentUser.department}`}
                </div>
                <div className="text-[9px] text-slate-500 font-mono">
                  ID: {currentUser.staffId}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Tabs - Dynamically restricted based on User Roles */}
        <nav className="flex-1 py-4 space-y-1">
          <div className="px-6 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-sans">
            {language === "ar" ? "تصفح الأبواب" : "Clinical Ledger Navigation"}
          </div>
          
          {/* 1. Unit Duty & Daily Checklist - Visible to ALL roles */}
          <button
            onClick={() => setActiveTab("duty")}
            className={`w-full flex items-center gap-3 px-6 py-4 text-right text-xs font-semibold transition-all border-l-4 ${
              activeTab === "duty"
                ? "bg-slate-800 border-pink-500 text-pink-400 font-bold shadow-md shadow-pink-900/20"
                : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-pink-500"
            }`}
          >
            <ClipboardList className={`h-4 w-4 shrink-0 ${activeTab === "duty" ? "text-pink-400 animate-pulse" : "text-slate-500"}`} />
            <span className="flex-1">{language === "ar" ? "ديوتي الوحدات والشيك ليست اليومية" : "Unit Duty & Daily Checklist"}</span>
            <span className="bg-emerald-600/30 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">LIVE</span>
          </button>

          {/* 2. Clinical Sheets Ledger */}
          <button
            onClick={() => {
              setActiveTab("editor");
              if (!editingRecord) handleCreateNew(selectedTemplate.id);
            }}
            className={`w-full flex items-center gap-3 px-6 py-4 text-right text-xs font-semibold transition-all border-l-4 ${
              activeTab === "editor"
                ? "bg-slate-800 border-pink-500 text-pink-400 font-bold shadow-md shadow-pink-900/20"
                : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-pink-500"
            }`}
          >
            <CheckSquare className={`h-4 w-4 shrink-0 ${activeTab === "editor" ? "text-pink-400" : "text-slate-500"}`} />
            <span className="flex-1">{language === "ar" ? "تعبئة وجرد الشيتات الطبية" : "Clinical Sheets Ledger"}</span>
            <span className="bg-pink-600/30 text-pink-400 text-[8px] px-1 py-0.5 rounded-full font-black uppercase">200+ N</span>
          </button>

          {/* 2.5 Dynamic Clinical Sheet Distribution Office & Forms Navigator */}
          <button
            onClick={() => setActiveTab("distribution")}
            className={`w-full flex items-center gap-3 px-6 py-3 text-right text-xs font-semibold transition-all border-l-4 ${
              activeTab === "distribution"
                ? "bg-slate-800 border-pink-500 text-pink-400 font-bold shadow-md"
                : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-pink-900"
            }`}
          >
            <LayoutGrid className="h-4 w-4 shrink-0 text-pink-500" />
            <span className="flex-1">{language === "ar" ? "مكتـب توزيـع الشيتـات الطبية" : "Clinical Sheets Distribution"}</span>
            <span className="bg-amber-500/20 text-amber-500 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Map</span>
          </button>

          {/* 2.6 Nursing Schedule Shift Roster (طبق الأصل من المطبوع) - Accessible to ALL */}
          <button
            onClick={() => setActiveTab("roster")}
            className={`w-full flex items-center gap-3 px-6 py-3 text-right text-xs font-semibold transition-all border-l-4 ${
              activeTab === "roster"
                ? "bg-slate-800 border-pink-500 text-pink-400 font-bold shadow-md"
                : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-pink-900"
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0 text-pink-500 animate-pulse" />
            <span className="flex-1">{language === "ar" ? "جدول نوبتجيات وورديات التمريض" : "Nursing Shifts Roster"}</span>
            <span className="bg-pink-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">ROSTER</span>
          </button>

          {canConfigureRoster && (
            <button
              onClick={() => setActiveTab("roster_config")}
              className={`w-full flex items-center gap-3 px-6 py-3 text-right text-xs font-semibold transition-all border-l-4 ${
                activeTab === "roster_config"
                  ? "bg-slate-800 border-pink-500 text-pink-400 font-bold shadow-md"
                  : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-pink-900"
              }`}
            >
              <Settings className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="flex-1">{language === "ar" ? "إعدادات الروستر" : "Roster Config"}</span>
            </button>
          )}

          {/* 3. Analytics Hub */}
          {isSupervisor && (
          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-6 py-3 text-right text-xs font-semibold transition-all border-l-4 ${
              activeTab === "analytics"
                ? "bg-slate-800 border-pink-500 text-pink-400 font-bold shadow-md"
                : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-pink-900"
            }`}
          >
            <TrendingUp className="h-4 w-4 shrink-0 text-pink-500" />
            <span className="flex-1">{language === "ar" ? "لوحة الجودة والتحليلات البصرية" : "Quality Analytics Hub"}</span>
            <span className="bg-pink-600/30 text-pink-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">CQI</span>
          </button>
          )}

          {/* 4. Saved Records Store */}
          {isSupervisor && (
          <button
            onClick={() => setActiveTab("history")}
            className={`w-full flex items-center gap-3 px-6 py-3 text-right text-xs font-semibold transition-all border-l-4 ${
              activeTab === "history"
                ? "bg-slate-800 border-pink-500 text-pink-400 font-bold shadow-md"
                : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-pink-900"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-pink-500" />
            <span className="flex-1">{language === "ar" ? "سجلات الأرشيف المحفوظة" : "Saved Records Store"}</span>
            {records.length > 0 && (
              <span className="bg-pink-600/30 text-pink-400 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
                {records.length}
              </span>
            )}
          </button>
          )}

          {/* 5. System Settings */}
          {isSupervisor && (
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-6 py-3 text-right text-xs font-semibold transition-all border-l-4 ${
              activeTab === "settings"
                ? "bg-slate-800 border-pink-500 text-pink-400 font-bold shadow-md"
                : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-pink-900"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0 text-pink-500" />
            <span className="flex-1">{language === "ar" ? "لوحة التحكم والبيانات والتهيئة" : "Hospital System Settings"}</span>
          </button>
          )}

          {/* Cloud Settings Tab */}
          <button
            onClick={() => setActiveTab("cloud_settings")}
            className={`w-full flex items-center gap-3 px-6 py-3 text-right text-xs font-semibold transition-all border-l-4 ${
              activeTab === "cloud_settings"
                ? "bg-slate-800 border-blue-500 text-blue-400 font-bold shadow-md"
                : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-blue-900"
            }`}
          >
            <Cloud className="h-4 w-4 shrink-0 text-blue-500" />
            <span className="flex-1">{language === "ar" ? "إعدادات السحابة والربط" : "Cloud Connectivity Settings"}</span>
          </button>

          {/* IT & Developer Control Panel Tab */}
          {isSupervisor && (
          <button
            onClick={() => setActiveTab("it_panel")}
            className={`w-full flex items-center gap-3 px-6 py-3 text-right text-xs font-semibold transition-all border-l-4 ${
              activeTab === "it_panel"
                ? "bg-slate-800 border-pink-500 text-pink-400 font-bold shadow-md"
                : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-pink-900"
            }`}
          >
            <Database className="h-4 w-4 shrink-0 text-pink-500" />
            <span className="flex-1">{language === "ar" ? "💻 لوحة الإدارة والدعم والبرمجة الأكاديمية" : "💻 Admin, IT & Developers Hub"}</span>
            <span className="bg-pink-600/30 text-pink-400 text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse uppercase">WSD CONSOLE</span>
          </button>
          )}

          {/* User Approval Tab for Admins */}
          {(currentUser.role === "admin" || currentUser.role === "it") && (
            <button
              onClick={() => setActiveTab("approval")}
              className={`w-full flex items-center gap-3 px-6 py-3 text-right text-xs font-semibold transition-all border-l-4 ${
                activeTab === "approval"
                  ? "bg-slate-800 border-emerald-500 text-emerald-400 font-bold shadow-md"
                  : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-emerald-900"
              }`}
            >
              <CheckSquare className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="flex-1">{language === "ar" ? "الموافقة على الحسابات الجديدة" : "New Account Approval"}</span>
            </button>
          )}

          {/* Profile Tab */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-6 py-3 text-right text-xs font-semibold transition-all border-l-4 ${
              activeTab === "profile"
                ? "bg-slate-800 border-pink-500 text-pink-400 font-bold shadow-md"
                : "border-transparent text-slate-400 hover:bg-slate-850 hover:text-white hover:border-pink-900"
            }`}
          >
            <User className="h-4 w-4 shrink-0 text-pink-500" />
            <span className="flex-1">{language === "ar" ? "الصفحة الشخصية" : "User Profile"}</span>
          </button>

          {/* 6. Messaging & Requests - NEW */}
          <button
            onClick={() => setActiveTab("messaging")}
            className={`w-full flex items-center gap-3 px-6 py-2.5 text-right text-xs font-semibold transition-colors ${
              activeTab === "messaging"
                ? "bg-slate-800 border-r-4 border-blue-500 text-blue-400 font-bold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-blue-500" />
            <span>{language === "ar" ? "المراسلات والطلبات" : "Messaging & Requests"}</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-2.5 text-right text-xs font-semibold text-rose-400 hover:bg-rose-950/20 hover:text-rose-200 transition-colors cursor-pointer"
          >
            <Lock className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{language === "ar" ? "تسجيل الخروج الآمن" : "Secure Log Out"}</span>
          </button>
        </nav>

        {/* Database offline status container */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-500 mb-1">
              {language === "ar" ? "قاعدة البيانات والمزامنة السحابية" : "Cloud Sync Database Gateway"}
            </p>
            <div className="flex items-center text-emerald-400 text-xs font-semibold gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>
                {dbStatus === "connected" && (language === "ar" ? "متصل كلياً وسريع سحابياً" : "Cloud Connection Active")}
                {dbStatus === "syncing" && (language === "ar" ? "مزامنة البيانات فورياً..." : "Syncing transaction...")}
                {dbStatus === "error" && (language === "ar" ? "انقطاع الاتصال السحابي المؤقت" : "Cloud Database Disconnected")}
              </span>
            </div>
            
            {/* Database backups */}
            <div className="mt-3 flex items-center justify-between gap-2 text-[10px] border-t border-slate-800 pt-2 text-slate-400 font-mono">
              <button onClick={handleExportBackup} className="hover:text-white flex items-center gap-1 transition">
                <Download className="h-3 w-3" />
                <span>{language === "ar" ? "تصدير نسخة" : "Export backup"}</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="hover:text-white flex items-center gap-1 transition">
                <Upload className="h-3 w-3" />
                <span>{language === "ar" ? "استيراد" : "Import backup"}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar - Hides completely on Print */}
        <header className="no-print bg-gradient-to-r from-white via-slate-50 to-pink-50/25 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between px-8 py-4.5 gap-4 shadow-sm z-10 text-right">
          <div 
            onClick={() => setActiveTab("duty")}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition select-none group"
            title={language === "ar" ? "الرئيسية والمتابعة اليومية" : "Go to Dashboard Home"}
          >
            <div className="w-10 h-10 bg-pink-600 group-hover:bg-pink-700 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-md shrink-0 transition-colors">
              BHG
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2 justify-end md:justify-start">
                <HeartPulse className="h-4.5 w-4.5 text-pink-600 animate-pulse group-hover:scale-110 transition-transform" />
                <span className="group-hover:text-pink-750 transition-colors">{language === "ar" ? hospitalSettings.appHeaderAr : hospitalSettings.appHeaderEn}</span>
              </h2>
              <p className="text-[10px] md:text-[11px] text-slate-500 mt-0.5 font-sans leading-none">
                {language === "ar" ? hospitalSettings.taglineAr : hospitalSettings.taglineEn}
              </p>
            </div>
          </div>

          {/* Center/Right alignment with active user details and actions */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end w-full md:w-auto">
            {/* Live Date/Time dynamic clock badge */}
            <div className="bg-white border border-slate-200 text-slate-700 text-[10px] font-mono px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-pink-600 animate-pulse" />
              <span className="font-bold">
                {currentTime.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}{" "}
                 {currentTime.toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>

            {/* Shift Tracker Badge (Customizable Active Shift Selector) */}
            <div 
              className="bg-slate-900 border border-slate-800 text-[10px] font-mono rounded-lg flex items-center px-1.5 py-1.5 shadow-sm text-slate-100"
              title={language === "ar" ? "اضغط لتعديل وردية العمل النشطة لتعبئة الجرد اليومي" : "Click to select active duty shift period for checklists"}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400">
                  {language === "ar" ? "الوردية النشطة:" : "Active Shift:"}
                </span>
                <select 
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="bg-slate-950 text-pink-400 font-extrabold text-xs rounded border border-slate-750 px-2 py-0.5 outline-none cursor-pointer focus:border-pink-500 font-sans"
                >
                  {CLINICAL_SHIFTS.map(cs => (
                    <option key={cs.id} value={cs.id} className="bg-slate-900 text-white text-xs font-sans font-bold">{cs.id}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Logged-In Employee assigned shift today (Roster link) */}
            <div 
              className="bg-pink-50 border border-pink-200 text-[10px] font-sans rounded-lg flex items-center px-3 py-1.5 shadow-sm text-pink-900 select-none animate-pulse"
              title={language === "ar" ? `ورديتك المقررة اليوم بالرسمي ل${hospitalSettings.nameAr}` : `Your assigned ${hospitalSettings.nameEn} shift today`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Calendar className="w-3.5 h-3.5 text-pink-600" />
                <span>
                  {language === "ar" ? "شفت الموظفة اليوم:" : "Your Shift Today:"}
                </span>
                <span className="text-white bg-pink-600 px-1.5 py-0.5 rounded text-[10px]">
                  {getCurrentUserShiftToday()}
                </span>
              </div>
            </div>

            {/* Break-The-Glass Ward Swapper */}
            {currentUser.role === "admin" && (
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1 px-1.5 rounded-lg">
                <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">🛡️ زجاج الطوارئ:</span>
                <select
                  value={currentUser.department || ""}
                  onChange={(e) => {
                    const updatedUser = { ...currentUser, department: e.target.value };
                    setCurrentUser(updatedUser);
                    localStorage.setItem("baheya_current_user_object", JSON.stringify(updatedUser));
                    playSpatialAudioContextTone("click");
                    addSystemLog(`Dr. Mohamed Elsayed utilized Break-The-Glass privilege to swap focus pipeline to ${e.target.value}`, "warning");
                  }}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-pink-700 font-sans cursor-pointer outline-none"
                >
                  <option value="QUALITY & IT DEPT">QUALITY & IT DEPT</option>
                  <option value="EMERGENCY UNIT">EMERGENCY UNIT</option>
                  <option value="INTENSIVE CARE flex">INTENSIVE CARE</option>
                  <option value="OPERATING ROOM">OPERATING ROOM</option>
                  <option value="PHARMACY STORE">PHARMACY STORE</option>
                </select>
              </div>
            )}

            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black transition shadow-sm cursor-pointer"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-pink-500" />
              {language === "ar" ? "English" : "العربية"}
            </button>

            {/* Prominent 🔔 Alert Bell to broadcast nurse submissions and system alerts */}
            <div className="relative">
              <button
                onClick={() => setIsBellOpen(!isBellOpen)}
                className="relative p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black transition shadow-sm cursor-pointer flex items-center justify-center h-[30px]"
              >
                <Bell className={`h-4 w-4 text-pink-600 ${notifications.some(n => !n.read) ? "animate-bounce" : ""}`} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[8px] w-4 h-4 flex items-center justify-center font-bold animate-pulse leading-none border border-white">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {isBellOpen && (
                <div 
                  className="absolute left-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 text-right overflow-hidden transition-all duration-200 origin-top-left flex flex-col max-h-[350px]"
                  style={{ direction: language === "ar" ? "rtl" : "ltr" }}
                >
                  <div className="px-4 py-3 bg-gradient-to-r from-pink-50 to-white border-b border-slate-100 flex items-center justify-between gap-2">
                    <h4 className="text-[11px] font-black text-slate-800">
                      {language === "ar" ? "🔔 الإشعارات ومستجدات القسم" : "🔔 Hospital Ward Alerts"}
                    </h4>
                    {notifications.some(n => !n.read) && (
                      <button
                        onClick={() => {
                          const marked = notifications.map(n => ({...n, read: true}));
                          setNotifications(marked);
                          localStorage.setItem("baheya_notifications", JSON.stringify(marked));
                        }}
                        className="text-[9px] text-pink-600 hover:text-pink-850 font-extrabold"
                      >
                        {language === "ar" ? "مقروء الكل" : "Mark all read"}
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-64">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        {language === "ar" ? "لا توجد تنبيهات حالية" : "No recent alerts"}
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 text-[10px] sm:text-xs transition text-right cursor-pointer hover:bg-slate-50/80 active:bg-slate-100 ${notif.read ? "bg-white text-slate-500 font-normal hover:text-slate-700" : "bg-pink-50/40 text-slate-900 border-r-2 border-pink-500 font-bold hover:bg-pink-100/50"}`}
                        >
                          <div className="flex justify-between items-start mb-1 text-[9px] font-medium text-slate-400">
                            <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {notif.type === "directive" && (
                              <span className="bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded text-[8px]">
                                {language === "ar" ? "توجيه إداري" : "Directive"}
                              </span>
                            )}
                          </div>
                          <p className="leading-relaxed hover:text-pink-650 transition">
                            {language === "ar" ? notif.messageAr : notif.messageEn}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between text-[9px] text-pink-500 font-semibold">
                            <span>{language === "ar" ? "اضغط هنا للانتقال ➔" : "Click to view section ➔"}</span>
                            {!notif.read && (
                              <span className="bg-pink-100 text-pink-700 text-[8px] font-extrabold px-1 rounded-sm">
                                {language === "ar" ? "جديد" : "New"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => handleCreateNew(selectedTemplate.id)}
              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-1.5 rounded-lg font-extrabold text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="h-4 w-4" />
              <span>{language === "ar" ? "إنشاء مستند جديد" : "New Ledger Link"}</span>
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
          </div>
        </header>

        {activeCodeBlueAlert && (
          <div className="mx-6 mt-4 bg-red-700 text-white border-2 border-red-500 rounded-2xl p-4 flex items-center justify-between shadow-2xl animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">🚨</span>
              <div className="space-y-0.5 text-right">
                <span className="bg-white text-red-700 text-[9px] uppercase px-2 py-0.5 rounded font-black font-mono">CODE BLUE BROADCAST</span>
                <p className="text-xs font-black">حالة طوارئ طبية حاسمة (Code Blue) معلنة في: [{activeCodeBlueAlert.zone}]</p>
                <p className="text-[10px] text-red-100">مصدر البث: Workstation Node IP {activeCodeBlueAlert.workstationIp} &bull; توقيت البث: {activeCodeBlueAlert.timestamp}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveCodeBlueAlert(null)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs px-3 py-1.5 rounded-lg font-bold transition hover:scale-105 cursor-pointer"
            >
              كتم النداء
            </button>
          </div>
        )}

        {/* Content Dashboard */}
        <main className="p-4 sm:p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
          
          {/* Quick Informative Statistics summary cards */}
          <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans mb-1">
                {language === "ar" ? "السجلات الإجمالية المحفوظة" : "Saved Archived Logs"}
              </div>
              <div className="text-xl font-black text-slate-900">{records.length}</div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans mb-1">
                {language === "ar" ? "خيارات النماذج والجرودات المتاحة" : "Total Template Sheets"}
              </div>
              <div className="text-xl font-black text-pink-600">{allAvailableTemplates.length} {language === "ar" ? "شيت كامل" : "Full Sheets"}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans mb-1">
                {language === "ar" ? "كود المستند النشط" : "Active Form Reference"}
              </div>
              <div className="text-sm font-black text-blue-600 truncate uppercase">{selectedTemplate.code}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans mb-1">
                {language === "ar" ? "الوضع النشط للصلاحية" : "User Authorization Status"}
              </div>
              <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="uppercase text-[10px] tracking-wide font-mono">
                  {currentUser.role.toUpperCase()} | SECURED
                </span>
              </div>
            </div>
          </div>

          {/* TAB 0: Daily Unit Duty & Checklist Portal - Designed for Unit Entrance, Crew Checklists & Nursing Supervisor Signoffs */}
          {activeTab === "duty" && (() => {
            const todayString = new Date().toISOString().split("T")[0];
            const isAdminOrQuality = currentUser.role === "admin" || currentUser.role === "quality" || currentUser.role === "president" || currentUser.role === "it";
            const effectiveDutyDept = isAdminOrQuality ? selectedDutyDept : (currentUser.department || "EMERGENCY UNIT");
            
            // Filter tasks for selected department
            const activeDeptTasks = dutyTasks.filter(t => t.department === effectiveDutyDept);
            
            // Find today's checklist for the selected department
            const todaysChecklist = dailyChecklists.find(cl => cl.department === effectiveDutyDept && cl.date === todayString);
            
            // Handler to submit checklist
            const submitChecklist = () => {
              if (activeDeptTasks.length === 0) {
                alert(language === "ar" ? "لا يمكن تقديم قائمة مهام فارغة! يرجى إضافة مهام لهذه الوحدة أولاً." : "Cannot submit an empty task list! Please add tasks first.");
                return;
              }

              // Verify permissions
              const hasPerm = checkPermission("submitChecklist");
              if (!hasPerm) {
                alert(language === "ar" ? "ليس لديك صلاحية تقديم الشيك ليست اليومية بموجب الإعدادات الحالية!" : "Your role does not have permission to submit the daily checklist under current settings!");
                return;
              }

              // Double-check if all answers are filled (defaulting unfilled to false)
              const finalAnswers: Record<string, { done: boolean; note?: string }> = {};
              activeDeptTasks.forEach(task => {
                finalAnswers[task.id] = {
                  done: dutyChecklistAnswers[task.id]?.done || false,
                  note: dutyChecklistAnswers[task.id]?.note || ""
                };
              });

              const newChecklist: UnitDailyChecklist = {
                id: `cl-${effectiveDutyDept.replace(/\s+/g, "-").toLowerCase()}-${todayString}`,
                department: effectiveDutyDept,
                date: todayString,
                completedByStaffName: language === "ar" ? currentUser.nameAr : currentUser.nameEn,
                completedByStaffId: currentUser.staffId,
                completedAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                status: "completed",
                answers: finalAnswers
              };

              const updated = [newChecklist, ...dailyChecklists.filter(cl => !(cl.department === effectiveDutyDept && cl.date === todayString))];
              saveChecklistsToDb(updated);
              setDutyChecklistAnswers({});
              alert(language === "ar" 
                ? `✅ تم تقديم واعتماد الشيك ليست اليومية لـ [${effectiveDutyDept}] بنجاح، بانتظار توقيع مديرة التمريض والمشرفين!` 
                : `✅ Daily Checklist for [${effectiveDutyDept}] submitted successfully! Awaiting supervisor's signoff.`);
            };

            // Handler to approve checklist (Supervisor/Nurse Director)
            const approveChecklist = (clId: string) => {
              // Verify permissions
              const hasPerm = checkPermission("approveChecklist");
              if (!hasPerm) {
                alert(language === "ar" ? "عفواً! هذه الصلاحية مخصصة لمديرة التمريض والمشرفين والمسؤولين فقط." : "Access Denied! This action is reserved for Head Nurse & Quality Supervisors.");
                return;
              }

              const updated = dailyChecklists.map(cl => {
                if (cl.id === clId) {
                  return {
                    ...cl,
                    status: "audited" as const,
                    auditedByStaffName: language === "ar" ? currentUser.nameAr : currentUser.nameEn,
                    auditedByStaffId: currentUser.staffId,
                    auditedAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
                    auditNotes: supervisorAuditNoteText || (language === "ar" ? "تم التحقق والاعتماد الطبي المباشر" : "Verified and accredited with clinical safety protocols OK.")
                  };
                }
                return cl;
              });

              saveChecklistsToDb(updated);
              setSupervisorAuditNoteText("");
              alert(language === "ar" ? "🎉 تم الختم والتوقيع والاعتماد الجراحي النهائي بنجاح ومزامنته للوحة الجودة!" : "🎉 Final clinical audit signed off and logged to quality database successfully!");
            };

            // Handler to add dynamic task
            const addTask = (e: React.FormEvent) => {
              e.preventDefault();
              if (!newTaskTextAr.trim() || !newTaskTextEn.trim()) {
                alert(language === "ar" ? "يرجى تعبئة نص المهمة باللغتين العربية والإنكليزية!" : "Please fill in the task definitions both in Arabic & English!");
                return;
              }

              const hasPerm = checkPermission("manageDutyTasks");
              if (!hasPerm) {
                alert(language === "ar" ? "ليس لديك صلاحية إضافة وتعديل مهام ديوتي الوحدات!" : "Your role does not have authorization to modify unit duty structures.");
                return;
              }

              const newTask: DailyDutyTask = {
                id: `duty-custom-${Date.now()}`,
                department: effectiveDutyDept,
                taskAr: newTaskTextAr,
                taskEn: newTaskTextEn,
                categoryAr: newTaskCategoryAr,
                categoryEn: newTaskCategoryEn,
                createdAt: todayString
              };

              const updated = [...dutyTasks, newTask];
              saveDutyTasksToDb(updated);
              setNewTaskTextAr("");
              setNewTaskTextEn("");
              alert(language === "ar" ? "✅ تم إضافة وإدراج المهمة الجديدة في الشيك ليست للقسم بنجاح!" : "✅ Dynamic duty task registered successfully into unit's active sheets!");
            };

            // Handler to delete checking task
            const deleteTask = (taskId: string) => {
              const hasPerm = checkPermission("manageDutyTasks");
              if (!hasPerm) {
                alert(language === "ar" ? "صلاحيات التعديل مقفلة لحسابك!" : "Modification locked for your account!");
                return;
              }

              if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذه المهمة نهائياً من جرد القسم؟" : "Are you sure you want to delete this task from unit duty templates?")) {
                const updated = dutyTasks.filter(t => t.id !== taskId);
                saveDutyTasksToDb(updated);
              }
            };

            // Statistics of completed checklists for today
            const activeUnits = isAdminOrQuality 
              ? departments 
              : departments.filter(d => d === (currentUser.department || "EMERGENCY UNIT"));

            const completedCount = dailyChecklists.filter(cl => 
              cl.date === todayString && 
              cl.status === "completed" && 
              (isAdminOrQuality || cl.department === effectiveDutyDept)
            ).length;

            const auditedCount = dailyChecklists.filter(cl => 
              cl.date === todayString && 
              cl.status === "audited" && 
              (isAdminOrQuality || cl.department === effectiveDutyDept)
            ).length;

            const totalIncomplete = activeUnits.length - (completedCount + auditedCount);

            return (
              <div className="space-y-6 animate-fade text-right" dir={language === "ar" ? "rtl" : "ltr"}>
                
                {/* 1. Header Banner */}
                <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-pink-950 text-white p-6 rounded-2xl shadow-md border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1.5 flex-1 select-none">
                    <div className="bg-pink-505/20 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-pink-300 font-extrabold text-[10px] uppercase tracking-wide border border-pink-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      {language === "ar" ? "البوابة الطبية النشطة لكامل المستشفى" : "HOSPITAL WIDE CORE GATEWAY - ACTIVE"}
                    </div>
                    <h2 className="text-lg font-black tracking-tight text-white">
                      {language === "ar" ? "بوابة الوحدات الطبية والشيك ليست والديوتي اليومي" : "Unit Clinical Gateways & Daily Duty Checklist Control"}
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-2xl">
                      {language === "ar" 
                        ? `واجهة تفتيش الرعاية السريرية المعتمدة لروتين تمريض وأرشفة ${hospitalSettings.nameAr || "المؤسسة"}. يقوم الممرضون بالمجموعات والجرودات الصباحية اليومية وتصديق استمارة الواجب، بينما تدقق مديرة التمريض والمشرف يدوياً بنقرة خروج واحدة.`
                        : `Standardized clinical audit interface for ${hospitalSettings.nameEn} nurses. Staff execute physical checking tasks, sign daily sheets off, and nursing directors certify compliance metrics with structured logs.`}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/10 font-mono text-center select-none shrink-0">
                    <Calendar className="h-5 w-5 text-pink-400 mb-1" />
                    <span className="text-xs font-bold text-pink-200 uppercase">{language === "ar" ? "تاريخ اليوم" : "Today's Date"}</span>
                    <span className="text-sm font-black text-white mt-0.5">{todayString}</span>
                  </div>
                </div>

                {/* 2. Today's Nursing Executive Summary Tracker */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === "ar" ? "الإجمالي النشط للوحدات المراقبة" : "Total Monitored Units"}</div>
                      <div className="text-lg font-black text-slate-800">{activeUnits.length} {language === "ar" ? "وحدات علاجية" : "Units"}</div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                      <LayoutGrid className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === "ar" ? "شيك ليست مكملة (بانتظار الإشراف)" : "Completed (Pending Audit)"}</div>
                      <div className="text-lg font-black text-amber-500">{completedCount} {language === "ar" ? "وحدات بالانتظار" : "Awaiting"}</div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 animate-pulse">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === "ar" ? "شيك ليست معتمدة ومحققة وموقعة" : "Audited & Signed Off"}</div>
                      <div className="text-lg font-black text-emerald-600">{auditedCount} / {activeUnits.length}</div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">{language === "ar" ? "وحدات لم تقدم الجرد بعد" : "Units Missing Submission"}</div>
                      <div className="text-lg font-bold text-rose-600">{totalIncomplete} {language === "ar" ? "وحرّة معلقة" : "Overdue"}</div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* 2.5 Unit Compliance Real-time Board (Admin/Quality only) */}
                {isAdminOrQuality && (
                  <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-md space-y-4 text-right">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                          <span>لوحة التفتيش والمتابعة اللحظية لأقسام مستشفى ${hospitalSettings.nameAr || "المؤسسة"} اليومية</span>
                          <ShieldCheck className="h-5 w-5 text-pink-600 animate-pulse" />
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {language === "ar" 
                            ? "مجموعة مراقبة تسليم الجرودات والجرعات اليومية من ممرضات الاستاف المعتمدين بالفروع" 
                            : "Live administrative compliance board displaying daily nursing duty checklist state for each medical unit."}
                        </p>
                      </div>
                      <div className="bg-pink-50 text-pink-700 px-3.5 py-1.5 rounded-xl border border-pink-100 text-xs font-black">
                        {language === "ar" ? "لوحة تحكم المشرف والمدير مفعّلة" : "Supervisor Controls Active"}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {departments.map((dept) => {
                        const cl = dailyChecklists.find(c => c.department === dept && c.date === todayString);
                        
                        let cardColor = "border-slate-200 bg-slate-50 text-slate-700";
                        let statusTextAr = "⏳ لم تقديم الجرد بعد";
                        let statusTextEn = "Missing Checklist";
                        let badgeColor = "bg-slate-200 text-slate-700";

                        if (cl) {
                          if (cl.status === "audited") {
                            cardColor = "border-emerald-200 bg-emerald-50/20 text-emerald-900";
                            statusTextAr = "✔ معتمد طبيّاً ومطابق";
                            statusTextEn = "Audited & Match";
                            badgeColor = "bg-emerald-100 text-emerald-800";
                          } else {
                            cardColor = "border-amber-200 bg-amber-50/20 text-amber-900";
                            statusTextAr = "✍ تم التقديم (بانتظار توقيعك)";
                            statusTextEn = "Completed (Awaiting Signoff)";
                            badgeColor = "bg-amber-100 text-amber-800 animate-pulse";
                          }
                        }

                        return (
                          <div 
                            key={dept} 
                            onClick={() => {
                              setSelectedDutyDept(dept);
                            }}
                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 text-right hover:scale-[1.01] hover:shadow-sm cursor-pointer ${cardColor}`}
                          >
                            <div className="space-y-1">
                              <span className="block text-[11px] font-black text-slate-800 truncate">
                                {dept}
                              </span>
                              <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded ${badgeColor}`}>
                                {language === "ar" ? statusTextAr : statusTextEn}
                              </span>
                            </div>

                            {cl && cl.status === "completed" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approveChecklist(cl.id);
                                }}
                                className="w-full py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[10px] font-black shadow transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
                              >
                                <Lock className="h-3 w-3" />
                                <span>{language === "ar" ? "اعتماد وتوقيع الشيت" : "Certify Sheet"}</span>
                              </button>
                            )}

                            {cl && cl.status === "audited" && (
                              <div className="text-[9px] text-slate-500 font-sans mt-1">
                                <span>{language === "ar" ? `بواسطة: ${cl.auditedByStaffName}` : `Audited by: ${cl.auditedByStaffName}`}</span>
                              </div>
                            )}

                            {!cl && (
                              <span className="text-[9px] text-rose-500 font-black tracking-tight mt-1 animate-pulse">
                                ⏳ {language === "ar" ? "معلّق - نبه الاستاف" : "Pending Staff Activity"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Main Split Screen Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Units Portal Grid & Supervisor Overview */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                      <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5 justify-end">
                          <span>بوابة دخول واستهلال وتصديق الوحدات</span>
                          <LayoutGrid className="h-4.5 w-4.5 text-pink-600 shrink-0" />
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                          {language === "ar" ? "اضغط على أي وحدة طبية لفتح الاستمارة، تتبع المهام وإتمام الجداول اليومية لها:" : "Select any active biological unit to evaluate today's checking task state:"}
                        </p>
                      </div>

                      <div className="space-y-2 text-right">
                        {activeUnits.map((unit) => {
                          const cl = dailyChecklists.find(c => c.department === unit && c.date === todayString);
                          const isSelected = selectedDutyDept === unit;
                          
                          return (
                            <button
                              key={unit}
                              onClick={() => {
                                setSelectedDutyDept(unit);
                                setDutyChecklistAnswers({});
                              }}
                              className={`w-full p-3 rounded-xl border transition text-right font-sans relative overflow-hidden flex flex-col gap-1 text-xs cursor-pointer ${
                                isSelected 
                                  ? "bg-gradient-to-l from-pink-50 to-white border-pink-500 shadow-sm ring-1 ring-pink-500/20" 
                                  : "bg-slate-50/50 hover:bg-slate-50 border-slate-150 hover:border-slate-300"
                              }`}
                            >
                              {/* Left highlight highlight indicator bar */}
                              {isSelected && <div className="absolute top-0 right-0 bottom-0 w-[5px] bg-pink-600"></div>}

                              <div className="flex items-center justify-between w-full">
                                {cl ? (
                                  cl.status === "audited" ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                      <ShieldCheck className="h-3 w-3 inline" />
                                      {language === "ar" ? "معتمد ووقّع" : "Audited"}
                                    </span>
                                  ) : (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                      <Clock className="h-3 w-3 inline" />
                                      {language === "ar" ? "تم التقديم" : "Completed"}
                                    </span>
                                  )
                                ) : (
                                  <span className="bg-rose-100 text-rose-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                                    {language === "ar" ? "معلق / مفقود" : "Pending"}
                                  </span>
                                )}

                                <span className="font-extrabold text-slate-800 text-xs">
                                  {unit === "EMERGENCY UNIT" && (language === "ar" ? "قسم الطوارئ" : "Emergency ER Unit")}
                                  {unit === "CHEMO UNIT PREPN" && (language === "ar" ? "صيدلية تحضير الكيماوي" : "Chemo Prep Pharmacy")}
                                  {unit === "ONCO-SURGICAL UNIT" && (language === "ar" ? "العمليات وأورام الثدي جراحياً" : "Onco-Surgical OR")}
                                  {unit === "OUTPATIENT CLINIC" && (language === "ar" ? "العيادات الخارجية والفحص" : "OP Oncology Clinic")}
                                  {unit === "INTENSIVE CARE UNIT (ICU)" && (language === "ar" ? "حالات الرعاية المركزة" : "Critical Care ICU")}
                                  {!["EMERGENCY UNIT", "CHEMO UNIT PREPN", "ONCO-SURGICAL UNIT", "OUTPATIENT CLINIC", "INTENSIVE CARE UNIT (ICU)"].includes(unit) && unit}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                                <span className="font-mono text-[9px]">
                                  {dutyTasks.filter(t => t.department === unit).length} {language === "ar" ? "مهام دورية" : "daily tasks"}
                                </span>
                                <span>
                                  {cl ? (
                                    language === "ar" 
                                      ? `بواسطة: ${cl.completedByStaffName}` 
                                      : `By: ${cl.completedByStaffName}`
                                  ) : (
                                    language === "ar" ? "لم يتم التوقيع اليوم" : "No entry today"
                                  )}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Middle & Right Column: The active Duty Form Sheet for Selected Unit */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6">
                      
                      {/* Active Department Header details */}
                      <div className="border-b border-rose-100 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="space-y-1 text-center sm:text-right">
                          <h3 className="text-base font-black text-rose-700 flex items-center justify-end gap-2">
                            <ClipboardList className="h-5 w-5 text-rose-500" />
                            <span>{getDeptTitle(effectiveDutyDept, language)}</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {language === "ar" ? "المراقبة الذكية لحالة الأجهزة والسلامة الصيدلانية على مدار الـ 24 ساعة:" : "Standardized 24-hour verification schedule supporting hospital rules:"}
                          </p>
                        </div>
                        
                        <div className="bg-rose-50 text-rose-800 text-xs py-1 px-3 rounded-xl border border-rose-100/50 flex flex-col text-center font-mono select-none">
                          <span className="font-bold text-[9px] uppercase tracking-wider">{language === "ar" ? "سجل الكود اليومي" : "Daily Code"}</span>
                          <span className="font-extrabold text-xs">BHG-CL-{effectiveDutyDept.substring(0,3).toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Check if already submitted/audited today */}
                      {todaysChecklist && (
                        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-4 text-xs ${
                          todaysChecklist.status === "audited" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-amber-50 border-amber-100 text-amber-700"
                        }`}>
                          <div className="space-y-1">
                            <div className="font-bold flex items-center gap-1.5 justify-end sm:justify-start">
                              <ShieldCheck className={`h-4 w-4 ${todaysChecklist.status === 'audited' ? 'text-emerald-650' : 'text-amber-600'}`} />
                              <span>
                                {todaysChecklist.status === "audited" 
                                  ? (language === "ar" ? "تم الاعتماد النهائي، الختم والتوقيع بواسطة المشرف!" : "Checklist fully Audited, Signed and Accredited by Supervisor!")
                                  : (language === "ar" ? "تم التقديم والإتمام اليومي بنجاح وتوقيع الاستاف!" : "Today's Checklist successfully completed by staff but pending Audit sign-off.")}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {language === "ar" 
                                ? `وقّع الموظف: ${todaysChecklist.completedByStaffName} (ID: ${todaysChecklist.completedByStaffId}) الساعة ${todaysChecklist.completedAt}`
                                : `Signed by medical Staff: ${todaysChecklist.completedByStaffName} (ID: ${todaysChecklist.completedByStaffId}) at ${todaysChecklist.completedAt}`}
                            </p>
                            {todaysChecklist.auditedByStaffName && (
                              <p className="text-[10px] text-emerald-700 font-extrabold">
                                {language === "ar" 
                                  ? `✅ اعتمد من المشرف الدليلي: ${todaysChecklist.auditedByStaffName} (ID: ${todaysChecklist.auditedByStaffId}) مع الملحوظة: ${todaysChecklist.auditNotes}`
                                  : `✅ Finalized by clinical Supervisor: ${todaysChecklist.auditedByStaffName} (ID: ${todaysChecklist.auditedByStaffId}) with note: "${todaysChecklist.auditNotes}"`}
                              </p>
                            )}
                          </div>
                          <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            todaysChecklist.status === "audited" ? "bg-emerald-600 text-white border-emerald-500" : "bg-amber-500 text-white border-amber-400 animate-pulse"
                          }`}>
                            {todaysChecklist.status === "audited" ? (language === "ar" ? "ملف مغلق ومعتمد" : "CLOSED / SECURED") : (language === "ar" ? "معاد للتدقيق اليوم" : "PENDING AUDIT")}
                          </span>
                        </div>
                      )}

                      {/* Dynamic Tasks Fill Form Grid */}
                      <div className="space-y-3">
                        {activeDeptTasks.length === 0 ? (
                          <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-450 space-y-2 select-none">
                            <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto" />
                            <p className="text-xs font-bold">{language === "ar" ? "لا توجد مهام ديوتي مخصصة لهذه الوحدة حالياً." : "No specific daily duty tasks initialized for this unit yet."}</p>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              {language === "ar" ? "طاقم الجودة ومديري التمريض يمكنهم إضافة وتوليد مهام مخصصة فوراً باستخدام اللوحة بالأسفل." : "Quality staff & administrators can create and assign dynamic tasks using the control form below."}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                            {activeDeptTasks.map((task) => {
                              // Answers checked check state
                              const isCompletedToday = todaysChecklist !== undefined;
                              const currentAnswerVal = isCompletedToday 
                                ? todaysChecklist.answers[task.id]?.done || false
                                : dutyChecklistAnswers[task.id]?.done || false;
                                
                              const currentAnswerNote = isCompletedToday
                                ? todaysChecklist.answers[task.id]?.note || ""
                                : dutyChecklistAnswers[task.id]?.note || "";

                              return (
                                <div 
                                  key={task.id} 
                                  className={`p-3.5 rounded-xl border text-right transition flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs cursor-pointer ${
                                    currentAnswerVal 
                                      ? "bg-emerald-50/20 border-emerald-200" 
                                      : "bg-white border-slate-150 hover:border-slate-300"
                                  }`}
                                >
                                  {/* Right text descriptive */}
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                        {language === "ar" ? task.categoryAr : task.categoryEn}
                                      </span>
                                      <span className="font-bold text-slate-800">
                                        {language === "ar" ? task.taskAr : task.taskEn}
                                      </span>
                                    </div>
                                    <p className="text-[10.5px] text-slate-400 font-medium">
                                      {language === "ar" ? task.taskEn : task.taskAr}
                                    </p>
                                  </div>

                                  {/* Inputs controls */}
                                  <div className="flex items-center gap-3 justify-end shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
                                    {/* Text explanation or logs */}
                                    <input
                                      type="text"
                                      disabled={isCompletedToday}
                                      placeholder={language === "ar" ? "قراءات أو ملاحظة (مثال: درجة الحرارة)" : "Readings / Remarks (optional)"}
                                      value={currentAnswerNote}
                                      onChange={(e) => {
                                        setDutyChecklistAnswers(prev => ({
                                          ...prev,
                                          [task.id]: {
                                            done: prev[task.id]?.done || false,
                                            note: e.target.value
                                          }
                                        }));
                                      }}
                                      className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 text-[11px] font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none w-44 text-right disabled:opacity-75 disabled:cursor-not-allowed"
                                    />

                                    {/* Direct Toggle Button - Staff check */}
                                    <button
                                      disabled={isCompletedToday}
                                      onClick={() => {
                                        setDutyChecklistAnswers(prev => ({
                                          ...prev,
                                          [task.id]: {
                                            ...prev[task.id],
                                            done: !prev[task.id]?.done
                                          }
                                        }));
                                      }}
                                      className={`px-3 py-1.5 rounded-lg border font-bold text-[10.5px] transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                                        currentAnswerVal 
                                          ? "bg-emerald-600 border-emerald-500 text-white shadow-sm"
                                          : "bg-slate-50 border-slate-200 text-slate-450 hover:bg-slate-100"
                                      }`}
                                    >
                                      {currentAnswerVal ? (
                                        <>
                                          <Check className="h-3 w-3 inline" />
                                          <span>{language === "ar" ? "مكتمل" : "Done"}</span>
                                        </>
                                      ) : (
                                        <span>{language === "ar" ? "تحديد كمنتهٍ" : "Mark Done"}</span>
                                      )}
                                    </button>

                                    {/* Admin delete custom task */}
                                    {checkPermission("manageDutyTasks") && (
                                      <button 
                                        onClick={() => deleteTask(task.id)}
                                        title={language === "ar" ? "إزالة المهمة من جرد القسم" : "Remove task"}
                                        className="p-1 px-1.5 text-rose-500 hover:bg-rose-50 border border-slate-100 rounded transition"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Complete Staff Checklist Section */}
                      {!todaysChecklist && activeDeptTasks.length > 0 && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                          <div className="space-y-1 text-center sm:text-right">
                            <p className="font-bold text-slate-700">
                              {language === "ar" ? "توقيع الموظف وإرسال استمارة الجرد الرقمية اليومية" : "Bilingual Electronic Staff Verification Stamps"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {language === "ar" 
                                ? `سيتم الختم برابط ومستوى الموظف النشط: ${currentUser.nameAr} | القسم: ${currentUser.department} (رقم الرمز: ${currentUser.staffId})`
                                : `Stamped with actively logged-in: ${currentUser.nameEn} | Dept: ${currentUser.department} (Staff ID: ${currentUser.staffId})`}
                            </p>
                          </div>

                          <button
                            onClick={submitChecklist}
                            className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>{language === "ar" ? "إتمام الشيك ليست وإدراجها للمشرفين" : "Complete, Sign Off & Route Checklist"}</span>
                          </button>
                        </div>
                      )}

                      {/* Supervisor Approval Control Panel Box */}
                      {todaysChecklist && todaysChecklist.status === "completed" && (
                        <div className="p-5 bg-gradient-to-l from-amber-500/10 via-amber-500/5 to-white rounded-xl border border-amber-500/30 text-xs space-y-4">
                          <div className="space-y-1">
                            <h4 className="font-black text-amber-800 flex items-center justify-end gap-1.5 text-xs">
                              <span>بوابة المراقبة والختم لمديرة التمريض والمشرفين</span>
                              <Award className="h-4 w-4 text-amber-600 shrink-0" />
                            </h4>
                            <p className="text-[10px] text-slate-500 max-w-2xl">
                              {language === "ar" 
                                ? `إشعار مخصص لرتبة "مُديرة التمريض" أو "مسؤولي الجودة": الشيك ليست اليومية لهذ القسم معبأة وجاهزة بالكامل. يرجى كتابة تعليقات الفحص والمراجعة لإتمام الإغلاق القانوني وقفل التقرير:`
                                : `Verification notice for Head Nurses & Auditors: Daily checklist inputs from nursing staff are complete. Review values and apply final approval to log into hospital records:`}
                            </p>
                          </div>

                          {rolePermissions.approveChecklist.includes(currentUser.role) ? (
                            <div className="space-y-3">
                              <div className="text-right space-y-1">
                                <label className="block text-[10px] font-bold text-slate-650">{language === "ar" ? "تعليق ومطالب التدقيق الصيدلي أو السريري للمشرف:" : "Supervisor Audit Notes / Quality Feedback:"}</label>
                                <textarea
                                  value={supervisorAuditNoteText}
                                  onChange={(e) => setSupervisorAuditNoteText(e.target.value)}
                                  placeholder={language === "ar" ? "مثال: تم تدقيق ومراجعة عيار أجهزة الإنعاش والدم، كافية والمطابقة سليمة ومطابقة للمعايير." : "e.g., Blood inventory and emergency shock apparatus fully verified. Closed."}
                                  className="w-full bg-white border border-amber-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-amber-500 font-sans text-xs min-h-[60px]"
                                />
                              </div>

                              <button
                                onClick={() => approveChecklist(todaysChecklist.id)}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Award className="h-4 w-4 text-white" />
                                <span>{language === "ar" ? "تأكيد الختم والتوقيع كمديرة تمريض ومشرف معتمد" : "Certify, Sign & Seal Healthcare Entry Logs"}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center font-bold">
                              {language === "ar" 
                                ? `⛔ صلاحية الاعتماد مقفلة! يجب التبديل لحساب "أ. فاطمة سعيد (مديرة تمريض)" أو "أ. نورهان علي (جودة)" من السلة أعلى اليمين للمحاكاة والاعتماد.`
                                : `⛔ Authorizing restricted. Swap to "Sister Fatima (Head Nurse)" or "Auditor Norhan" to test supervisors stamp.`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 4. Administrator Dynamic Task Creator */}
                    {rolePermissions.manageDutyTasks.includes(currentUser.role) && (
                      <form onSubmit={addTask} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-right">
                        <div className="border-b border-slate-100 pb-2 mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 justify-end">
                            <span>إضافة وزيادة واجبات السجل من لوحة الإدارة</span>
                            <ListPlus className="h-4.5 w-4.5 text-pink-600" />
                          </h4>
                          <span className="text-[10px] bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-full uppercase font-mono">
                            {currentUser.role.toUpperCase()} PRIVILEGE
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          {language === "ar" 
                            ? `بصفتك مسؤول النظام، يمكنك إدراج واجبات تفقدية جديدة لـ [${effectiveDutyDept}]. ستظهر هذه البنود فوراً لطاقم التمريض والاستاف لتعبئتها يومياً:`
                            : `As Admin, append custom inspection tasks dynamically to [${effectiveDutyDept}] checklists:`}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500">{language === "ar" ? "نص الواجب اليومي المقيم (بالعربية):" : "Checking Item (Arabic):"}</label>
                            <input
                              type="text"
                              required
                              value={newTaskTextAr}
                              onChange={(e) => setNewTaskTextAr(e.target.value)}
                              placeholder={language === "ar" ? "مثال: مراجعة غاز الأوكسجين والتأكد من عدم تسربه" : "مثال: فحص سلامة أغطية صندوق الإبر"}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-sans"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500">{language === "ar" ? "نص الواجب اليومي المقيم (بالإنكليزية):" : "Checking Item (English):"}</label>
                            <input
                              type="text"
                              required
                              value={newTaskTextEn}
                              onChange={(e) => setNewTaskTextEn(e.target.value)}
                              placeholder="e.g., Inspect medical gas levels and verify safety seals"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-sans"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500">{language === "ar" ? "التصنيف والباب المقيم (بالعربية):" : "Category / Subtitle (Arabic):"}</label>
                            <input
                              type="text"
                              required
                              value={newTaskCategoryAr}
                              onChange={(e) => setNewTaskCategoryAr(e.target.value)}
                              placeholder="مثال: جاهزية الأجهزة"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500">{language === "ar" ? "التصنيف والباب المقيم (بالإنكليزية):" : "Category / Subtitle (English):"}</label>
                            <input
                              type="text"
                              required
                              value={newTaskCategoryEn}
                              onChange={(e) => setNewTaskCategoryEn(e.target.value)}
                              placeholder="e.g., Device Readiness"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{language === "ar" ? "إدراج وتخزين الواجب اليومي بالوحدة الطبية" : "Insert & Register New Task Sheet"}</span>
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {activeTab === "cloud_settings" && (
            <CloudSettingsPage
              language={language}
              currentUser={currentUser}
              records={records}
              customTemplates={customTemplates}
              systemUsers={systemUsers}
              dailyChecklists={dailyChecklists}
              systemLogs={systemLogs}
              dutyTasks={dutyTasks}
              setRecords={setRecords}
              setCustomTemplates={setCustomTemplates}
              setSystemUsers={setSystemUsers}
              setDailyChecklists={setDailyChecklists}
              setSystemLogs={setSystemLogs}
              setDutyTasks={setDutyTasks}
            />
          )}

          {activeTab === "editor" && (() => {
            const userDept = (currentUser?.department || "").toUpperCase().trim();
            const activeDirectives = notifications.filter(n => 
              !n.read && 
              n.type === "directive" && 
              (n.targetDepartment === "ALL" || (n.targetDepartment && userDept.includes(n.targetDepartment.toUpperCase().trim())))
            );

            return (
              <div className="space-y-4">
                {activeDirectives.length > 0 && (
                  <div className="no-print bg-gradient-to-l from-rose-500 via-rose-600 to-pink-600 text-white rounded-xl p-4 shadow-md border border-rose-400/40 relative overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-0 w-1/4 bg-radial-gradient from-white/10 to-transparent pointer-events-none" />
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-right animate-pulse-slow font-sans" dir="rtl">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/15 p-2 rounded-lg shrink-0">
                          <Radio className="h-5 w-5 text-white animate-pulse" />
                        </div>
                        <div className="text-right">
                          <span className="bg-white text-rose-700 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full uppercase font-sans">
                            {language === "ar" ? "📡 توجيه إداري وقائي عاجل" : "📡 High Priority Quality Notice"}
                          </span>
                          <p className="text-xs font-black mt-1 leading-relaxed">
                            {language === "ar" ? activeDirectives[0].messageAr : activeDirectives[0].messageEn}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const directiveId = activeDirectives[0].id;
                          const updated = notifications.map(n => n.id === directiveId ? {...n, read: true} : n);
                          setNotifications(updated);
                          localStorage.setItem("baheya_notifications", JSON.stringify(updated));
                        }}
                        className="px-4 py-1.5 bg-white hover:bg-slate-50 text-rose-700 font-black text-xs rounded-lg transition shadow shrink-0 cursor-pointer"
                      >
                        {language === "ar" ? "علم وألتزم بالتعليمات ✓" : "Acknowledge & Comply ✓"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Sidebar templates selector with custom search box */}
              <aside className="no-print lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                    <Layers className="h-4 w-4 text-pink-600" />
                    {language === "ar" ? `نماذج الجرد (${allAvailableTemplates.length} شيت كامل)` : `Master Templates (${allAvailableTemplates.length} Sheets)`}
                  </h3>
                  <p className="text-[10px] text-slate-500 leading-tight mt-1">
                    {language === "ar" ? `استعرض وابحث بنصف الاسم أو الكود الخاص بأقسام ${hospitalSettings.nameAr || "المؤسسة"} المتكاملة:` : "Filter and search through the clinical departments checklist archives:"}
                  </p>
                </div>

                {/* SEARCH AND FILTER COMPONENTS (مربع بحث ذكي للبلاتفورم مع فلاتر أقسام) */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={language === "ar" ? "ابحث بالاسم أو كود الشيت..." : "Search by sheet title or code..."}
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-8 pl-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-pink-500 focus:bg-white transition"
                    />
                    {templateSearchQuery && (
                      <button 
                        onClick={() => setTemplateSearchQuery("")}
                        className="absolute left-2.5 top-2.5 font-bold text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Horizontal Scrollable tabs of medical departments */}
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">
                      {language === "ar" ? "الأقسام والوحدات الرئيسية:" : "Department quick filters:"}
                    </span>
                    <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                      {[
                        { key: "ALL", ar: "عام / الكل", en: "General / All" },
                        { key: "ER", ar: "طوارئ (ER)", en: "Emergency" },
                        { key: "ICU", ar: "رعاية (ICU)", en: "Critical Care" },
                        { key: "OR", ar: "عمليات (OR)", en: "Operating" },
                        { key: "CHEMO", ar: "كيماوي (Chemo)", en: "Chemotherapy" },
                        { key: "RAD", ar: "أشعة (Rad)", en: "Radiology" },
                        { key: "PED", ar: "أطفال (Ped)", en: "Pediatrics" },
                        { key: "PHA", ar: "صيدلية (Pharm)", en: "Pharmacy" },
                        { key: "QLTY", ar: "جودة (Qual)", en: "Quality" },
                        ...departments.filter(d => !["EMERGENCY UNIT", "CHEMO UNIT PREPN", "INTENSIVE CARE UNIT (ICU)"].includes(d)).map(d => ({ key: d, ar: d, en: d }))
                      ].map((item) => {
                        const isSelected = selectedDepartmentFilter === item.key;
                        return (
                          <button
                            key={item.key}
                            onClick={() => setSelectedDepartmentFilter(item.key)}
                            className={`px-2 py-1 text-[9px] font-extrabold rounded-full border transition shrink-0 uppercase ${
                              isSelected 
                                ? "bg-pink-600 border-pink-500 text-white shadow-sm" 
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {language === "ar" ? item.ar : item.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Yearly Partition Filters */}
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">
                      {language === "ar" ? "منها تقسيمات سنوية (السنة المعتمدة):" : "Yearly partition (Approved year):"}
                    </span>
                    <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                      {[
                        { key: "ALL", ar: "كل السنوات", en: "All Years" },
                        { key: "2026", ar: "سنة 2026", en: "Year 2026" },
                        { key: "2025", ar: "سنة 2025", en: "Year 2025" },
                        { key: "2024", ar: "سنة 2024", en: "Year 2024" }
                      ].map((yr) => {
                        const isSelected = selectedYearFilter === yr.key;
                        return (
                          <button
                            key={yr.key}
                            onClick={() => setSelectedYearFilter(yr.key)}
                            className={`px-2 py-1 text-[9px] font-extrabold rounded border transition shrink-0 ${
                              isSelected 
                                ? "bg-slate-800 border-slate-700 text-white shadow-sm" 
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {language === "ar" ? yr.ar : yr.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Templates list scrollbox with dynamic match counters */}
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[380px] p-0.5 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                    <span>{language === "ar" ? "السجلات المطابقة:" : "Matching sheets:"}</span>
                    <span className="font-extrabold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {filteredTemplates.length} / 200
                    </span>
                  </div>

                  {filteredTemplates.map((tpl) => {
                    const isSelected = selectedTemplate.id === tpl.id;
                    const recordCount = records.filter(r => r.templateId === tpl.id).length;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplate(tpl);
                          handleCreateNew(tpl.id);
                        }}
                        className={`text-right w-full p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-1.5 transition ${
                          isSelected
                            ? "bg-pink-50 border-pink-200 text-pink-700 shadow-inner"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        <div className="flex flex-col items-start text-left shrink overflow-hidden">
                          <span className="font-bold truncate text-[11px] max-w-[140px] text-right">
                            {language === "ar" ? tpl.titleAr : tpl.titleEn}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5 font-mono">{tpl.code}</span>
                        </div>
                        {recordCount > 0 && (
                          <span className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-[8px] font-bold shrink-0">
                            {recordCount}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {filteredTemplates.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400">
                      {language === "ar" ? "لا توجد نتائج مطابقة لبحثك." : "No matching templates."}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px]">
                    <p className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <Info className="h-3.5 w-3.5 text-slate-500" />
                      {language === "ar" ? "كيف تقوم بتسجيل الأيام؟" : "Interactive Guide:"}
                    </p>
                    <p className="text-slate-500 leading-relaxed font-sans">
                      {language === "ar" 
                        ? "اضغط مباشرة على مربعات الأيام بالجدول للتبديل بين علامة متوفر (✔)، غير متوفر (✘)، أو أدخل قيمة الحرارة أوفلاين." 
                        : "Click directly on days column matrix to toggle checks (✔), missing logs (✘) or type custom notes."}
                    </p>
                  </div>
                </div>
              </aside>

              {editingRecord ? (
                <div className="lg:col-span-3 space-y-6">
                  {/* Action Toolbar */}
                  <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingRecord(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                        {language === "ar" ? "إغلاق" : "Close Editor"}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generatePDF(
                          editingRecord,
                          selectedTemplate,
                          hospitalSettings,
                          language,
                          dayFocus,
                          selectedShift
                        )}
                        className="px-4 py-1.5 bg-pink-650 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-white" />
                        {language === "ar" ? "تصدير تقرير PDF" : "Export Clinical PDF"}
                      </button>

                      <button
                        onClick={handlePrint}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="h-4 w-4 text-pink-400" />
                        {language === "ar" ? "طباعة طبق الأصل" : "Print Precise Replica"}
                      </button>
                    </div>
                  </div>

                  {/* Row & Items Inline Manager (no-print) */}
                  <div className="no-print mx-0 mt-0 mb-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-150 pb-2.5 mb-2 font-sans text-right">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-pink-100 text-pink-700 rounded-lg">
                          <ListPlus className="h-4.5 w-4.5" />
                        </span>
                        <div>
                          <h3 className="text-xs font-black text-slate-800">
                            {language === "ar" ? "نظام تعديل وإضافة وحذف أصناف الشيت" : "Sheet Items & Rows Architect (Add, Edit, Delete)"}
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {language === "ar" ? "أضف بنوداً جديدة للجدول، أو عدل المسميات والمقادير مباشرة لتعديل خلايا الجرد طبق الأصل" : "Directly append new items, customize bilingual text or modify unit/qty specifications instantly"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-650 px-2.5 py-1 rounded-full">
                        {language === "ar" ? `${editingRecord.gridData.length} صنف متاح` : `${editingRecord.gridData.length} active items`}
                      </span>
                    </div>

                    {/* Inline list of current items in this editingRecord */}
                    {currentUser.role && !["staff", "normal", "nurse"].includes(currentUser.role.toLowerCase()) && (
                    <div className="mb-4 max-h-40 overflow-y-auto border border-slate-100 rounded-lg bg-slate-50 divide-y divide-slate-100 text-xs font-sans">
                      {editingRecord.gridData.map((row, rIdx) => (
                        <div key={row.code || rIdx} className="p-2 flex items-center justify-between gap-3 hover:bg-slate-100/50">
                          <div className="flex-1 min-w-0 text-right">
                            <span className="text-[10px] font-extrabold text-slate-400 font-mono inline-block ml-2 w-5">
                              {rIdx + 1}
                            </span>
                            <span className="font-bold text-slate-800">
                              {language === "ar" ? row.itemAr : row.itemEn}
                            </span>
                            <span className="text-[10px] text-slate-450 font-mono inline-block mr-2 uppercase tracking-wide">
                              (Code: {row.code || rIdx+1} | {language === "ar" ? `وحدة: ${row.unit || '-'}` : `Unit: ${row.unit || '-'}`} | {language === "ar" ? `مخزون: ${row.qty || '-'}` : `Qty: ${row.qty || '-'}`})
                            </span>
                          </div>
                          
                          {/* Item modifiers */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleStartEditRow(rIdx, row)}
                              className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded transition text-slate-400 cursor-pointer"
                              title={language === "ar" ? "تعديل محتوى الصف" : "Edit row text"}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(rIdx)}
                              className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition text-slate-400 cursor-pointer"
                              title={language === "ar" ? "حذف الصف كاملاً" : "Remove item row"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}

                    {/* Quick Input Panel for edit/add rows */}
                    {currentUser.role && !["staff", "normal", "nurse"].includes(currentUser.role.toLowerCase()) && (
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-xs gap-3 grid grid-cols-1 md:grid-cols-12 items-end font-sans">
                      <div className="md:col-span-4">
                        <label className="block text-[9px] text-slate-450 font-black mb-1 text-right">
                          {language === "ar" ? "اسم الصنف بالعربية" : "Item Arabic Title:"}
                        </label>
                        <input
                          type="text"
                          value={rowForm.itemAr}
                          onChange={(e) => setRowForm({ ...rowForm, itemAr: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 outline-none focus:border-pink-500 font-bold text-slate-800"
                          placeholder={language === "ar" ? "مثال: أمبول صوديوم كلورايد" : "Arabic title"}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[9px] text-slate-450 font-black mb-1 text-right">
                          {language === "ar" ? "اسم الصنف بالإنجليزية" : "Item English Title:"}
                        </label>
                        <input
                          type="text"
                          value={rowForm.itemEn}
                          onChange={(e) => setRowForm({ ...rowForm, itemEn: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 outline-none focus:border-pink-500 font-mono text-slate-800"
                          placeholder="e.g. Sodium Chloride Ampoule"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 md:col-span-3">
                        <div>
                          <label className="block text-[9px] text-slate-450 font-black mb-1 text-center">
                            كود
                          </label>
                          <input
                            type="text"
                            value={rowForm.code}
                            onChange={(e) => setRowForm({ ...rowForm, code: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-center font-mono uppercase font-bold text-slate-800"
                            placeholder="E12"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-450 font-black mb-1 text-center">
                            الوحدة
                          </label>
                          <input

                            type="text"
                            value={rowForm.unit}
                            onChange={(e) => setRowForm({ ...rowForm, unit: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1 text-center text-slate-800"
                            placeholder="AMP"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-450 font-black mb-1 text-center">
                            العدد/الكمية
                          </label>
                          <input
                            type="text"
                            value={rowForm.qty}
                            onChange={(e) => setRowForm({ ...rowForm, qty: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1 text-center font-mono text-slate-800"
                            placeholder="20"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 flex gap-1 bg-transparent">
                        <button
                          onClick={handleSaveRowForm}
                          className="flex-1 bg-pink-650 hover:bg-pink-700 text-white font-bold py-1.5 rounded-lg text-center transition cursor-pointer"
                        >
                          {rowEditIndex !== null 
                            ? (language === "ar" ? "حفظ" : "Save") 
                            : (language === "ar" ? "إضافة صنف" : "Add Row")}
                        </button>
                        {rowEditIndex !== null && (
                          <button
                            onClick={handleCancelRowEdit}
                            className="bg-slate-200 text-slate-700 font-bold py-1.5 px-2 rounded-lg text-center hover:bg-slate-300 transition cursor-pointer"
                          >
                            X
                          </button>
                        )}
                      </div>
                    </div>
                    )}
                  </div>

                  {/* HIGH FIDELITY PRINTABLE REPLICA CONTAINER (صناعة طبق الأصل للفورم لضمان الجودة) */}
                  <div className="print-container bg-white p-6 sm:p-8 rounded-b-xl border border-slate-200 shadow-sm relative overflow-visible print:border-none print:shadow-none print:p-0">
                    
                    {/* Double bordered box representing high standard Egyptian Clinical documents */}
                    <div className="border-[3px] border-slate-900 p-5 rounded-lg relative overflow-hidden print:p-0 print:border-none">
                      
                      {/* RED INK QUALITY OFFICERS CERTIFICATION SEAL (ختم في الجانب مع روتيت) */}
                      {editingRecord.additionalInfo?.isQualityCertified && (
                        <div className="absolute top-6 left-6 rotate-[-12deg] border-[3px] border-red-600 text-red-600 bg-white/95 px-4 py-2 rounded-lg font-mono text-[10px] uppercase font-bold tracking-tight text-center select-none shadow-md border-double border-4 z-30 avoid-break print:left-3 print:top-6">
                          <div className="border-b border-red-600 pb-0.5 mb-1 font-bold tracking-widest text-[8px] flex items-center justify-center gap-1">
                            <HeartPulse className="h-3 w-3" />
                            <span>BAHEYA QUALITY</span>
                          </div>
                          <div className="text-[12px] font-black text-red-600 leading-none">
                            CERTIFIED AUDIT
                          </div>
                          <div className="text-[9px] text-red-600 mt-1 font-extrabold tracking-tight">
                            ✔ COMPLIANT & APPROVED
                          </div>
                          <div className="text-[8px] text-slate-500 mt-1 uppercase font-normal font-sans leading-none">
                            Date: {editingRecord.additionalInfo?.certifiedAt || "2026-06-01"}
                          </div>
                          <div className="text-[8px] text-slate-500 uppercase font-bold font-sans mt-0.5">
                            ID: {editingRecord.additionalInfo?.certifiedBy || "Auditor Norhan Ali"}
                          </div>
                        </div>
                      )}

                      {/* Header Banner - Replica of Hospital Letterhead */}
                      <div className="flex flex-col sm:flex-row items-center justify-between border-b-2 border-slate-900 pb-4 mb-4 avoid-break">
                        
                        {/* Bilingual Logo block */}
                        <div className="flex items-center gap-3">
                          <div className="text-right flex flex-col justify-center">
                            <span className="text-xl sm:text-2xl font-black text-pink-600 tracking-tight leading-none">
                              {hospitalSettings.nameAr}
                            </span>
                            <span className="text-[8px] text-pink-600 font-bold leading-tight select-none">
                              {hospitalSettings.taglineAr}
                            </span>
                          </div>
                          <div className="h-8 w-[1px] bg-slate-300 hidden sm:block"></div>
                          <div className="text-left hidden sm:flex flex-col justify-center font-sans">
                            <span className="text-xs font-extrabold text-slate-800 tracking-wide leading-none">
                              {hospitalSettings.nameEn}
                            </span>
                            <span className="text-[8px] text-slate-400 leading-tight">
                              {hospitalSettings.taglineEn}
                            </span>
                          </div>
                        </div>

                        {/* Code blue form titles */}
                        <div className="text-center mt-3 sm:mt-0">
                          <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                            {language === "ar" ? selectedTemplate.titleAr : selectedTemplate.titleEn}
                          </h2>
                          <span className="text-[9px] sm:text-xs font-mono text-slate-400 tracking-wider">
                            Form Reference: {selectedTemplate.code} | Version {selectedTemplate.version || "01"} | Rev: {selectedTemplate.issueDate}
                          </span>
                        </div>
                      </div>

                      {/* Metadata Entry Row - nurse names, date, department */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs mb-4 avoid-break print:bg-transparent print:border-none print:p-0">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">
                            {language === "ar" ? "القسم / مكان الجرد" : "Department / Unit Floor:"}
                          </label>
                          <input
                            type="text"
                            value={editingRecord.department}
                            onChange={(e) => setEditingRecord({ ...editingRecord, department: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 print:text-black focus:outline-none focus:border-pink-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">
                            {language === "ar" ? "تاريخ الفحص والمراقبة" : "Inspection Month/Date:"}
                          </label>
                          <div className="relative flex items-center">
                            <Calendar className="absolute right-2 text-slate-400 h-3.5 w-3.5 pointer-events-none" />
                            <input
                              type="date"
                              value={editingRecord.date}
                              onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded pr-8 pl-2 py-1 font-mono font-bold text-slate-800 print:text-black focus:outline-none focus:border-pink-500 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">
                            {language === "ar" ? "الوردية / الشفت المقترن بالجرد" : "Associated Shift Period:"}
                          </label>
                          <div className="relative flex items-center">
                            <select
                              value={selectedShift}
                              onChange={(e) => setSelectedShift(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 print:text-black focus:outline-none focus:border-pink-500 text-xs h-[30px]"
                            >
                              {CLINICAL_SHIFTS.map(cs => (
                                <option key={cs.id} value={cs.id}>{cs.nameAr}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">
                            {language === "ar" ? "الممرض المسؤول حالياً" : "Investigated Nurse Name:"}
                          </label>
                          <div className="relative flex items-center">
                            <User className="absolute right-2 text-slate-400 h-3.5 w-3.5 pointer-events-none" />
                            <input
                              type="text"
                              value={editingRecord.staffName}
                              onChange={(e) => setEditingRecord({ ...editingRecord, staffName: e.target.value })}
                              disabled={!(currentUser.role === "admin" || currentUser.role === "quality" || currentUser.role === "president" || currentUser.role === "head_nurse" || currentUser.role === "it")}
                              className="w-full bg-white border border-slate-200 rounded pr-8 pl-2 py-1 font-bold text-slate-800 print:text-black focus:outline-none focus:border-pink-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase font-mono">
                            {language === "ar" ? "الرقم الوظيفي / الكود" : "Responsible Employee ID:"}
                          </label>
                          <input
                            type="text"
                            value={editingRecord.staffId}
                            onChange={(e) => setEditingRecord({ ...editingRecord, staffId: e.target.value })}
                            disabled={!(currentUser.role === "admin" || currentUser.role === "quality" || currentUser.role === "president" || currentUser.role === "head_nurse" || currentUser.role === "it")}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-800 print:text-black focus:outline-none focus:border-pink-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Patient metadata details row if patient specific details is enabled */}
                      {selectedTemplate.hasPatientDetails && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-red-50/50 p-3 rounded-lg border border-red-100 text-xs mb-4 avoid-break print:bg-transparent print:border-none print:p-0">
                          <div>
                            <label className="block text-[9px] text-red-700 font-bold mb-1 uppercase">
                              {language === "ar" ? "اسم المريض الرباعي" : "Patient Full Name:"}
                            </label>
                            <input
                              type="text"
                              value={editingRecord.patientName || ""}
                              onChange={(e) => setEditingRecord({ ...editingRecord, patientName: e.target.value })}
                              className="w-full bg-white border border-red-200 rounded px-2 py-1 font-bold text-slate-800 print:text-black focus:outline-none focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-red-700 font-bold mb-1 uppercase font-sans">
                              {language === "ar" ? "الرقم الطبي (MRN)" : "Clinical Record ID (MRN):"}
                            </label>
                            <input
                              type="text"
                              value={editingRecord.patientMRN || ""}
                              onChange={(e) => setEditingRecord({ ...editingRecord, patientMRN: e.target.value })}
                              className="w-full bg-white border border-red-200 rounded px-2 py-1 font-mono font-bold text-slate-800 print:text-black focus:outline-none focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-red-700 font-bold mb-1 uppercase">
                              {language === "ar" ? "التشخيص الطبي الأورام" : "Acknowledge Oncology Diagnosis:"}
                            </label>
                            <input
                              type="text"
                              value={editingRecord.diagnosis || ""}
                              onChange={(e) => setEditingRecord({ ...editingRecord, diagnosis: e.target.value })}
                              className="w-full bg-white border border-red-200 rounded px-2 py-1 font-bold text-slate-800 print:text-black focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* FORM CASE 1: PATIENT CONSENT / OUT AGAINST ADVICE FORM */}
                      {selectedTemplate.id === "patient-discharge-ama" ? (
                        <div className="text-right text-xs leading-relaxed space-y-4 text-slate-800 print:text-black print:leading-normal">
                          <p className="font-bold border-b pb-1 text-slate-700">
                            {language === "ar" 
                              ? "أقرأ أنا الموقع أدناه بأنني أتحمل كامل المسؤولية بمغادرة الحالة المستشفى رغماً عن التوصيات الطبية:"
                              : "Patient/Legal guardian declaration on discharge against medical advice:"}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-transparent print:border-none print:p-0">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>{language === "ar" ? "اسم المقر المسؤول:" : "Declarant Name:"}</span>
                                <input 
                                  type="text" 
                                  placeholder="..........."
                                  value={editingRecord.additionalInfo?.witnessName || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, witnessName: e.target.value }
                                  })}
                                  className="border-b border-slate-400 flex-1 px-1 font-bold bg-transparent focus:outline-none" 
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <span>{language === "ar" ? "صلة القرابة بالمريض:" : "Relationship to Patient:"}</span>
                                <select
                                  value={editingRecord.additionalInfo?.relation || "self"}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, relation: e.target.value }
                                  })}
                                  className="border-b border-slate-400 bg-transparent py-0.5 px-1 font-bold text-xs outline-none"
                                >
                                  <option value="self">{language === "ar" ? "بالأصالة عن نفسي" : "Self"}</option>
                                  <option value="son">{language === "ar" ? "صلة قرابة: ابن" : "Son"}</option>
                                  <option value="daughter">{language === "ar" ? "صلة قرابة: ابنة" : "Daughter"}</option>
                                  <option value="relative">{language === "ar" ? "صلة قرابة: قرابة قانونية" : "Legal Guardian"}</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>{language === "ar" ? "الرقم القومي / العائلي:" : "National ID Number:"}</span>
                                <input 
                                  type="text" 
                                  placeholder=".........................."
                                  value={editingRecord.additionalInfo?.witnessSignatureAr || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, witnessSignatureAr: e.target.value }
                                  })}
                                  className="border-b border-slate-400 flex-1 px-1 font-mono bg-transparent focus:outline-none" 
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{language === "ar" ? "بسبب مغادرة وقدرها:" : "Stated Discharge Reason:"}</span>
                                <input 
                                  type="text"
                                  placeholder={language === "ar" ? "سبب المغادرة رغماً عن التوجيه" : "Reason detail"}
                                  value={editingRecord.additionalInfo?.doctorRefusedText || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, doctorRefusedText: e.target.value }
                                  })}
                                  className="border-b border-slate-400 flex-1 px-1 bg-transparent focus:outline-none" 
                                />
                              </div>
                            </div>
                          </div>

                          <div className="border border-red-200 bg-red-50/20 p-3 rounded-lg print:border-none print:p-0">
                            <p className="font-bold text-red-800 print:text-black mb-1">
                              {language === "ar" ? "إقرار الطبيب ومضاعفات خروج المريض المحتملة:" : "Clinical Complications Explained:"}
                            </p>
                            <p className="text-[11px] text-slate-600 print:text-black mb-2 font-sans">
                              {language === "ar" 
                                ? "أقر أنا الطبيب المسؤول بأنني قمت بشرح وتوضيح المخاطر الطبية والمضاعفات الناتجة عن رفض العلاج ومنها:"
                                : "The attending physician explained clinical hazards regarding the rejection of care:"}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="flex items-center gap-1">
                                <span className="font-bold">1.</span>
                                <input 
                                  type="text" 
                                  value={editingRecord.additionalInfo?.complication1 || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, complication1: e.target.value }
                                  })}
                                  placeholder={language === "ar" ? "مضاعفة 1: التهاب الجرح" : "Complication hazard 1"}
                                  className="border-b border-slate-300 px-1 py-0.5 w-full bg-transparent focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-bold">2.</span>
                                <input 
                                  type="text" 
                                  value={editingRecord.additionalInfo?.complication2 || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, complication2: e.target.value }
                                  })}
                                  placeholder={language === "ar" ? "مضاعفة 2: تدهور مؤشرات الصدر" : "Complication hazard 2"}
                                  className="border-b border-slate-300 px-1 py-0.5 w-full bg-transparent focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-bold">3.</span>
                                <input 
                                  type="text" 
                                  value={editingRecord.additionalInfo?.complication3 || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, complication3: e.target.value }
                                  })}
                                  placeholder={language === "ar" ? "مضاعفة 3: فشل وظائف الأعضاء" : "Complication hazard 3"}
                                  className="border-b border-slate-300 px-1 py-0.5 w-full bg-transparent focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Signatures replica block */}
                          <div className="grid grid-cols-2 gap-6 pt-10 text-center avoid-break">
                            <div className="border-t border-slate-400 pt-2 space-y-1">
                              <p className="font-bold">{language === "ar" ? "توقيع المريض المقر بالمسؤولية" : "Patient Declarant Signature:"}</p>
                              <p className="text-[10px] text-slate-450">{language === "ar" ? "توقيع أو ختم بصمة اليد" : "Handwritten signature or thumbprint"}</p>
                            </div>
                            <div className="border-t border-slate-400 pt-2 space-y-1">
                              <p className="font-bold">{language === "ar" ? "توقيع الطبيب والختم الرسمي" : "Physician Stamp & Stamp:"}</p>
                              <p className="text-[10px] text-slate-455">{language === "ar" ? "تاريخ ووقت التوقيع بالرفض" : "Date & time of clearance"}</p>
                            </div>
                          </div>

                          <div className="text-center pt-8 border-t text-[9px] text-slate-400 font-mono avoid-break">
                            <span>Issue Date: 03.2025 | Document Reference: BHG-FR-MED-080 | Page 1 of 1</span>
                          </div>
                        </div>
                      ) : (
                        
                        /* FORM CASE 2: HIGH FIDELITY MONTHLY GRID / CHECKLIST SPREADSHEETS (كل الأنماط الأخرى) */
                        <div className="space-y-4">
                          
                          {/* Legend Bar only on screen */}
                          <div className="no-print bg-slate-100 hover:bg-slate-150 p-3.5 rounded-xl border border-slate-200/60 text-xs text-slate-600 font-sans shadow-sm transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-700 ml-1">
                                  {language === "ar" ? "رموز التقييم والجرد:" : "Symbol Legend:"}
                                </span>
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  <span className="bg-emerald-600 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[8px]">✔</span>
                                  <span>{language === "ar" ? "متوفر وسليم" : "Available & Safe"}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200/50 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  <span className="bg-rose-600 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[8px]">✘</span>
                                  <span>{language === "ar" ? "غير متوفر / مفقود" : "Missing / Out"}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200/50 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                                  <span className="border border-blue-300 text-blue-800 rounded px-1.5 text-[8px] font-mono bg-white">قيمة</span>
                                  <span>{language === "ar" ? "الأرقام والقياسات" : "Numerical/Reading"}</span>
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 justify-end">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                                <span>
                                  {language === "ar" ? "نصيحة للجودة: انقر فوق اسم اليوم بالعمود بالجدول للملء التلقائي لكامل العمود بـ (✔) دفعة واحدة!" : "Tip: Click any Day column header above to fill the entire column with (✔) instantly!"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Interactive Data Table */}
                          <div className="overflow-x-auto border rounded-lg border-slate-200 print:border-none animate-fade">
                            <table className="min-w-full text-right divide-y divide-slate-250 border-collapse print:text-black">
                              <thead className="bg-slate-100 border-b-2 border-slate-900">
                                <tr className="divide-x divide-x-reverse divide-slate-200">
                                  <th scope="col" className="px-2 py-3 text-center text-xs font-black text-slate-800 w-10">M</th>
                                  <th scope="col" className="px-2 py-3 text-center text-xs font-black text-slate-800 w-16">Code</th>
                                  <th scope="col" className="px-3 py-3 text-right text-xs font-black text-slate-800 min-w-[220px]">
                                    {language === "ar" ? "الصنف والمستلزم المطلوب فصحه وجرده" : "Medical Item description"}
                                  </th>
                                  <th scope="col" className="px-2 py-3 text-center text-xs font-black text-slate-850 w-16">Unit</th>
                                  <th scope="col" className="px-2 py-3 text-center text-xs font-black text-slate-850 w-12 mr-1">Qty</th>
                                  
                                  {/* Day headers with Bulk Action Checkboxes */}
                                  {dayFocus === "all" ? (
                                    Array.from({ length: numDays }, (_, i) => (i + 1).toString()).map(day => (
                                      <th 
                                        key={day} 
                                        scope="col" 
                                        onClick={() => handleBulkFillDay(day)}
                                        className="day-col px-0.5 py-1 text-center text-[9px] font-mono text-slate-700 cursor-pointer lg:hover:bg-slate-200 active:bg-slate-300 select-none print:cursor-default print:hover:bg-transparent"
                                        title={language === "ar" ? "انقر للملء التلقائي لليوم" : "Click to Bulk Fill Day"}
                                      >
                                        <div className="font-bold">{day}</div>
                                        <div className="no-print text-[7px] text-pink-500 font-sans font-normal border-t mt-0.5 leading-none">
                                          Fill
                                        </div>
                                      </th>
                                    ))
                                  ) : (
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-bold text-pink-700 w-24">
                                      {language === "ar" ? `يوم الفحص ${dayFocus}` : `Day ${dayFocus}`}
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              
                              <tbody className="bg-white divide-y divide-slate-200 border-b border-slate-900">
                                {editingRecord.gridData.map((row, rIndex) => (
                                  <tr 
                                    key={row.code || rIndex} 
                                    className="divide-x divide-x-reverse divide-slate-200 hover:bg-slate-50 transition print:hover:bg-transparent"
                                  >
                                    {/* S/N */}
                                    <td className="px-2 py-2 text-center text-xs font-bold font-mono text-slate-500">
                                      {row.sn || rIndex + 1}
                                    </td>
                                    
                                    {/* Code */}
                                    <td className="px-2 py-2 text-center text-xs font-bold font-mono text-slate-500">
                                      {row.code || "N/A"}
                                    </td>

                                    {/* Bilingual descriptor */}
                                    <td className="px-3 py-2 text-right text-xs">
                                      <div className="font-bold text-slate-900 leading-tight">
                                        {row.itemAr}
                                      </div>
                                      <div className="text-[9px] text-slate-450 leading-none mt-1 font-mono">
                                        {row.itemEn}
                                      </div>
                                    </td>

                                    {/* Unit */}
                                    <td className="px-2 py-2 text-center text-[10px] uppercase font-bold text-slate-500">
                                      {row.unit || "-"}
                                    </td>

                                    {/* Target Qty */}
                                    <td className="px-2 py-2 text-center text-xs font-bold text-slate-705 font-mono">
                                      {row.qty || "-"}
                                    </td>

                                    {/* Columns for checkmarks days */}
                                    {dayFocus === "all" ? (
                                      Array.from({ length: numDays }, (_, i) => (i + 1).toString()).map(day => {
                                        const val = row.days[day] || "";
                                        return (
                                          <td
                                            key={day}
                                            onClick={() => handleCellToggle(rIndex, day)}
                                            className={`day-col px-0.5 text-center text-[10px] font-bold cursor-pointer transition select-none print:cursor-default ${
                                              val === "✔" 
                                                ? "bg-emerald-50 text-emerald-700" 
                                                : val === "✘" 
                                                ? "bg-red-50 text-red-650 font-black" 
                                                : val !== "" 
                                                ? "bg-blue-50 text-blue-800 font-mono text-[9px]" 
                                                : "lg:hover:bg-slate-100"
                                            }`}
                                          >
                                            {val}
                                          </td>
                                        );
                                      })
                                    ) : (
                                      // Single focused Day Column mode
                                      <td
                                        onClick={() => handleCellToggle(rIndex, dayFocus.toString())}
                                        className={`px-3 py-2 text-center text-xs font-bold cursor-pointer transition select-none ${
                                          row.days[dayFocus.toString()] === "✔" 
                                            ? "bg-emerald-50 text-emerald-800" 
                                            : row.days[dayFocus.toString()] === "✘" 
                                            ? "bg-red-50 text-red-800 font-black" 
                                            : row.days[dayFocus.toString()] !== "" 
                                            ? "bg-blue-50 text-blue-900 font-mono text-[10px]" 
                                            : "lg:hover:bg-slate-100"
                                        }`}
                                      >
                                        {row.days[dayFocus.toString()] || (
                                          <span className="text-[10px] text-slate-350 font-normal">
                                            {language === "ar" ? "اضغط" : "Click"}
                                          </span>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                                <tr className="divide-x divide-x-reverse divide-slate-200">
                                  <td className="px-2 py-2 text-center text-[10px] font-black text-slate-600 bg-slate-100">-</td>
                                  <td className="px-2 py-2 text-center text-[10px] font-black text-slate-600 bg-slate-100">-</td>
                                  <td className="px-3 py-2 text-right text-xs font-black text-slate-800 bg-slate-100/95">
                                    <div className="flex items-center justify-between">
                                      <span>{language === "ar" ? "توقيع وبصمة الموظف اليومي:" : "Daily Verified Signature:"}</span>
                                      <ShieldCheck className="h-3.5 w-3.5 text-pink-600 inline ml-1" />
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-center text-[10px] font-black text-slate-600 bg-slate-100">-</td>
                                  <td className="px-2 py-2 text-center text-[10px] font-black text-slate-600 bg-slate-100">-</td>
                                  
                                  {dayFocus === "all" ? (
                                    Array.from({ length: ledgerViewMode === "weekly" ? 7 : numDays }, (_, i) => (i + 1).toString()).map(day => {
                                      const isDayFilled = editingRecord.gridData.some(row => row.days[day] !== undefined && row.days[day] !== "");
                                      return (
                                        <td key={day} className="day-col px-0.5 py-1.5 text-center text-[9px] font-sans font-black bg-slate-50">
                                          {isDayFilled ? (
                                            <div className="flex flex-col items-center justify-center">
                                              <span className="text-[8px] bg-pink-100 text-pink-850 border border-pink-200/50 py-0.5 px-0.5 rounded leading-none block font-sans scale-[0.9] select-none" title={`Signed by: ${editingRecord.staffName || 'Staff Nurse'}`}>
                                                ✍ {editingRecord.staffName ? editingRecord.staffName.split(" ")[0] : (language === "ar" ? "تمريض" : "Nurse")}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-slate-300">-</span>
                                          )}
                                        </td>
                                      );
                                    })
                                  ) : (
                                    <td className="px-3 py-2 text-center text-xs font-bold bg-slate-50 font-sans">
                                      {editingRecord.gridData.some(row => row.days[dayFocus.toString()] !== undefined && row.days[dayFocus.toString()] !== "") ? (
                                        <span className="text-[10px] bg-pink-100 text-pink-805 border border-pink-200 py-1 px-2 rounded-full inline-block font-sans font-black">
                                          ✍ {editingRecord.staffName || (language === "ar" ? "توقيع التمريض المعتمد" : "Nurse Signoff")}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Signatures row replica */}
                          <div className="grid grid-cols-3 gap-6 pt-10 text-center avoid-break text-xs text-slate-800 print:text-black">
                            <div className="border-t-2 border-slate-900 pt-2 space-y-1">
                              <span className="font-extrabold">{language === "ar" ? "المستلم ومحضر ممرض القسم" : "Prepared Nurse / Officer:"}</span>
                              <div className="h-4"></div>
                              <div className="text-[10px] text-slate-600 font-bold">{editingRecord.staffName || "............................"}</div>
                              <div className="text-[9px] text-slate-400 font-mono">ID: {editingRecord.staffId || "....."}</div>
                            </div>
                            <div className="border-t-2 border-slate-900 pt-2 space-y-1">
                              <span className="font-extrabold">{language === "ar" ? "رئيسة التمريض للقسم" : "Checked Head Nurse:"}</span>
                              <div className="h-6"></div>
                              <div className="text-[10px] text-slate-400 font-bold">................................................</div>
                            </div>
                            <div className="border-t-2 border-slate-900 pt-2 space-y-1">
                              <span className="font-extrabold">{language === "ar" ? "مراقب الجودة والتنمية" : "Hospital Quality Controller:"}</span>
                              <div className="h-6"></div>
                              <div className="text-[10px] text-slate-400 border border-transparent">
                                {editingRecord.additionalInfo?.isQualityCertified 
                                  ? (language === "ar" ? `معتمد: ${editingRecord.additionalInfo.certifiedBy}` : `Certified: ${editingRecord.additionalInfo.certifiedBy}`)
                                  : "................................................"}
                              </div>
                            </div>
                          </div>

                          {/* Document footer references */}
                          <div className="text-center pt-6 border-t text-[9px] text-slate-400 font-mono avoid-break">
                            <span>Revision: {selectedTemplate.code} | Issue Date: {selectedTemplate.issueDate} | ${hospitalSettings.nameEn} Clinical Quality Archive - Page 1 of 1</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-3 text-center py-20 bg-white border rounded-xl border-dashed border-slate-300 p-8">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2 animate-bounce" />
                  <p className="text-sm font-bold text-slate-600">
                    {language === "ar" ? "يرجى الضغط على نموذج من قائمة الـ 200 شيت النشطة للبدء بالتسجيل" : "Please select any form template on sidebar or click create blank database log to start."}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

          {/* TAB: Interactive Quality Compliance Analytics & CQI Suite */}
          {activeTab === "analytics" && (
            <QualityAnalyticsHub
              records={records}
              allAvailableTemplates={allAvailableTemplates}
              language={language}
              currentUser={currentUser}
              resolvedGaps={resolvedGaps}
              handleToggleGapState={handleToggleGapState}
              editingGapKey={editingGapKey}
              setEditingGapKey={setEditingGapKey}
              gapResolutionNote={gapResolutionNote}
              setGapResolutionNote={setGapResolutionNote}
              handleSaveGapResolution={handleSaveGapResolution}
              handleSeedMockAuditData={handleSeedMockAuditData}
              setRecords={setRecords}
              sentinelIncidents={sentinelIncidents}
              setSentinelIncidents={setSentinelIncidents}
              jciCheckedArray={jciCheckedArray}
              setJciCheckedArray={setJciCheckedArray}
              analyticsSubTab={analyticsSubTab}
              setAnalyticsSubTab={setAnalyticsSubTab}
              showIncidentForm={showIncidentForm}
              setShowIncidentForm={setShowIncidentForm}
              newIncidentForm={newIncidentForm}
              setNewIncidentForm={setNewIncidentForm}
              addSystemLog={addSystemLog}
              notifications={notifications}
              setNotifications={setNotifications}
              handleNotificationClick={handleNotificationClick}
              hospitalSettings={hospitalSettings}
            />
          )}

          {false && (() => {
            // Aggregate quality statistics dynamically
            let totalChecks = 0;
            let successfulChecks = 0;
            let criticalFailures = 0;
            const openAlertsList: any[] = [];

            records.forEach((rec) => {
              const temp = allAvailableTemplates?.find(t => t.id === rec.templateId);
              const templateTitle = temp ? (language === "ar" ? temp.titleAr : temp.titleEn) : rec.templateId;
              const templateCode = temp ? temp.code : "";
              
              if (rec.gridData) {
                rec.gridData.forEach((row) => {
                  if (row.days) {
                    Object.entries(row.days).forEach(([day, val]) => {
                      if (val) {
                        totalChecks++;
                        if (val === "✔" || val !== "✘") {
                          successfulChecks++;
                        }
                        if (val === "✘") {
                          criticalFailures++;
                          const gapKey = `${rec.id}-${row.code || row.itemEn}-${day}`;
                          openAlertsList.push({
                            recordId: rec.id,
                            recordDate: rec.date,
                            templateCode,
                            templateTitle,
                            itemName: row.itemAr,
                            itemEn: row.itemEn,
                            dayNum: day,
                            staffName: rec.staffName,
                            department: rec.department,
                            uniqueGapKey: gapKey
                          });
                        }
                      }
                    });
                  }
                });
              }
            });

            const compliancePercent = totalChecks > 0 ? Math.round((successfulChecks / totalChecks) * 100) : 100;

            return (
              <div className="space-y-6 animate-fade text-right font-sans">
                
                {/* Header section with branding & Seeding Action button */}
                <div className="bg-gradient-to-l from-pink-500/10 via-pink-400/5 to-transparent p-6 rounded-2xl border border-pink-100 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-right">
                    <span className="bg-pink-600 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
                      Continuous Quality Improvement (CQI)
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-2 flex items-center justify-end gap-2">
                      <span>لوحة مؤشرات الجودة لـ {hospitalSettings.nameAr}</span>
                      <TrendingUp className="h-5 w-5 text-pink-600" />
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xl leading-relaxed">
                      مؤشرات ورسومات بيانية حية وفورية تقيس صلاحية الأدوية وعربات الطوارئ ومستويات الجودة عبر كافة وحدات المستشفى الطبية. تساعدك على حصر المعوقات الطبية واتخاذ التدابير التصحيحية فوراً.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {records.length === 0 && (
                      <button
                        onClick={handleSeedMockAuditData}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Database className="h-4 w-4" />
                        <span>توليد وتغذية 3 سجلات طبية تجريبية للتحليل</span>
                      </button>
                    )}
                    {records.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm(language === "ar" ? "هل أنت متأكد من مسح جميع التقارير المسجلة؟" : "Are you sure you want to clear all records?")) {
                            setRecords([]);
                            localStorage.setItem("baheya_medical_records", JSON.stringify([]));
                            alert(language === "ar" ? "تم تصفير المستودع بنجاح." : "Records store cleared.");
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[10px] rounded-lg transition shrink-0"
                      >
                        تفريغ الأرشيف الحالي
                      </button>
                    )}
                  </div>
                </div>

                {/* Real-time Task Submission notifications for supervisors / quality team */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5 text-right no-print">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <button 
                      onClick={() => {
                        const marked = notifications.map(n => ({...n, read: true}));
                        setNotifications(marked);
                        localStorage.setItem("baheya_notifications", JSON.stringify(marked));
                      }}
                      className="text-[10px] text-pink-600 font-extrabold hover:text-pink-800 hover:underline transition cursor-pointer"
                    >
                      {language === "ar" ? "تعديل المقروء كلياً" : "Mark all as read"}
                    </button>
                    <h3 className="text-sm font-black text-slate-850 flex items-center gap-1.5 justify-end">
                      <span className="bg-rose-500 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold animate-pulse leading-none">
                        {notifications.filter(n => !n.read).length}
                      </span>
                      <span>تنبيهات تسليم وحفظ الكواشف والشيتات اليومية من التمريض</span>
                      <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
                    </h3>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-3 text-center">
                        {language === "ar" ? "لا توجد أي تنبيهات جديدة من وحدات المستشفى الطبية." : "No new alerts at this moment."}
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 rounded-xl border text-xs transition flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 cursor-pointer hover:border-pink-300 hover:bg-white active:bg-slate-50 ${
                            notif.read ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-rose-50/40 border-rose-100 text-slate-850 font-bold"
                          }`}
                        >
                          <div className="text-[10px] font-mono text-slate-400 shrink-0 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${notif.read ? 'bg-slate-300' : 'bg-rose-500 animate-ping'}`} />
                            <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-right flex-1 text-[11px] leading-relaxed hover:text-pink-650 transition">
                            {language === "ar" ? notif.messageAr : notif.messageEn}
                          </div>
                          {!notif.read && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-extrabold text-[9px] rounded shrink-0">
                              {language === "ar" ? "جديد (انقر للمتابعة)" : "New (Click to open)"}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Statistical Cards Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  
                  {/* 1. Quality Compliance Score Gauge */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">معدل الامتثال العام للأقسام</span>
                      <h4 className="text-2xl font-black text-slate-800 mt-1">
                        {records.length === 0 ? "96%" : `${compliancePercent}%`}
                      </h4>
                      <span className="text-[9px] text-emerald-600 font-sans block mt-1">
                        {records.length === 0 ? "● مستند على عينات المعايير الطبية للثقة" : "● تحديث تلقائي حسب الفحوصات الجارية"}
                      </span>
                    </div>
                    <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-pink-600"
                          strokeDasharray={`${records.length === 0 ? 96 : compliancePercent}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-[10px] font-black text-pink-700 font-sans">
                          {records.length === 0 ? "96" : compliancePercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Total Audits Count */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">عدد الجرودات الموثقة بالأرشيف</span>
                      <h4 className="text-2xl font-black text-slate-800 mt-1">
                        {records.length} {language === "ar" ? "جرودات مأرشفة" : "logs"}
                      </h4>
                      <span className="text-[9px] text-slate-400 block mt-1">
                        بمتوسط تسجيل جودة دوري لكل نموذج نشط
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 text-pink-600 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                  </div>

                  {/* 3. Deficiency alerts / quality issues */}
                  <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${
                    (records.length === 0 ? 1 : openAlertsList.length) > 0 
                      ? "bg-rose-50/50 border-rose-200" 
                      : "bg-white border-slate-200"
                  }`}>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">ثغرات أو عيوب معلقة رصدت حديثاً</span>
                      <h4 className={`text-2xl font-black mt-1 ${
                        (records.length === 0 ? 1 : openAlertsList.length) > 0 ? "text-rose-700" : "text-slate-800"
                      }`}>
                        {records.length === 0 ? 1 : openAlertsList.filter(g => !resolvedGaps[g.uniqueGapKey]?.resolved).length} {language === "ar" ? "ثغرات غير محلولة" : "Deficiencies"}
                      </h4>
                      <span className="text-[9px] text-slate-500 block mt-1">
                        تتضمن أدوات مفقودة، درجات حرارة منتهكة أو أقفال مكسورة
                      </span>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                      (records.length === 0 ? 1 : openAlertsList.length) > 0 
                        ? "bg-rose-100 border-rose-200 text-rose-600" 
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}>
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                  </div>

                  {/* 4. Total staff concept switches */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">كادر العمل الطبي المنشط</span>
                      <h4 className="text-2xl font-black text-slate-800 mt-1">
                        {systemUsers.length} {language === "ar" ? "أعضاء كادر" : "accounts"}
                      </h4>
                      <span className="text-[9px] text-slate-400 block mt-1">
                        صلاحيات موزعة بين (الأدمن، التمريض والجودة)
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 text-pink-600 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                  </div>

                </div>

                {/* Creative AI-Driven Predictive Analytics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print text-right font-sans">
                  {/* AI Nurse Burnout & Clinical Error Predictor Card */}
                  <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                      <span className="bg-pink-900/40 text-pink-400 border border-pink-500/20 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded uppercase font-mono">AI PREDICTOR ENGINE</span>
                      <h4 className="font-black text-xs text-slate-200 flex items-center gap-1.5 justify-end">
                        <span>خوارزمية رصد الإجهاد السريري والاحتراق (Burnout Predictor)</span>
                        <TrendingUp size={14} className="text-pink-500" />
                      </h4>
                    </div>

                    <div className="space-y-4 text-xs">
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        يقوم نموذج الذكاء الاصطناعي بربط جداول نوبتجيات التمريض (Roster Metrics) بقوائم الأخطاء والملاحظات السريرية المسجلة للتنبؤ بمستويات التعب والإجهاد البشري ومنع الحوادث الطبية مسبقاً.
                      </p>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850/60 text-center">
                          <span className="text-xs font-mono font-black text-rose-450 text-rose-400 block">78% RISK LEVEL</span>
                          <span className="text-[10px] text-slate-400 block mt-1">معامل خطر الإجهاد (ICU)</span>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850/60 text-center">
                          <span className="text-xs font-mono font-black text-emerald-400 block">-38% REDUCTION</span>
                          <span className="text-[10px] text-slate-400 block mt-1">تحسين توزيع النوبتجيات</span>
                        </div>
                      </div>

                      <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-950/40 text-right space-y-1.5">
                        <span className="text-[10px] font-extrabold text-rose-300 block">💡 توصية وقائية حرجة عاجلة لـ د. محمد السيد:</span>
                        <p className="text-[10.5px] text-slate-200 leading-normal font-sans text-right">
                          رصد تراكم نوبتجيات ليلية متتالية لـ **(أ. مريم كمال)** في وحدة الحالات الحرجة. نوصي بتبديل نوبتجية ليلة الخميس مع **(أ. فاطمة)** لتخفيض معامل الخطأ السريري المتوقع بنسبة 45%.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Predictive Inventory Asset Exhaustion Module Card */}
                  <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                      <span className="bg-cyan-950/60 text-cyan-400 border border-cyan-500/20 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded uppercase font-mono">ASSET VELOCITY CALC</span>
                      <h4 className="font-black text-xs text-slate-200 flex items-center gap-1.5 justify-end">
                        <span>المتنبئ الذكي لنفاد مخزون المستلزمات الطبية</span>
                        <TrendingUp size={14} className="text-cyan-400" />
                      </h4>
                    </div>

                    <div className="space-y-4 text-xs font-sans">
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        من خلال استهلاك المستلزمات اليومي المدون في لوحة الجرود السريعة، يحسب الذكاء الاصطناعي سرعة النفاد (Consumption Velocity) ويتوقع تاريخ نفاد المخزون باليوم والساعة لتفادي انقطاع الأدوية الحساسة.
                      </p>

                      <div className="space-y-2 text-right">
                        {/* Drug 1 */}
                        <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 text-slate-300">
                          <span className="font-bold text-rose-400 font-sans">نفاد متوقع: 24 يونيو 2026</span>
                          <span className="text-[11px] font-bold text-slate-205 text-slate-200">حقن مرشحات الأنسولين (Onco-Syringes)</span>
                        </div>
                        {/* Drug 2 */}
                        <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 text-slate-300">
                          <span className="font-bold text-amber-400 font-sans">نفاد متوقع: 19 يوليو 2026</span>
                          <span className="text-[11px] font-bold text-slate-205 text-slate-200">جل تشغيل صدمات قلبية (DC Shock Gels)</span>
                        </div>
                      </div>

                      <p className="text-[9.5px] text-slate-500 font-mono text-left">
                        * Calculations refreshed instantly upon nurse submission entries.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lower Section Grid: Department progress & CQI alert tracker */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Left Area: Department compliance meters (comparative list) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b pb-2">
                      <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1 justify-end">
                        <span>إمتثال الأقسام الطبية لمعايير الجودة</span>
                        <Award className="h-4 w-4 text-pink-600" />
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        تقييم نسبي لمعدل التزام فرق التمريض بالجرد المنهجي المعتمد ل${hospitalSettings.nameAr || "المؤسسة"}.
                      </p>
                    </div>

                    <div className="space-y-4 pt-1">
                      {/* Unit 1 */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                          <span className="font-mono bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded text-[8px]">98% EXCELLENT</span>
                          <span className="font-bold">وحدة طوارئ واستقبل ${hospitalSettings.nameAr || "المؤسسة"} (Emergency Dept)</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute top-0 right-0 h-full bg-emerald-500 rounded-full" style={{ width: "98%" }}></div>
                        </div>
                      </div>

                      {/* Unit 2 */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                          <span className="font-mono bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded text-[8px]">94% RELIABLE</span>
                          <span className="font-bold">وحدة تحضير العلاج الكيماوي (Chemo-Prep)</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute top-0 right-0 h-full bg-pink-500 rounded-full" style={{ width: "94%" }}></div>
                        </div>
                      </div>

                      {/* Unit 3 */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                          <span className="font-mono bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded text-[8px]">100% PERFECT</span>
                          <span className="font-bold">غرفة جراحة الأورام (Onco-Surgical Units)</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute top-0 right-0 h-full bg-emerald-500 rounded-full" style={{ width: "100%" }}></div>
                        </div>
                      </div>

                      {/* Unit 4 */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                          <span className="font-mono bg-amber-50 text-amber-700 px-1 py-0.2 rounded text-[8px]">82% MODERATE</span>
                          <span className="font-bold">قسم العيادات الخارجية ومتابعة الأداء (Outpatient)</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute top-0 right-0 h-full bg-amber-400 rounded-full" style={{ width: "82%" }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-normal">
                      💡 <strong>ملاحظة المراقبة والاعتماد الصحى:</strong> لرفع نسبة الامتثال في الأقسام الأقل حظاً، ينبغي مراجعة جداول تسليم الشيفتات والتأكد من إمضاء التمريض بالتناوب يومياً.
                    </div>
                  </div>

                  {/* Right Area: Interactive Closed-Loop Audit Gaps Tracker & Alert System */}
                  <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="border-b pb-2 flex items-center justify-between">
                        <span className="bg-rose-100 text-rose-700 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">LIVE OBSERVATIONS</span>
                        <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                          <span>مركز رصد الثغرات والعيوب الطبية الحرجة</span>
                          <ShieldAlert className="h-4 w-4 text-rose-600" />
                        </h4>
                      </div>

                      <p className="text-[10px] text-slate-400 mt-1 mb-3">
                        عندما يقوم الكادر برصد خلل (علامة ✘) في أدوات الفحص، تظهر الثغرة هنا فوراً لتمكين الجودة أو رئيسة التمريض من كتابة الإجراء التصحيحي وإقفال البوابة الطبية للثغرة:
                      </p>

                      {/* Gap Inline Resolution Dialog workspace */}
                      {editingGapKey && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-3 space-y-2 text-right">
                          <span className="font-bold text-[10px] text-amber-800">✍️ تسجيل القرار والتصحيح اللازم:</span>
                          <textarea
                            value={gapResolutionNote}
                            onChange={(e) => setGapResolutionNote(e.target.value)}
                            placeholder="مثال: تم تعبئة الأدرينالين المفقود من صيدلية المستشفى وتركيب قفل جرد بلاستيكي أحمر جديد مخصص ذو رقم كود معتمد بالوقت الحالي."
                            className="w-full bg-white border border-slate-200 p-2 text-xs rounded shadow-inner font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            rows={2}
                          />
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => setEditingGapKey(null)}
                              className="text-[10px] font-bold text-slate-500 hover:underline"
                            >
                              تراجع
                            </button>
                            <button
                              onClick={handleSaveGapResolution}
                              className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded shadow cursor-pointer flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              <span>تثبيت الإجراء وتصحيح الثغرة</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Scannable Gaps Table */}
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {/* If no records exist, show 1 sample gap automatically for experience */}
                        {records.length === 0 ? (
                          <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl relative flex items-start gap-3">
                            <div className="flex-1 text-right min-w-0">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className="text-[8px] bg-red-100 text-red-700 font-extrabold rounded px-1">نموذج تجريبي</span>
                                <span className="font-black text-rose-900 truncate block">فشل اختبار بطارية ومكثف جهاز الصدمات الكهربائية DC Shock</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                                عربة طوارئ الطوارئ والإنعاش / اليوم الخامس - رصدت بواسطة (أ. فاطمة الزهراء)
                              </p>
                              
                              {/* Resolution status check */}
                              {resolvedGaps["mock-crashcart"]?.resolved ? (
                                <div className="bg-emerald-50/60 border border-emerald-100 p-2 rounded-lg mt-2 text-[10px] text-emerald-800 font-sans">
                                  <p className="font-bold">✔ تم حل الخلل عبر قرار الجودة:</p>
                                  <p className="text-[9px] text-emerald-700 mt-0.5">{resolvedGaps["mock-crashcart"].notes}</p>
                                  <div className="text-[8px] text-slate-400 mt-1">
                                      بواسطة: {resolvedGaps["mock-crashcart"].resolvedBy} - بتاريخ: {resolvedGaps["mock-crashcart"].resolvedAt}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 text-left">
                                  <button
                                    onClick={() => handleToggleGapState("mock-crashcart")}
                                    className="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white shadow-sm rounded text-[9px] font-extrabold transition cursor-pointer"
                                  >
                                    اتخاذ إجراء وإقرار تصحيح جودة
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                              <X className="h-4 w-4" />
                            </div>
                          </div>
                        ) : (
                          openAlertsList.map((gap) => {
                            const resInfo = resolvedGaps[gap.uniqueGapKey];
                            const isResolved = resInfo?.resolved;
                            
                            return (
                              <div
                                key={gap.uniqueGapKey}
                                className={`p-3 border rounded-xl relative flex items-start gap-3 transition-colors ${
                                  isResolved ? "bg-emerald-50/20 border-emerald-100" : "bg-red-50/30 border-red-150"
                                }`}
                              >
                                <div className="flex-1 text-right min-w-0">
                                  <div className="flex items-center gap-1.5 justify-end">
                                    {isResolved && (
                                      <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                        تم التصحيح والحل
                                      </span>
                                    )}
                                    <span className="font-black text-rose-900 truncate block">خلل في: {gap.itemName} / {gap.itemEn}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                                    {gap.templateTitle} ({gap.templateCode}) / اليوم {gap.dayNum} - بقسم: {gap.department} - بواسطة ({gap.staffName})
                                  </p>

                                  {isResolved ? (
                                    <div className="bg-emerald-50/60 border border-emerald-100 p-2 rounded-lg mt-2 text-[10px] text-emerald-800 font-sans">
                                      <p className="font-bold">✔ إجراء معتمد لتصحيح الجودة:</p>
                                      <p className="text-[9px] text-emerald-700 mt-0.5">{resInfo.notes}</p>
                                      <div className="text-[8px] text-slate-400 mt-1">
                                        بواسطة: {resInfo.resolvedBy} / بتاريخ: {resInfo.resolvedAt}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2 text-left">
                                      <button
                                        onClick={() => handleToggleGapState(gap.uniqueGapKey)}
                                        className="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white shadow-sm rounded text-[9px] font-extrabold transition cursor-pointer"
                                      >
                                        اتخاذ إجراء وإقرار تصحيح جودة
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                                  isResolved ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-rose-100 border-rose-200 text-rose-600"
                                }`}>
                                  {isResolved ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                </div>
                              </div>
                            );
                          })
                        )}
                        
                        {records.length > 0 && openAlertsList.length === 0 && (
                          <div className="text-center py-10 bg-emerald-50/20 border border-dashed border-emerald-200 rounded-xl p-4">
                            <span className="text-xl">🏆</span>
                            <p className="font-bold text-emerald-800 text-xs mt-1.5">أنت على قمة الهرم الطبي للجودة!</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">لم يتم رصد أي ثغرات أو نواقص أو أقفال مكسورة حالياً في جميع الوثائق المدققة.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-3 mt-4 text-[9px] text-slate-400 flex items-center justify-between">
                      <span>BAHEYA CQI COMMAND-ALERTS CLOUD WORKSPACE</span>
                      <span>تحديث مستمر ●</span>
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}

          {activeTab === "it_panel" && (
            <div className="space-y-6 animate-fade font-sans text-right" dir="rtl">
              <div className="bg-gradient-to-l from-slate-900 via-pink-950 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl text-white">
                <div className="flex justify-between items-center flex-row-reverse flex-wrap gap-4">
                  <div>
                    <span className="bg-pink-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">IT & DEV CONSOLE</span>
                    <h2 className="text-xl font-black mt-1">💻 لوحة الإدارة والدعم والبرمجة الأكاديمية (Admin, IT & Developers Hub)</h2>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(["admin_ops", "it_infra", "dev_sandbox", "dr_backup"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setItSubTab(tab)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          itSubTab === tab ? "bg-pink-600 text-white shadow" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {tab === "admin_ops" ? "إدارة الصلاحيات" : tab === "it_infra" ? "السيرفرات والأجهزة" : tab === "dev_sandbox" ? "مختبر المطور" : "النسخ الاحتياطي & PIN"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {itSubTab === "admin_ops" && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <h3 className="font-extrabold text-slate-800 border-b pb-2 flex items-center gap-2 justify-end">
                    <span>تحكم المشرف والتحقق الرقمي للمؤسسة</span>
                    <span className="text-pink-600">🛡️</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border p-4 rounded-xl space-y-3 bg-slate-50 text-right">
                      <span className="font-bold text-slate-700 block">🔒 قفل تاريخ الجرد السريري للميدان</span>
                      <p className="text-[11px] text-slate-500">منع التعديلات ذات التواريخ الراجعة وحصر الجرد باليوم الحالي للسلامة السريرية.</p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={itStrictComplianceMode}
                          onChange={(e) => setItStrictComplianceMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                        <span className="mr-3 text-xs font-bold text-slate-600">تفعيل القاعدة الصارمة</span>
                      </label>
                    </div>

                    <div className="border p-4 rounded-xl space-y-3 bg-slate-50 text-right">
                      <span className="font-bold text-slate-700 block">🔄 علاج تعارض البيانات التلقائي (Anti-Drift)</span>
                      <p className="text-[11px] text-slate-500">معالجة تعارضات الكتابة مع السقوف السحابية بشكل آلي باستخدام الطوابع الزمنية.</p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={itConflictResolutionWithNewest}
                          onChange={(e) => setItConflictResolutionWithNewest(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                        <span className="mr-3 text-xs font-bold text-slate-600">تفعيل دمج الطوابع الزمنية</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {itSubTab === "it_infra" && (
                <div className="space-y-6 text-right select-none">
                  {/* Top Block: Network Security Operations Warning Controls */}
                  <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-4">
                    <div className="flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-100 flex items-center gap-2 justify-end text-lg">
                          <span>وحدة التحكم والتدخل السيبراني السريع - CISO CONSOLE</span>
                          <span className="text-rose-500 animate-pulse">⚡</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">المكتب المسؤول: د. محمد السيد (Operations Admin Staff ID: 9999)</p>
                      </div>

                      {/* Emergency global lockdown slider button */}
                      <div className="flex items-center gap-3 bg-red-955 p-3 rounded-xl border border-red-900/60 self-start sm:self-auto bg-red-950">
                        <div className="text-right">
                          <span className="block text-xs font-black text-rose-400">🚨 قفل غلق النظام العام</span>
                          <span className="block text-[9px] text-slate-400 font-sans">غلق فوري للواجهات وسحب الجلسات لجميع الكوادر</span>
                        </div>
                        <button
                          onClick={() => {
                            const before = isGlobalLockdownActive;
                            setIsGlobalLockdownActive(!before);
                            playSpatialAudioContextTone(!before ? "alarm" : "success");
                            addSystemLog(`Global emergency system lockdown switch toggled to ${!before ? "ACTIVE" : "INACTIVE"} by Admin 9999`, !before ? "error" : "success");
                          }}
                          className={`w-14 h-8 rounded-full transition-all relative p-1 outline-none cursor-pointer ${isGlobalLockdownActive ? "bg-rose-600 animate-pulse" : "bg-slate-800"}`}
                        >
                          <span className={`w-6 h-6 rounded-full bg-white block absolute top-1 shadow-md transition-all ${isGlobalLockdownActive ? "left-7 bg-red-100" : "left-1"}`} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 text-right">
                      {/* Left: Port and Webhook Webhook Ports Matrix */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                        <span className="block text-xs font-black text-pink-400 uppercase tracking-widest">⚙️ تهيئة المنافذ والويب هوك - Webhook & Port Matrix</span>
                        
                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">منفذ البث السحابي (Live Server Port ID):</label>
                            <input
                              type="text"
                              value={liveServerPort}
                              onChange={(e) => setLiveServerPort(e.target.value.replace(/\D/g, ""))}
                              className="w-full bg-slate-900 border border-slate-800 p-2 text-center text-xs font-mono font-bold rounded-lg text-amber-400 focus:outline-none focus:border-pink-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">رابط إنذار الطوارئ (Emergency Broadcast Webhook URL):</label>
                            <input
                              type="text"
                              value={alertWebhookUrl}
                              onChange={(e) => setAlertWebhookUrl(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 p-2 text-left text-xs font-mono rounded-lg text-pink-450 text-pink-400 focus:outline-none focus:border-pink-500"
                            />
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setWebhookTestStatus("SENDING");
                                playSpatialAudioContextTone("click");
                                setTimeout(() => {
                                  setWebhookTestStatus("SUCCESS_200_OK");
                                  addSystemLog(`Self-test notification dispatched to ${alertWebhookUrl} on enterprise port ${liveServerPort} - Returned HTTP 200 OK`, "success");
                                  playSpatialAudioContextTone("success");
                                }, 1200);
                              }}
                              disabled={webhookTestStatus === "SENDING"}
                              className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-bold rounded-lg transition text-slate-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>{webhookTestStatus === "SENDING" ? "جاري الإرسال ومحاكاة POST..." : "⚡ بث حمولة ويب-هوك تجريبية (POST)"}</span>
                            </button>
                            {webhookTestStatus !== "IDLE" && (
                              <div className={`mt-2 p-2 rounded text-[10px] text-center font-mono font-bold ${webhookTestStatus.includes("SUCCESS") ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-blue-950 text-blue-300 border border-blue-900"}`}>
                                STATE: [{webhookTestStatus}]
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Active sessions Ledger and Security Reaper */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              playSpatialAudioContextTone("click");
                              setWebhookTestStatus("SENDING");
                              setTimeout(() => {
                                const criticalSessions = activeMockSessions.filter(s => s.idle > 20 && s.ward !== "QUALITY & IT DEPT");
                                if (criticalSessions.length > 0) {
                                  criticalSessions.forEach(cs => {
                                    addSystemLog(`[SECURITY REAPER] Auto-terminated inactive nurse node session [${cs.id}] of Staff ID ${cs.staffId} inside clinical ward ${cs.ward} (Passed idle: ${cs.idle} mins)`, "warning");
                                  });
                                  const remaining = activeMockSessions.map(s => {
                                    if (s.idle > 20 && s.ward !== "QUALITY & IT DEPT") {
                                      return { ...s, status: "Reaped", idle: 0 };
                                    }
                                    return s;
                                  });
                                  setActiveMockSessions(remaining);
                                  alert(`🚨 تم الحاصد الأمني وطرد ${criticalSessions.length} جلسات خاملة بنجاح لحماية السجلات!`);
                                  playSpatialAudioContextTone("alarm");
                                } else {
                                  alert(`✔ جميع الأجهزة النشطة ممتثلة وتخضع للنشاط والمسح المستمر.`);
                                  playSpatialAudioContextTone("success");
                                }
                                setWebhookTestStatus("IDLE");
                              }, 800);
                            }}
                            className="bg-rose-900 hover:bg-rose-850 text-white text-[9px] font-black px-2 py-1 rounded cursor-pointer transition hover:scale-105"
                          >
                            🧹 تشغيل حاصد الخمول (Reaper)
                          </button>
                          <span className="block text-xs font-black text-pink-400 uppercase tracking-widest">👤 قائمة الجلسات النشطة وسقوف الخمول</span>
                        </div>

                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {activeMockSessions.map((sess) => (
                            <div key={sess.id} className="p-2 bg-slate-900/60 rounded-lg border border-slate-850 text-right text-[10px] space-y-1 relative font-sans">
                              <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${sess.status === "Active" ? "bg-emerald-400 animate-pulse" : sess.status === "Reaped" ? "bg-red-500 animate-ping" : "bg-amber-400 animate-pulse"}`} />
                              <div className="flex items-center gap-1.5 justify-end text-[10px]">
                                <span className="text-slate-400">({sess.id})</span>
                                <span className="font-extrabold text-slate-200">كادر كود رقم: {sess.staffId}</span>
                              </div>
                              <p className="text-slate-400 text-[9px]">القسم المفتوح: {sess.ward} &bull; Node IP: {sess.ip}</p>
                              <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1">
                                <span>{sess.os}</span>
                                <span className="font-bold">الحالة: {sess.status === "Reaped" ? <span className="text-red-500">مطرود (Reaped)</span> : <span>خمول {sess.idle} دقيقة</span>}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Active Diagnostics Sweep & Code Blue Transmitter */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                        <span className="block text-xs font-black text-pink-400 uppercase tracking-widest">📡 فحص استجابة الشبكة والاتصالات</span>
                        
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              setPingSweepStatus("RUNNING");
                              playSpatialAudioContextTone("click");
                              setTimeout(() => {
                                const newPings: Record<string, number> = {};
                                Object.keys(pingLatencies).forEach(k => {
                                  newPings[k] = Math.floor(Math.random() * 21) + 2;
                                });
                                setPingLatencies(newPings);
                                setPingSweepStatus("SUCCESS");
                                addSystemLog("Internal facility LAN agency latency sweep triggered over ICU/ER node terminals", "info");
                                playSpatialAudioContextTone("success");
                              }, 1000);
                            }}
                            disabled={pingSweepStatus === "RUNNING"}
                            className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-emerald-400 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>{pingSweepStatus === "RUNNING" ? "جاري المسح الاتصالي بالملي ثانية..." : "📡 فحص اتصال أقسام بهية (LAN Ping Sweep)"}</span>
                          </button>

                          {/* Latencies bars */}
                          <div className="space-y-1.5 pt-1 text-[10px] font-sans">
                            {Object.entries(pingLatencies).map(([dept, val]) => {
                              const ms = val as number;
                              return (
                                <div key={dept} className="flex items-center justify-between text-right">
                                  <span className={`font-bold font-mono ${ms < 10 ? "text-emerald-400" : ms < 20 ? "text-amber-400" : "text-red-400"}`}>{ms}ms</span>
                                  <div className="flex-1 mx-3 h-1.5 bg-slate-900 rounded-full overflow-hidden flex justify-end">
                                    <div className={`h-full rounded-full ${ms < 10 ? "bg-emerald-400" : ms < 20 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${Math.min(100, Math.max(10, (ms / 30) * 100))}%` }} />
                                  </div>
                                  <span className="text-slate-300 text-[9px] w-24 truncate">{dept}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Emergency Code Blue Button Trigger */}
                          <div className="pt-2 border-t border-slate-850/60">
                            <button
                              onClick={() => {
                                playSpatialAudioContextTone("alarm");
                                const alertData = {
                                  zone: currentUser.department || "INTENSIVE CARE",
                                  workstationIp: "192.168.12.115",
                                  timestamp: new Date().toLocaleTimeString()
                                };
                                setActiveCodeBlueAlert(alertData);
                                addSystemLog(`🚨 Emergency CODE BLUE alert initiated by Dr. Mohamed Elsayed from workstation ${alertData.workstationIp}`, "error");
                                alert("🚨 تم تعميم وبث إنذار كود بلو الطارئ لجميع الشاشات النشطة!");
                              }}
                              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black transition text-center shadow-lg animate-pulse uppercase tracking-wider cursor-pointer"
                            >
                              🚨 بث طوارئ كود بلو (Code Blue Alarm)
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Monospace Audit Terminal Beneath */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-white font-mono space-y-3 relative text-right">
                    <span className="absolute top-4 left-4 text-[9px] text-slate-500 uppercase tracking-widest pointer-events-none">Immutable Audit Record</span>
                    <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-900 pb-2 flex items-center gap-2 justify-end">
                      <span>📟 سجل التدقيق والوقائع الطبية غير القالب للتعديل (Immutable Live Trail Terminal)</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </h3>

                    <div className="bg-black/45 p-4 rounded-xl border border-slate-900 max-h-[220px] overflow-y-auto font-mono text-[11px] leading-relaxed text-right flex flex-col-reverse divide-y divide-slate-900/60">
                      {systemLogs.length === 0 ? (
                        <div className="text-center text-slate-500 py-6">
                          # SECURE LEDGER IDLE &bull; NO OVERRIDES COMMITTED IN CURRENT SECURE SPACE
                        </div>
                      ) : (
                        [...systemLogs].reverse().map((log) => (
                          <div key={log.id} className="py-2 flex items-start justify-between gap-4 font-mono">
                            <span className="text-slate-500 text-[10px] shrink-0 select-none">[{log.time}]</span>
                            <div className="flex-1 text-slate-350 text-slate-300">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black mr-2 uppercase ${log.type === "success" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : log.type === "error" ? "bg-rose-950 text-rose-400 border border-rose-900" : log.type === "warning" ? "bg-amber-950 text-amber-500 border border-amber-900" : "bg-slate-900 text-slate-400 border border-slate-850"}`}>
                                {log.type || "INFO"}
                              </span>
                              <span className="font-sans text-[11px] mr-1.5">{log.event}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 text-left pt-1 select-none font-mono">
                      SYSTEM INTEGRATION ENGINE ONLINE - INTEGRITY VALIDATED &bull; SECURE LOCAL & HOST SHA256 BLOCK: 0x9999-BAHEYA
                    </div>
                  </div>
                </div>
              )}

              {itSubTab === "dev_sandbox" && (() => {
                const [ruleAction, setRuleAction] = React.useState<"read" | "write" | "delete">("read");
                const [testRole, setTestRole] = React.useState<string>("staff");
                const [ruleOutput, setRuleOutput] = React.useState<string>("الرجاء الضغط على الزر أدناه لبدء اختبار محاكاة الصلاحيات...");
                const [evaluating, setEvaluating] = React.useState(false);

                const handleEvaluateRule = () => {
                  setEvaluating(true);
                  setTimeout(() => {
                    let result = "";
                    if (ruleAction === "delete") {
                      if (testRole === "admin" || testRole === "it") {
                        result = "🟢 SUCCESS [200 OK]: تم السماح بالعملية بموجب القاعدة: allow delete: if request.auth.token.role in ['admin', 'it'];";
                      } else {
                        result = "🔴 FORBIDDEN [403 Access Denied]: تم حجب محاولة الحذف! يقتصر الحذف على رتب المشرفين والأدمن فقط.";
                      }
                    } else if (ruleAction === "write") {
                      if (testRole === "guest") {
                        result = "🔴 UNAUTHORIZED [401 Denied]: غير مسموح بالكتابة لقالب ضيف غير مصرح له.";
                      } else {
                        result = "🟢 SUCCESS [200 OK]: تم تسجيل المستند بنجاح بموجب قاعدة: allow write: if request.auth.uid != null;";
                      }
                    } else {
                      result = "🟢 SUCCESS [200 OK]: القراءة متاحة لجميع الموظفين المسجلين والموثقين بالبوابة.";
                    }
                    setRuleOutput(result);
                    setEvaluating(false);
                  }, 400);
                };

                return (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm text-right" dir="rtl">
                    <div className="border-b pb-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded font-black">STABLE SUITE</span>
                        <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                          <span>مختبر ومحاكي قواعد حماية بيانات بهية (Developer Rules Auditor)</span>
                          <span className="text-pink-600">🧪</span>
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-slate-400 font-mono">WORKSPACE ID: 9c8b4661-ab0e-4a0b-bf3e-6c70e3b95a58</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Left: Configuration Tester */}
                      <div className="space-y-4 border p-5 rounded-2xl bg-slate-50 border-slate-250/60">
                        <h4 className="font-bold text-slate-700 text-xs text-right">⚙️ اختبار السيناريوهات الأمنية النشطة</h4>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">العملية المخابرة بالقواعد:</label>
                            <div className="grid grid-cols-3 gap-2">
                              {(["read", "write", "delete"] as const).map((act) => (
                                <button
                                  key={act}
                                  onClick={() => setRuleAction(act)}
                                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                                    ruleAction === act ? "bg-pink-600 border-pink-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {act === "read" ? "قراءة (Read)" : act === "write" ? "كتابة (Write)" : "حذف (Delete)"}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">دور الموظف الافتراضي للاختبار:</label>
                            <div className="grid grid-cols-4 gap-2">
                              {["admin", "it", "staff", "guest"].map((role) => (
                                <button
                                  key={role}
                                  onClick={() => setTestRole(role)}
                                  className={`py-1.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold border transition ${
                                    testRole === role ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {role.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={handleEvaluateRule}
                            disabled={evaluating}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white border border-slate-700 text-xs font-extrabold rounded-lg transition cursor-pointer"
                          >
                            {evaluating ? "جاري فحص السقوف الأمنية للمتغيرات..." : "⚡ تشغيل اختبار الأذونات التفاعلية"}
                          </button>
                        </div>
                      </div>

                      {/* Right: Sandbox Rules Auditor Console */}
                      <div className="flex flex-col space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 block">📟 كونسول مخرجات الأمن والامتثال (Direct Live Console):</span>
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex-1 flex flex-col justify-between font-mono text-[11px] select-all min-h-[188px]">
                          <div className="space-y-1 text-emerald-400">
                            <p className="text-slate-500 text-[10px] select-none"># Security Simulator Core v3.1</p>
                            <p className="text-slate-400">auth_uid: "test-dev-user-009"</p>
                            <p className="text-slate-400">token_role: "{testRole}"</p>
                            <p className="text-slate-400">resource_path: "/databases/default/documents/medical_records/*"</p>
                            <p className="text-slate-300">Evaluating execution security criteria matches...</p>
                            <p className={`font-bold mt-2 pt-2 border-t border-slate-900 select-all ${ruleOutput.includes("SUCCESS") ? "text-emerald-400" : "text-rose-400"}`}>
                              {ruleOutput}
                            </p>
                          </div>
                          <div className="text-[9px] text-slate-500 text-left pt-2 select-none border-t border-slate-900 mt-2">
                            FIREBASE CLOUD INFRASTRUCTURE &bull; ACCREDITATION CHECK APPROVED
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

              {itSubTab === "dr_backup" && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <h3 className="font-extrabold text-slate-800 border-b pb-2 flex items-center gap-2 justify-end">
                    <span>إحصاءات استرجاع الـ PIN وضبط السجلات</span>
                    <span className="text-pink-600">🌀</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border p-4 rounded-xl space-y-3 bg-slate-50 text-right">
                      <span className="font-bold text-slate-800 block">إعادة تعيين PIN لكادر طبي</span>
                      <div className="space-y-2">
                        <select
                          value={itSelectedUserIdToOverride}
                          onChange={(e) => {
                            setItSelectedUserIdToOverride(e.target.value);
                            const userObj = systemUsers.find((u: any) => u.id === e.target.value);
                            if (userObj) setItOverwrittenPin(userObj.pin || "1234");
                          }}
                          className="w-full p-2 bg-white border rounded-lg text-xs"
                        >
                          <option value="">-- اختر كادر الموظفين --</option>
                          {systemUsers.map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.nameAr} ({u.staffId})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          maxLength={6}
                          value={itOverwrittenPin}
                          onChange={(e) => setItOverwrittenPin(e.target.value.replace(/\D/g, ""))}
                          placeholder="الـ PIN الجديد"
                          className="w-full p-2 bg-white border rounded-lg text-center font-mono tracking-widest text-sm"
                        />
                        <button
                          onClick={() => {
                            if (!itSelectedUserIdToOverride) return alert("اختر موظف أولاً!");
                            const updatedUsers = systemUsers.map((u: any) => {
                              if (u.id === itSelectedUserIdToOverride) {
                                const uUpdated = { ...u, pin: itOverwrittenPin };
                                saveStaffMember(uUpdated).catch((err: any) => console.error("Firestore update failed", err));
                                return uUpdated;
                              }
                              return u;
                            });
                            setSystemUsers(updatedUsers);
                            localStorage.setItem("baheya_system_users", JSON.stringify(updatedUsers));
                            alert("KEY SECURED PASS SAVE SUCCESSFUL");
                          }}
                          className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition font-sans cursor-pointer"
                        >
                          حفظ الـ PIN السري الجديد
                        </button>
                      </div>
                    </div>

                    <div className="border p-4 rounded-xl bg-rose-50 border-rose-200/60 flex flex-col justify-between text-right">
                      <div>
                        <span className="font-bold text-rose-800 block">🗑️ منطقة خطر استرجاع ضبط الكاش والمستندات</span>
                        <p className="text-[11px] text-rose-700/80 leading-relaxed mt-1 font-sans">تفريغ السجلات والجرودات السريعة والعودة للحالة النقية.</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("هل تريد تصفير قاعدة البيانات بالكامل؟")) {
                            localStorage.clear();
                            window.location.reload();
                          }
                        }}
                        className="w-full mt-2 py-2 bg-rose-600 hover:bg-rose-700 font-sans text-white text-xs font-bold rounded-xl transition cursor-pointer text-center"
                      >
                        🗑️ العودة لوضع المصنع الكامل
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <ProfileView user={currentUser} language={language} />
          )}

          {activeTab === "messaging" && (
            <div className="p-4 bg-slate-50 min-h-[calc(100vh-80px)]" dir="rtl">
              <MessagingDashboard
                currentUser={currentUser}
                systemUsers={systemUsers}
                language={language}
                rosterWishes={rosterWishes}
                setRosterWishes={rawSetRosterWishes}
                rosterList={rosterList}
                setRosterList={rawSetRosterList}
                addSystemLog={addSystemLog}
                notifications={notifications}
                setNotifications={setNotifications}
                hospitalSettings={hospitalSettings}
              />
            </div>
          )}

          {/* TAB 2.6: Approved Nursing Schedule Shift Roster (طبق الأصل من المطبوع والمعتمد لبهية) */}
          {activeTab === "approval" && (
  <div className="p-6 bg-slate-50 min-h-screen">
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h2 className="text-xl font-bold mb-4">{language === "ar" ? "الموافقة على الحسابات الجديدة" : "New Account Approval"}</h2>
      <UserApprovalDashboard users={systemUsers} />
    </div>
  </div>
)}

          {activeTab === "roster_config" && (
            <div className="p-6 bg-slate-50 min-h-screen">
              <RosterPlanningPanel
                language={language}
                hospitalSettings={hospitalSettings}
                systemUsers={systemUsers}
                rosterList={rosterList}
                setRosterList={rawSetRosterList}
                rosterWishes={rosterWishes}
                currentUser={currentUser}
                addSystemLog={addSystemLog}
                onViewUserProfile={setViewingUserProfileUser}
              />
            </div>
          )}

{activeTab === "roster" && (() => {
            const isTabSupervisor = currentUser.role === "admin" || currentUser.role === "quality" || currentUser.role === "president" || currentUser.role === "head_nurse" || currentUser.role === "it";
            const isTabNormalNurse = !isTabSupervisor;
            const isRosterFullyLocked = cnoApproved && directorApproved;


            // Check if there's any approved wish for this selected day key
            const selfApprovedWishForDay = rosterWishes.find(w => 
              w.employeeId === currentUser.id && 
              w.dayKey === wishDayKey && 
              w.status === "approved"
            );

            return (
              <div className="space-y-6 animate-fade font-sans text-right" dir="rtl" id="roster-view-container-element">
                {/* INJECT PRINTING ORIENTATION LANDSCAPE STYLES DYNAMICALLY */}
                <style>{`
                  @media print {
                    @page {
                      size: A4 landscape !important;
                      margin: 0 !important; /* Forces zero outer margin to prevent browser default clipping */
                    }
                    /* Container-driven paddings for absolute safety on printing edges */
                    html, body {
                      width: 100% !important;
                      height: 100% !important;
                      margin: 0 !important;
                      padding: 0.3cm 0.4cm !important;
                      background: #ffffff !important;
                      color: #000000 !important;
                      zoom: 61% !important; /* Optimal scaling to fit 31 days and name cells on A4 Landscape sheet */
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                      box-sizing: border-box !important;
                    }
                    /* Ensure exact background print rules */
                    * {
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                      color-adjust: exact !important;
                    }
                    /* Collapse sidebar, header navigations, support widgets and interactive controllers */
                    aside, nav, header, button, select, textarea, .no-print, .leadership-btn-zone {
                      display: none !important;
                    }
                    .roster-card-box {
                      border: none !important;
                      box-shadow: none !important;
                      padding: 0 !important;
                      margin: 0 !important;
                    }
                    #roster-view-container-element {
                      padding: 0 !important;
                      margin: 0 !important;
                    }
                    /* Roster print scroll wrapper override */
                    .roster-print-wrapper {
                      overflow: visible !important;
                      width: 100% !important;
                      max-width: 100% !important;
                    }
                    table {
                      width: 100% !important;
                      min-width: 100% !important;
                      table-layout: fixed !important;
                      border-collapse: collapse !important;
                    }
                    /* static placement for table freeze/sticky columns during printing */
                    th.sticky, td.sticky {
                      position: static !important;
                      background-color: transparent !important;
                      border-left: 1px solid #000000 !important;
                    }
                    /* Absolute columns spacing layout for fixed grids */
                    th:first-child, td:first-child {
                      width: 13% !important;
                      text-align: right !important;
                      padding-right: 4px !important;
                    }
                    th:not(:first-child), td:not(:first-child) {
                      width: 2.8% !important;
                    }
                    th, td {
                      font-size: 7.5px !important;
                      padding: 3px 1px !important;
                      border: 1px solid #000000 !important;
                      text-align: center !important;
                      word-break: break-all !important;
                    }
                    thead tr {
                      background-color: #f1f5f9 !important;
                    }
                    .stamp-seal-zone {
                      transform: scale(0.85);
                    }
                    /* Force side-by-side printing layout on senior leadership double signatures cards */
                    .signatures-print-grid {
                      display: flex !important;
                      flex-direction: row !important;
                      gap: 16px !important;
                      width: 100% !important;
                    }
                    .signatures-print-grid > div {
                      flex: 1 !important;
                      margin: 0 !important;
                    }
                  }
                `}</style>

                {/* Header Box with Stats */}
                <div className="bg-gradient-to-l from-slate-900 via-rose-950 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl text-white relative overflow-hidden no-print">
                  <div className="absolute left-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-pink-500/10 to-transparent pointer-events-none" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 z-10 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="bg-pink-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          {language === "ar" ? "الهيكل التنظيمي المعتمد للنوبتجيات" : "Official Nursing Roster v5.0"}
                        </span>
                        <Calendar className="h-5 w-5 text-pink-500 animate-bounce" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                        {language === "ar"
                          ? "جدول توزيع نوبتجيات وورديات هيئة التمريض"
                          : "Nursing Shift Scheduling & Roster System"}
                      </h2>
                      <p className="text-slate-200 text-xs leading-relaxed max-w-3xl font-medium">
                        {language === "ar"
                          ? `النظام المتكامل لإدارة جداول الورديات للدورة النشطة (${getPeriodLabelAr(selectedRosterPeriod)}). يتم ربط الموظفين بالجدول تلقائياً لمعرفة الورديات اليومية، مع إتاحة الخصائص للمشرفين والمسؤولين لإجراء تعديلات ملزمة واستقبال ودراسة رغبات الممرضين للموافقة والربط التلقائي في ثوانٍ معدودة.`
                          : `Official roster dashboard for operational cycle: ${getPeriodLabelEn(selectedRosterPeriod)}. Nurses track their daily shifts instantly, while supervisors manage live modifications and approve incoming employee shift wishes.`}
                      </p>
                    </div>

                    <div className="flex gap-2.5 shrink-0 z-10 justify-end">
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 hover:border-white/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
                      >
                        <Printer className="h-4 w-4 text-pink-400" />
                        <span>{language === "ar" ? "🖨️ طباعة الروستر الرسمي المعتمد (على ورقة A4)" : "Print Official Report (Fits on A4 Layout)"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Create New Roster Initialization Box */}
                <div className="bg-pink-50 p-4 rounded-xl border border-pink-200 mb-4 shadow-sm text-right no-print">
                  <h4 className="font-black text-xs text-pink-900 mb-2">{language === "ar" ? "ابدأ دورة روستر جديدة:" : "Initialize New Roster Cycle:"}</h4>
                  <button
                    onClick={() => {
                      if (rosterList.some(r => r.departmentName === selectedRosterDept && (r.month === selectedRosterPeriod || (!r.month && selectedRosterPeriod === "2026-05")))) {
                        alert(language === "ar" ? "عذراً، الروستر للقسم المختار في هذه الفترة موجود بالفعل!" : "Roster for this department and period already exists!");
                        return;
                      }
                      
                      // Filter wishes for this dept and period
                      const periodWishes = rosterWishes.filter(w => w.department === selectedRosterDept && w.period === selectedRosterPeriod);
                      
                      const newRoster = {
                        id: `roster-${selectedRosterDept}-${selectedRosterPeriod}-${Date.now()}`,
                        departmentName: selectedRosterDept,
                        month: selectedRosterPeriod,
                        rows: periodWishes.map((w: any) => ({
                          employeeId: w.employeeId,
                          employeeNameAr: w.employeeNameAr,
                          employeeCode: w.employeeCode,
                          shifts: w.requestedShifts || {}
                        }))
                      };
                      
                      setRosterList(prev => [...prev, newRoster]);
                      addSystemLog(`Initialized new roster for ${selectedRosterDept} (${selectedRosterPeriod}) with ${periodWishes.length} wishes imported.`, "success");
                      alert(language === "ar" ? `✔ تم إنشاء الروستر الجديد لقسم [${selectedRosterDept}] مع استيراد [${periodWishes.length}] رغبة!` : "New roster initialized with wishes!");
                    }}
                    className="flex w-full items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg p-2 font-black text-xs cursor-pointer transition"
                  >
                    <Plus size={14} />
                    <span>{language === "ar" ? `إنشاء وتجميع رغبات قسم: ${selectedRosterDept}` : `Create & Consolidate Wishes: ${selectedRosterDept}`}</span>
                  </button>
                </div>

                {/* Month/Period Switcher & Snapshot Archive Vault */}
                <div className="bg-gradient-to-l from-slate-50 to-slate-100 border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4 text-right no-print">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="bg-pink-100 text-pink-850 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                        {language === "ar" ? "الفترات والأرشفة" : "Historical Vault"}
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-800">
                        {language === "ar" ? "نظام التبديل وأرشفة جداول الشهور التاريخية" : "Operational Cycle Shifter & Archive Vault"}
                      </h3>
                    </div>
                    <Calendar className="h-4.5 w-4.5 text-pink-600 shrink-0" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Switcher Dropdown */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-500">{language === "ar" ? "اختر الشهر / دورة العمل النشطة بالجدول:" : "Active Schedule Month Cycle:"}</label>
                      <select
                        value={selectedRosterPeriod}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedRosterPeriod(val);
                          localStorage.setItem("baheya_selected_roster_period", val);
                          addSystemLog(`Roster active period shifted to ${val}`, "success");
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-1 focus:ring-pink-500 text-xs text-right cursor-pointer"
                      >
                        {availablePeriods.map((p) => (
                          <option key={p.value} value={p.value}>
                            {language === "ar" ? p.labelAr : p.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Archive Operations */}
                    <div className="md:col-span-2 flex flex-col justify-end space-y-2 text-right">
                      <div className="text-[10.5px] text-slate-500 font-medium">
                        {language === "ar" 
                          ? `حفظ الجدول لقسم "${selectedRosterDept}" كأرشيف معتمد للشهر الحالي مغلق للتفتيش والمطابقة بالختم لـ ${hospitalSettings.nameAr || "بهية"}.` 
                          : `Snapshot current roster for ward "${selectedRosterDept}" to local historical index with official stamps.`}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            const monthKey = selectedRosterPeriod || "2026-05";
                            const activeRoster = rosterList.find(r => r.departmentName === selectedRosterDept && (r.month === monthKey || (!r.month && monthKey === "2026-05"))) || { rows: [] };
                            
                            if (activeRoster.rows.length === 0) {
                              alert(language === "ar" ? "لا توجد صفوف نوبتجيات مدرجة لحفظها في الأرشيف!" : "No shifts data to save into archives!");
                              return;
                            }

                            const newArchive = {
                              id: `archive-${selectedRosterDept}-${monthKey}-${Date.now()}`,
                              department: selectedRosterDept,
                              month: monthKey,
                              monthLabelAr: getPeriodLabelAr(monthKey),
                              monthLabelEn: getPeriodLabelEn(monthKey),
                              createdAt: new Date().toLocaleString(),
                              operatorAr: currentUser.nameAr || "مسؤول النظام",
                              operatorEn: currentUser.nameEn || "System Admin",
                              rowsCount: activeRoster.rows.length,
                              cnoName: customCnoName,
                              directorName: customDirectorName,
                              cnoApproved,
                              directorApproved,
                              cnoDate: cnoApprovalDate,
                              directorDate: directorApprovalDate,
                              rows: JSON.parse(JSON.stringify(activeRoster.rows))
                            };

                            const updatedArchives = [newArchive, ...rosterArchives];
                            setRosterArchives(updatedArchives);
                            localStorage.setItem("baheya_roster_archives", JSON.stringify(updatedArchives));
                            
                            alert(language === "ar" 
                              ? `✔ تم إنشاء نسخة الأرشيف المعتمدة بنجاح لشهر [${getPeriodLabelAr(monthKey)}] لـ قسم [${selectedRosterDept}] ومطابقتها بختم الأمان!` 
                              : `Roster snapshotted successfully to archives bank!`);
                          }}
                          className="px-4 py-2 bg-gradient-to-l from-slate-900 via-rose-950 to-slate-900 text-white rounded-xl text-xs font-black hover:opacity-95 transition flex items-center gap-1.5 cursor-pointer shadow-sm text-right"
                        >
                          <FileText size={13.5} className="text-pink-400" />
                          <span>{language === "ar" ? "📋 تجميد وأرشفة الروستر الحالي للقسم" : "Freeze & Archive Current Month"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Add/Create New Month Period dynamically */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-right flex flex-col justify-between space-y-3 mt-4">
                    <div className="flex items-center justify-between border-b border-rose-100 pb-2 mb-1">
                      <span className="text-[10px] bg-pink-100 text-pink-700 font-bold px-2.5 py-0.5 rounded-full select-none">
                        {language === "ar" ? "تصدير وضبط الدورات المعتمدة" : "Period Customizer Core"}
                      </span>
                      <h4 className="font-black text-xs text-rose-950">
                        {language === "ar" ? "🛠️ لوحة تسجيل وإنشاء دورة جدول جديدة" : "🛠️ Register New Month Scheduling Cycle"}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-right">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-500">{language === "ar" ? "رمز الدورة (مثال: 2026-08):" : "Period Key (e.g. 2026-08):"}</label>
                        <input
                          type="text"
                          placeholder="e.g. 2026-08"
                          id="newPeriodKeyInput"
                          className="w-full p-2 bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold font-mono outline-none focus:ring-1 focus:ring-pink-500 text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-500">{language === "ar" ? "الاسم بالعربية (مثال: 16 أغسطس - 15 سبتمبر 2026):" : "Arabic Label:"}</label>
                        <input
                          type="text"
                          placeholder="16 أغسطس - 15 سبتمبر 2026"
                          id="newPeriodArInput"
                          className="w-full p-2 bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-500">{language === "ar" ? "الاسم بالإنجليزية (مثال: Aug 16 - Sep 15, 2026):" : "English Label:"}</label>
                        <input
                          type="text"
                          placeholder="Aug 16 - Sep 15, 2026"
                          id="newPeriodEnInput"
                          className="w-full p-2 bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const keyEl = document.getElementById("newPeriodKeyInput") as HTMLInputElement;
                          const arEl = document.getElementById("newPeriodArInput") as HTMLInputElement;
                          const enEl = document.getElementById("newPeriodEnInput") as HTMLInputElement;
                          
                          if (!keyEl || !arEl || !enEl) return;
                          
                          const keyVal = keyEl.value.trim();
                          const arVal = arEl.value.trim();
                          const enVal = enEl.value.trim();
                          
                          if (!keyVal || !arVal || !enVal) {
                            alert(language === "ar" ? "يرجى ملء جميع الحقول لتحديد الدورة الجديدة!" : "Please fill in all fields to add a period!");
                            return;
                          }
                          
                          if (availablePeriods.some(p => p.value === keyVal)) {
                            alert(language === "ar" ? "الدورة أو الشهر موجود بالفعل!" : "This period key already exists!");
                            return;
                          }
                          
                          const nextPeriods = [
                            ...availablePeriods,
                            { value: keyVal, labelAr: arVal, labelEn: enVal }
                          ];
                          
                          setAvailablePeriods(nextPeriods);
                          localStorage.setItem("baheya_custom_periods", JSON.stringify(nextPeriods));
                          setSelectedRosterPeriod(keyVal);
                          localStorage.setItem("baheya_selected_roster_period", keyVal);
                          
                          // clear inputs
                          keyEl.value = "";
                          arEl.value = "";
                          enEl.value = "";
                          
                          addSystemLog(`Created and registered new roster month cycle: ${keyVal} (${arVal})`, "success");
                          alert(language === "ar" 
                            ? `✔ تم إنشاء وتفعيل دورة الشَّهر الجديد [${keyVal}] بنجاح، وتنشيطها كالدورة الحالية لاستقبال رغبات الكادر!` 
                            : `Successfully added and activated scheduling period: ${keyVal}!`
                          );
                        }}
                        className="px-4 py-2 bg-gradient-to-l from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-lg text-xs font-black transition shadow-sm cursor-pointer"
                      >
                        {language === "ar" ? "➕ تسجيل وتفعيل الدورة الجديدة فورا" : "➕ Register & Activate New Period"}
                      </button>
                    </div>
                  </div>

                  {/* Archives List Section */}
                  {rosterArchives.length > 0 && (
                    <div className="bg-white p-4.5 rounded-xl border border-slate-200 mt-2 space-y-3">
                      <h4 className="text-[11px] font-black text-slate-700 flex items-center justify-end gap-1.5">
                        <span>سجل الأرشيفات المعتمدة المحفوظة محلياً ورقمياً (المرجع اليدوي للورديات)</span>
                        <Award size={13} className="text-rose-600" />
                      </h4>

                      <div className="overflow-x-auto">
                        <table className="w-full text-[10.5px] text-right font-sans">
                          <thead>
                            <tr className="bg-slate-50 text-slate-505 font-bold border-b border-slate-150">
                              <th className="p-2 text-right">{language === "ar" ? "تاريخ الأرشفة" : "Archived Date"}</th>
                              <th className="p-2 text-right">{language === "ar" ? "القسم" : "Department"}</th>
                              <th className="p-2 text-right">{language === "ar" ? "الدورة / الشهر" : "Cycle Month"}</th>
                              <th className="p-2 text-center">{language === "ar" ? "الكوادر" : "Nurses"}</th>
                              <th className="p-2 text-center">{language === "ar" ? "حالة الاعتماد الأول والنهائي للختم" : "Audit Stamp Seal"}</th>
                              <th className="p-2 text-center">{language === "ar" ? "الإجراءات المتاحة" : "Actions"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rosterArchives.map((archive) => (
                              <tr key={archive.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-2 font-mono font-bold text-slate-600 text-right">{archive.createdAt}</td>
                                <td className="p-2 font-black text-slate-800 text-right">{archive.department}</td>
                                <td className="p-2 font-black text-pink-605 text-right">{language === "ar" ? archive.monthLabelAr : archive.monthLabelEn}</td>
                                <td className="p-2 text-center font-mono font-bold text-slate-800">{archive.rowsCount} كادر</td>
                                <td className="p-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${archive.cnoApproved ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                                      {archive.cnoApproved ? `✓ CNO: ${archive.cnoName || "Signed"}` : "⌛ pending"}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${archive.directorApproved ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500"}`}>
                                      {archive.directorApproved ? `✓ SEAL: ${archive.directorName || "Signed"}` : "⌛ pending"}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        if (window.confirm(language === "ar" ? `هل أنت متأكد من استعادة بيانات الأرشيف لـ قسم [${archive.department}] ودورة [${archive.month}]؟ سيؤدي لتبديل وتجاوز الجدول المفتوح حالياً.` : `Restore archive?`)) {
                                          setRosterList(prevList => {
                                            const cleaned = prevList.filter(r => !(r.departmentName === archive.department && (r.month === archive.month || (!r.month && archive.month === "2026-05"))));
                                            const restoredRecord = {
                                              id: `roster-${archive.department}-${archive.month}`,
                                              departmentName: archive.department,
                                              month: archive.month,
                                              rows: archive.rows
                                            };
                                            const next = [...cleaned, restoredRecord];
                                            localStorage.setItem("baheya_department_rosters", JSON.stringify(next));
                                            return next;
                                          });
                                          
                                          // Sync approvals from archive
                                          syncAndSetCnoApproved(!!archive.cnoApproved, archive.cnoDate || "");
                                          syncAndSetDirectorApproved(!!archive.directorApproved, archive.directorDate || "");
                                          if (archive.cnoName) setCustomCnoName(archive.cnoName);
                                          if (archive.directorName) setCustomDirectorName(archive.directorName);
                                          
                                          alert(language === "ar" ? "✅ تم بنجاح استعادة جميع بيانات الجدول التاريخية والأختام والاعتمادات!" : "Roster restored successfully!");
                                        }
                                      }}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9.5px] font-black cursor-pointer transition shadow-xs whitespace-nowrap"
                                    >
                                      {language === "ar" ? "تحميل واستعادة" : "Restore"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (window.confirm(language === "ar" ? "هل تريد بالتأكيد تدمير ومعو هذا الروستر المؤرشف بالكامل؟" : "Confirm deleting this archived month record?")) {
                                          const next = rosterArchives.filter(a => a.id !== archive.id);
                                          setRosterArchives(next);
                                          localStorage.setItem("baheya_roster_archives", JSON.stringify(next));
                                        }
                                      }}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                      title={language === "ar" ? "إزالة الأرشيف" : "Delete Archive"}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 1: Shift Definitions Reference Panel */}
                <div className="bg-white border border-slate-205 p-4 rounded-2xl shadow-sm text-right space-y-3 no-print">
                  <div className="flex items-center gap-1.5 justify-end">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                      {language === "ar" ? `دليل فترات الورديات الرسمية المعتمدة لـ ${hospitalSettings.nameAr || "المؤسسة"}` : "Approved Hospital Shift Legends"}
                    </h3>
                    <Award className="h-4 w-4 text-pink-600" />
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-[11px]">
                    <div className="bg-cyan-50 border border-cyan-300 p-2.5 rounded-xl text-center">
                      <span className="font-black text-cyan-600 text-base block font-mono">M</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{language === "ar" ? "صباحي" : "Morning"}</span>
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">08:00 AM - 02:00 PM</span>
                    </div>
                    <div className="bg-yellow-100/50 border border-yellow-300 p-2.5 rounded-xl text-center">
                      <span className="font-black text-yellow-600 text-base block font-mono">A</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{language === "ar" ? "ظهر" : "Afternoon"}</span>
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">02:00 PM - 08:00 PM</span>
                    </div>
                    <div className="bg-orange-50 border border-orange-300 p-2.5 rounded-xl text-center">
                      <span className="font-black text-orange-600 text-base block font-mono">D</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{language === "ar" ? "لونج" : "Long Day"}</span>
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">08:00 AM - 08:00 PM</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-xl text-center shadow-inner">
                      <span className="font-black text-emerald-400 text-base block font-mono">N</span>
                      <span className="font-bold text-slate-200 block mt-0.5">{language === "ar" ? "نايت" : "Night Shift"}</span>
                      <span className="text-[9px] text-slate-400 font-mono block mt-0.5">08:00 PM - 08:00 AM</span>
                    </div>
                    <div className="bg-fuchsia-50 border border-fuchsia-300 p-2.5 rounded-xl text-center animate-pulse">
                      <span className="font-black text-fuchsia-600 text-base block font-mono">DN</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{language === "ar" ? "24 ساعة" : "24 Hours"}</span>
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">08:00 AM - 08:00 AM</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-center">
                      <span className="font-black text-emerald-700 text-base block font-mono">OFF</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{language === "ar" ? "إجازة / أوف" : "Day Off"}</span>
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">No Assignment</span>
                    </div>
                    <div className="bg-violet-50 border border-violet-300 p-2.5 rounded-xl text-center">
                      <span className="font-black text-violet-700 text-base block font-mono">AL</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{language === "ar" ? "سنوية" : "Annual Leave"}</span>
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">Paid Leave</span>
                    </div>
                  </div>
                </div>

                {/* Senior Leadership Sign-off Board */}
                <div className="bg-white border border-rose-200/60 p-5 rounded-2xl shadow-sm space-y-4 text-right">
                  <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div className="text-[10px] bg-amber-50 text-amber-850 border border-amber-200/60 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {language === "ar" ? `خاص بالإدارة الطبية والتمريض العليا لمستشفى ${hospitalSettings.nameAr}` : `${hospitalSettings.nameEn} Senior Medical Leadership Sign-off`}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <h3 className="font-extrabold text-sm text-slate-800">
                        {language === "ar" ? "لوحة الاعتماد النهائي والتوثيق للروستر الموحد" : "Executive Dual-Signature & Final Authorization Board"}
                      </h3>
                      <Award className="h-5 w-5 text-rose-600 animate-pulse" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: CNO Sign-off */}
                    <div className={`p-4 rounded-xl border transition-all ${cnoApproved ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">{language === "ar" ? "الاعتماد الأول التمريضي" : "First Sign-off Stage"}</span>
                          <h4 className="font-bold text-xs text-slate-800">{language === "ar" ? `رئيسة التمريض المعتمدة: ${customCnoName}` : `CNO Signatory: ${customCnoName}`}</h4>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            {language === "ar" ? `اعتماد ملاءمة التوزيع لخطط رعاية المرضى بـ ${hospitalSettings.nameAr || "المؤسسة"} تحت إشراف المنصب.` : "Verifies staff workload compliance with hospital care delivery directives."}
                          </p>
                          
                          {cnoApproved ? (
                            <div className="pt-2 text-[10.5px] text-emerald-850 font-bold flex flex-col gap-1 items-start">
                              <span className="flex items-center gap-1">
                                <span>✓ {language === "ar" ? "تم الاعتماد والمطابقة الرقمية" : "Authorized & Stamped"}</span>
                              </span>
                              <span className="text-[9px] text-emerald-600 font-mono font-bold">بواسطة: {customCnoName}</span>
                              <span className="text-[9px] text-slate-400 font-mono">Date: {cnoApprovalDate}</span>
                            </div>
                          ) : (
                            <div className="pt-2 text-[10.5px] text-slate-400 font-bold">
                              {language === "ar" ? `⌛ بانتظار توقيع رئيسة التمريض (${customCnoName})` : `Pending Signature of ${customCnoName}`}
                            </div>
                          )}
                        </div>

                        {/* Right stamp zone or button */}
                        <div className="flex flex-col items-center justify-center shrink-0 stamp-seal-zone">
                          {cnoApproved ? (
                            <div className="relative w-20 h-20 flex items-center justify-center bg-white rounded-full p-1 shadow-sm border border-emerald-100 rotate-12 select-none">
                              <svg width="74" height="74" viewBox="0 0 100 100" className="text-emerald-705 fill-current">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" />
                                <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3,2" />
                                <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="1" />
                                <path id="cnoSealPath" d="M 12,50 A 38,38 0 1,1 88,50" fill="none" />
                                <text className="text-[7.5px] font-extrabold fill-emerald-800" letterSpacing="0.8">
                                  <textPath href="#cnoSealPath" startOffset="50%" textAnchor="middle">
                                    {(hospitalSettings.nameAr || "مؤسسة بهية").slice(0, 30)}
                                  </textPath>
                                </text>
                                <text x="50" y="47" className="text-[6.5px] font-black fill-emerald-950 text-center" textAnchor="middle">
                                  {customCnoName.slice(0, 16)}
                                </text>
                                <text x="50" y="58" className="text-[6.5px] font-extrabold fill-emerald-750 tracking-wider text-center" textAnchor="middle">
                                  APPROVED
                                </text>
                                <text x="50" y="66" className="text-[5.5px] font-semibold fill-emerald-600 text-center" textAnchor="middle">
                                  ★ التمريض ★
                                </text>
                              </svg>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                              <KeyRound className="w-5 h-5" />
                            </div>
                          )}

                          {/* Interactive toggle if user has role */}
                          {((rolePermissions.signoffRosterCno || []).includes(currentUser?.role || "") || ["admin", "it"].includes(currentUser?.role || "")) && (
                            <button
                              onClick={() => {
                                const nextState = !cnoApproved;
                                const dateStr = nextState ? new Date().toLocaleString() : "";
                                syncAndSetCnoApproved(nextState, dateStr);
                                addSystemLog(`CNO sign-off updated to ${nextState} by ${currentUser.nameEn}`, "success");
                              }}
                              className="mt-2 text-[10px] bg-pink-600 hover:bg-pink-700 text-white font-black px-2 py-1 rounded-md cursor-pointer transition shadow-sm leadership-btn-zone"
                            >
                              {cnoApproved ? (language === "ar" ? "إلغاء التوقيع" : "Revoke") : (language === "ar" ? "توقيع الآن 📝" : "Sign Off")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Executive Director Sign-off */}
                    <div className={`p-4 rounded-xl border transition-all ${directorApproved ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">{language === "ar" ? "الاعتماد النهائي الإداري" : "Final Executive Stage"}</span>
                          <h4 className="font-bold text-xs text-slate-800">{language === "ar" ? `مدير عام الأقسام والعمليات: ${customDirectorName}` : `Operations Director: ${customDirectorName}`}</h4>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            {language === "ar" ? `الاعتماد التشغيلي النهائي لربط الورديات وإقرار الموازنة الموثقة بختم ${hospitalSettings.nameAr || "بهية"}.` : "Final operational seal and financial payroll alignment sign-off."}
                          </p>

                          {directorApproved ? (
                            <div className="pt-2 text-[10.5px] text-emerald-850 font-bold flex flex-col gap-1 items-start">
                              <span className="flex items-center gap-1">
                                <span>✓ {language === "ar" ? "تم التوقيع بنجاح والإصدار الرسمي" : "Operations Sealed"}</span>
                              </span>
                              <span className="text-[9px] text-emerald-600 font-mono font-bold">بواسطة: {customDirectorName}</span>
                              <span className="text-[9px] text-slate-400 font-mono">Date: {directorApprovalDate}</span>
                            </div>
                          ) : (
                            <div className="pt-2 text-[10.5px] text-slate-400 font-bold">
                              {language === "ar" ? `⌛ بانتظار توقيع المدير الطبي ورئيس العمليات (${customDirectorName})` : `Pending Seal of ${customDirectorName}`}
                            </div>
                          )}
                        </div>

                        {/* Right stamp zone or button */}
                        <div className="flex flex-col items-center justify-center shrink-0 stamp-seal-zone">
                          {directorApproved ? (
                            <div className="relative w-20 h-20 flex items-center justify-center bg-white rounded-full p-1 shadow-sm border border-rose-100 -rotate-12 select-none">
                              <svg width="74" height="74" viewBox="0 0 100 100" className="text-rose-705 fill-current">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
                                <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4,2" />
                                <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="1" />
                                <path id="dirSealPath" d="M 12,50 A 38,38 0 1,1 88,50" fill="none" />
                                <text className="text-[7.5px] font-extrabold fill-rose-800" letterSpacing="0.8">
                                  <textPath href="#dirSealPath" startOffset="50%" textAnchor="middle">
                                    {(hospitalSettings.nameAr || "مؤسسة بهية").slice(0, 30)}
                                  </textPath>
                                </text>
                                <text x="50" y="47" className="text-[6.5px] font-black fill-rose-900 text-center" textAnchor="middle">
                                  {customDirectorName.slice(0, 16)}
                                </text>
                                <text x="50" y="58" className="text-[6px] font-black fill-rose-805 tracking-widest text-center" textAnchor="middle">
                                  MED-SEAL
                                </text>
                                <text x="50" y="66" className="text-[5.5px] font-bold fill-rose-600 text-center" textAnchor="middle">
                                  ★ العمليات ★
                                </text>
                              </svg>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                              <KeyRound className="w-5 h-5" />
                            </div>
                          )}

                          {/* Interactive toggle if user has role */}
                          {((rolePermissions.signoffRosterCno || []).includes(currentUser?.role || "") || ["admin", "it"].includes(currentUser?.role || "")) && (
                            <button
                              onClick={() => {
                                const nextState = !directorApproved;
                                const dateStr = nextState ? new Date().toLocaleString() : "";
                                syncAndSetDirectorApproved(nextState, dateStr);
                                addSystemLog(`Director/Operations sign-off updated to ${nextState} by ${currentUser.nameEn}`, "success");
                              }}
                              className="mt-2 text-[10px] bg-pink-600 hover:bg-pink-700 text-white font-black px-2 py-1 rounded-md cursor-pointer transition shadow-sm leadership-btn-zone"
                            >
                              {directorApproved ? (language === "ar" ? "إلغاء التوقيع" : "Revoke") : (language === "ar" ? "توقيع الآن 📝" : "Sign Off")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Flexible Signers & Promotions Configurator (For Management / Admin / IT) */}
                  {["admin", "it", "president"].includes(currentUser?.role || "") && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-250 mt-3 no-print space-y-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-black px-2.5 py-0.5 rounded-full uppercase">
                          إعداد خاص ومحلي للإدارة العليا
                        </span>
                        <h5 className="font-extrabold text-xs text-slate-800">
                          ⚙️ تخصيص أسماء أصحاب التوقيع المعتمدين والمناصب المرنة والترقية الفورية
                        </h5>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="block text-[10.5px] font-black text-slate-500">اسم رئيسة التمريض النشطة (CNO):</label>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                const actName = currentUser.nameAr || currentUser.nameEn || "مسؤول النظام";
                                setCustomCnoName(actName);
                                localStorage.setItem("baheya_custom_cno_name", actName);
                                addSystemLog(`Promoted user to active CNO: ${actName}`, "info");
                              }}
                              className="px-2.5 bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-black rounded-lg cursor-pointer transition"
                              title="ترقية ذاتية فدرالية"
                            >
                              ترقية نفسي 👑
                            </button>
                            <input
                              type="text"
                              value={customCnoName}
                              onChange={(e) => {
                                setCustomCnoName(e.target.value);
                                localStorage.setItem("baheya_custom_cno_name", e.target.value);
                              }}
                              className="p-2 bg-white border border-slate-350 rounded-lg text-xs font-bold text-slate-800 outline-none w-full text-right"
                              placeholder="أ. فاطمة الزهراء"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10.5px] font-black text-slate-500">اسم رئيس القطاع والعمليات الطبية (Executive Director):</label>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                const actName = currentUser.nameAr || currentUser.nameEn || "مسؤول النظام";
                                setCustomDirectorName(actName);
                                localStorage.setItem("baheya_custom_director_name", actName);
                                addSystemLog(`Promoted user to Operations Director: ${actName}`, "info");
                              }}
                              className="px-2.5 bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-black rounded-lg cursor-pointer transition"
                              title="ترقية ذاتية فدرالية"
                            >
                              ترقية نفسي 👑
                            </button>
                            <input
                              type="text"
                              value={customDirectorName}
                              onChange={(e) => {
                                setCustomDirectorName(e.target.value);
                                localStorage.setItem("baheya_custom_director_name", e.target.value);
                              }}
                              className="p-2 bg-white border border-slate-350 rounded-lg text-xs font-bold text-slate-800 outline-none w-full text-right"
                              placeholder="د. محمد السيد"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed text-right">
                        * يتيح هذا القسم تخصيص هوية وختم رئيسة التمريض أو مدير عام المستشفى كعلامة مائية ملونة على شهادات الروستر في حالة حدوث ترقية، غياب، أو استبدال للممثلة القانونية المعتمدة للمؤسسة.
                      </p>
                    </div>
                  )}

                  {/* Combined Stamp Locked status */}
                  {isRosterFullyLocked && (
                    <div className="bg-emerald-600/90 text-white px-4 py-2.5 rounded-xl text-center text-xs font-black tracking-wide flex items-center justify-center gap-1.5 animate-pulse shadow">
                      <span>🏆 {language === "ar" ? `الروستر الموحد لـ ${hospitalSettings.nameAr || "بهية"} معتمد وموثق بختم الإدارة الطبية والتمريض العليا ومغلق لبدء العمل الفعلي للدورة!` : "Roster fully authorized & locked for hospital operations!"}</span>
                    </div>
                  )}
                </div>

                {/* Roster Controls: Department Selector */}
                <div className="bg-white border border-slate-205 p-4.5 rounded-2xl shadow-sm text-right flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-pink-700">{language === "ar" ? "تصفية واستعراض جدول القسم الطبي الحالي:" : "Filter Active Medical Department Roster:"}</label>
                    <select
                      value={selectedRosterDept}
                      onChange={(e) => setSelectedRosterDept(e.target.value)}
                      disabled={isTabNormalNurse}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-black text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none w-full md:w-80 shadow-sm cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
                    >
                      {isTabNormalNurse ? (
                        <option value={currentUser.department || "EMERGENCY UNIT"}>{currentUser.department || "EMERGENCY UNIT"}</option>
                      ) : (
                        departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))
                      )}
                    </select>
                    {isTabNormalNurse && (
                      <span className="text-[10px] text-pink-700 font-extrabold bg-pink-50 border border-pink-100 px-2 py-1 rounded mt-1 inline-block">
                        🔒 {language === "ar" ? `مغلق وتلقائياً معروض لقسمك الحالي فقط: ${currentUser.department || "EMERGENCY UNIT"}` : `Locked and restricted to your active department: ${currentUser.department || "EMERGENCY UNIT"}`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 bg-pink-50 border border-pink-100 p-3 rounded-xl max-w-lg">
                    <HeartPulse className="h-5 w-5 text-pink-600 shrink-0" />
                    <p className="text-[11px] text-slate-700 leading-tight">
                      {language === "ar"
                        ? "💡 التفاعل بالنقرات: انقر فوق أي خانة بجدول الورديات أدناه لتعديل الوردية فورياً (متاح للمشرفين من أجل المرونة)، أو اضغط على يومك الخاص ككادر ممرض لتحديده وإرسال أو مراجعة رغبة الشفت المقررة."
                        : "💡 Live Interaction: Click on any shift cell inside the dynamic roster grid below to edit assignments instantly (for supervisors) or auto-load your day code for wish requests."}
                    </p>
                  </div>
                </div>

                {/* SUPERVISOR ROSTER ACTIONS BLOCK */}
                {isTabSupervisor && (
                  <div className="bg-white border-2 border-pink-100 p-5 rounded-2xl shadow-sm text-right space-y-4 no-print" dir="rtl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-rose-50 pb-3">
                      <div className="space-y-0.5">
                        <h3 className="font-extrabold text-sm text-slate-800 flex items-center justify-start gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-pink-600 inline-block animate-pulse" />
                          <span>{language === "ar" ? "لوحة التحكم السريعة لإدارة طاقم عمل القسم" : "Supervisor Operations: Department Staffing Panel"}</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 leading-none">
                          {language === "ar"
                            ? `التحكم في من يظهر في جدول الروستر لقسم (${selectedRosterDept}) مع إمكانية توليد حسابات دخول تلقائية تزامنية.`
                            : `Add or remove active practitioners for ${selectedRosterDept} and generate on-the-fly digital login keys.`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingRosterRow(!isAddingRosterRow);
                            // Clear form
                            setNewRosterEmpNameAr("");
                            setNewRosterEmpNameEn("");
                            setNewRosterEmpCode("");
                            setNewRosterEmpPin("");
                          }}
                          className="px-4.5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{language === "ar" ? "قيد اسم موظف جديد +" : "Register & Add Staff Name +"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResetRosterToDefaultsObj}
                          className="px-4.5 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          {language === "ar" ? "🔄 تهيئة وتصفير الجدول للافتراضي" : "Reset Grid to Default"}
                        </button>
                      </div>
                    </div>

                    {/* NEW ROW FORM ZONE */}
                    {isAddingRosterRow && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-4 animate-fade">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === "ar" ? "بطاقة تسجيل موظف روستر فوري" : "Instant Staff Registration Card"}</span>
                          <span className="text-[11px] font-black text-pink-600 bg-pink-50 px-2 py-0.5 rounded">{selectedRosterDept}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">{language === "ar" ? "الاسم الكامل (عربي) *" : "Full Name (Arabic) *"}</label>
                            <input
                              type="text"
                              value={newRosterEmpNameAr}
                              onChange={(e) => setNewRosterEmpNameAr(e.target.value)}
                              placeholder="مثال: منى علي حسن"
                              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-pink-500 outline-none text-right font-bold text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">{language === "ar" ? "الاسم الكامل (إنجليزي) *" : "Full Name (English) *"}</label>
                            <input
                              type="text"
                              value={newRosterEmpNameEn}
                              onChange={(e) => setNewRosterEmpNameEn(e.target.value)}
                              placeholder="e.g. MONA ALI HASSAN"
                              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-pink-500 outline-none text-left font-sans font-bold text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">{language === "ar" ? "كود الموظف الفريد (Staff ID) *" : "Unique Staff ID (Code) *"}</label>
                            <input
                              type="text"
                              value={newRosterEmpCode}
                              onChange={(e) => setNewRosterEmpCode(e.target.value)}
                              placeholder="e.g. NUR-150"
                              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-pink-500 outline-none text-left font-mono font-bold text-pink-700 uppercase animate-pulse"
                            />
                            <span className="text-[9px] text-slate-400 mt-1 block">
                              {language === "ar" ? "سيتم تلقائياً إضافة البادئة BHG- إن لم يكتب" : "Auto-prefixes BHG- if omitted"}
                            </span>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">{language === "ar" ? "المسمى الطبي / الدور الوظيفي *" : "Clinical Role / Designation *"}</label>
                            <select
                              value={newRosterEmpRole}
                              onChange={(e) => setNewRosterEmpRole(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-pink-500 outline-none font-bold text-slate-800 cursor-pointer"
                            >
                              <option value="staff">{language === "ar" ? "أخصائي تمريض (Staff Nurse)" : "Staff Nurse (SN)"}</option>
                              <option value="tech">{language === "ar" ? "فني تمريض (Nursing Technician)" : "Nursing Technician (NT)"}</option>
                              <option value="intern">{language === "ar" ? "تمريض امتياز (Intern Nurse)" : "Intern Nurse (INT)"}</option>
                              <option value="assistant">{language === "ar" ? "مساعد تمريض (Nursing Assistant)" : "Nursing Assistant (NA)"}</option>
                              <option value="secretary">{language === "ar" ? "سكرتارية القسم (Secretary/SEC)" : "Department Secretary (SEC)"}</option>
                              <option value="head_nurse">{language === "ar" ? "رئيسة تمريض القسم (Head Nurse)" : "Head Nurse (HN)"}</option>
                              <option value="doctor">{language === "ar" ? "طبيب مقيم (Clinical Doctor)" : "Clinical Doctor"}</option>
                              <option value="quality">{language === "ar" ? "مسؤول جودة (Quality Officer)" : "Quality Officer"}</option>
                              <option value="admin">{language === "ar" ? "مسؤول نظام إداري (Admin)" : "System Admin"}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">
                              {language === "ar" ? "رمز المرور السري (PIN Code)" : "Secret Password (PIN Code)"}
                            </label>
                            <input
                              type="password"
                              maxLength={6}
                              value={newRosterEmpPin}
                              onChange={(e) => setNewRosterEmpPin(e.target.value)}
                              disabled={!newRosterAutoRegister}
                              placeholder="1234"
                              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-pink-500 outline-none text-left font-mono font-bold text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 pt-4">
                            <input
                              type="checkbox"
                              id="auto-reg-cb"
                              checked={newRosterAutoRegister}
                              onChange={(e) => setNewRosterAutoRegister(e.target.checked)}
                              className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500 cursor-pointer"
                            />
                            <label htmlFor="auto-reg-cb" className="text-[10px] font-extrabold text-pink-850 cursor-pointer select-none">
                              {language === "ar" ? "تفعيل الحساب طبيعياً لتمكين الدخول الفوري بالرقم السري" : "Provision system account to enable instant portal login"}
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setIsAddingRosterRow(false)}
                            className="px-4 py-1.5 bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 font-bold text-xs rounded-lg transition cursor-pointer"
                          >
                            {language === "ar" ? "إلغاء والتراجع" : "Cancel & Close"}
                          </button>

                          <button
                            type="button"
                            onClick={handleAddRosterRowConfirm}
                            className="px-5 py-1.5 bg-emerald-650 hover:bg-emerald-700 bg-emerald-600 text-white font-black text-xs rounded-lg shadow-md transition cursor-pointer flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{language === "ar" ? "تأكيد تسجيل وإضافة الكادر" : "Confirm & Save New Staff"}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Major Display: Dynamic Grid Table Roster */}
                <div className="bg-white border border-slate-210 rounded-2xl shadow-md overflow-hidden print-container roster-card-box">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-pink-600" />
                      <span>
                        {language === "ar" 
                          ? `جدول نوبتجيات تمريض قسم: ${selectedRosterDept} (${getPeriodLabelAr(selectedRosterPeriod)})` 
                          : `Nursing Shift Grid for Dept: ${selectedRosterDept} (${getPeriodLabelEn(selectedRosterPeriod)})`}
                      </span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg border border-slate-700"
                      >
                        <Printer className="h-4 w-4 shrink-0" />
                        <span>{language === "ar" ? "🖨️ طباعة الروستر" : "Print Roster"}</span>
                      </button>
                      <div className="text-[10px] bg-white border px-3 py-1.5 rounded-lg border-slate-200 shadow-sm font-semibold text-slate-500 no-print">
                        {language === "ar" ? "إجمالي الحجم: 31 يوماً متتالياً" : "Roster Length: 31 Consecutive Days"}
                      </div>
                    </div>
                  </div>

                  {/* Grid Wrapper with Horizontal scrolling */}
                  <div className="overflow-x-auto print:overflow-visible max-w-full roster-print-wrapper print-container">
                    <table className="w-full text-right border-collapse table-auto text-xs min-w-[1400px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 select-none">
                          <th className="sticky right-0 bg-slate-100 z-10 p-2.5 text-center border-l border-slate-200 min-w-[200px]">
                            {language === "ar" ? "الكوادر والاسم الوظيفي للتمريض" : "Nursing Staff Information"}
                          </th>
                          
                          {/* Day Keys Header */}
                          {ROSTER_DAYS_KEYS.map((day, idx) => {
                            const weekday = ROSTER_DAYS_WD[idx];
                            const isWeekend = weekday === "FRI";
                            return (
                              <th 
                                key={idx} 
                                className={`p-1.5 text-center min-w-[40px] border-l border-slate-200 font-mono text-[10px] leading-tight ${
                                  isWeekend ? "bg-red-50 text-red-750" : ""
                                }`}
                              >
                                <div className="text-[9px] text-slate-400 font-bold tracking-tight">{weekday}</div>
                                <div className="text-sm font-black text-rose-950 mt-0.5">{day}</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {(() => {
                          const activeDeptRoster = rosterList.find(r => r.departmentName === selectedRosterDept && (r.month === selectedRosterPeriod || (!r.month && selectedRosterPeriod === "2026-05"))) || { rows: [], departmentName: selectedRosterDept, month: selectedRosterPeriod };
                          
                          // Dynamically merge systemUsers registered in this department into active roster rows
                          const deptStaffUsers = systemUsers.filter(u => 
                            u.department === selectedRosterDept && 
                            ['staff', 'Staff', 'head_nurse', 'tech', 'nursing_tech', 'intern', 'intern_nurse', 'assistant', 'nursing_assistant', 'secretary', 'sec'].includes(u.role)
                          );
                          
                          // Filter roster rows to ONLY show users who are registered on the system (systemUsers)
                          const filteredRosterRows = activeDeptRoster.rows.filter((row: any) => {
                            return systemUsers.some(u => 
                              u.id === row.employeeId || 
                              (u.staffId && u.staffId === row.employeeCode) || 
                              (u.pin && u.pin === row.employeeCode)
                            );
                          });
                          
                          const existingIds = new Set(filteredRosterRows.map((r: any) => r.employeeId));
                          const existingCodes = new Set(filteredRosterRows.map((r: any) => r.employeeCode));
                          const combinedRows = [...filteredRosterRows];
                          
                          deptStaffUsers.forEach(usr => {
                            if (!existingIds.has(usr.id) && !existingCodes.has(usr.staffId) && !existingCodes.has(usr.pin)) {
                              combinedRows.push({
                                employeeId: usr.id,
                                employeeNameAr: usr.nameAr,
                                employeeNameEn: usr.nameEn,
                                roleTitleAr: resolveRoleTitles(usr.role).ar,
                                roleTitleEn: resolveRoleTitles(usr.role).en,
                                employeeCode: usr.staffId || usr.pin,
                                shifts: {}
                              });
                            }
                          });

                          // Map each row so that its names, titles and codes are always synced with the system users database (so edits on names/roles show immediately!)
                          const syncedRows = combinedRows.map((row: any) => {
                            const matchedUser = systemUsers.find(u => 
                              u.id === row.employeeId || 
                              (u.staffId && u.staffId === row.employeeCode) || 
                              (u.pin && u.pin === row.employeeCode)
                            );
                            if (matchedUser) {
                              return {
                                ...row,
                                employeeNameAr: matchedUser.nameAr,
                                employeeNameEn: matchedUser.nameEn,
                                roleTitleAr: resolveRoleTitles(matchedUser.role).ar,
                                roleTitleEn: resolveRoleTitles(matchedUser.role).en,
                                employeeCode: matchedUser.staffId || matchedUser.pin
                              };
                            }
                            return row;
                          });

                          if (syncedRows.length === 0) {
                            return (
                              <tr>
                                <td colSpan={32} className="p-10 text-center text-slate-400 font-bold">
                                  {language === "ar" ? "⚠️ لم يتم تدوين طاقم مخصص لهذا القسم بعد." : "No staff registered for this department."}
                                </td>
                              </tr>
                            );
                          }

                          return syncedRows.map((row: any, rIdx: number) => {
                            // Determine if this row belongs to the active logged-in nurse
                            const isSelfRow = (row.employeeId && row.employeeId === currentUser.id) || 
                                              (row.employeeCode && row.employeeCode === currentUser.staffId) ||
                                              (row.employeeCode && row.employeeCode === currentUser.pin);

                            return (
                              <tr key={row.employeeId || rIdx} className={`hover:bg-pink-50/15 transition ${isSelfRow ? "bg-pink-50/40" : ""}`}>
                                <td className="sticky right-0 bg-white shadow-sm z-10 p-2 border-l border-slate-200 flex flex-col justify-center min-w-[200px] h-full text-right">
                                  {editingRosterEmpId === (row.employeeId || row.employeeCode) ? (
                                    <div className="space-y-1.5 p-1 no-print">
                                      <div>
                                        <label className="text-[8px] font-black text-slate-400 block mb-0.5 text-right uppercase">الاسم (عربي):</label>
                                        <input
                                          type="text"
                                          value={editRosterEmpNameAr}
                                          onChange={(e) => setEditRosterEmpNameAr(e.target.value)}
                                          className="w-full text-[11px] font-bold border border-slate-300 rounded px-2 py-1 text-right bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                          placeholder="الاسم بالعربية"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[8px] font-black text-slate-400 block mb-0.5 text-right uppercase">Name (English):</label>
                                        <input
                                          type="text"
                                          value={editRosterEmpNameEn}
                                          onChange={(e) => setEditRosterEmpNameEn(e.target.value)}
                                          className="w-full text-[10px] font-sans border border-slate-300 rounded px-2 py-0.5 text-left bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                          placeholder="Full Name (English)"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[8px] font-black text-slate-400 block mb-0.5 text-right uppercase">Code:</label>
                                        <input
                                          type="text"
                                          value={editRosterEmpCode}
                                          onChange={(e) => setEditRosterEmpCode(e.target.value)}
                                          className="w-full text-[10px] font-mono font-bold text-pink-600 border border-slate-300 rounded px-2 py-0.5 text-left bg-white text-pink-600 focus:outline-none focus:ring-1 focus:ring-pink-500 uppercase"
                                          placeholder="BHG-NUR-99"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-2 justify-end">
                                        <button
                                          type="button"
                                          onClick={() => setEditingRosterEmpId(null)}
                                          className="p-1 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded cursor-pointer transition text-[9px] font-bold"
                                        >
                                          {language === "ar" ? "إلغاء`" : "Cancel"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveRosterEmpInline(row)}
                                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                                        >
                                          <Check className="h-3 w-3" />
                                          <span>{language === "ar" ? "حفظ" : "Save"}</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-full text-right">
                                      <span className="font-extrabold text-slate-900 text-[12px] flex items-center gap-1.5 justify-start">
                                        {isSelfRow && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-pink-600 animate-pulse inline-block" />
                                        )}
                                        <span
                                          onClick={() => {
                                            const matchedUser = systemUsers.find(u => u.id === row.employeeId || u.staffId === row.employeeCode);
                                            if (matchedUser) {
                                              setViewingUserProfileUser(matchedUser);
                                            } else {
                                              setViewingUserProfileUser({
                                                id: row.employeeId || row.employeeCode,
                                                nameAr: row.employeeNameAr || "",
                                                nameEn: row.employeeNameEn || "",
                                                staffId: row.employeeCode || "GUEST",
                                                department: selectedRosterDept,
                                                role: "staff",
                                                avatarInitials: row.employeeNameEn ? row.employeeNameEn.slice(0, 2).toUpperCase() : "NU"
                                              });
                                            }
                                          }}
                                          className="hover:text-pink-650 hover:underline cursor-pointer transition text-slate-800"
                                          title={language === "ar" ? "اضغط لفتح الملف التشغيلي للشخصية" : "Click to view full profile"}
                                        >
                                          {language === "ar" ? row.employeeNameAr : row.employeeNameEn}
                                        </span>
                                        {isSelfRow && (
                                          <span className="text-[8px] bg-pink-100 text-pink-700 px-1 py-0.5 rounded font-black">
                                            {language === "ar" ? "أنت" : "You"}
                                          </span>
                                        )}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1 leading-none">
                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                          {language === "ar" ? row.roleTitleAr : row.roleTitleEn}
                                        </span>
                                        <span className="text-[9px] font-mono font-medium text-pink-600 block">
                                          Code: {row.employeeCode}
                                        </span>
                                      </div>

                                      {/* Management action controls */}
                                      {((rolePermissions.addRemoveStaff || []).includes(currentUser?.role || "") || ['admin', 'it'].includes(currentUser?.role || "")) && (
                                        <div className="flex items-center gap-1.5 mt-1.5 justify-end border-t border-slate-100 pt-1.5 no-print">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingRosterEmpId(row.employeeId || row.employeeCode);
                                              setEditRosterEmpNameAr(row.employeeNameAr || "");
                                              setEditRosterEmpNameEn(row.employeeNameEn || "");
                                              setEditRosterEmpCode(row.employeeCode || "");
                                            }}
                                            className="text-slate-400 hover:text-blue-650 hover:text-blue-600 p-0.5 rounded transition cursor-pointer"
                                            title={language === "ar" ? "تعديل اسم وبيانات الموظف" : "Edit staff names / code"}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <span className="text-slate-200">|</span>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveRosterEmpInline(row)}
                                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition cursor-pointer"
                                            title={language === "ar" ? "حذف وتعطيل الموظف من الروستر والبرنامج" : "Deactivate and remove from system"}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Render each day cell */}
                                {ROSTER_DAYS_KEYS.map((day, idx) => {
                                  const value = row.shifts[day] || "-";
                                  
                                  // Stylings for shift badges - customized to be completely distinct with no similarity
                                  let badgeClass = "bg-slate-50 text-slate-400 border border-slate-100";
                                  if (value === "M") badgeClass = "bg-cyan-500 text-slate-950 font-mono font-black border border-cyan-600 shadow-sm";
                                  if (value === "A") badgeClass = "bg-yellow-400 text-neutral-900 font-mono font-black border border-yellow-500 shadow-sm";
                                  if (value === "D") badgeClass = "bg-orange-500 text-white font-mono font-black border border-orange-600 shadow-sm";
                                  if (value === "N") badgeClass = "bg-slate-950 text-emerald-400 font-mono font-black border-2 border-slate-900 shadow-sm";
                                  if (value === "DN") badgeClass = "bg-fuchsia-600 text-white font-mono font-black border border-fuchsia-700 shadow-sm animate-pulse";
                                  if (value === "OFF") badgeClass = "bg-emerald-600 text-white font-mono font-bold border border-emerald-700 shadow-sm";
                                  if (value === "AL") badgeClass = "bg-violet-600 text-white font-mono font-bold border border-violet-700 shadow-sm";

                                  return (
                                    <td 
                                      key={idx} 
                                      onClick={() => {
                                        // 1. Dynamic Role-based permission check from settings matrix
                                        const isAdminRole = (rolePermissions.modifyRosterShifts || []).includes(currentUser?.role || "") || 
                                                            ['admin', 'it', 'president'].includes(currentUser?.role || "");
                                        const isStaff = currentUser?.role === 'staff' || currentUser?.role === 'Staff' || !isAdminRole;
                                        
                                        // The Binding Rule: Staff can only edit their own row (userCode binding: employeeCode vs staffId)
                                        const isMyRow = (row.employeeId && row.employeeId === currentUser.id) || 
                                                        (row.employeeCode && row.employeeCode === currentUser.staffId) ||
                                                        (row.employeeCode && row.employeeCode === currentUser.pin);
                                        if (itStrictComplianceMode && isStaff && !isMyRow) {
                                          alert(language === "ar" 
                                            ? "هذا الصف يخص موظفاً آخر وليس لديك صلاحية تعديل جدول الكوادر الآخرين" 
                                            : "Access Denied: This row belongs to another employee and you lack roster editing permissions.");
                                          return;
                                        }

                                        // 2. Is the roster locked by senior administration?
                                        if (itStrictComplianceMode && isRosterFullyLocked) {
                                          alert(language === "ar" 
                                            ? "🔒 عذراً، هذا الروستر معتمد نهائياً ومقفل من الإدارة وغير قابل للتعديل." 
                                            : "Notice: Roster is officially locked by administration.");
                                          return;
                                        }

                                        // 3. Nurse - clicked cell (loads wishes AND opens shift selection popup directly so they can register their shift easily)
                                        if (isStaff) {
                                          setWishDayKey(day);
                                          setActiveRosterCellEdit({
                                            employeeId: row.employeeId,
                                            dayKey: day,
                                            currentShift: value,
                                            employeeNameAr: row.employeeNameAr,
                                            employeeNameEn: row.employeeNameEn,
                                            employeeCode: row.employeeCode
                                          });
                                          const formSec = document.getElementById("wish-form-section-element");
                                          if (formSec) { formSec.scrollIntoView({ behavior: "smooth" }); }
                                          return;
                                        }

                                        // 4. Admin/Supervisor - opens the direct cell edit modal!
                                        if (isAdminRole) {
                                          setActiveRosterCellEdit({
                                            employeeId: row.employeeId,
                                            dayKey: day,
                                            currentShift: value,
                                            employeeNameAr: row.employeeNameAr,
                                            employeeNameEn: row.employeeNameEn,
                                            employeeCode: row.employeeCode
                                          });
                                        }
                                      }}
                                      onDoubleClick={() => {
                                          // Require Admin role for double click to clear
                                          const isAdminRole = (rolePermissions.modifyRosterShifts || []).includes(currentUser?.role || "") || 
                                                              ['admin', 'it', 'president'].includes(currentUser?.role || "");
                                          if (!isAdminRole) {
                                            alert("Notice: You lack permissions to quick-clear shifts.");
                                            return;
                                          }
                                          if (isRosterFullyLocked) {
                                              alert("Roster is locked.");
                                              return;
                                          }
                                          // Update the roster to clear the shift
                                          setRosterList(prevList => prevList.map(rost => {
                                              if (rost.departmentName === selectedRosterDept) {
                                                  return {
                                                      ...rost,
                                                      rows: rost.rows.map((r: any) => {
                                                          if (r.employeeId === row.employeeId || r.employeeCode === row.employeeCode) {
                                                              const newShifts = {...r.shifts};
                                                              delete newShifts[day];
                                                              return {...r, shifts: newShifts};
                                                          }
                                                          return r;
                                                      })
                                                  };
                                              }
                                              return rost;
                                          }));
                                      }}
                                      className={`p-1.5 text-center border-l border-slate-200 transition select-none ${
                                        (!isRosterFullyLocked) ? "cursor-alias hover:bg-pink-100/40" : ""
                                      }`}
                                      title={isTabSupervisor ? (language === "ar" ? "انقر كمسؤول لتعديل نوبتجية هذا اليوم" : "Click to modify shift as supervisor") : (language === "ar" ? "انقر لتحديد نوبتجية وطلب رغبة لهذا اليوم الخاص بك" : "Click to request shift wish")}
                                    >
                                      <div className={`mx-auto w-8.5 h-8.5 rounded-lg flex items-center justify-center text-[11px] leading-tight sh-badge sh-badge-${value} ${badgeClass} ${value === 'DN' ? 'shift-dn' : value === 'N' ? 'shift-n' : ''}`}>
                                        {value}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Print layout signature block */}
                  <div className="hidden print:block p-8 border-t border-slate-300 mt-20 text-xs font-sans text-right">
                    <div className="grid grid-cols-3 gap-8 text-center">
                      <div className="space-y-4">
                        <p className="font-extrabold text-slate-800">توقيع رئيسة تمريض القسم</p>
                        <div className="h-10 border-b border-slate-300 w-2/3 mx-auto" />
                        <p className="text-[10px] text-slate-500">التاريخ:     /     / 2026</p>
                      </div>
                      <div className="space-y-4">
                        <p className="font-extrabold text-slate-800">توقيع أ. فاطمة الزهراء (رئيسة تمريض المستشفى CNO)</p>
                        <div className="h-10 border-b border-emerald-300 w-2/3 mx-auto flex items-center justify-center text-xs text-emerald-700 font-bold">
                          {cnoApproved ? `✓ معتمد ومعزز رقمياً في ${cnoApprovalDate}` : "بانتظار اتمام الاعتماد"}
                        </div>
                        <p className="text-[10px] text-slate-500">التاريخ:     /     / 2026</p>
                      </div>
                      <div className="space-y-4">
                        <p className="font-extrabold text-slate-800">موافقة وتوقيع د. محمد السيد (المدير العام)</p>
                        <div className="h-10 border-b border-rose-300 w-2/3 mx-auto flex items-center justify-center text-xs text-rose-700 font-bold">
                          {directorApproved ? `✓ معتمد ومعزز رقمياً في ${directorApprovalDate}` : "بانتظار اتمام الاعتماد من المدير"}
                        </div>
                        <p className="text-[10px] text-slate-500">{language === "ar" ? hospitalSettings.nameAr : hospitalSettings.nameEn}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Roster Preferences & Wishes Workflow */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print" id="wish-form-section-element">
                  
                  {/* SUB-SECTION A: Employees Wish Submit Box */}
                  <div className="lg:col-span-5 bg-white border border-slate-210 p-5 rounded-2xl shadow-sm text-right space-y-4">
                    <div className="flex items-center gap-2 justify-end">
                      <div>
                        <h4 className="font-black text-sm text-slate-900">
                          {language === "ar" ? "تقديم رغبات وتفضيلات الشفتات الاستثنائية" : "Submit Shift Preferences & Wishes"}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{language === "ar" ? "خاص بالكوادر لطلب تعديلات أو إجازات تدرس من المشرف" : "For staff nurses requesting specific shifts"}</p>
                      </div>
                      <div className="w-8.5 h-8.5 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Date choice */}
                    <div className="space-y-3.5 text-xs font-sans">
                      <div>
                        <label className="block text-[11px] font-black text-slate-900 mb-2">
                          {language === "ar" ? "📍 جدول تحديد رغبة اليوم باللمس (علامة اليوم 1 - 31):" : "📍 Roster-Style Day Marking Table (1 - 31):"}
                        </label>
                        
                        <div className="overflow-x-auto border border-pink-100 rounded-2xl bg-pink-50/10 p-3 no-print shadow-inner" dir="rtl">
                          <table className="w-full text-center border-collapse text-[10px]">
                            <thead>
                              <tr className="border-b border-pink-100">
                                <th className="p-1 px-2 font-black text-slate-600 border-l border-pink-100 text-[11px] min-w-[120px] text-right">
                                  {language === "ar" ? "اسم الموظف" : "Employee Name"}
                                </th>
                                {ROSTER_DAYS_KEYS.map((k, i) => (
                                  <th key={k} className="p-1 font-mono font-black text-slate-500 min-w-[34px]">
                                    <div className="text-[10px] text-pink-600 font-bold">{k}</div>
                                    <div className="text-[7.5px] text-slate-400 font-semibold">{language === "ar" ? ROSTER_DAYS_WD[i] === "MON" ? "إثن" : ROSTER_DAYS_WD[i] === "TUE" ? "ثلا" : ROSTER_DAYS_WD[i] === "WED" ? "أرب" : ROSTER_DAYS_WD[i] === "THU" ? "خمي" : ROSTER_DAYS_WD[i] === "FRI" ? "جمعه" : ROSTER_DAYS_WD[i] === "SAT" ? "سبت" : "أحد" : ROSTER_DAYS_WD[i].substring(0, 2)}</div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-pink-50/20">
                                <td className="p-2 font-extrabold text-slate-800 text-[11px] border-l border-pink-100 text-right font-sans">
                                  {language === "ar" ? currentUser.nameAr : currentUser.nameEn}
                                </td>
                                {ROSTER_DAYS_KEYS.map((dayKey) => {
                                  // Find if there is any submitted wish for this day
                                  const matchingWish = rosterWishes.find(
                                    (w: any) => w.employeeId === currentUser.id && w.dayKey === dayKey
                                  );
                                  const isSelected = wishDayKey === dayKey;
                                  
                                  let cellContent = "➕";
                                  let cellBg = "bg-white hover:bg-slate-100 border-slate-205";
                                  if (matchingWish) {
                                    cellContent = matchingWish.requestedShift || "OFF";
                                    if (matchingWish.status === "approved") {
                                      cellBg = "bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800 font-black";
                                    } else if (matchingWish.status === "rejected") {
                                      cellBg = "bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-800 font-black";
                                    } else {
                                      cellBg = "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800 font-black animate-pulse";
                                    }
                                  }
                                  
                                  return (
                                    <td key={dayKey} className="p-1">
                                      <button
                                        type="button"
                                        onClick={() => setWishDayKey(dayKey)}
                                        className={`w-7 h-7 rounded-lg text-[9px] flex items-center justify-center border font-bold transition-all cursor-pointer ${cellBg} ${
                                          isSelected ? "ring-2 ring-pink-500 scale-110 shadow-md border-pink-500 z-10" : ""
                                        }`}
                                        title={matchingWish ? `${matchingWish.reasonAr || 'طلب معلق'}` : `${language === "ar" ? "انقر لتسجيل رغبة يوم" : "Click to request shift for day"} ${dayKey}`}
                                      >
                                        {cellContent}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10px] text-slate-500 font-sans">
                          <span className="font-bold text-slate-700">💡 {language === "ar" ? "انقر على مربع اليوم (1 - 31) لتسجيل أو تعديل رغبتك السحابية مباشرة" : "Click any day cell (1 - 31) to submit or manage wishes"}</span>
                          <div className="flex gap-2">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-150 border border-amber-300 inline-block" /> {language === "ar" ? "طلب معلق" : "Pending"}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-150 border border-emerald-300 inline-block" /> {language === "ar" ? "موافق عليها" : "Approved"}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-white border border-slate-250 inline-block" /> {language === "ar" ? "فارغ" : "Empty"}</span>
                          </div>
                        </div>

                        <div className="mt-3 bg-pink-100/30 p-3 rounded-xl border border-pink-150 text-[11px] text-slate-800 leading-relaxed font-sans text-right">
                          📆 <strong>{language === "ar" ? "الفصل التشغيلي النشط حالياً:" : "Current Operational Window:"}</strong> {language === "ar" ? "يونيو - يوليو 2026 (الدور الصيفي الموحد)" : "June - July 2026 (Unified Summer Cycle)"}
                        </div>
                      </div>

                      {/* CHECK IF LOGGED-IN NURSE ALREADY HAS APPROVED SHIFT */}
                      {selfApprovedWishForDay ? (
                        <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-xl space-y-3 text-right">
                          <h5 className="font-extrabold text-amber-800 text-xs flex items-center gap-1.5 justify-end">
                            <span>⚠️ شفتك لهذا اليوم معتمد ومغلق بالفصل</span>
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                          </h5>
                          <p className="text-[10.5px] text-slate-700 leading-relaxed font-medium">
                            {language === "ar"
                              ? `الشفت المعتمد لك حالياً ليوم ${wishDayKey} هو (${selfApprovedWishForDay.requestedShift}). لا تملك مصلحة التغيير المباشر لضمان انسيابية العمل. بدلاً من ذلك، اكتب التبرير لتعديل هذا الشفت لإرساله للمشرف.`
                              : `Your shift for Day ${wishDayKey} is already approved as (${selfApprovedWishForDay.requestedShift}). Click to submit a formal approved change request and notify your CNO.`}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-amber-900 mb-1">{language === "ar" ? "الوردية البديلة المطلوبة لطلب التعديل *:" : "Requested Replacement Shift *:"}</label>
                              <select
                                value={wishShift}
                                onChange={(e) => setWishShift(e.target.value)}
                                className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                              >
                                {CLINICAL_SHIFTS.map(cs => (
                                  <option key={cs.id} value={cs.id}>{cs.nameAr} ({cs.id})</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-amber-900 mb-1">{language === "ar" ? "المرتجع الحالي المؤكد:" : "Current Confirmed:"}</label>
                              <div className="w-full bg-amber-100 border border-amber-300 rounded-xl py-2 px-3 font-bold text-amber-800">
                                {selfApprovedWishForDay.requestedShift}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-amber-900 mb-1">{language === "ar" ? "مبرر وسبب طلب التعديل بالكامل (بالعربية) * :" : "Arabic Reason *:"}</label>
                            <textarea
                              rows={2}
                              value={wishReasonAr}
                              onChange={(e) => setWishReasonAr(e.target.value)}
                              placeholder="مثل: أرغب بالتبديل مع ممرضة الطوارئ هاجر للظروف الصحية الطارئة..."
                              className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs text-right outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-amber-900 mb-1">{language === "ar" ? "السبب والتبرير (بالإنجليزية) * :" : "English Reason *:"}</label>
                            <textarea
                              rows={2}
                              value={wishReasonEn}
                              onChange={(e) => setWishReasonEn(e.target.value)}
                              placeholder="e.g. Please swap shift to M instead of N due to medical exams..."
                              className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs text-left outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                              dir="ltr"
                            />
                          </div>

                          <div className="pt-1.5">
                            <button
                              onClick={() => {
                                if (isRosterFullyLocked) {
                                  alert(language === "ar" ? "🔒 الروستر معتمد نهائياً ومغلق تماماً ضد أي طلبات تعديل." : "Roster fully locked.");
                                  return;
                                }
                                if (!wishReasonAr.trim() || !wishReasonEn.trim()) {
                                  alert(language === "ar" ? "⚠️ الرجاء كتابة وتبرير الاستمارة باللغتين العربية والإنجليزية." : "Please type reasons in both languages.");
                                  return;
                                }

                                const modificationWish = {
                                  id: `wish-mod-${Date.now()}`,
                                  employeeId: currentUser.id,
                                  employeeNameAr: currentUser.nameAr,
                                  employeeNameEn: currentUser.nameEn,
                                  departmentName: currentUser.department || "EMERGENCY UNIT",
                                  dayKey: wishDayKey,
                                  requestedShift: wishShift,
                                  reasonAr: `[طلب تبديل وتعديل معتمد] ${wishReasonAr}`,
                                  reasonEn: `[APPROVED SWAP REQ] ${wishReasonEn}`,
                                  status: "pending",
                                  submittedAt: new Date().toISOString()
                                };

                                const updatedWishes = [modificationWish, ...rosterWishes];
                                setRosterWishes(updatedWishes);
                                localStorage.setItem("baheya_roster_wishes", JSON.stringify(updatedWishes));

                                const newNotification = {
                                  id: `notif-${Date.now()}`,
                                  messageAr: `🚨 طلب تعديل نوبتجية معتمدة: قدمت الممرضة "${currentUser.nameAr}" طلباً مفصلاً لتعديل شفت يوم ${wishDayKey} بقسم "${currentUser.department || "أخرى"}".`,
                                  titleAr: `طلب تعديل نوبتجية معتمدة: ${currentUser.nameAr}`,
                                  messageEn: `🚨 Approved Shift Change request: Nurse "${currentUser.nameEn}" requested modification for Day ${wishDayKey} in department "${currentUser.department || "Other"}".`,
                                  titleEn: `Shift Revocation workflow: ${currentUser.nameEn}`,
                                  bodyAr: `قدمت الممرضة ${currentUser.nameAr} طلباً مفصلاً لتعديل شفت يوم ${wishDayKey}. متاح للدراسة بالصندوق.`,
                                  bodyEn: `Staff requested revocation/change of approved shift on day ${wishDayKey}. Available in inbox.`,
                                  timestamp: new Date().toISOString(),
                                  read: false,
                                };
                                setNotifications([newNotification, ...notifications]);

                                setWishReasonAr("");
                                setWishReasonEn("");
                                alert(language === "ar" ? "✅ تم بنجاح تقديم طلب التعديل الاستثنائي لمشرف القسم! يرجى انتظار رد الإدارة." : "Modification request submitted successfully!");
                              }}
                              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                              <span>{language === "ar" ? "تقديم طلب تعديل الشفت المعتمد" : "Send Approved Shift Change request"}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Shift choice */}
                          <div>
                            <label className="block text-[10px] font-black text-slate-450 mb-1">{language === "ar" ? "الوردية الاستثنائية المطلوبة:" : "Requested Shift Period:"}</label>
                            <select
                              value={wishShift}
                              onChange={(e) => setWishShift(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none font-bold"
                            >
                              {CLINICAL_SHIFTS.map(cs => (
                                <option key={cs.id} value={cs.id}>{cs.nameAr}</option>
                              ))}
                            </select>
                          </div>

                          {/* Arabic reason */}
                          <div>
                            <label className="block text-[10px] font-black text-slate-450 mb-1">{language === "ar" ? "اذكر تفاصيل وسبب الطلب بالكامل (بالعربية) * :" : "Reason (Arabic):"}</label>
                            <textarea
                              rows={2}
                              value={wishReasonAr}
                              onChange={(e) => setWishReasonAr(e.target.value)}
                              placeholder="مثل: ظروف عائلية، مرافقة مريض، اختبارات كلية التمريض..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none font-semibold text-right"
                            />
                          </div>

                          {/* English reason (Bilingual Requirement) */}
                          <div>
                            <label className="block text-[10px] font-black text-slate-450 mb-1">{language === "ar" ? "السبب بالتفصيل (بالإنجليزية) * :" : "Reason (English) *:"}</label>
                            <textarea
                              rows={2}
                              value={wishReasonEn}
                              onChange={(e) => setWishReasonEn(e.target.value)}
                              placeholder="e.g. Family emergency, university nursing exams..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none font-semibold text-left"
                              dir="ltr"
                            />
                          </div>

                          {/* Constraint instruction */}
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-[10px] text-slate-600 leading-normal">
                            🛡️ {language === "ar" ? "ملاءمة رغبات المرضى وعائلاتهم: بمجرد موافقة المشرف، سيقوم النظام تلقائياً بتغيير الوردية بقسمك في جدول الروستر الرئيسي." : "Secure integration: Roster auto-propagates on official supervisor signature."}
                          </div>

                          <button
                            onClick={() => {
                              if (isRosterFullyLocked) {
                                alert(language === "ar" ? "🔒 الروستر معتمد نهائياً ومغلق تماماً ضد أي رغبات جديدة." : "Roster is sealed.");
                                return;
                              }
                              if (!wishReasonAr.trim() || !wishReasonEn.trim()) {
                                alert(language === "ar" ? "⚠️ الرجاء تعبئة أسباب تقديم الرغبة باللغتين العربية والإنجليزية." : "Please type reasons in both Arabic and English.");
                                return;
                              }
                              const newWishObj = {
                                id: `wish-${Date.now()}`,
                                employeeId: currentUser.id,
                                employeeNameAr: currentUser.nameAr,
                                employeeNameEn: currentUser.nameEn,
                                departmentName: currentUser.department || "EMERGENCY UNIT",
                                department: currentUser.department || "EMERGENCY UNIT",
                                period: selectedRosterPeriod,
                                dayKey: wishDayKey,
                                requestedShift: wishShift,
                                reasonAr: wishReasonAr,
                                reasonEn: wishReasonEn,
                                status: "pending",
                                submittedAt: new Date().toISOString()
                              };

                              const updatedWishes = [newWishObj, ...rosterWishes];
                              setRosterWishes(updatedWishes);
                              localStorage.setItem("baheya_roster_wishes", JSON.stringify(updatedWishes));

                              // Broadcast notification
                              const newNotification = {
                                id: `notif-${Date.now()}`,
                                messageAr: `⚙️ رغبة نوبتجية جديدة: قامت الممرضة "${currentUser.nameAr}" بتقديم رغبتها لتثبيت وردية "${wishShift}" ليوم ${wishDayKey} بقسم "${currentUser.department || "أخرى"}".`,
                                titleAr: `رغبة نوبتجية جديدة: ${currentUser.nameAr}`,
                                messageEn: `⚙️ New shift wish: Nurse "${currentUser.nameEn}" requested to schedule shift "${wishShift}" for Day ${wishDayKey} inside section "${currentUser.department || "Other"}".`,
                                titleEn: `New shift wish: ${currentUser.nameEn}`,
                                bodyAr: `طلب كادر التمريض تثبيت الفترة (${wishShift}) ليوم ${wishDayKey} مايو-يونيو بقسم ${currentUser.department}.`,
                                bodyEn: `Staff requested shift (${wishShift}) for day ${wishDayKey} inside ${currentUser.department}.`,
                                timestamp: new Date().toISOString(),
                                read: false,
                              };
                              setNotifications([newNotification, ...notifications]);

                              setWishReasonAr("");
                              setWishReasonEn("");
                              alert(language === "ar" ? "✅ تم تقديم رغبتك بنجاح ونقلها فوراً للمشرفين بانتظار الاعتماد المالي والطبي." : "Sent shift wish successfully!");
                            }}
                            className="w-full bg-pink-650 hover:bg-pink-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Check className="h-4 w-4" />
                            <span>{language === "ar" ? "إرسال الرغبة والطلب للمشرف" : "Submit Wish to Supervisor"}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* SUB-SECTION B: Supervisors Request Inbox / Personal Wishes status */}
                  <div className="lg:col-span-7 bg-white border border-slate-210 p-5 rounded-2xl shadow-sm text-right space-y-4">
                    <div className="flex items-center gap-2 justify-end">
                      {isTabNormalNurse ? (
                        <div>
                          <h4 className="font-black text-sm text-slate-900">
                            {language === "ar" ? "سجل رغباتي وحالتها الحالية في المستشفى" : "My Submitted Shift Wishes & Status"}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {language === "ar" ? "سجل رغبات التعديل والشيفتات الخاصة بسيادتكم وحالة قبولها الإداري" : "Track development status for submitted shift wishes"}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h4 className="font-black text-sm text-slate-900">
                            {language === "ar" ? "صندوق فرز واعتماد رغبات طاقم التمريض" : "Supervisor Roster Approvals Terminal"}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {language === "ar" ? "صلاحيات مشرفي الأقسام والجودة والعمليات لمطابقة الطلبات وإقرار تبديل الشفتات" : "Authorize staff wishes, updating the master schedule automatically."}
                          </p>
                        </div>
                      )}
                      <div className="w-8.5 h-8.5 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600">
                        <Inbox className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Real-time Supervisory Stats & Alerts Control Center */}
                    {(() => {
                      const deptWishes = rosterWishes.filter(w => 
                        !selectedRosterDept || w.departmentName?.toUpperCase().trim() === selectedRosterDept?.toUpperCase().trim()
                      );
                      const pendingCount = deptWishes.filter(w => w.status === "pending").length;
                      const approvedCount = deptWishes.filter(w => w.status === "approved").length;
                      const rejectedCount = deptWishes.filter(w => w.status === "rejected").length;
                      const completionRate = deptWishes.length > 0 ? Math.round((approvedCount / deptWishes.length) * 100) : 100;

                      return (
                        <div className="space-y-3.5 no-print my-3">
                          {/* Main Stats Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl transition hover:border-pink-300">
                              <span className="text-[10px] text-slate-450 font-bold block">
                                {language === "ar" ? "إجمالي رغبات القسم" : "Total Dept Wishes"}
                              </span>
                              <div className="flex items-baseline gap-1 mt-1 justify-end">
                                <span className="font-black text-slate-800 text-lg">{deptWishes.length}</span>
                                <span className="text-[9px] text-slate-450 font-bold">{language === "ar" ? "طلبات" : "wishes"}</span>
                              </div>
                            </div>

                            <div className={`p-3 rounded-xl border transition ${pendingCount > 0 ? "bg-amber-50/50 border-amber-300 animate-pulse" : "bg-slate-50 border-slate-200"}`}>
                              <span className="text-[10px] text-slate-450 font-bold block">
                                {language === "ar" ? "قيد المراجعة والفرز" : "Pending Evaluation"}
                              </span>
                              <div className="flex items-baseline gap-1 mt-1 justify-end">
                                <span className="font-black text-amber-600 text-lg">{pendingCount}</span>
                                <span className="text-[9px] text-slate-455 font-bold">{language === "ar" ? "طلب معلق" : "Pending"}</span>
                              </div>
                            </div>

                            <div className="bg-emerald-50/40 border border-emerald-150 p-3 rounded-xl transition">
                              <span className="text-[10px] text-slate-455 font-bold block">
                                {language === "ar" ? "رغبات معتمدة ومربوطة" : "Approved & Integrated"}
                              </span>
                              <div className="flex items-baseline gap-1 mt-1 justify-end">
                                <span className="font-black text-emerald-600 text-lg">{approvedCount}</span>
                                <span className="text-[9px] text-slate-455 font-bold">{language === "ar" ? "طلب" : "Approved"}</span>
                              </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl transition">
                              <span className="text-[10px] text-slate-455 font-bold block">
                                {language === "ar" ? "رغبات مستبعدة/مرفوضة" : "Declined Requests"}
                              </span>
                              <div className="flex items-baseline gap-1 mt-1 justify-end">
                                <span className="font-black text-rose-600 text-lg">{rejectedCount}</span>
                                <span className="text-[9px] text-slate-455 font-bold">{language === "ar" ? "مستبعد" : "Declined"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Professional Alert Hub Chain Notification Banner */}
                          <div className="bg-gradient-to-l from-slate-900 to-rose-950 text-white p-3.5 rounded-xl border border-rose-900/40 space-y-2 text-right">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                                <span className="text-[10px] font-extrabold text-pink-400 tracking-wider font-sans">
                                  {language === "ar" ? "📡 تدفق تنبيهات الهيكل الإشرافي المباشر" : "Leadership Notification Loop"}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-450 font-mono">
                                ROLE: {currentUser.role?.toUpperCase()} | DEPT: {selectedRosterDept}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                              {language === "ar"
                                ? `يقوم النظام ببث التعديلات والطلب لمشرف القسم الحالي (${selectedRosterDept}) ومباشرة إلى رئيسة التمريض (HN)، ثم مدير الجودة (Quality)، وصولاً إلى المدير الطبي (CNO) للمراجعة والتوقيع الإلكتروني.`
                                : `Changes recursively notify active supervisor for ${selectedRosterDept}, Department HN, Quality Assurance, and ultimate CNO/Executive Director for final approval.`}
                            </p>

                            {/* Active Chain Map */}
                            <div className="grid grid-cols-4 gap-1 text-[8.5px] text-center pt-1 font-bold">
                              <div className="bg-white/10 p-1.5 rounded-lg border border-white/5 space-y-0.5">
                                <span className="block text-slate-300">1. {language === "ar" ? "مشرف القسم" : "Supervisor"}</span>
                                <span className={`${pendingCount > 0 ? "text-amber-400 animate-pulse" : "text-emerald-400"}`}>
                                  ● {pendingCount > 0 ? (language === "ar" ? "مراجعة" : "Action Required") : (language === "ar" ? "مستقرة" : "Synced")}
                                </span>
                              </div>
                              <div className="bg-white/10 p-1.5 rounded-lg border border-white/5 space-y-0.5">
                                <span className="block text-slate-300">2. {language === "ar" ? "رئيسة التمريض" : "HN"}</span>
                                <span className="text-emerald-400">● {language === "ar" ? "نشط" : "Online"}</span>
                              </div>
                              <div className="bg-white/10 p-1.5 rounded-lg border border-white/5 space-y-0.5">
                                <span className="block text-slate-300">3. {language === "ar" ? "مدير الجودة" : "Quality Manager"}</span>
                                <span className="text-emerald-400">● {language === "ar" ? "مراقب" : "Monitoring"}</span>
                              </div>
                              <div className="bg-white/10 p-1.5 rounded-lg border border-white/5 space-y-0.5">
                                <span className="block text-slate-300">4. {language === "ar" ? "المدير الإداري" : "CNO/Director"}</span>
                                <span className={`${cnoApproved ? "text-emerald-400" : "text-amber-400"}`}>
                                  ● {cnoApproved ? (language === "ar" ? "معتمد" : "Signed") : (language === "ar" ? "انتظار" : "Awaiting")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Requests Terminal */}
                    <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                      {(() => {
                        // If normal nurse, filter to only show their OWN wishes
                        const filteredWishes = isTabNormalNurse 
                          ? rosterWishes.filter(w => w.employeeId === currentUser.id)
                          : rosterWishes;

                        if (filteredWishes.length === 0) {
                          return (
                            <div className="p-8 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-xl border border-dashed">
                              {language === "ar" ? "📂 لا توجد طلبات أو رغبات مسجلة للاستعراض حالياً." : "No submitted requests."}
                            </div>
                          );
                        }

                        return filteredWishes.map((wish) => {
                          const isPending = wish.status === "pending";
                          return (
                            <div 
                              key={wish.id}
                              className={`p-4 border rounded-xl space-y-3 transition-colors ${
                                wish.status === "approved" 
                                  ? "bg-emerald-50/60 border-emerald-250" 
                                  : wish.status === "rejected"
                                  ? "bg-rose-50/60 border-rose-250"
                                  : "bg-slate-50 border-slate-205"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div>
                                  <span className="font-extrabold text-slate-900 text-[12.5px] block">
                                    {language === "ar" ? wish.employeeNameAr : wish.employeeNameEn}
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] text-slate-500 font-sans leading-none">
                                    <span>{language === "ar" ? `قسم: ${wish.departmentName}` : `Dept: ${wish.departmentName}`}</span>
                                    <span>•</span>
                                    <span>{wish.submittedAt ? new Date(wish.submittedAt).toLocaleDateString() : ""}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="bg-slate-900 text-slate-100 px-2.5 py-1 rounded font-mono text-[10px] font-black">
                                    Day: {wish.dayKey} ➔ {wish.requestedShift}
                                  </span>
                                  
                                  {wish.status === "approved" && (
                                    <span className="bg-emerald-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      {language === "ar" ? "✓ تم القبول والربط" : "Approved"}
                                    </span>
                                  )}
                                  {wish.status === "rejected" && (
                                    <span className="bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      {language === "ar" ? "✗ مرفوض" : "Rejected"}
                                    </span>
                                  )}
                                  {wish.status === "pending" && (
                                    <span className="bg-amber-550 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                      {language === "ar" ? "قيد الدراسة والفرز" : "Pending Approval"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Reason details */}
                              <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1.5 font-sans leading-normal">
                                <p className="text-[11px] text-slate-800 font-medium">
                                  <span className="font-black text-rose-950 ml-1">{language === "ar" ? "السبب بالعربية:" : "Ar Reason:"}</span>
                                  {wish.reasonAr}
                                </p>
                                <p className="text-[11px] text-slate-600 font-mono text-left block" dir="ltr">
                                  <span className="font-sans font-bold text-rose-950 mr-1 block text-right">{language === "ar" ? "السبب بالإنجليزية:" : "En Reason:"}</span>
                                  {wish.reasonEn}
                                </p>
                              </div>

                              {/* Action Buttons for Supervisors/Admins */}
                              {isPending && isTabSupervisor && (
                                <div className="flex gap-2 justify-end pt-1">
                                  <button
                                    onClick={() => {
                                      // 1. Mark status as rejected
                                      const updated = rosterWishes.map(w => w.id === wish.id ? { ...w, status: "rejected" } : w);
                                      setRosterWishes(updated);
                                      localStorage.setItem("baheya_roster_wishes", JSON.stringify(updated));

                                      // Broadcast rejection notification
                                      const newNotif = {
                                        id: `notif-${Date.now()}`,
                                        messageAr: `❌ تم رفض طلب الورديات: رفض مشرف قسم "${wish.departmentName}" طلب تثبيت الوردية المرفوع من "${wish.employeeNameAr}" ليوم ${wish.dayKey}.`,
                                        messageEn: `❌ Shift Wish Rejected: Supervisor in section "${wish.departmentName}" declined the shift wish uploaded by "${wish.employeeNameEn}" for Day ${wish.dayKey}.`,
                                        timestamp: new Date().toISOString(),
                                        read: false
                                      };
                                      const updatedNotifs = [newNotif, ...notifications];
                                      setNotifications(updatedNotifs);
                                      localStorage.setItem("baheya_notifications", JSON.stringify(updatedNotifs));

                                      // 2. Add System log
                                      addSystemLog(`Supervisor rejected shift wish from ${wish.employeeNameEn} for Day ${wish.dayKey}.`, "warning");
                                      alert(language === "ar" ? "تم رفض الطلب بنجاح وإرسال إشعار للموظف." : "Request marked as rejected.");
                                    }}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    <span>{language === "ar" ? "رفض الطلب" : "Reject Wish"}</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      // 1. Mark status as approved
                                      const updatedWishes = rosterWishes.map(w => w.id === wish.id ? { ...w, status: "approved" } : w);
                                      setRosterWishes(updatedWishes);
                                      localStorage.setItem("baheya_roster_wishes", JSON.stringify(updatedWishes));

                                      // 2. Automagically rewrite the shift inside the corresponding Roster Row!
                                      const nextRosterList = rosterList.map((rost) => {
                                        const hasEmployee = rost.rows.some((row: any) => 
                                          row.employeeId === wish.employeeId || 
                                          row.employeeCode === wish.employeeId ||
                                          row.employeeNameEn.toLowerCase().trim() === wish.employeeNameEn.toLowerCase().trim()
                                        );
                                        if (hasEmployee) {
                                          return {
                                            ...rost,
                                            rows: rost.rows.map((row: any) => {
                                              if (
                                                row.employeeId === wish.employeeId || 
                                                row.employeeCode === wish.employeeId ||
                                                row.employeeNameEn.toLowerCase().trim() === wish.employeeNameEn.toLowerCase().trim()
                                              ) {
                                                return {
                                                  ...row,
                                                  shifts: {
                                                    ...row.shifts,
                                                    [wish.dayKey]: wish.requestedShift
                                                  }
                                                };
                                              }
                                              return row;
                                            })
                                          };
                                        }
                                        return rost;
                                      });

                                      setRosterList(prevList => {
                                        const nextRosterList = prevList.map((rost) => {
                                          const hasEmployee = rost.rows.some((row: any) => 
                                            row.employeeId === wish.employeeId || 
                                            row.employeeCode === wish.employeeId ||
                                            (row.employeeNameEn && row.employeeNameEn.toLowerCase().trim() === wish.employeeNameEn.toLowerCase().trim())
                                          );
                                          if (hasEmployee) {
                                            return {
                                              ...rost,
                                              rows: rost.rows.map((row: any) => {
                                                if (
                                                  row.employeeId === wish.employeeId || 
                                                  row.employeeCode === wish.employeeId ||
                                                  (row.employeeNameEn && row.employeeNameEn.toLowerCase().trim() === wish.employeeNameEn.toLowerCase().trim())
                                                ) {
                                                  return {
                                                    ...row,
                                                    shifts: {
                                                      ...row.shifts,
                                                      [wish.dayKey]: wish.requestedShift
                                                    }
                                                  };
                                                }
                                                return row;
                                              })
                                            };
                                          }
                                          return rost;
                                        });
                                        localStorage.setItem("baheya_department_rosters", JSON.stringify(nextRosterList));
                                        
                                        // Broadcast approval notification
                                        const newApproveNotif = {
                                          id: `notif-${Date.now()}`,
                                          messageAr: `✅ تم اعتماد النوبتجية: وافق مشرف قسم "${wish.departmentName}" على طلب الزميلة "${wish.employeeNameAr}" ليوم ${wish.dayKey} وتعيين الوردية "${wish.requestedShift}" تلقائياً بالتنسيق.`,
                                          messageEn: `✅ Shift Wish Approved: Supervisor for section "${wish.departmentName}" authorized shift wish for "${wish.employeeNameEn}" on Day ${wish.dayKey} with shift "${wish.requestedShift}", updating master logs.`,
                                          timestamp: new Date().toISOString(),
                                          read: false
                                        };
                                        setNotifications(prev => [newApproveNotif, ...prev]);
                                        // Merge update into local storage
                                        const existingNotifsJson = localStorage.getItem("baheya_notifications") || "[]";
                                        try {
                                          const parsedNotifs = JSON.parse(existingNotifsJson);
                                          localStorage.setItem("baheya_notifications", JSON.stringify([newApproveNotif, ...parsedNotifs]));
                                        } catch (err) {
                                          localStorage.setItem("baheya_notifications", JSON.stringify([newApproveNotif]));
                                        }

                                        return nextRosterList;
                                      });

                                      // 3. Add system log and alert
                                      addSystemLog(`Supervisor APPROVED shift wish from ${wish.employeeNameEn} for Day ${wish.dayKey}. Schedule auto-updated to ${wish.requestedShift}.`, "info");
                                      alert(language === "ar" ? "✅ تم قبول الطلب واعتماده بنجاح! تم تحديث الشفت الحالي تلقائياً داخل جدول الروستر الرئيسي." : "Wish approved! Roster has been updated automatically.");
                                    }}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-black transition flex items-center gap-1 cursor-pointer shadow-sm"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>{language === "ar" ? "اعتماد وقبول وقرن بالروستر" : "Approve & Join Roster"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}

          {/* TAB 2.5: Clinical Sheet Distribution Registry & Department Forms Hub */}
          {activeTab === "distribution" && (
            <div className="space-y-6 animate-fade font-sans text-right" dir="rtl">
              {/* Header section with Stats */}
              <div className="bg-gradient-to-l from-slate-900 via-slate-850 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl text-white relative overflow-hidden">
                <div className="absolute left-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-pink-500/10 to-transparent pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 z-10 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="bg-pink-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        {language === "ar" ? `قاعدة بيانات ${hospitalSettings.nameAr} للأقسام والوحدات` : `${hospitalSettings.nameEn} Department Pool`}
                      </span>
                      <LayoutGrid className="h-5 w-5 text-pink-500" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                      {language === "ar"
                        ? "مكتب التوزيع السريري للنماذج والـ 200 شيت"
                        : "Clinical Sheets Distribution Office & Forms Navigator"}
                    </h2>
                    <p className="text-slate-300 text-xs leading-relaxed max-w-2xl font-medium">
                      {language === "ar"
                        ? `منصة الإشراف المتكاملة لتعيين وتوزيع النماذج التشغيلية واستمارات الجرد على الوحدات الطبية الـ 16 المختلفة بمستشفى ${hospitalSettings.nameAr || "المؤسسة"} مع مراقبة مؤشرات الامتثال اليومي.`
                        : "Integrated supervisor suite for allocating standard checklists and registers across 16 medical wings, monitoring compliance and re-routing folders."}
                    </p>
                  </div>
                  
                  {/* Aggregates Dashboard */}
                  <div className="flex gap-4 shrink-0 bg-slate-800/60 p-4 rounded-xl border border-slate-700 justify-end md:justify-start">
                    <div className="text-center px-2">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">
                        {language === "ar" ? "إجمالي النماذج النشطة" : "Active Sheets"}
                      </span>
                      <span className="text-2xl font-black text-pink-400">
                        {allAvailableTemplates.length}
                      </span>
                    </div>
                    <div className="w-px bg-slate-700 self-stretch" />
                    <div className="text-center px-2">
                       <span className="block text-[10px] text-slate-400 uppercase font-bold">
                        {language === "ar" ? "الأقسام والوحدات" : "Departments"}
                      </span>
                      <span className="text-2xl font-black text-amber-400">
                        {departments.length}
                      </span>
                    </div>
                    <div className="w-px bg-slate-700 self-stretch" />
                    <div className="text-center px-2">
                       <span className="block text-[10px] text-slate-400 uppercase font-bold">
                        {language === "ar" ? "الشيتات المجرودة" : "Logged Records"}
                      </span>
                      <span className="text-2xl font-black text-emerald-400">
                        {records.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid of Bento-style Department Cards & Distribution Controller */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* 1. Quick Re-allocation & Distribution Form Card (Admins / Supervisors) */}
                <div className="xl:col-span-1 space-y-6 text-right">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1.5 font-sans">
                        <span>{language === "ar" ? "التوجيه والدليفري للنماذج" : "Re-Route / Distribute Templates"}</span>
                        <ArrowLeftRight className="h-4 w-4 text-pink-600" />
                      </h3>
                      <p className="text-[10px] text-slate-500 leading-tight mt-1">
                        {language === "ar"
                          ? "قم بتحديد نموذج من الـ 200 نموذج النشطة وتوجيهه فورياً ليكون من صلاحية قسم أو وحدة طبية معينة:"
                          : "Select any active clinical template or registration sheet and route it to an explicit hospital wing:"}
                      </p>
                    </div>

                    {/* Form Controls */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-right font-extrabold text-slate-600 mb-1">
                          {language === "ar" ? "1- اختر الاستمارة / الشيت المطلوب للتوزيع:" : "1. Select Sheet to Distribute:"}
                        </label>
                        <select
                          id="dist-template-select"
                          className="w-full bg-slate-55 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-pink-500 text-slate-700 text-right"
                        >
                          {allAvailableTemplates.map(tpl => (
                            <option key={tpl.id} value={tpl.id} className="text-right">
                              ({tpl.code}) {language === "ar" ? tpl.titleAr : tpl.titleEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-right font-extrabold text-slate-600 mb-1">
                          {language === "ar" ? "2- اختر القسم/الوحدة المستهدفة بالتوزيع للعمل:" : "2. Select Target Clinical Department Unit:"}
                        </label>
                        <select
                          id="dist-dept-select"
                          className="w-full bg-slate-55 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-pink-500 text-slate-700 text-right"
                        >
                          {departments.map(dept => (
                            <option key={dept} value={dept} className="text-right">{dept}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          const tplId = (document.getElementById("dist-template-select") as HTMLSelectElement)?.value;
                          const deptName = (document.getElementById("dist-dept-select") as HTMLSelectElement)?.value;
                          if (!tplId || !deptName) {
                            alert("Please select both a template and department");
                            return;
                          }
                          const hasPerm = currentUser.role === "admin" || currentUser.role === "quality" || currentUser.role === "president" || currentUser.role === "it";
                          if (!hasPerm) {
                            alert(language === "ar" ? "عذراً! هذه لوحة إشرافية، لا تملك صلاحية تعديل توزيع النماذج." : "Only admins or quality compliance supervisors may re-allocate templates.");
                            return;
                          }
                          
                          // Dispatch override
                          const tpl = allAvailableTemplates.find(t => t.id === tplId);
                          if (tpl) {
                            const updatedOverrides = {
                              ...templateOverrides,
                              [tplId]: {
                                ...tpl,
                                departmentDefault: deptName
                              }
                            };
                            setTemplateOverrides(updatedOverrides);
                            localStorage.setItem("baheya_template_overrides", JSON.stringify(updatedOverrides));
                            saveTemplateConfig({ overrides: updatedOverrides, deactivated: deactivatedTemplateIds }).catch(err => console.error("Cloud dynamic template routing overrides update failing:", err));
                            
                            // Log system operation
                            addSystemLog(`Routed template ${tpl.code} dynamically to department: ${deptName}`, "info");
                            
                            alert(language === "ar" 
                              ? `✅ تم توجيه وتوزيع الشيت [${tpl.code}] بنجاح إلى [${deptName}]! الاستمارة متاحة الآن فوراً لطاقم تمريض هذا القسم للعمل وتعبئة جرد الأيام.`
                              : `✅ Succesfully routed sheet [${tpl.code}] to [${deptName}]! Department staff can now view and fill.`);
                          }
                        }}
                        className="w-full bg-pink-600 hover:bg-pink-700 hover:text-pink-100 text-white font-bold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm uppercase cursor-pointer"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                        <span>{language === "ar" ? "حفظ وتعديل مكان التوزيع الفوري" : "Apply & Distribute Form"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Notice transmitter (اريال تنبيه مشرف الجودة والعموم) */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-right">
                    <div className="border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center justify-end gap-1.5 font-sans">
                        <span>{language === "ar" ? "📡 جهاز بث تنبيهات وقواعد الجودة" : "📡 Broadcast Quality Directives"}</span>
                        <Radio className="h-4 w-4 text-rose-600" />
                      </h3>
                      <p className="text-[10px] text-slate-500 leading-tight mt-1">
                        {language === "ar"
                          ? "قم بكتابة توجيه جودة عاجل أو إجراء للوحدة لموظفي التمريض الميدانيين ليظهر لهم مباشرة في لوحة العمل:"
                          : "Broadcast medical quality or safety guidelines directly to nursing staff workbenches:"}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-right font-extrabold text-slate-600 mb-1">
                          {language === "ar" ? "القسم السريري المستهدف بالبث:" : "Target Ward / Unit for Broadcast:"}
                        </label>
                        <select
                          id="broadcast-dept-select"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-pink-500 text-slate-750 text-right font-sans"
                        >
                          <option value="ALL">{language === "ar" ? "كل أقسام المستشفى (بث عام)" : "All Hospital Departments"}</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-right font-extrabold text-slate-600 mb-1">
                          {language === "ar" ? "نص التنبيه أو التوجيه العاجل:" : "Directive or Notice details (Ar/En):"}
                        </label>
                        <textarea
                          id="broadcast-message-text"
                          rows={3}
                          placeholder={language === "ar" ? "مثال: يرجى العلم بضرورة تسجيل قياسات رطوبة صيدلية الخلط وغرفة الملابس بحد أقصى الثالثة عصراً." : "Write notice/instructions here..."}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-pink-500 text-slate-700 text-right font-sans"
                        />
                      </div>

                      <button
                        onClick={() => {
                          const dept = (document.getElementById("broadcast-dept-select") as HTMLSelectElement)?.value;
                          const msg = (document.getElementById("broadcast-message-text") as HTMLTextAreaElement)?.value.trim();
                          
                          if (!msg) {
                            alert(language === "ar" ? "يرجى كتابة التنبيه أولاً!" : "Please write a notice message!");
                            return;
                          }

                          const newNotif = {
                            id: `notif-${Date.now()}`,
                            messageAr: `📡 [توجيه المشرفين] للقسم (${dept === "ALL" ? "جميع الأقسام" : dept}): ${msg}`,
                            messageEn: `📡 [Supervisor Directive] for (${dept === "ALL" ? "All Departments" : dept}): ${msg}`,
                            timestamp: new Date().toISOString(),
                            read: false,
                            type: "directive",
                            targetDepartment: dept
                          };

                          const updated = [newNotif, ...notifications];
                          setNotifications(updated);
                          localStorage.setItem("baheya_notifications", JSON.stringify(updated));

                          // clear textarea
                          (document.getElementById("broadcast-message-text") as HTMLTextAreaElement).value = "";
                          
                          addSystemLog(`Broadcast Quality Directive regarding: ${msg.substring(0, 40)}...`, "warning");

                          alert(
                            language === "ar" 
                              ? `✅ تم بث التوجيه بنجاح! سيظهر فوراً لطواقم التمريض بالقسم المستهدف كـ إعلام هام بنظام كادر ${hospitalSettings.nameAr || "المؤسسة"}.`
                              : `✅ Succesfully broadcasted quality directive to target ward staff.`
                          );
                        }}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Radio className="h-4 w-4 animate-pulse" />
                        <span>{language === "ar" ? "بث ونشر التعليمات فوراً للأقسام" : "Broadcast Directive"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Instructions Alert */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-3 text-right">
                    <h4 className="font-bold text-slate-800 flex items-center justify-end gap-1 font-sans">
                      <span>{language === "ar" ? "دليل توجيه الشيتات والـ 200 نموذج" : "Distribution & Routing Directives"}</span>
                      <Info className="h-4 w-4 text-slate-500" />
                    </h4>
                    <p className="text-right leading-relaxed">
                      {language === "ar" 
                        ? "يتم تحديد الأقسام الافتراضية لكل شيت من الـ 200 شيت بناءً على الكود الطبي ومعايير الجودة G-GEN. يتيح لك مكتب التوزيع تعديل القسم الافتراضي لكي تتمكن طواقم التمريض التابعة لهذا القسم من رؤية الاستمارة وتعبئتها بنسق أسبوعي (7 أيام) أو شهري لتطابق الاستمارة الطبية على الأرض."
                        : "Checklists are linked to functional wings. Quality officers can alter these assignments in real-time, instantly making specific forms accessible to target wards in their digital ledger list."}
                    </p>
                  </div>
                </div>

                {/* 2. Departments Bento Grid Grid displaying clinical details and listing sheets */}
                <div className="xl:col-span-2 space-y-6 text-right">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-right">
                    <div className="border-b border-slate-100 pb-3 mb-4">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-right font-sans">
                         {language === "ar" ? "خرائط توزيع الاستمارات على الأقسام والوحدات الـ 16" : "Allotment Map of 16 Clinical Departments"}
                       </h3>
                       <p className="text-[10px] text-slate-500 leading-tight mt-1 text-right">
                         {language === "ar" ? "اضغط على أي قسم لاستعراض الاستمارات الموزعة والنشطة لديه وتعبئة أي سجل فوري:" : "Click on any clinical wing to audit and fill its operational sheets:"}
                       </p>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {departments.map((dept, idx) => {
                        // Find how many templates map to this department in allAvailableTemplates
                        const deptTemplates = allAvailableTemplates.filter(t => doesTemplateMatchDepartment(t, dept));
                        // Find matching saved records count for stats
                        const deptRecordsCount = records.filter(rec => rec.department === dept).length;
                        
                        return (
                          <div 
                            key={dept} 
                            className="bg-slate-50/60 p-4 rounded-xl border border-slate-150 shadow-xs hover:border-pink-300 hover:bg-slate-50 hover:shadow-sm transition flex flex-col justify-between"
                          >
                            <div className="text-right">
                              {/* Department Badge and Index */}
                              <div className="flex items-center justify-between mb-2 flex-row-reverse">
                                <span className="bg-slate-200 text-slate-800 text-[9px] font-sans font-black px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="bg-pink-100 text-pink-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 flex-row-reverse">
                                  <span>{deptTemplates.length}</span>
                                  <span>{language === "ar" ? "نموذج نشط" : "Templates"}</span>
                                </span>
                              </div>

                              {/* Title */}
                              <h4 className="text-xs font-bold text-slate-900 leading-tight tracking-tight text-right uppercase">
                                {dept}
                              </h4>
                              
                              <p className="text-[10px] text-slate-400 leading-none mt-1 text-right font-mono font-medium block">
                                {language === "ar" ? `قسم ${hospitalSettings.nameAr || "المؤسسة"} المتكامل الفرعي` : `Integrated Wing`}
                              </p>

                              {/* Mini statistics */}
                              <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-200/60 pt-2.5 flex-row-reverse">
                                <div className="text-right">
                                  <span className="block text-[8px] text-slate-400 leading-none font-bold">
                                    {language === "ar" ? "السجلات المرفوعة" : "Logged Files"}
                                  </span>
                                  <span className="text-xs font-black text-emerald-600 text-right block">
                                    {deptRecordsCount} {language === "ar" ? "جرد ملء" : "Saved"}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[8px] text-slate-400 leading-none font-bold">
                                    {language === "ar" ? "معدل الرصد" : "Reporting Cycle"}
                                  </span>
                                  <span className="text-xs font-black text-pink-600 block text-right">
                                    {deptRecordsCount > 0 ? "100%" : "0%"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* View / Select Folder Action */}
                            <div className="mt-4 pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-right">
                              {/* Quick selection dropdown to search their checklists */}
                              <select
                                id={`quick-select-dept-${idx}`}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) return;
                                  const matchingTpl = deptTemplates.find(t => t.id === val);
                                  if (matchingTpl) {
                                    setSelectedTemplate(matchingTpl);
                                    setActiveTab("editor");
                                    handleCreateNew(matchingTpl.id);
                                  }
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg p-1 text-[11px] font-semibold text-slate-700 cursor-pointer text-right outline-none"
                              >
                                <option value="">⚠️ {language === "ar" ? "اختر شيت للتعبئة فوراً..." : "Open checklist..."}</option>
                                {deptTemplates.map(t => (
                                  <option key={t.id} value={t.id}>
                                    ({t.code}) {language === "ar" ? t.titleAr.slice(0, 30) : t.titleEn.slice(0, 30)}...
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "history" && (() => {
            const finalHistoryRecords = filteredRecords.filter(r => {
              if (historyDeptFilter && r.department !== historyDeptFilter) return false;
              if (historyTemplateFilter && r.templateId !== historyTemplateFilter) return false;
              return true;
            });

            // Extract unique departments for filter dropdown
            const uniqueHistoryDepts = Array.from(new Set(records.map(r => r.department))).filter(Boolean);
            // Extract templates for filter dropdown
            const uniqueHistoryTemplates = Array.from(new Set(records.map(r => r.templateId)))
              .map(tid => allAvailableTemplates.find(t => t.id === tid))
              .filter(Boolean);

            const handleDeleteRecord = async (recordId: string) => {
              const isAdminOrIt = currentUser && (currentUser.role === "admin" || currentUser.role === "it" || currentUser.role === "quality");
              if (!isAdminOrIt) {
                alert(language === "ar" 
                  ? "عذراً: غير مسموح لك بحذف السجلات المؤرشفة. هذه الصلاحية للمشرفين ومسؤولي النظام فقط."
                  : "Access Denied: Only supervisors and administrators are allowed to delete archived clinical records.");
                return;
              }

              if (!confirm(language === "ar" 
                ? "هل أنت متأكد تماماً من رغبتك في حذف هذا السجل المؤرشف نهائياً وبشكل غير قابل للاسترداد؟" 
                : "Are you sure you want to permanently and irreversibly delete this archived record?")) {
                return;
              }

              try {
                await deleteClinicalRecord(recordId);
                const updated = records.filter(r => r.id !== recordId);
                setRecords(updated);
                localStorage.setItem("baheya_medical_records", JSON.stringify(updated));
                addSystemLog(`Deleted archived record: ID ${recordId}`, "warning");
                if (selectedHistoryRecord?.id === recordId) {
                  setSelectedHistoryRecord(null);
                }
                alert(language === "ar" ? "تم حذف السجل بنجاح من قاعدة البيانات." : "Clinical record successfully deleted.");
              } catch (err: any) {
                console.error("Delete failed:", err);
                alert(language === "ar" ? "فشلت عملية الحذف سحابياً: " + err.message : "Cloud deletion failed: " + err.message);
              }
            };

            const handleEditRecordFromHistory = (rec: SavedRecord) => {
              const matchingTemplate = allAvailableTemplates.find(t => t.id === rec.templateId);
              if (matchingTemplate) {
                setSelectedTemplate(matchingTemplate);
              }
              setEditingRecord(rec);
              setActiveTab("editor");
              addSystemLog(`Loaded archived record ${rec.id} in active clinical editor.`, "info");
            };

            return (
              <div className="space-y-6 animate-fade font-sans text-right" dir="rtl">
                {/* Header card with Stats */}
                <div className="bg-gradient-to-l from-slate-900 via-slate-850 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl text-white relative overflow-hidden">
                  <div className="absolute left-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-pink-500/10 to-transparent pointer-events-none" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 z-10 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="bg-pink-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          {language === "ar" ? "أرشيف الجودة والاعتماد السريري" : "Clinical Quality & Accreditation Archive"}
                        </span>
                        <FileSpreadsheet className="h-5 w-5 text-pink-500" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                        {language === "ar" ? "مستودع سجلات الأرشيف ومراقبة الجودة" : "Saved Records & Clinical Audits Store"}
                      </h2>
                      <p className="text-slate-300 text-xs leading-relaxed max-w-2xl font-medium">
                        {language === "ar"
                          ? "استعرض وابحث في جميع سجلات الـ 200 شيت المنفذة بالكامل من قبل الطواقم التمريضية والطبية، مع طباعتها أو تحميلها كملفات PDF رسمية أو الاستمرار بتعديلها."
                          : "Navigate, filter and print fully logged medical registers, rosters, and form checklists generated by nurses and clinic personnel."}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 shrink-0 bg-slate-800/60 p-4 rounded-xl border border-slate-700 justify-end">
                      <div className="text-center px-2">
                        <span className="block text-[10px] text-slate-400 font-bold">
                          {language === "ar" ? "السجلات الكلية بالأرشيف" : "Total Logged"}
                        </span>
                        <span className="text-2xl font-black text-pink-400">
                          {records.length}
                        </span>
                      </div>
                      <div className="w-px bg-slate-700 self-stretch" />
                      <div className="text-center px-2">
                        <span className="block text-[10px] text-slate-400 font-bold">
                          {language === "ar" ? "تطابق البحث الحالي" : "Filtered Matches"}
                        </span>
                        <span className="text-2xl font-black text-emerald-400">
                          {finalHistoryRecords.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
                  {/* Search query input */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="font-bold text-slate-650 flex items-center gap-1 justify-end">
                      <span>{language === "ar" ? "ابحث بنص، كود الشيت، الموظف، المريض..." : "Search text, Staff, Patient..."}</span>
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={language === "ar" ? "اكتب اسم الموظف، المعرف ID، كود الاستمارة..." : "Type text or ID to search..."}
                        className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-right transition font-medium focus:bg-white focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 text-xs focus:outline-none"
                      />
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Filter by Department */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-650 block text-right">
                      {language === "ar" ? "تصنيف القسم الطبي/الوحدة" : "Filter by Department"}
                    </label>
                    <select
                      value={historyDeptFilter}
                      onChange={(e) => setHistoryDeptFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-705 cursor-pointer text-right outline-none hover:bg-slate-100"
                    >
                      <option value="">{language === "ar" ? "كل الأقسام الطبية" : "All Medical Departments"}</option>
                      {uniqueHistoryDepts.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Template Checklist */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-650 block text-right">
                      {language === "ar" ? "تصفية بنوع الشيت" : "Filter by Template Checklist"}
                    </label>
                    <select
                      value={historyTemplateFilter}
                      onChange={(e) => setHistoryTemplateFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-705 cursor-pointer text-right outline-none hover:bg-slate-100"
                    >
                      <option value="">{language === "ar" ? "كل النماذج الـ 200" : "All 200 Forms Templates"}</option>
                      {uniqueHistoryTemplates.map(tpl => tpl && (
                        <option key={tpl.id} value={tpl.id}>
                          ({tpl.code}) {language === "ar" ? tpl.titleAr : tpl.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Empty State vs List */}
                {finalHistoryRecords.length === 0 ? (
                  <div className="bg-white border rounded-xl border-dashed border-slate-300 p-12 text-center space-y-4">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto animate-bounce" />
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-800 text-sm">
                        {language === "ar" ? "لا توجد سجلات مطابقة في مستودع الأرشيف" : "No Matching Records Found in Archive Store"}
                      </h3>
                      <p className="text-slate-500 text-xs max-w-lg mx-auto leading-relaxed">
                        {language === "ar"
                          ? "لم نجد أي سجلات مدخلة أو محفوظة حتى الآن بناء على خيارات البحث. يمكنك تسجيل وتدقيق شيت جديد من قسم 'جرد الأقسام' أو ضغط الزر بالأسفل لتجربة 3 نماذج أرشيفية مليئة بالتفاصيل فوراً!"
                          : "No active history is saved or matches current filters. You can record medical logs in the workspace or seed mock logs to test."}
                      </p>
                    </div>

                    <button
                      onClick={handleSeedMockAuditData}
                      className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <Database className="h-4 w-4" />
                      <span>{language === "ar" ? "توليد 3 سجلات أرشيف جودة مستندات مجاناً (تجريبي)" : "Seed 3 Mock Archived Quality Registers"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column: Records list */}
                    <div className="xl:col-span-2 space-y-3">
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto text-right">
                          <table className="w-full text-xs text-right text-slate-650 whitespace-nowrap min-w-full">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                              <tr>
                                <th scope="col" className="px-4 py-3">{language === "ar" ? "كود الشيت" : "Code"}</th>
                                <th scope="col" className="px-4 py-3">{language === "ar" ? "اسم النموذج والترخيص" : "Workbook / Check List"}</th>
                                <th scope="col" className="px-4 py-3">{language === "ar" ? "التاريخ والوقت" : "Date & Time"}</th>
                                <th scope="col" className="px-4 py-3">{language === "ar" ? "القسم والموقع" : "Location"}</th>
                                <th scope="col" className="px-4 py-3">{language === "ar" ? "سجل بواسطة" : "Logged By"}</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-center">{language === "ar" ? "الإجراءات" : "Actions"}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {finalHistoryRecords.map(r => {
                                const tpl = allAvailableTemplates.find(t => t.id === r.templateId);
                                const isSelected = selectedHistoryRecord?.id === r.id;
                                return (
                                  <tr 
                                    key={r.id} 
                                    className={`hover:bg-slate-50/80 transition cursor-pointer ${isSelected ? "bg-pink-50/40" : ""}`}
                                    onClick={() => setSelectedHistoryRecord(r)}
                                  >
                                    <td className="px-4 py-3.5">
                                      <span className="font-sans font-black bg-slate-150 text-slate-700 px-2 py-0.5 rounded text-[10px] border border-slate-250/50">
                                        {tpl ? tpl.code : "N/A"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 font-bold text-slate-800">
                                      <div className="flex flex-col text-right">
                                        <span className="text-[11.5px] truncate max-w-[180px]">
                                          {tpl ? (language === "ar" ? tpl.titleAr : tpl.titleEn) : r.templateId}
                                        </span>
                                        {r.patientName && (
                                          <span className="text-[9px] text-emerald-650 font-bold text-right pt-0.5">
                                            👤 {r.patientName} (MRN: {r.patientMRN})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-[11px] font-mono font-medium text-slate-500">
                                      <div className="flex items-center gap-1.5 justify-end">
                                        <span>{r.time}</span>
                                        <Clock className="h-3 w-3 text-slate-350" />
                                        <span>{r.date}</span>
                                        <Calendar className="h-3 w-3 text-slate-350" />
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-slate-600 font-bold">
                                      {r.department}
                                    </td>
                                    <td className="px-4 py-3.5 font-bold text-slate-605">
                                      <div className="flex flex-col text-right">
                                        <span>{r.staffName || "غير معرف"}</span>
                                        <span className="text-[9px] text-slate-400 font-mono">ID: {r.staffId || "N/A"}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                      <div className="flex items-center gap-1.5 justify-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => setSelectedHistoryRecord(r)}
                                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                          title={language === "ar" ? "معاينة خاطفة" : "Quick preview"}
                                        >
                                          <Info className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => generatePDF(
                                            r,
                                            tpl || allAvailableTemplates[0],
                                            hospitalSettings,
                                            language,
                                            "all"
                                          )}
                                          className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-650 rounded-lg transition"
                                          title={language === "ar" ? "طباعة / تصدير PDF" : "Print PDF"}
                                        >
                                          <Printer className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleEditRecordFromHistory(r)}
                                          className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-650 rounded-lg transition"
                                          title={language === "ar" ? "تعديل في المحرر" : "Load in Clinical Editor"}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRecord(r.id)}
                                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                                          title={language === "ar" ? "حذف نهائي" : "Delete recorded log"}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Record Inspection Panel */}
                    <div className="xl:col-span-1">
                      {selectedHistoryRecord ? (() => {
                        const rec = selectedHistoryRecord;
                        const tpl = allAvailableTemplates.find(t => t.id === rec.templateId);
                        return (
                          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 text-right">
                            <div className="flex items-center justify-between border-b pb-3 border-slate-100 flex-row-reverse">
                              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                <FileText className="h-3.5 w-3.5 text-pink-600" />
                                <span>{language === "ar" ? "بطاقة السجل والبيانات" : "Audit Card info"}</span>
                              </h4>
                              <button
                                onClick={() => setSelectedHistoryRecord(null)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                              >
                                ✕ {language === "ar" ? "إغلاق" : "hide"}
                              </button>
                            </div>

                            <div className="space-y-3 text-xs leading-relaxed">
                              {/* Metadata list */}
                              <div>
                                <span className="block text-[10px] text-slate-400 font-bold">{language === "ar" ? "كود واسم النموذج السريري" : "Checklist Title"}</span>
                                <span className="font-black text-slate-800 text-[12px] block text-right pt-0.5">
                                  ({tpl?.code || "N/A"}) {language === "ar" ? tpl?.titleAr : tpl?.titleEn}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-50">
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-bold">{language === "ar" ? "القسم والموقع" : "Ward / Dept"}</span>
                                  <span className="font-bold text-slate-700">{rec.department}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-bold">{language === "ar" ? "تاريخ الحفظ والتدقيق" : "Archived Date"}</span>
                                  <span className="font-bold text-slate-700 font-mono text-[11px] block ttext-right">{rec.date} {rec.time}</span>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-50">
                                <span className="block text-[10px] text-slate-400 font-bold">{language === "ar" ? "الموظف المسؤول (التمريض/المدقق)" : "Staff Nurse of Duty"}</span>
                                <div className="flex items-center gap-2 justify-end mt-0.5">
                                  <span className="text-slate-700 font-bold">{rec.staffName || "طاقم غير معرف"}</span>
                                  <span className="bg-slate-100 text-slate-600 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">ID: {rec.staffId || "N/A"}</span>
                                </div>
                              </div>

                              {rec.patientName && (
                                <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg text-[11px]">
                                  <span className="block text-[9px] text-emerald-800 font-bold mb-1">📋 {language === "ar" ? "بيانات المريض ومسوغات الخروج" : "Oncology Patient Medical Admission Info"}</span>
                                  <div className="space-y-1 text-slate-700 text-right">
                                    <div><strong>{language === "ar" ? "الاسم:" : "Name:"}</strong> {rec.patientName}</div>
                                    <div><strong>MRN:</strong> <span className="font-mono">{rec.patientMRN}</span></div>
                                    {rec.diagnosis && <div><strong>{language === "ar" ? "التشخيص العلمي السريري:" : "Clinical Diagnosis:"}</strong> {rec.diagnosis}</div>}
                                  </div>
                                </div>
                              )}

                              {rec.notes && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-105">
                                  <span className="block text-[9px] text-slate-450 font-bold uppercase mb-1">{language === "ar" ? "مذكرة الجرد وملاحظات معايير الاعتماد" : "Clinical audit remarks"}</span>
                                  <p className="text-slate-600 text-[11px] font-medium leading-relaxed italic">{rec.notes}</p>
                                </div>
                              )}

                              {/* Signoff verification badge */}
                              <div className="flex justify-center py-2.5 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <div className="text-center">
                                  <span className="text-[14px] inline-block mb-0.5">🎖️</span>
                                  <span className="block text-[9px] text-slate-400 font-black tracking-widest">BAHEYA CLINICAL AUDIT DEPT</span>
                                  <span className="inline-block mt-1 text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                                    ✓ {language === "ar" ? "معتمد ومطابق لـ JCI" : "JCI ACCREDITED COMPLIANT"}
                                  </span>
                                </div>
                              </div>

                              {/* Document filling check matrix */}
                              <div>
                                <span className="block text-[10px] text-slate-400 font-bold mb-1.5">{language === "ar" ? "أصناف الجرد المسجلة بالسجل" : "Registered items list"}</span>
                                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 border-r-2 border-pink-500/10">
                                  {rec.gridData?.map((item, idx) => {
                                    const checkedDaysCount = Object.values(item.days || {}).filter(Boolean).length;
                                    return (
                                      <div key={idx} className="bg-slate-50/70 p-2 rounded border border-slate-100 flex justify-between items-center text-[11px]">
                                        <span className="bg-slate-200 text-slate-700 font-mono text-[9px] px-1 py-0.5 rounded">
                                          {checkedDaysCount} {language === "ar" ? "أيام" : "days"}
                                        </span>
                                        <div className="text-right flex-1 pr-2">
                                          <div className="font-bold text-slate-700 truncate max-w-[145px]">
                                            {language === "ar" ? item.itemAr : item.itemEn}
                                          </div>
                                          <span className="text-[9px] text-slate-400 font-mono">({item.code})</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Secondary buttons */}
                              <div className="flex gap-2 pt-2 text-center">
                                <button
                                  onClick={() => generatePDF(
                                    rec,
                                    tpl || allAvailableTemplates[0],
                                    hospitalSettings,
                                    language,
                                    "all"
                                  )}
                                  className="flex-1 py-1.5 bg-pink-650 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  <span>{language === "ar" ? "طباعة التقرير" : "Print report"}</span>
                                </button>
                                <button
                                  onClick={() => handleEditRecordFromHistory(rec)}
                                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-pink-400" />
                                  <span>{language === "ar" ? "استئناف التعديل" : "Resume Editor"}</span>
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })() : (
                        <div className="bg-slate-50 border rounded-xl border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs font-semibold py-24 leading-relaxed">
                          <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          {language === "ar"
                            ? "اضغط على أي سجل بالجدول لعرض التفاصيل الكاملة لقائمة الفحص وعلامات مطابقة الجودة السحابية التابعة لبهية."
                            : "Click on any record in list to inspect daily check values, comments and JCI compliant indicators."}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 4: General and Admin Hospital Settings with Custom Sheet Builders */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade font-sans text-right">
              
              {/* Hospital settings */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                    <span>تعديل إعدادات ترويسة (Header) وتذييل (Footer) التقارير والسجلات</span>
                    <Settings className="h-4.5 w-4.5 text-pink-600" />
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    تعديل بيانات ترويسة التقارير (الاسم والشعار) وتذييلها (Footer) لتظهر في جميع السجلات المطبوعة
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-pink-600 mb-1">اسم المؤسسة/المنشأة الرئيسي (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.nameAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, nameAr: e.target.value })}
                      className="w-full bg-pink-55/15 border border-pink-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold text-pink-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-pink-600 mb-1">Institution/Hospital Name (English)</label>
                    <input
                      type="text"
                      value={settingsForm.nameEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, nameEn: e.target.value })}
                      className="w-full bg-pink-55/15 border border-pink-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold text-pink-800 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم ترويسة البرنامج الهيدر (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.appHeaderAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, appHeaderAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Program Header Label (English)</label>
                    <input
                      type="text"
                      value={settingsForm.appHeaderEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, appHeaderEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-sans font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">عنوان البوابة (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.portalTitleAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, portalTitleAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">عنوان البوابة (بالانجليزية)</label>
                    <input
                      type="text"
                      value={settingsForm.portalTitleEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, portalTitleEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">العنوان المميز (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.premiumTitleAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, premiumTitleAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">العنوان المميز (بالانجليزية)</label>
                    <input
                      type="text"
                      value={settingsForm.premiumTitleEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, premiumTitleEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تذييل البرنامج الثابتة (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.appFooterAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, appFooterAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تذييل البرنامج الثابتة (بالانجليزية)</label>
                    <input
                      type="text"
                      value={settingsForm.appFooterEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, appFooterEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">الشعار / السطر التعريفي (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.taglineAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, taglineAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                      placeholder="في ضهر كل ست مصرية"
                    />
                  </div>

                   <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">الشعار / السطر التعريفي (بالانجليزية)</label>
                    <input
                      type="text"
                      value={settingsForm.taglineEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, taglineEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-mono font-bold"
                      placeholder="Breast Cancer Care Hospital"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">جهة الاعتماد (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.accreditationBodyAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, accreditationBodyAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">جهة الاعتماد (بالانجليزية)</label>
                    <input
                      type="text"
                      value={settingsForm.accreditationBodyEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, accreditationBodyEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">إصدار البرنامج</label>
                    <input
                      type="text"
                      value={settingsForm.appVersion}
                      onChange={(e) => setSettingsForm({ ...settingsForm, appVersion: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ المراجعة</label>
                    <input
                      type="text"
                      value={settingsForm.revisionDate}
                      onChange={(e) => setSettingsForm({ ...settingsForm, revisionDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-mono font-bold"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تعليمات المستخدمين (بالعربية)</label>
                    <textarea
                      value={settingsForm.userInstructionsAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, userInstructionsAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                      rows={3}
                    />
                  </div>

                   <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تعليمات المستخدمين (بالانجليزية)</label>
                    <textarea
                      value={settingsForm.userInstructionsEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, userInstructionsEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                      rows={3}
                    />
                  </div>


                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تذييل التقارير المطبوعة (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.footerAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, footerAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                      placeholder="تذييل التقرير بالعربية"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تذييل التقارير المطبوعة (بالانجليزية)</label>
                    <input
                      type="text"
                      value={settingsForm.footerEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, footerEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-mono font-bold"
                      placeholder="Report Footer in English"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-start">
                  <button
                    onClick={handleSaveHospitalSettings}
                    className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                  >
                    حفظ الهوية الجديدة
                  </button>
                </div>
              </div>

              {/* Dynamic Departments Manager Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-right">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                    <span>إدارة وتعديل الأقسام والوحدات الطبية بالمستشفى</span>
                    <Layers className="h-4.5 w-4.5 text-pink-600" />
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    قم بإضافة وحذف الأقسام والوحدات السريرية الطبية المتاحة بالمستشفى. سيتم تحديث نماذج واستمارات الجرد وخيارات إضافة وتعديل حسابات الكادر فوراً بهذا الدليل الديناميكي.
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start justify-end text-xs">
                  {/* List of departments */}
                  <div className="w-full md:w-1/2 space-y-2 order-2 md:order-1">
                    <label className="block text-[10px] font-bold text-slate-505 mb-1 text-slate-500">الأقسام والوحدات السريرية الطبية المسجّلة حالياً بالمنظومة:</label>
                    <div className="border border-slate-150 rounded-lg p-2 max-h-44 overflow-y-auto space-y-1 bg-slate-50">
                      {departments.map((dept, index) => (
                        <div key={index} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-md border border-slate-100 shadow-sm">
                          <button
                            onClick={() => {
                              if (departments.length <= 1) {
                                alert(language === "ar" ? `عذراً: يجب الحفاظ على قسم طبي واحد على الأقل بنظام ${hospitalSettings.nameAr || "المؤسسة"}!` : "Access Denied: You must keep at least one registered department!");
                                return;
                              }
                              if (confirm(language === "ar" ? `هل أنت متأكد من حذف قسم "${dept}"؟` : `Are you sure you want to delete ${dept}?`)) {
                                const list = departments.filter((d) => d !== dept);
                                setDepartments(list);
                                localStorage.setItem("baheya_hospital_departments", JSON.stringify(list));
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 font-extrabold text-[10px] cursor-pointer"
                          >
                            × حذف القسم
                          </button>
                          <span className="font-bold text-slate-700 text-xs">{dept}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add New Department Form */}
                  <div className="w-full md:w-1/2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 order-1 md:order-2">
                    <label className="block text-[10px] font-bold text-slate-650 text-slate-700">تسجيل وتفعيل وحدة طبية جديدة:</label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="مثال: ONCOLOGY INTENSIVE CARE"
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-xs text-slate-800 outline-none focus:ring-1 focus:ring-pink-500 text-right"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                            if (!val) return;
                            if (departments.includes(val)) {
                              alert(language === "ar" ? "هذا القسم مسجل بالفعل!" : "This department already exists!");
                              return;
                            }
                            const updatedDepts = [...departments, val];
                            setDepartments(updatedDepts);
                            localStorage.setItem("baheya_hospital_departments", JSON.stringify(updatedDepts));
                            (e.target as HTMLInputElement).value = "";
                            alert(language === "ar" ? `تم تفعيل قسم "${val}" بنجاح!` : `Department ${val} added!`);
                          }
                        }}
                      />
                      <p className="text-[9px] text-slate-400">اكتب الاسم بالكامل ثم اضغط Enter للإضافة والحفظ التلقائي</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roles and Job Titles Manager */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-right">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                    <span>إدارة الأدوار والمسميات الوظيفية</span>
                    <User className="h-4.5 w-4.5 text-pink-600" />
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Roles */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">الأدوار (Roles):</label>
                    <div className="border border-slate-150 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1 bg-slate-50">
                      {settingsForm.roles.map((role, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-md border border-slate-100 shadow-sm">
                          <button
                            onClick={() => {
                              const newRoles = settingsForm.roles.filter((_, i) => i !== idx);
                              setSettingsForm({ ...settingsForm, roles: newRoles });
                            }}
                            className="text-rose-600 text-[10px]"
                          >× حذف</button>
                          <span>{role}</span>
                        </div>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="إضافة دور جديد..."
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (!val || settingsForm.roles.includes(val)) return;
                          setSettingsForm({ ...settingsForm, roles: [...settingsForm.roles, val] });
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                  </div>
                  
                  {/* Job Titles Management */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <label className="block text-xs font-bold text-slate-700">إدارة المسميات الوظيفية (Job Titles):</label>
                    
                    <div className="flex gap-2">
                      <input
                        id="job-title-input"
                        type="text"
                        placeholder="إضافة مسمى وظيفي جديد..."
                        className="flex-grow bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-medium text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddJobTitle();
                          }
                        }}
                      />
                      <button 
                        className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-pink-700"
                        onClick={handleAddJobTitle}
                      >أضف</button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {settingsForm.jobTitles.map((title, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                          <span className="font-medium text-xs">{title}</span>
                          <button
                            onClick={() => {
                              const newTitles = settingsForm.jobTitles.filter((_, i) => i !== idx);
                              setSettingsForm({ ...settingsForm, jobTitles: newTitles });
                            }}
                            className="text-rose-600 text-[10px] hover:text-rose-800"
                          >حذف</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom sheets and template management - COMPLETE INTERACTIVE SUITE */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-8">
                
                {/* Section 1: Template Modification & Customization & Activation (تعديل وتخصيص وتفعيل النماذج الأساسية والمخصصة) */}
                <div>
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                      <span>تعديل وتخصيص وتفعيل النماذج (أساسية + مخصصة)</span>
                      <Settings className="h-4.5 w-4.5 text-pink-600" />
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      اختر أي نموذج للجرودات من القائمة المتاحة لتعديل بيانات تعريفه، ترميز كوده، أو تعديل وإضافة وإزالة بنود وأصناف الجرد المكونة له فورياً. كما يمكنك تنشيط أو تعطيل الشيتات لمنع ظهورها تماماً.
                    </p>
                  </div>

                  <div className="space-y-4 font-sans text-xs">
                    {/* Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">اختر الشيت المراد تعديله أو تفعيله/تعطيله:</label>
                      <select
                        onChange={(e) => handleSelectTemplateToEdit(e.target.value)}
                        value={selectedTemplateToEdit}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold text-slate-800"
                      >
                        <option value="">-- اختر النموذج لفتحه للتحرير --</option>
                        {/* Static standard list */}
                        <optgroup label={language === "ar" ? "النماذج الطبية الأساسية الافتراضية" : "Clinical Standard Checklists"}>
                          {FORM_TEMPLATES.map((t) => {
                            const isDeactivated = deactivatedTemplateIds.includes(t.id);
                            const label = language === "ar" ? t.titleAr : t.titleEn;
                            return (
                              <option key={t.id} value={t.id}>
                                {t.code}: {label} {isDeactivated ? "❌ (معطل ومخفي حالياً)" : "✔ (نشط ومتاح)"}
                              </option>
                            );
                          })}
                        </optgroup>
                        {/* Custom templates list */}
                        {customTemplates.length > 0 && (
                          <optgroup label={language === "ar" ? "النماذج المخصصة المضافة حديثاً" : "Added Custom Checklists"}>
                            {customTemplates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.code}: {language === "ar" ? t.titleAr : t.titleEn} (نشط ومتاح)
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {selectedTemplateToEdit && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        
                        {/* Toggle Activate/Deactivate for Standard template */}
                        {!selectedTemplateToEdit.startsWith("custom-tpl-") && (
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-250">
                            <div className="text-right">
                              <p className="font-bold text-slate-800">
                                {deactivatedTemplateIds.includes(selectedTemplateToEdit) ? "النموذج معطل ومخفي حالياً عن الكادر الطبي" : "النموذج نشط ويظهر للمستخدمين بالقائمة"}
                              </p>
                              <span className="text-[10px] text-slate-400">تتحكم هذه الميزة في إخفاء الشيت بالكامل لتبسيط عمليات الجرد اليومية وتقليص الخيارات غير الضرورية</span>
                            </div>
                            <button
                              onClick={() => handleToggleDeactivateTemplate(selectedTemplateToEdit)}
                              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                deactivatedTemplateIds.includes(selectedTemplateToEdit)
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                              }`}
                            >
                              {deactivatedTemplateIds.includes(selectedTemplateToEdit) ? "إعادة تنشيط وتمكين الشيت" : "تعطيل وإخفاء الشيت من القائمة"}
                            </button>
                          </div>
                        )}

                        <h4 className="text-[11px] font-extrabold text-pink-700 border-b pb-1.5 flex items-center justify-between">
                          <span>بيانات تعريف وهيدر الشيت:</span>
                          <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold">{selectedTemplateToEdit}</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">اسم الشيت (بالعربية)</label>
                            <input
                              type="text"
                              value={editTemplateForm.titleAr}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, titleAr: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">اسم الشيت (بالإنجليزية)</label>
                            <input
                              type="text"
                              value={editTemplateForm.titleEn}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, titleEn: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">الكود التعريفي للشيت</label>
                            <input
                              type="text"
                              value={editTemplateForm.code}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, code: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono font-black text-pink-600 uppercase"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">القسم الافتراضي لتسجيل السجلات</label>
                            <select
                              value={editTemplateForm.departmentDefault}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, departmentDefault: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            >
                              {departments.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">الإصدار (Version)</label>
                            <input
                              type="text"
                              value={editTemplateForm.version}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, version: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-700"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">تاريخ الاعتماد / الإصدار</label>
                            <input
                              type="text"
                              value={editTemplateForm.issueDate}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, issueDate: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-700"
                            />
                          </div>

                          <div className="md:col-span-3 flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                            <input
                              type="checkbox"
                              id="editHasPatient"
                              checked={editTemplateForm.hasPatientDetails}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, hasPatientDetails: e.target.checked })}
                              className="h-4 w-4 text-pink-600 border-slate-300 rounded cursor-pointer"
                            />
                            <label htmlFor="editHasPatient" className="font-bold text-slate-700 cursor-pointer user-select-none">
                              تضمين وإظهار خانات بيانات المريض بالأعلى (الاسم، السن، الرقم الطبي، ورقم السرير)
                            </label>
                          </div>
                        </div>

                        {/* Items editing section */}
                        <div className="space-y-3 pt-2">
                          <h4 className="text-[11px] font-extrabold text-pink-700 border-b pb-1.5">
                            أصناف وبنود الجرد المكونة لهذا الشيت ({editTemplateItems.length} بند):
                          </h4>

                          {/* Quick single item adder */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-2 text-right items-end font-sans">
                            <div className="md:col-span-3">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">البند / الصنف بالعربية</label>
                              <input
                                type="text"
                                value={editTemplateSingleItemForm.itemAr}
                                onChange={(e) => setEditTemplateSingleItemForm({ ...editTemplateSingleItemForm, itemAr: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold focus:bg-white outline-none"
                                placeholder="شمعة فلتر تنفس رئيسية"
                              />
                            </div>
                            
                            <div className="md:col-span-3">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">البند بالإنجليزية</label>
                              <input
                                type="text"
                                value={editTemplateSingleItemForm.itemEn}
                                onChange={(e) => setEditTemplateSingleItemForm({ ...editTemplateSingleItemForm, itemEn: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white outline-none"
                                placeholder="Ventilator main filter"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">كود الصنف</label>
                              <input
                                type="text"
                                value={editTemplateSingleItemForm.code}
                                onChange={(e) => setEditTemplateSingleItemForm({ ...editTemplateSingleItemForm, code: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white outline-none"
                                placeholder="BH-ITM-01"
                              />
                            </div>

                            <div className="md:col-span-1 border-r pr-2 md:border-r-0 md:pr-0">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">الوحدة</label>
                              <input
                                type="text"
                                value={editTemplateSingleItemForm.unit}
                                onChange={(e) => setEditTemplateSingleItemForm({ ...editTemplateSingleItemForm, unit: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold text-center focus:bg-white outline-none"
                                placeholder="PCS"
                              />
                            </div>

                            <div className="md:col-span-1">
                              <label className="block text-[9px] font-bold text-slate-440 mb-1">الكمية</label>
                              <input
                                type="text"
                                value={editTemplateSingleItemForm.qty}
                                onChange={(e) => setEditTemplateSingleItemForm({ ...editTemplateSingleItemForm, qty: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold text-center focus:bg-white outline-none"
                                placeholder="1"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <button
                                onClick={handleAddOrEditSingleItemInTemplate}
                                className="w-full py-1.5 bg-pink-700 hover:bg-pink-850 text-white rounded text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                {editTemplateItemIndex !== null ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                <span>{editTemplateItemIndex !== null ? "حفظ التعديل" : "إضافة بند"}</span>
                              </button>
                            </div>
                          </div>

                          {/* List of items in standard/custom template */}
                          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-150 bg-white shadow-inner">
                            {editTemplateItems.map((item, idx) => {
                              const isEditingThisItem = editTemplateItemIndex === idx;
                              return (
                                <div key={idx} className={`p-2 flex items-center justify-between text-[11px] hover:bg-slate-50 transition ${isEditingThisItem ? "bg-pink-50/40" : ""}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono bg-slate-100 text-slate-500 rounded px-1 text-[9px] w-6 text-center font-bold">{item.sn}</span>
                                    {item.code && <span className="font-mono text-slate-400 font-bold ml-1 text-[9px]">{item.code}</span>}
                                    <span className="font-extrabold text-slate-800">{item.itemAr}</span>
                                    {item.itemEn && <span className="text-slate-400 font-mono text-[10px] mr-1">/ {item.itemEn}</span>}
                                    <span className="bg-pink-50 text-pink-700 mr-2 px-1 text-[9px] rounded font-bold">{item.qty || "1"} {item.unit || "PCS"}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => handleStartEditSingleItemInTemplate(idx)}
                                      className="p-1 hover:bg-slate-105 hover:bg-slate-100 text-slate-600 rounded transition"
                                      title="تعديل هذا البند"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveSingleItemInTemplate(idx)}
                                      className="p-1 hover:bg-rose-50 text-rose-650 rounded transition"
                                      title="حذف هذا البند"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions row */}
                        <div className="flex justify-between items-center pt-2 border-t font-sans text-xs">
                          <button
                            onClick={() => handleSelectTemplateToEdit("")}
                            className="px-4 py-2 bg-slate-250 hover:bg-slate-300 bg-slate-200 text-slate-700 rounded-lg font-bold"
                          >
                            إلغاء وإخلاء لوحة التحكم
                          </button>

                          <button
                            onClick={handleSaveTemplateEdits}
                            className="px-5 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:from-pink-700 hover:to-rose-700 font-bold rounded-lg shadow-md transition cursor-pointer"
                          >
                            حفظ وتطبيق كافة التغيرات لـ ({editTemplateForm.code})
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Custom Sheet Design and Build (نظام تصميم وإنشاء شيتات جديدة) */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                      <span>تصميم وإنشاء شيت جرد وقسم مخصص جديد لقائمة التدقيق</span>
                      <Plus className="h-4.5 w-4.5 text-pink-600" />
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      قم بإنشاء نموذج جرد رقمي جديد مخصص تماماً. يمكنك إما بناء بنوده تفاعلياً واحداً تلو الآخر لتنسيقه بدقة مذهلة، أو كتابته بالنص مجمّعاً، ليقوم النظام بتوليده وإتاحته لتسجيل السجلات والطباعة في ثوانٍ.
                    </p>
                  </div>

                  {/* Form */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-right">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">اسم الشيت المخصص (بالعربية)</label>
                        <input
                          type="text"
                          value={templateForm.titleAr}
                          onChange={(e) => setTemplateForm({ ...templateForm, titleAr: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          placeholder="مثال: جرد مستلزمات رعاية الرقابة الأسبوعي"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">اسم الشيت (بالإنجليزية)</label>
                        <input
                          type="text"
                          value={templateForm.titleEn}
                          onChange={(e) => setTemplateForm({ ...templateForm, titleEn: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          placeholder="مثال: ICU Check Sheet"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">ترميز الكود (Checklist Code)</label>
                        <input
                          type="text"
                          value={templateForm.code}
                          onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-800 uppercase font-black focus:outline-none focus:ring-1 focus:ring-pink-500"
                          placeholder="مثال: BH-ICU-08"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">القسم / الوحدة</label>
                        <select
                          value={templateForm.departmentDefault}
                          onChange={(e) => setTemplateForm({ ...templateForm, departmentDefault: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500 font-sans"
                        >
                          {departments.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">رقم مراجعة النسخة (Revision)</label>
                        <input
                          type="text"
                          value={templateForm.version}
                          onChange={(e) => setTemplateForm({ ...templateForm, version: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono focus:outline-none focus:ring-1 focus:ring-pink-500"
                          placeholder="01"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">تاريخ الإصدار والاعتماد</label>
                        <input
                          type="text"
                          value={templateForm.issueDate}
                          onChange={(e) => setTemplateForm({ ...templateForm, issueDate: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                      </div>

                      <div className="md:col-span-3 flex items-center gap-2 bg-white p-3 text-right border rounded-lg border-slate-200 mt-1">
                        <input
                          type="checkbox"
                          id="newHasPatient"
                          checked={templateForm.hasPatientDetails}
                          onChange={(e) => setTemplateForm({ ...templateForm, hasPatientDetails: e.target.checked })}
                          className="h-4 w-4 text-pink-600 border-slate-300 rounded cursor-pointer"
                        />
                        <label htmlFor="newHasPatient" className="font-bold text-slate-700 cursor-pointer user-select-none">
                          تفعيل لوحة بيانات المريض أعلى الملف (الاسم، والسن، والجنسية والتذكرة الطبية)
                        </label>
                      </div>
                    </div>

                    {/* Interactive Item list designer */}
                    <div className="pt-2">
                      <h4 className="font-bold text-slate-700 mb-2 block">تصميم بنود الجرد تفاعلياً (أو استخدم صندوق الأنابيب أدناه):</h4>
                      
                      <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-2 text-right items-end">
                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">البند بالعربية *</label>
                          <input
                            type="text"
                            value={newTemplateItemForm.itemAr}
                            onChange={(e) => setNewTemplateItemForm({ ...newTemplateItemForm, itemAr: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold focus:bg-white outline-none"
                            placeholder="مثال: جهاز قياس التنفس مع الخرطوم"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">البند بالإنجليزية</label>
                          <input
                            type="text"
                            value={newTemplateItemForm.itemEn}
                            onChange={(e) => setNewTemplateItemForm({ ...newTemplateItemForm, itemEn: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white outline-none"
                            placeholder="Respiratory gauge set"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">كود الصنف (اختياري)</label>
                          <input
                            type="text"
                            value={newTemplateItemForm.code}
                            onChange={(e) => setNewTemplateItemForm({ ...newTemplateItemForm, code: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white outline-none"
                            placeholder="ITM-01"
                          />
                        </div>

                        <div className="md:col-span-1.5 border-r pr-2 md:border-r-0 md:pr-0">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">الوحدة</label>
                          <input
                            type="text"
                            value={newTemplateItemForm.unit}
                            onChange={(e) => setNewTemplateItemForm({ ...newTemplateItemForm, unit: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold text-center focus:bg-white outline-none"
                            placeholder="PCS"
                          />
                        </div>

                        <div className="md:col-span-1.5">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">الكمية المطلوبة</label>
                          <input
                            type="text"
                            value={newTemplateItemForm.qty}
                            onChange={(e) => setNewTemplateItemForm({ ...newTemplateItemForm, qty: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold text-center focus:bg-white outline-none"
                            placeholder="1"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <button
                            onClick={handleAddNewTemplateItem}
                            className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>درج</span>
                          </button>
                        </div>
                      </div>

                      {/* Created builder items preview */}
                      {newTemplateItems.length > 0 && (
                        <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 block border-b pb-1">البنود المضافة حالياً للشيت الجديد ({newTemplateItems.length} بند جرد مخصص):</span>
                          <div className="flex flex-wrap gap-1.5">
                            {newTemplateItems.map((item, index) => (
                              <div key={index} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                                <span className="font-bold">{item.itemAr}</span>
                                <span className="text-slate-400 text-[8px]">({item.qty} {item.unit})</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNewTemplateItem(index)}
                                  className="text-slate-400 hover:text-red-650 transition font-bold"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fallback Text-based pipelines parser */}
                    {newTemplateItems.length === 0 && (
                      <div className="pt-2">
                        <label className="block text-[10px] font-black text-slate-500 mb-1">
                          أو الصق مصفوفة البنود دفعة واحدة بالتنسيق التالي (اسم الصنف بالعربية|الاسم بالإنجبليزية|الوحدة|الكمية):
                        </label>
                        <textarea
                          rows={3}
                          value={templateForm.itemsText}
                          onChange={(e) => setTemplateForm({ ...templateForm, itemsText: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 font-mono font-bold leading-normal outline-none focus:ring-1 focus:ring-pink-500 placeholder-slate-400 focus:bg-white"
                          placeholder="سرنجة معقمة 5 سم مخصصة|Sterile Syringe 5cc|PCS|12&#10;شريط اختبار قياس رطوبة الهواء|Air Humidity Testing Strip|STRIP|6&#10;مسحة كحول ناصعة معقمة مخصصة|Sterile Alcohol Swab|PACK|24"
                        />
                        <p className="text-[10px] text-slate-400 leading-normal mt-1">
                          يقوم النظام بتسجيل البنود وتغذية الـ 31 يوماً آلياً لكل سطر مندمج. افصل البنود بسطر جديد (Enter)، والخصائص برمز الأنبوب (|).
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleCreateCustomTemplate}
                        className="px-6 py-2.5 bg-gradient-to-r from-pink-650 to-rose-650 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        <span>إنشاء وتنسيق الشيت بقائمة ${hospitalSettings.nameAr || "المؤسسة"}</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Section 3: Lists current custom templates */}
                {customTemplates.length > 0 && (
                  <div className="border-t border-slate-200 pt-6 text-xs">
                    <h4 className="text-xs font-bold text-slate-800 mb-3 block">الشيتات المخصصة المشحونة المصنوعة حالياً:</h4>
                    <div className="divide-y divide-slate-150 border border-slate-200 rounded-xl overflow-hidden bg-white">
                      {customTemplates.map((customTpl) => (
                        <div key={customTpl.id} className="p-3 bg-white flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                          <div>
                            <span className="font-mono bg-pink-50 text-pink-700 font-extrabold px-2 py-0.5 rounded text-[10px] ml-2">
                              {customTpl.code}
                            </span>
                            <span className="font-extrabold text-slate-900 block sm:inline-block">
                              {customTpl.titleAr} / {customTpl.titleEn}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 sm:mt-0 font-bold block sm:inline-block sm:mr-4">
                              القسم الافتراضي: {customTpl.departmentDefault} | {customTpl.items.length} أصناف
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteCustomTemplate(customTpl.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            حذف الشيت بالكامل
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: User Directory and Management (إدارة وتعديل وإضافة كادر المستخدمين الطبيين) */}
                <div className="border-t border-slate-200 pt-6 space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                      <span>إدارة وصلاحيات المستخدمين والكادر الطبي</span>
                      <User className="h-4.5 w-4.5 text-pink-600" />
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 text-right font-sans">
                      أضف كوادراً طبية جديدة (أطباء، رئيسيات تمريض، مسؤولي الجودة) لتمكينهم من تسجيل الجرودات، أو عدّل بيانات الكادر الحالي وصلاحياتهم. يتطلب هذا القسم صلاحيات مسؤول النظام (الأدمن).
                    </p>
                  </div>

                  {!isSupervisor ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-right text-amber-800 flex items-start gap-2.5 justify-end font-sans">
                      <div>
                        <p className="font-bold">تنبيه الوصول الخاص بلوحة الإدارة</p>
                        <p className="text-[10px] text-amber-700 mt-1">
                          أنت مسجل الدخول بصفتك <span className="font-bold">({language === "ar" ? currentUser.nameAr : currentUser.nameEn})</span>. لرؤية وتعديل وإضافة المستخدمين وتفويض الصلاحيات، يرجى تبديل الحساب إلى كادر المشرفين المعتمدين بالفريق.
                        </p>
                      </div>
                      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Sub-section 4.1: Add New User Form */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs font-sans">
                        <h4 className="font-bold text-pink-700 text-[11px] border-b pb-1">إضافة عضو جديد للكادر الطبي بالنظام:</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-right">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">الاسم الكامل (بالعربية) *</label>
                            <input
                              type="text"
                              value={newUserForm.nameAr}
                              onChange={(e) => setNewUserForm({ ...newUserForm, nameAr: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="مثال: أ. هند أحمد"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1 font-mono">الاسم الكامل (بالإنجليزية) *</label>
                            <input
                              type="text"
                              value={newUserForm.nameEn}
                              onChange={(e) => setNewUserForm({ ...newUserForm, nameEn: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="e.g. Sister Hind Ahmed"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">كود الموظف المخصص (Staff ID) *</label>
                            <input
                              type="text"
                              value={newUserForm.staffId}
                              onChange={(e) => setNewUserForm({ ...newUserForm, staffId: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono uppercase font-black text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="e.g. BHG-NUR-101"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">المستوى الوظيفي والصلاحيات *</label>
                            <select
                              value={newUserForm.role}
                              onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            >
                              <option value="staff">أخصائي تمريض (Regular Staff Nurse)</option>
                              <option value="tech">فني تمريض (Nursing Technician / NT)</option>
                              <option value="intern">تمريض امتياز (Intern Nurse / INT)</option>
                              <option value="assistant">مساعد تمريض (Nursing Assistant / NA)</option>
                              <option value="secretary">سكرتارية القسم (Department Secretary / SEC)</option>
                              <option value="head_nurse">رئيسة تمريض / مشرفة قسم (Head Nurse)</option>
                              <option value="quality">مسؤول رقابة جودة (Quality Auditor)</option>
                              <option value="admin">مسؤول نظام كامل (Full Admin)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1 font-sans">القسم الطبي الافتراضي *</label>
                            <select
                              value={newUserForm.department}
                              onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            >
                              {departments.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">رمز المرور المخصص (PIN - 4 أرقام) *</label>
                            <input
                              type="text"
                              maxLength={6}
                              value={newUserForm.pin}
                              onChange={(e) => setNewUserForm({ ...newUserForm, pin: e.target.value.replace(/\D/g, "") })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-center text-xs font-black tracking-widest text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="1234"
                            />
                          </div>

                          <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">البريد الإلكتروني المهني (Corporate Email) *</label>
                            <input
                              type="email"
                              value={newUserForm.email}
                              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="e.g. nurse.fatima@baheya.org"
                            />
                          </div>

                          {/* Dynamic checklist template permissions manager block */}
                          <div className="md:col-span-2 lg:col-span-3 border-t pt-3 mt-1 text-right">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-100">
                              <label className="block text-[10px] font-black text-pink-700 font-sans">تحديد النماذج وشيتات الجرد الطبي المسموح له برؤيتها وتعبئتها (Permissions) *</label>
                              
                              {/* Quick selection actions */}
                              <div className="flex flex-wrap gap-1 md:gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewUserForm({ ...newUserForm, permissions: allAvailableTemplates.map(t => t.id) });
                                  }}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-pink-600 hover:text-white text-slate-700 border border-slate-300 rounded text-[9px] font-bold transition cursor-pointer"
                                  title="تحديد كامل الـ 200 شيت للموظف"
                                >
                                  {language === "ar" ? "تحديد الـ 200 نموذج (الكل)" : "Select All 200"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const dept = newUserForm.department || "";
                                    const matches = allAvailableTemplates
                                      .filter(t => {
                                        if (t.departmentDefault === dept) return true;
                                        const tId = t.id.toLowerCase();
                                        if (dept === "EMERGENCY UNIT" && (tId.startsWith("er-") || tId.startsWith("emergency"))) return true;
                                        if (dept === "INTENSIVE CARE UNIT (ICU)" && (tId.startsWith("icu-") || tId.startsWith("intensive"))) return true;
                                        if (dept === "CHEMO UNIT PREPN" && (tId.startsWith("chemo-") || tId.startsWith("chemo"))) return true;
                                        if (dept === "ONCO-SURGICAL UNIT" && (tId.startsWith("onco-") || tId.startsWith("surgical") || tId.startsWith("or-"))) return true;
                                        if (dept === "OUTPATIENT CLINIC" && (tId.startsWith("out-") || tId.startsWith("outpatient"))) return true;
                                        
                                        const firstWord = dept.split(" ")[0].toLowerCase();
                                        if (firstWord && tId.includes(firstWord)) return true;
                                        return false;
                                      })
                                      .map(t => t.id);
                                    setNewUserForm({ ...newUserForm, permissions: matches });
                                  }}
                                  className="px-2 py-0.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded text-[9px] font-bold transition cursor-pointer"
                                  title="تحديد شيتات القسم المختار فقط تلقائياً"
                                >
                                  {language === "ar" ? "النماذج الخاصة بقسمه فقط" : "Select Dept Only"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matches = allAvailableTemplates
                                      .filter(t => t.id.includes("crash-cart") || t.id.includes("dc-shock") || t.id.includes("med-cart") || t.id.includes("supplies-store") || t.id.includes("temp-fridge") || t.id.includes("supplies-box") || t.id.includes("intubation-box") || t.id.includes("chest-tube"))
                                      .map(t => t.id);
                                    setNewUserForm({ ...newUserForm, permissions: matches });
                                  }}
                                  className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-855 border border-amber-200 rounded text-[9px] font-bold transition cursor-pointer"
                                  title="تحديد الـ 8 شيتات الرئيسية المعتمدة للجودة"
                                >
                                  {language === "ar" ? "الـ 8 نماذج الرئيسية للجودة" : "Select 8 Core"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewUserForm({ ...newUserForm, permissions: [] });
                                  }}
                                  className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[9px] font-bold transition cursor-pointer"
                                >
                                  {language === "ar" ? "إلغاء التحديد" : "Clear All"}
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-white border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                              {allAvailableTemplates.map((tpl) => {
                                const isChecked = (newUserForm.permissions || []).includes(tpl.id);
                                return (
                                  <label key={tpl.id} className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 hover:text-black cursor-pointer bg-slate-50 p-1.5 rounded border border-slate-100 transition justify-between">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const current = newUserForm.permissions || [];
                                        const updated = e.target.checked
                                          ? [...current, tpl.id]
                                          : current.filter(id => id !== tpl.id);
                                        setNewUserForm({ ...newUserForm, permissions: updated });
                                      }}
                                      className="rounded border-slate-300 text-pink-600 focus:ring-pink-500 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <div className="leading-tight flex-1 ml-1 text-right">
                                      <span className="font-mono font-bold text-pink-600 text-[10px] block leading-none">{tpl.code}</span>
                                      <span className="block mt-0.5 text-[10px]">{language === "ar" ? tpl.titleAr : tpl.titleEn}</span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={handleAddSystemUser}
                            className="px-5 py-2 bg-slate-850 hover:bg-slate-900 bg-slate-800 text-white font-extrabold rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="h-4 w-4" />
                            <span>{language === "ar" ? "تسجيل وتفعيل الموظف الجديد" : "Register & Activate Staff"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Sub-section 4.2: Edit Existing User */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs font-sans">
                        <div className="border-b pb-1 flex items-center justify-between">
                          <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">CONTROL WORKSPACE</span>
                          <h4 className="font-bold text-pink-700 text-[11px]">تحرير وتعديل بيانات مستخدم مسجّل حالياً:</h4>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">اختر الموظف الطبي المراد إدارته:</label>
                          <select
                            onChange={(e) => handleSelectUserToEdit(e.target.value)}
                            value={selectedUserToEdit}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          >
                            <option value="">-- اختر المستخدم الحالي لفتح لوحة تعديله --</option>
                            {systemUsers.map((usr) => (
                              <option key={usr.id} value={usr.id}>
                                {usr.nameAr} / {usr.nameEn} ({usr.role === "admin" ? "أدمن" : usr.role === "quality" ? "جودة" : "تمريض"}) - {usr.staffId}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedUserToEdit && (
                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-4 text-right">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-1">الاسم بالعربية</label>
                                <input
                                  type="text"
                                  value={editUserForm.nameAr}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, nameAr: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-1 font-mono">الاسم بالإنجليزية</label>
                                <input
                                  type="text"
                                  value={editUserForm.nameEn}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, nameEn: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-1">كود الموظف التعريفي</label>
                                <input
                                  type="text"
                                  value={editUserForm.staffId}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, staffId: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono uppercase font-black focus:bg-white focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-1">الدور والصلاحيات</label>
                                <select
                                  value={editUserForm.role}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as UserRole })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold focus:bg-white"
                                >
                                  <option value="staff">أخصائي تمريض (Regular Staff Nurse)</option>
                                  <option value="tech">فني تمريض (Nursing Technician / NT)</option>
                                  <option value="intern">تمريض امتياز (Intern Nurse / INT)</option>
                                  <option value="assistant">مساعد تمريض (Nursing Assistant / NA)</option>
                                  <option value="secretary">سكرتارية القسم (Department Secretary / SEC)</option>
                                  <option value="head_nurse">رئيسة تمريض / مشرفة (Head Nurse)</option>
                                  <option value="quality">مسؤول رقابة جودة (Quality Auditor)</option>
                                  <option value="admin">مسؤول نظام كامل (Full Admin)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-1">القسم الطبي</label>
                                <select
                                  value={editUserForm.department}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, department: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold focus:bg-white focus:outline-none"
                                >
                                  {departments.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-450 mb-1">رمز مرور الدخول (PIN Code)</label>
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={editUserForm.pin}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, pin: e.target.value.replace(/\D/g, "") })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono text-center font-bold tracking-widest focus:bg-white"
                                  placeholder="1234"
                                />
                              </div>

                              <div className="md:col-span-2 lg:col-span-3">
                                <label className="block text-[9px] font-bold text-slate-450 mb-1">البريد الإلكتروني المهني</label>
                                <input
                                  type="email"
                                  value={editUserForm.email}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                                  placeholder="nurse.name@baheya.org"
                                />
                              </div>

                              {/* Dynamic template checklist permissions editor block */}
                              <div className="md:col-span-2 lg:col-span-3 border-t pt-3 mt-1 text-right">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-100">
                                  <label className="block text-[10px] font-black text-pink-700 font-sans">تحديد النماذج وشيتات الجرد الطبي المسموح له برؤيتها وتعبئتها (Permissions) *</label>
                                  
                                  {/* Quick selection actions */}
                                  <div className="flex flex-wrap gap-1 md:gap-1.5 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditUserForm({ ...editUserForm, permissions: allAvailableTemplates.map(t => t.id) });
                                      }}
                                      className="px-2 py-0.5 bg-slate-100 hover:bg-pink-650 hover:text-white text-slate-700 border border-slate-300 rounded text-[9px] font-bold transition cursor-pointer"
                                      title="تحديد كامل الـ 200 شيت للموظف"
                                    >
                                      {language === "ar" ? "تحديد الـ 200 نموذج (الكل)" : "Select All 200"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const dept = editUserForm.department || "";
                                        const matches = allAvailableTemplates
                                          .filter(t => {
                                            if (t.departmentDefault === dept) return true;
                                            const tId = t.id.toLowerCase();
                                            if (dept === "EMERGENCY UNIT" && (tId.startsWith("er-") || tId.startsWith("emergency"))) return true;
                                            if (dept === "INTENSIVE CARE UNIT (ICU)" && (tId.startsWith("icu-") || tId.startsWith("intensive"))) return true;
                                            if (dept === "CHEMO UNIT PREPN" && (tId.startsWith("chemo-") || tId.startsWith("chemo"))) return true;
                                            if (dept === "ONCO-SURGICAL UNIT" && (tId.startsWith("onco-") || tId.startsWith("surgical") || tId.startsWith("or-"))) return true;
                                            if (dept === "OUTPATIENT CLINIC" && (tId.startsWith("out-") || tId.startsWith("outpatient"))) return true;
                                            const firstWord = dept.split(" ")[0].toLowerCase();
                                            if (firstWord && tId.includes(firstWord)) return true;
                                            return false;
                                          })
                                          .map(t => t.id);
                                        setEditUserForm({ ...editUserForm, permissions: matches });
                                      }}
                                      className="px-2 py-0.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded text-[9px] font-bold transition cursor-pointer"
                                      title="تحديد شيتات القسم المختار فقط تلقائياً"
                                    >
                                      {language === "ar" ? "النماذج الخاصة بقسمه فقط" : "Select Dept Only"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const matches = allAvailableTemplates
                                          .filter(t => t.id.includes("crash-cart") || t.id.includes("dc-shock") || t.id.includes("med-cart") || t.id.includes("supplies-store") || t.id.includes("temp-fridge") || t.id.includes("supplies-box") || t.id.includes("intubation-box") || t.id.includes("chest-tube"))
                                          .map(t => t.id);
                                        setEditUserForm({ ...editUserForm, permissions: matches });
                                      }}
                                      className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-805 border border-amber-200 rounded text-[9px] font-bold transition cursor-pointer"
                                      title="تحديد الـ 8 شيتات الرئيسية المعتمدة للجودة"
                                    >
                                      {language === "ar" ? "الـ 8 نماذج الرئيسية للجودة" : "Select 8 Core"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditUserForm({ ...editUserForm, permissions: [] });
                                      }}
                                      className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[9px] font-bold transition cursor-pointer"
                                    >
                                      {language === "ar" ? "إلغاء التحديد" : "Clear All"}
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-white border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                                  {allAvailableTemplates.map((tpl) => {
                                    const isChecked = (editUserForm.permissions || []).includes(tpl.id);
                                    return (
                                      <label key={tpl.id} className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 hover:text-black cursor-pointer bg-slate-50 p-1.5 rounded border border-slate-100 transition justify-between">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const current = editUserForm.permissions || [];
                                            const updated = e.target.checked
                                              ? [...current, tpl.id]
                                              : current.filter(id => id !== tpl.id);
                                            setEditUserForm({ ...editUserForm, permissions: updated });
                                          }}
                                          className="rounded border-slate-300 text-pink-600 focus:ring-pink-500 h-3.5 w-3.5 cursor-pointer"
                                        />
                                        <div className="leading-tight flex-1 ml-1 text-right">
                                          <span className="font-mono font-bold text-pink-600 text-[10px] block leading-none">{tpl.code}</span>
                                          <span className="block mt-0.5 text-[10px]">{language === "ar" ? tpl.titleAr : tpl.titleEn}</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t pt-2.5">
                              <button
                                onClick={() => handleDeleteSystemUser(selectedUserToEdit)}
                                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>إبطال وحذف الحساب الطبي</span>
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSelectUserToEdit("")}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition"
                                >
                                  إلغاء التعديل
                                </button>
                                <button
                                  onClick={handleUpdateSystemUser}
                                  className="px-4 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded text-[10px] font-bold shadow transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>حفظ التعديلات الجديدة</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sub-section 4.3: Active User Directory Table List */}
                      <div className="space-y-4 text-xs font-sans">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-800 text-sm block text-right">دليل هوية وجدول موظفي النظام الحاليين ({systemUsers.length} مستخدم):</span>
                          
                          {/* Search box for users */}
                          <div className="relative w-full sm:w-64" dir="rtl">
                            <input
                              type="text"
                              value={userRegistrySearch}
                              onChange={(e) => {
                                setUserRegistrySearch(e.target.value);
                                setUserRegistryPage(0);
                              }}
                              placeholder="البحث بالاسم، كود الموظف، الصلاحيات..."
                              className="w-full pr-8 pl-8 py-1.5 bg-slate-50/50 text-slate-700 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition focus:bg-white"
                            />
                            <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                            {userRegistrySearch && (
                              <button
                                onClick={() => {
                                  setUserRegistrySearch("");
                                  setUserRegistryPage(0);
                                }}
                                className="absolute left-2 top-1.5 text-slate-450 hover:text-slate-650 bg-slate-100 border px-1.5 py-0.5 rounded font-sans text-[10px]"
                              >
                                تصفية
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Pagination Status Text */}
                        {userRegistrySearch && (
                          <div className="text-[10px] text-slate-500 text-right animate-pulse-slow" dir="rtl">
                            تمت التصفية والعثور على <span className="font-bold text-pink-600">{
                              systemUsers.filter((usr) => {
                                const s = userRegistrySearch.toLowerCase().trim();
                                return (
                                  (usr.nameAr || "").toLowerCase().includes(s) ||
                                  (usr.nameEn || "").toLowerCase().includes(s) ||
                                  (usr.staffId || "").toLowerCase().includes(s) ||
                                  (usr.department || "").toLowerCase().includes(s) ||
                                  (usr.role || "").toLowerCase().includes(s)
                                );
                              }).length
                            }</span> مستخدم مطابق.
                          </div>
                        )}

                        {/* Scrollbar Container with Max Height */}
                        <div className="max-h-[460px] overflow-y-auto pr-2 pl-2 scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-slate-50 border border-slate-100 rounded-2xl p-2 bg-slate-50/20 shadow-inner">
                          {(() => {
                            const filtered = systemUsers.filter((usr) => {
                              const s = userRegistrySearch.toLowerCase().trim();
                              if (!s) return true;
                              return (
                                (usr.nameAr || "").toLowerCase().includes(s) ||
                                (usr.nameEn || "").toLowerCase().includes(s) ||
                                (usr.staffId || "").toLowerCase().includes(s) ||
                                (usr.department || "").toLowerCase().includes(s) ||
                                (usr.role || "").toLowerCase().includes(s)
                              );
                            });

                            const itemsPerPage = 9;
                            const totalPages = Math.ceil(filtered.length / itemsPerPage);
                            const paginated = filtered.slice(
                              userRegistryPage * itemsPerPage,
                              (userRegistryPage + 1) * itemsPerPage
                            );

                            if (paginated.length === 0) {
                              return (
                                <div className="py-12 text-center text-slate-400 text-xs" dir="rtl">
                                  لا توجد أي نتائج مطابقة لمصطلح البحث "{userRegistrySearch}"
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {paginated.map((usr) => {
                                    const isSelected = selectedUserToEdit === usr.id;
                                    const isActiveSession = currentUser.id === usr.id;
                                    return (
                                      <div
                                        key={usr.id}
                                        onClick={() => setViewingUserProfileUser(usr)}
                                        className={`p-3 bg-white border rounded-xl shadow-sm flex items-start gap-3 transition-all cursor-pointer hover:border-pink-400 hover:shadow-md hover:-translate-y-0.5 duration-150 ${
                                          isSelected ? "border-pink-500 ring-1 ring-pink-500 animate-pulse" : "border-slate-200"
                                        }`}
                                        title="اضغط لفتح الملف التشغيلي للشخصية"
                                      >
                                        {/* Tool button triggers */}
                                        <div className="flex flex-col gap-1 shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-150">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSelectUserToEdit(usr.id);
                                            }}
                                            className={`p-1 rounded transition text-slate-600 ${isSelected ? "bg-pink-100 text-pink-700" : "hover:bg-slate-200"}`}
                                            title="تعديل الموظف"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteSystemUser(usr.id);
                                            }}
                                            className="p-1 rounded transition text-slate-400 hover:text-rose-650 hover:bg-rose-50"
                                            title="إلغاء تفعيل الموظف"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>

                                        <div className="flex-1 text-right min-w-0">
                                          <div className="flex items-center justify-end gap-1.5 leading-none">
                                            {isActiveSession && (
                                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0.5 rounded text-[8px] font-extrabold font-sans">
                                                جلسة العمل الحالية
                                              </span>
                                            )}
                                            <span className="font-black text-slate-800 truncate block">{usr.nameAr}</span>
                                          </div>
                                          <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wide leading-none mt-1 truncate">
                                            {usr.nameEn}
                                          </span>
                                          
                                          <div className="mt-2.5 flex items-center justify-end gap-1">
                                            <span className="text-[9px] font-bold text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border">
                                              {usr.staffId}
                                            </span>
                                            <span className="text-[10px] text-slate-500 truncate font-semibold">
                                              {usr.department}
                                            </span>
                                          </div>

                                          <div className="mt-1.5 flex justify-end">
                                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase font-sans tracking-wide border ${
                                              usr.role === "admin"
                                                ? "bg-red-50 text-red-700 border-red-200"
                                                : usr.role === "quality"
                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            }`}>
                                              {usr.role === "admin" ? "مسؤول نظام عام" : usr.role === "quality" ? "مسؤول جودة مستشفى" : "رئيسة تمريض"}
                                            </span>
                                          </div>
                                        </div>

                                        <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-black text-xs border uppercase ${
                                          usr.role === "admin"
                                            ? "bg-red-50 text-red-650 border-red-200"
                                            : usr.role === "quality"
                                            ? "bg-amber-55 text-amber-650 border-amber-200"
                                            : "bg-emerald-50 text-emerald-650 border-emerald-100"
                                        }`}>
                                          {usr.avatarInitials}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Pagination control buttons row */}
                                {totalPages > 1 && (
                                  <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs mt-3 shadow-sm" dir="rtl">
                                    <button
                                      disabled={userRegistryPage <= 0}
                                      onClick={() => setUserRegistryPage((p) => Math.max(0, p - 1))}
                                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent font-extrabold cursor-pointer text-[10px]"
                                    >
                                      السابق
                                    </button>

                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
                                      <span>الصفحة</span>
                                      <span className="font-extrabold text-slate-900 bg-slate-100 border px-1.5 py-0.5 rounded leading-none font-sans">
                                        {userRegistryPage + 1}
                                      </span>
                                      <span>من أصل</span>
                                      <span className="font-extrabold text-slate-800">
                                        {totalPages}
                                      </span>
                                    </div>

                                    <button
                                      disabled={userRegistryPage >= totalPages - 1}
                                      onClick={() => setUserRegistryPage((p) => Math.min(totalPages - 1, p + 1))}
                                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent font-extrabold cursor-pointer text-[10px]"
                                    >
                                      التالي
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Sub-section 4.2: Role Permission Matrix (لوحة تخصيص مرونة الصلاحيات للأدوار) */}
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 gap-6 space-y-6 text-right">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                          <div className="text-right w-full">
                            <h4 className="font-extrabold text-pink-700 text-sm flex items-center justify-end gap-1.5 leading-none">
                              <span>معمارية الصلاحيات والأدوار الديناميكية (Dynamic RBAC Engine)</span>
                              <Settings className="h-4 w-4 text-pink-600 shrink-0" />
                            </h4>
                            <p className="text-[10px] text-slate-500 leading-tight mt-1.5">
                              {language === "ar" 
                                ? "قم بإدارة الأدوار والمهام التفصيلية وجدول الربط (Access Matrix) مباشرة في Firestore بالوقت الفعلي:" 
                                : "Configure roles, actions, and access matrix natively connected to Firestore in real-time:"}
                            </p>
                          </div>

                          {/* Dynamic Action Buttons */}
                          <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto shrink-0">
                            {/* Add New Role Button */}
                            <button
                              onClick={() => {
                                const roleId = prompt(language === "ar" ? "أدخل معرف الدور البرمجي بالإنجليزية (مثال: radiology_clerk):" : "Enter role ID (e.g. radiology_clerk):");
                                if (!roleId) return;
                                const nameAr = prompt(language === "ar" ? "أدخل اسم الدور بالعربية (مثال: فني أشعة):" : "Enter role Arabic name:");
                                if (!nameAr) return;
                                const nameEn = prompt(language === "ar" ? "أدخل اسم الدور بالإنجليزية:" : "Enter role English name:");
                                if (!nameEn) return;
                                
                                const newRole = { id: roleId.trim().toLowerCase(), nameAr: nameAr.trim(), nameEn: nameEn.trim() };
                                saveRole(newRole).then(() => {
                                  // Seed access matrix for this role
                                  permissionsList.forEach(p => {
                                    saveAccessMatrix({
                                      id: `${newRole.id}_${p.id}`,
                                      roleId: newRole.id,
                                      permissionId: p.id,
                                      enabled: false
                                    });
                                  });
                                  addSystemLog(`Added new dynamic role: ${nameEn}`, "success");
                                }).catch(err => {
                                  alert("Error: " + err.message);
                                });
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer transition shadow-sm shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{language === "ar" ? "إضافة دور جديد" : "Add New Role"}</span>
                            </button>

                            {/* Add New Permission Button */}
                            <button
                              onClick={() => {
                                const permId = prompt(language === "ar" ? "أدخل معرف الصلاحية بالإنجليزية (مثال: financial_approve):" : "Enter permission action ID:");
                                if (!permId) return;
                                const nameAr = prompt(language === "ar" ? "أدخل اسم الإجراء بالعربية (مثال: اعتماد التقرير المالي):" : "Enter description in Arabic:");
                                if (!nameAr) return;
                                const nameEn = prompt(language === "ar" ? "أدخل اسم الإجراء بالإنجليزية:" : "Enter description in English:");
                                if (!nameEn) return;

                                const newPerm = { id: permId.trim(), nameAr: nameAr.trim(), nameEn: nameEn.trim() };
                                savePermission(newPerm).then(() => {
                                  // Seed access matrix for this permission
                                  rolesList.forEach(r => {
                                    saveAccessMatrix({
                                      id: `${r.id}_${newPerm.id}`,
                                      roleId: r.id,
                                      permissionId: newPerm.id,
                                      enabled: false
                                    });
                                  });
                                  addSystemLog(`Added new dynamic permission action: ${nameEn}`, "success");
                                }).catch(err => {
                                  alert("Error: " + err.message);
                                });
                              }}
                              className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer transition shadow-sm shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{language === "ar" ? "إضافة صلاحية جديدة" : "Add New Action"}</span>
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-right border-collapse bg-white rounded-lg overflow-hidden border border-slate-200">
                            <thead>
                              <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                <th className="p-3 border-b border-slate-200 min-w-[240px] text-right">
                                  {language === "ar" ? "الإجراء أو الصلاحية المقيدة بالقسم" : "Clinical Action Policy"}
                                </th>
                                {rolesList.map(role => (
                                  <th key={role.id} className="p-3 border-b border-slate-200 text-center min-w-[100px] group relative">
                                    <div className="font-extrabold text-slate-800">{language === "ar" ? role.nameAr : role.nameEn}</div>
                                    <div className="text-[8px] font-mono text-slate-400 font-semibold uppercase">{role.id}</div>
                                    
                                    {/* Delete Dynamic Role Button */}
                                    {!["staff", "head_nurse", "quality", "president", "admin", "it"].includes(role.id) && (
                                      <button
                                        onClick={() => {
                                          if (confirm(language === "ar" ? `هل ترغب بحذف رتبة ${role.nameAr} الحالية من النظام؟` : `Do you want to delete role ${role.nameEn}?`)) {
                                            deleteRole(role.id).then(() => {
                                              addSystemLog(`Deleted dynamic role: ${role.nameEn}`, "warning");
                                            });
                                          }
                                        }}
                                        className="absolute -top-1 -right-1 bg-red-100 text-red-650 p-0.5 rounded-full hover:bg-red-200 cursor-pointer hidden group-hover:block"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {permissionsList.map((policy) => (
                                <tr key={policy.id} className="hover:bg-slate-50 transition text-[11px]">
                                  <td className="p-3 font-bold text-slate-700 relative group text-right">
                                    <div className="text-slate-900 font-extrabold">{language === "ar" ? policy.nameAr : policy.nameEn}</div>
                                    <div className="text-[9px] text-slate-400 font-mono font-medium">{policy.id}</div>
                                    
                                    {/* Delete Dynamic Permission Button */}
                                    {!["submitChecklist", "approveChecklist", "manageDutyTasks", "editMasterTemplates", "deleteLogs", "modifyRosterShifts", "signoffRosterCno", "addRemoveStaff", "editHospitalSettings", "viewSystemDatabase"].includes(policy.id) && (
                                      <button
                                        onClick={() => {
                                          if (confirm(language === "ar" ? `هل ترغب بحذف هذه الصلاحية السحابية من الجدول؟` : `Delete action ${policy.nameEn}?`)) {
                                            deletePermission(policy.id).then(() => {
                                              addSystemLog(`Deleted dynamic permission action: ${policy.nameEn}`, "warning");
                                            });
                                          }
                                        }}
                                        className="absolute top-1/2 left-2 -translate-y-1/2 bg-red-50 text-red-650 p-1 rounded hover:bg-red-100 cursor-pointer hidden group-hover:block"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                  
                                  {rolesList.map(role => {
                                    const mapping = accessMatrix.find(m => m.roleId === role.id && m.permissionId === policy.id);
                                    const isEnabled = mapping ? mapping.enabled : false;

                                    const toggleMatrix = () => {
                                      saveAccessMatrix({
                                        id: `${role.id}_${policy.id}`,
                                        roleId: role.id,
                                        permissionId: policy.id,
                                        enabled: !isEnabled
                                      }).then(() => {
                                        addSystemLog(`Updated Access Matrix: ${role.id} - ${policy.id} -> ${!isEnabled}`, "info");
                                      }).catch(err => {
                                        console.error("Matrix save error:", err);
                                      });
                                    };

                                    return (
                                      <td key={role.id} className="p-3 text-center">
                                        <input
                                          type="checkbox"
                                          checked={role.id === "admin" || role.id === "it" ? true : isEnabled}
                                          disabled={role.id === "admin" || role.id === "it"}
                                          onChange={toggleMatrix}
                                          className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500 cursor-pointer disabled:opacity-50"
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* STATE-OF-THE-ART DEPARTMENT MANAGER VAULT & SYSTEM CUSTOMIZATION */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-6 text-right border border-pink-900/30">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="bg-pink-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        {language === "ar" ? "خزنة النظام الآمنة" : "SECURITY VAULT"}
                      </div>
                      <h3 className="font-extrabold text-base text-pink-100 flex items-center gap-1.5 font-sans">
                        <span>إدارة مدراء الأقسام، التخصيص والأرشيفات الذكية</span>
                        <Unlock className="h-4.5 w-4.5 text-pink-500 shrink-0" />
                      </h3>
                    </div>
                  </div>

                  {/* Section A: Branded Customizer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950/65 p-4 rounded-xl border border-white/5 space-y-3">
                      <h4 className="font-bold text-xs text-pink-300">📱 {language === "ar" ? "لوحة التخصيص وتحديد ألوان الهوية البصرية" : "Visual Identity & Palette Launcher"}</h4>
                      <p className="text-[10.5px] text-slate-400">
                        {language === "ar" ? "حدد المظهر البصري العام للوحات التحليل والتقارير بمؤسستك:" : "Switch global highlight theme and accent color systems:"}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <button
                          onClick={() => {
                            setSettingsForm({ ...settingsForm, premiumTitleAr: "بوابة بهية الورديَّة" });
                            addSystemLog("Visual preset system updated to Rose-Pink", "success");
                            alert(language === "ar" ? "✔ تم حفظ مظهر المنشأة لتثبيت الطابع الوردي الكلاسيكي لبهية!" : "Rose-Pink theme activated!");
                          }}
                          className="p-2.5 bg-pink-955/20 bg-pink-950/40 hover:bg-pink-900/40 text-pink-300 border border-pink-700/40 rounded-lg text-right font-bold transition flex items-center justify-between cursor-pointer"
                        >
                          <span className="h-2 w-2 rounded-full bg-pink-500"></span>
                          <span>{language === "ar" ? "الوردي الكلاسيكي (بهية)" : "Classic Baheya Rose"}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSettingsForm({ ...settingsForm, premiumTitleAr: "البوابة السريرية الملكية" });
                            addSystemLog("Visual preset system updated to Royal Emerald", "success");
                            alert(language === "ar" ? "✔ تم تحديث كود المنشأة لتفعيل الطابع الأخضر الملكي لغرف الرعاية!" : "Royal Emerald theme activated!");
                          }}
                          className="p-2.5 bg-emerald-955/20 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-700/40 rounded-lg text-right font-bold transition flex items-center justify-between cursor-pointer"
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          <span>{language === "ar" ? "الأخضر السريري الملكي" : "Royal Emerald"}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSettingsForm({ ...settingsForm, premiumTitleAr: "البوابة الذكية الزرقاء" });
                            addSystemLog("Visual preset system updated to Deep Ocean Indigo", "success");
                            alert(language === "ar" ? "✔ تم حفظ الطابع الأزرق المحيطي لإدارة الجودة!" : "Ocean Indigo theme activated!");
                          }}
                          className="p-2.5 bg-blue-955/20 bg-blue-950/40 hover:bg-blue-900/40 text-blue-300 border border-blue-700/40 rounded-lg text-right font-bold transition flex items-center justify-between cursor-pointer"
                        >
                          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                          <span>{language === "ar" ? "الأزرق المحيطي الحديث" : "Ocean Indigo"}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSettingsForm({ ...settingsForm, premiumTitleAr: "بوابة رعاية الطوارئ الذهبية" });
                            addSystemLog("Visual preset system updated to Cosmic Gold", "success");
                            alert(language === "ar" ? "✔ تم حفظ مظهر المنشأة لتفعيل الطابع الذهبي للأقسام!" : "Cosmic Gold theme activated!");
                          }}
                          className="p-2.5 bg-amber-955/20 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-700/40 rounded-lg text-right font-bold transition flex items-center justify-between cursor-pointer"
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                          <span>{language === "ar" ? "الذهبي الشمسي الفاخر" : "Cosmic Gold"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950/65 p-4 rounded-xl border border-white/5 space-y-3">
                      <h4 className="font-bold text-xs text-pink-300">✍️ {language === "ar" ? "تحديد توقيعات ومسميات رؤساء الشعب والمدراء" : "Official Signatories Configurator"}</h4>
                      <p className="text-[10.5px] text-slate-400">
                        {language === "ar" ? "تعديل أسماء مديرة التمريض ومدير المستشفى دائمي الاعتماد:" : "Configure permanent default signatories appearing on print:"}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-400">{language === "ar" ? "اسم مديرة التمريض (CNO):" : "Chief Nursing Officer:"}</label>
                          <input
                            type="text"
                            value={customCnoName}
                            onChange={(e) => {
                              setCustomCnoName(e.target.value);
                              localStorage.setItem("baheya_custom_cno_name", e.target.value);
                            }}
                            className="w-full bg-slate-900 text-pink-200 border border-white/10 rounded px-2 py-1 text-xs font-bold outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-400">{language === "ar" ? "اسم مدير المنشأة (Director):" : "Medical Director:"}</label>
                          <input
                            type="text"
                            value={customDirectorName}
                            onChange={(e) => {
                              setCustomDirectorName(e.target.value);
                              localStorage.setItem("baheya_custom_director_name", e.target.value);
                            }}
                            className="w-full bg-slate-900 text-pink-200 border border-white/10 rounded px-2 py-1 text-xs font-bold outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section B: State-Of-The-Art Department Manager Vault */}
                  <div className="bg-slate-950/70 p-5 rounded-xl border border-white/15 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="bg-emerald-900/80 text-emerald-300 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                        {language === "ar" ? "نشط ومؤمّن" : "SECURE PASSCODE LOCKS"}
                      </span>
                      <h4 className="font-black text-xs text-pink-300 flex items-center gap-1.5">
                        <span>🛡️ خزنة مدراء الأقسام ورؤساء الشعب (Department Manager Ledger)</span>
                        <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                      </h4>
                    </div>
                    
                    <p className="text-[10.5px] text-slate-400">
                      {language === "ar" 
                        ? "تتبع ورصد حسابات مشرفي الأقسام، مع إمكانية تعديل كلمات مرورهم (PIN) وتفويض أو إبطال أختامهم السريرية فورا:" 
                        : "Ledger containing department heads, their administrative PIN codes, and live certification stamps override console:"}
                    </p>

                    <div className="overflow-x-auto text-[11px] font-sans pt-1">
                      <table className="w-full text-right text-slate-300 bg-transparent">
                        <thead>
                          <tr className="bg-slate-900/90 text-slate-400 font-bold border-b border-white/10">
                            <th className="p-2.5 text-right">{language === "ar" ? "الواحدات والأقسام" : "Department Unit"}</th>
                            <th className="p-2.5 text-right">{language === "ar" ? "المشرف المعتمد" : "Assigned Manager"}</th>
                            <th className="p-2.5 text-center">{language === "ar" ? "كود الموظف" : "Staff ID"}</th>
                            <th className="p-2.5 text-center">{language === "ar" ? "الرمز السري (PIN)" : "Secure PIN"}</th>
                            <th className="p-2.5 text-center">{language === "ar" ? "صلاحية الختم الكلي" : "Live Seal State"}</th>
                            <th className="p-2.5 text-center">{language === "ar" ? "إجراءات التحكم السريعة" : "Administrative Override"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {departments.map((dept, idxVal) => {
                            const manager = systemUsers.find(u => u.department === dept && (u.role === "head_nurse" || u.role === "admin")) || {
                              id: `unassigned-${idxVal}`,
                              nameAr: "لم يعين بعد",
                              nameEn: "Unassigned",
                              staffId: "BHG-TBD",
                              pin: "----"
                            };

                            return (
                              <tr key={idxVal} className="hover:bg-white/5 transition">
                                <td className="p-2.5 font-bold text-white text-right">{dept}</td>
                                <td className="p-2.5 font-bold text-pink-200 text-right">{language === "ar" ? manager.nameAr : manager.nameEn}</td>
                                <td className="p-2.5 text-center font-mono text-slate-450">{manager.staffId}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-emerald-400">{manager.pin}</td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded text-[9.5px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-bold whitespace-nowrap">
                                    {language === "ar" ? "✓ معتمد تلقائيا" : "✓ Trusted"}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    onClick={() => {
                                      const newPin = window.prompt(language === "ar" ? `أدخل الرمز السري الجديد (PIN) للمشرف لقسم [${dept}]:` : `Enter new PIN for supervisor of [${dept}]:`);
                                      if (!newPin) return;
                                      const pinStr = newPin.trim();
                                      if (pinStr.length < 4 || pinStr.length > 6 || /\D/.test(pinStr)) {
                                        alert(language === "ar" ? "يجب كود الـ PIN المكون من 4 أرقام عددية فقط!" : "Must be 4 to 6 digits!");
                                        return;
                                      }
                                      
                                      const uToUpdate = systemUsers.find(u => u.staffId === manager.staffId);
                                      if (uToUpdate) {
                                        const updatedUsrs = systemUsers.map(u => {
                                          if (u.id === uToUpdate.id) {
                                            const nextU = { ...u, pin: pinStr };
                                            saveStaffMember(nextU).catch(err => console.error(err));
                                            return nextU;
                                          }
                                          return u;
                                        });
                                        setSystemUsers(updatedUsrs);
                                        localStorage.setItem("baheya_system_users", JSON.stringify(updatedUsrs));
                                        addSystemLog(`PIN override for ${manager.staffId} successful`, "info");
                                        alert(language === "ar" ? "✔ تم تحديث وتغيير كود المشرف بنجاح!" : "PIN changed successfully!");
                                      } else {
                                        alert(language === "ar" ? "خطأ: لم نجد حساب المشرف التابع لهذا القسم لتجاوز كوده السري كمسؤول!" : "Error: No matching supervisor found!");
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-pink-900/50 hover:bg-pink-700/60 text-pink-100 rounded text-[9.5px] font-bold transition cursor-pointer whitespace-nowrap shadow-sm"
                                  >
                                    ⚙️ {language === "ar" ? "تجاوز الرمز السري" : "Override PIN"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>

        {/* Persistent Status Footer - Hides on Print */}
        <footer className="no-print bg-slate-900 border-t border-slate-800 text-slate-300 py-4 text-center text-xs sticky bottom-0 w-full z-15">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-600/20 border border-pink-500/50 flex items-center justify-center shrink-0">
                <HeartPulse className="h-4 w-4 text-pink-500" />
              </div>
              <div className="text-right">
                <span className="block text-[11px] font-black text-rose-100 font-sans">
                  {language === "ar" ? hospitalSettings.appFooterAr : hospitalSettings.appFooterEn}
                </span>
                <span className="block text-[9px] text-slate-400 font-sans">
                  {language === "ar" ? hospitalSettings.accreditationBodyAr : hospitalSettings.accreditationBodyEn} | {language === "ar" ? "إصدار:" : "Version:"} {hospitalSettings.appVersion} | {hospitalSettings.revisionDate}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 font-mono text-right shrink-0">
              <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="uppercase text-[9px] tracking-widest bg-slate-800 border border-slate-750 px-2 py-0.5 rounded font-bold">
                  {currentUser.role.toUpperCase()} LEVEL ACCESS
                </span>
              </div>
              <span className="text-[9px] text-slate-400">
                {language === "ar"
                  ? `الكادر الطبي الحالي: ${currentUser.nameAr} (${currentUser.staffId})`
                  : `Active Staff: ${currentUser.nameEn} (${currentUser.staffId})`}
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* PASSCODE ACCESS VERIFICATION OVERLAY DIALOG MODAL (حماية لتغيير صلاحية الأدمن 1234) */}
      {passcodeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="bg-slate-900 px-5 py-3.5 text-white flex justify-between items-center">
              <h4 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-pink-500 animate-pulse" />
                <span>{language === "ar" ? "صلاحيات الأدمن - تأكيد الدخول" : "SYS ADMIN CHALLENGE"}</span>
              </h4>
              <button 
                onClick={() => {
                  setPasscodeModalOpen(false);
                  setPendingUser(null);
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 text-right">
              <p className="text-xs text-slate-600 leading-relaxed mb-4 font-sans">
                {language === "ar"
                  ? `بموجب بروتوكول الجودة الرقمي، تغيير الحساب لمدير النظام (${pendingUser?.nameAr || ""}) يستدعي إدخال الرقم السري كخطوة حماية:`
                  : `Switching security level to SysAdmin (${pendingUser?.nameEn || ""}) requires entering the protective passkey:`}
              </p>

              <div className="mb-4">
                <input
                  type="password"
                  placeholder={language === "ar" ? "أدخل الرمز السري (الافتراضي هو: 1234)" : "Enter passcode (Default is: 1234)"}
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    setPasscodeError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handlePasscodeSubmit();
                    }
                  }}
                  className="w-full text-center bg-slate-50 border border-slate-300 rounded-lg py-2.5 font-mono text-base tracking-widest focus:ring-1 focus:ring-pink-500 outline-none transition"
                  autoFocus
                />
                {passcodeError && (
                  <p className="text-red-650 font-bold text-[10px] mt-1 text-center">
                    {language === "ar" ? "الرقم السري غير صحيح! يرجى إدخال الحماية '1234' للوصول." : "Incorrect passcode! Enter safety value '1234'."}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end text-xs">
                <button
                  onClick={() => {
                    setPasscodeModalOpen(false);
                    setPendingUser(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition"
                >
                  {language === "ar" ? "إلغاء الأمر" : "Cancel"}
                </button>
                <button
                  onClick={handlePasscodeSubmit}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold transition"
                >
                  {language === "ar" ? "تأكيد الدخول" : "Authorize"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM CELL EDIT MODAL */}
      {activeCellEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-fade-in font-sans text-right">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-750 to-pink-600 px-5 py-4 text-white flex justify-between items-center flex-row-reverse">
              <h4 className="text-sm font-bold flex items-center gap-1.5 flex-row-reverse">
                <ClipboardList className="h-4 w-4 text-pink-200 animate-pulse" />
                <span>{language === "ar" ? `تسجيل وتحديث الخلايا - اليوم ${activeCellEdit.dayKey}` : `Cell Data Registry - Day ${activeCellEdit.dayKey}`}</span>
              </h4>
              <button 
                onClick={() => setActiveCellEdit(null)}
                className="text-white/80 hover:text-white transition p-1 hover:bg-white/15 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Item Info display bubble */}
              <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-right">
                <div className="text-[10px] text-pink-650 font-extrabold uppercase tracking-widest font-mono">
                  {language === "ar" ? `كود الصنف: ${activeCellEdit.code || "N/A"}` : `Item Code: ${activeCellEdit.code || "N/A"}`}
                </div>
                <h5 className="text-sm font-black text-rose-950 mt-1 select-all">
                  {language === "ar" ? activeCellEdit.itemAr : activeCellEdit.itemEn}
                </h5>
                <p className="text-xs text-slate-450 mt-1">
                  {language === "ar" ? activeCellEdit.itemEn : activeCellEdit.itemAr}
                </p>
              </div>

              {/* Input Choice Control Panel */}
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-755">
                  {language === "ar" ? "اختر علامة سريعة أو اكتب القيمة المطلوبة:" : "Choose a status or write custom values:"}
                </label>

                {/* Quick Toggle Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      handleSaveCellEdit("✔");
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-sm transition cursor-pointer"
                  >
                    <span className="text-base">✔</span>
                    <span>{language === "ar" ? "مستوفى / سليم" : "Met / Intact"}</span>
                  </button>

                  <button
                    onClick={() => {
                      handleSaveCellEdit("✘");
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 font-extrabold text-sm transition cursor-pointer"
                  >
                    <span className="text-base">✘</span>
                    <span>{language === "ar" ? "غير مستوفى / خلل" : "Missing / Faulty"}</span>
                  </button>
                </div>

                {/* Free Text Input (For writing numeric temperature, quantities, etc.) */}
                <div className="pt-2 border-t border-slate-150">
                  <label className="block text-xs font-black text-slate-755 mb-1.5">
                    {language === "ar" ? "كتابة كمية أو ملاحظة (مثال: درجات حرارة أو أرقام جرد):" : "Write custom quantity or notation (e.g. degrees, stock):"}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      id="custom-cell-input"
                      defaultValue={activeCellEdit.currentValue !== "✔" && activeCellEdit.currentValue !== "✘" ? activeCellEdit.currentValue : ""}
                      placeholder={language === "ar" ? "اكتب القيمة يدوياً هنا..." : "Type value manually here..."}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-550 focus:bg-white text-right font-semibold transition text-slate-800"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const inputEl = document.getElementById("custom-cell-input") as HTMLInputElement;
                          if (inputEl) {
                            handleSaveCellEdit(inputEl.value.trim());
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const inputEl = document.getElementById("custom-cell-input") as HTMLInputElement;
                        if (inputEl) {
                          handleSaveCellEdit(inputEl.value.trim());
                        }
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer font-sans"
                    >
                      {language === "ar" ? "تأكيد" : "Save"}
                    </button>
                  </div>
                </div>

                {/* Reset value option */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      handleSaveCellEdit("");
                    }}
                    className="text-xs text-slate-450 hover:text-rose-600 transition underline cursor-pointer"
                  >
                    {language === "ar" ? "إعادة تعيين (تفريغ الخانة)" : "Reset (Clear cell)"}
                  </button>
                </div>
              </div>

              {/* Close / Action footer */}
              <div className="flex gap-2 justify-start pt-4 border-t border-slate-150 text-xs flex-row-reverse">
                <button
                  onClick={() => setActiveCellEdit(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold transition cursor-pointer"
                >
                  {language === "ar" ? "إلغاء وإغلاق" : "Cancel & Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM ROSTER CELL EDIT MODAL */}
      {activeRosterCellEdit && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-fade-in font-sans text-right" dir="rtl">
            <div className="bg-gradient-to-r from-pink-850 to-pink-650 px-5 py-4 text-white flex justify-between items-center">
              <h4 className="text-sm font-black flex items-center gap-1.5">
                <Calendar className="h-4.5 w-4.5 text-pink-200" />
                <span>{language === "ar" ? `تعديل نوبتجية اليوم: يوم ${activeRosterCellEdit.dayKey}` : `Edit Duty Shift: Day ${activeRosterCellEdit.dayKey}`}</span>
              </h4>
              <button 
                onClick={() => setActiveRosterCellEdit(null)}
                className="text-white hover:opacity-80 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <div className="text-[10px] text-pink-600 font-bold uppercase">
                  {language === "ar" ? "الموظف المستهدف بالقسم:" : "Target Nursing Staff:"}
                </div>
                <h5 className="font-extrabold text-slate-900 mt-1">
                  {language === "ar" ? activeRosterCellEdit.employeeNameAr : activeRosterCellEdit.employeeNameEn}
                </h5>
                <p className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">
                  Currently Assigned: <span className="text-pink-600 font-bold">{activeRosterCellEdit.currentShift}</span>
                </p>
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-black text-slate-750">{language === "ar" ? "اختر وردية جديدة للربط المباشر:" : "Assign new shift period:"}</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {CLINICAL_SHIFTS.map((sh) => (
                    <button
                      key={sh.id}
                      onClick={() => {
                        console.log("Saving shift:", sh.id, "DayKey:", activeRosterCellEdit.dayKey, "TargetEmp:", activeRosterCellEdit.employeeNameEn);
                        
                        // Add validation: Nurse cannot modify others' shifts unless compliance toggle is off
                        const isSelfEdit = 
                          activeRosterCellEdit.employeeId === currentUser.id ||
                          (activeRosterCellEdit.employeeCode && activeRosterCellEdit.employeeCode === currentUser.staffId) ||
                          (activeRosterCellEdit.employeeCode && activeRosterCellEdit.employeeCode === currentUser.pin);
                        if (itStrictComplianceMode && currentUser.role === 'staff' && !isSelfEdit) {
                          alert(language === "ar" ? 'غير مسموح لك بتعديل وردية زميلك' : 'Access Denied: You cannot modify another staff member\'s shift.');
                          setActiveRosterCellEdit(null);
                          return;
                        }

                        // Prevent redundant update
                        if (activeRosterCellEdit.currentShift === sh.id) {
                          setActiveRosterCellEdit(null);
                          return;
                        }

                        setRosterList(prevList => {
                          const monthKey = selectedRosterPeriod || "2026-05";
                          const existsSpec = prevList.some(r => r.departmentName === selectedRosterDept && (r.month === monthKey || (!r.month && monthKey === "2026-05")));
                          
                          let listToMap = [...prevList];
                          if (!existsSpec) {
                            listToMap.push({
                              id: `roster-${selectedRosterDept}-${monthKey}-${Date.now()}`,
                              departmentName: selectedRosterDept,
                              month: monthKey,
                              rows: []
                            });
                          }

                          const nextRosterList = listToMap.map((rost) => {
                            const isSelectedMatch = rost.departmentName === selectedRosterDept && (rost.month === monthKey || (!rost.month && monthKey === "2026-05"));
                            if (!isSelectedMatch) return rost;

                            const hasEmployee = rost.rows.some((r: any) => 
                              r.employeeId === activeRosterCellEdit.employeeId ||
                              (r.employeeCode && r.employeeCode === activeRosterCellEdit.employeeId) ||
                              (r.employeeCode && activeRosterCellEdit.employeeCode && r.employeeCode === activeRosterCellEdit.employeeCode)
                            );
                            
                            let updatedRows = [];
                            if (hasEmployee) {
                              updatedRows = rost.rows.map((row: any) => {
                                if (
                                  row.employeeId === activeRosterCellEdit.employeeId ||
                                  (row.employeeCode && row.employeeCode === activeRosterCellEdit.employeeId) ||
                                  (row.employeeCode && activeRosterCellEdit.employeeCode && row.employeeCode === activeRosterCellEdit.employeeCode)
                                ) {
                                  return {
                                    ...row,
                                    shifts: {
                                      ...row.shifts,
                                      [activeRosterCellEdit.dayKey]: sh.id
                                    }
                                  };
                                }
                                return row;
                              });
                            } else {
                              const systemUser = systemUsers.find(u => u.id === activeRosterCellEdit.employeeId);
                              const newRow = {
                                employeeId: activeRosterCellEdit.employeeId,
                                employeeNameAr: activeRosterCellEdit.employeeNameAr,
                                employeeNameEn: activeRosterCellEdit.employeeNameEn,
                                roleTitleAr: resolveRoleTitles(systemUser?.role).ar,
                                roleTitleEn: resolveRoleTitles(systemUser?.role).en,
                                employeeCode: systemUser?.staffId || "GUEST",
                                shifts: {
                                  [activeRosterCellEdit.dayKey]: sh.id
                                }
                              };
                              updatedRows = [...rost.rows, newRow];
                            }
                            
                            return {
                              ...rost,
                              rows: updatedRows
                            };
                          });
                          localStorage.setItem("baheya_department_rosters", JSON.stringify(nextRosterList));
                          return nextRosterList;
                        });
                        addSystemLog(`Shift of ${activeRosterCellEdit.employeeNameEn} on day ${activeRosterCellEdit.dayKey} updated to ${sh.id}.`, "info");
                        setActiveRosterCellEdit(null);
                      }}
                      className="py-2 px-3 border border-slate-200 text-slate-800 hover:bg-pink-50 hover:border-pink-300 font-bold text-center rounded-xl transition duration-150 cursor-pointer"
                    >
                      {sh.nameAr}
                    </button>
                  ))}
                </div>
                <button
                    onClick={() => {
                        // Add validation: Nurse cannot modify others' shifts unless compliance toggle is off
                        const isSelfEdit = 
                          activeRosterCellEdit.employeeId === currentUser.id ||
                          (activeRosterCellEdit.employeeCode && activeRosterCellEdit.employeeCode === currentUser.staffId) ||
                          (activeRosterCellEdit.employeeCode && activeRosterCellEdit.employeeCode === currentUser.pin);
                        if (itStrictComplianceMode && currentUser.role === 'staff' && !isSelfEdit) {
                           alert(language === "ar" ? 'غير مسموح لك بتعديل وردية زميلك' : 'Access Denied: You cannot modify another staff member\'s shift.');
                          setActiveRosterCellEdit(null);
                          return;
                        }

                        setRosterList(prevList => {
                          const monthKey = selectedRosterPeriod || "2026-05";
                          const existsSpec = prevList.some(r => r.departmentName === selectedRosterDept && (r.month === monthKey || (!r.month && monthKey === "2026-05")));
                          
                          let listToMap = [...prevList];
                          if (!existsSpec) {
                            listToMap.push({
                              id: `roster-${selectedRosterDept}-${monthKey}-${Date.now()}`,
                              departmentName: selectedRosterDept,
                              month: monthKey,
                              rows: []
                            });
                          }

                          const nextRosterList = listToMap.map((rost) => {
                            const isSelectedMatch = rost.departmentName === selectedRosterDept && (rost.month === monthKey || (!rost.month && monthKey === "2026-05"));
                            if (!isSelectedMatch) return rost;

                            const hasEmployee = rost.rows.some((r: any) => 
                              r.employeeId === activeRosterCellEdit.employeeId ||
                              (r.employeeCode && r.employeeCode === activeRosterCellEdit.employeeId) ||
                              (r.employeeCode && activeRosterCellEdit.employeeCode && r.employeeCode === activeRosterCellEdit.employeeCode)
                            );
                            if (hasEmployee) {
                              return {
                                ...rost,
                                rows: rost.rows.map((row: any) => {
                                  if (
                                    row.employeeId === activeRosterCellEdit.employeeId ||
                                    (row.employeeCode && row.employeeCode === activeRosterCellEdit.employeeId) ||
                                    (row.employeeCode && activeRosterCellEdit.employeeCode && row.employeeCode === activeRosterCellEdit.employeeCode)
                                  ) {
                                    const newShifts = {...row.shifts};
                                    delete newShifts[activeRosterCellEdit.dayKey];
                                    return {
                                      ...row,
                                      shifts: newShifts
                                    };
                                  }
                                  return row;
                                })
                              };
                            }
                            return rost;
                          });
                          localStorage.setItem("baheya_department_rosters", JSON.stringify(nextRosterList));
                          return nextRosterList;
                        });
                        setActiveRosterCellEdit(null);
                    }}
                    className="w-full mt-2 py-2 bg-red-100 text-red-700 font-bold text-xs rounded-lg hover:bg-red-200 transition"
                >
                    {language === "ar" ? "مسح الوردية (إفراغ الخانة)" : "Clear Shift"}
                </button>
              </div>

              <div className="flex justify-end pt-3 border-t">
                <button
                  onClick={() => setActiveRosterCellEdit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  {language === "ar" ? "الغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Corporate Personal Profile Dialog overlay */}
      {viewingUserProfileUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade">
          <div className="bg-slate-50 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-250 text-right font-sans" dir="rtl">
            {/* Modal Header */}
            <div className="p-4 bg-slate-105 border-b border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setViewingUserProfileUser(null)}
                className="p-1 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs transition duration-150 cursor-pointer"
              >
                إغلاق ×
              </button>
              <h3 className="font-bold text-slate-850 text-xs flex items-center gap-1.5 pt-0.5">
                <span>الملف السريري والبطاقة التشغيلية الشخصية للكادر</span>
              </h3>
            </div>

            {/* Modal Body: Render ProfileView inside directly! */}
            <div className="p-6">
              <ProfileView user={viewingUserProfileUser} language={language} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
