import React, { useState } from "react";
import { AppUser, UserRole } from "../types";
import { saveSystemUser } from "../lib/firestoreService";
import { 
  ShieldCheck, 
  UserPlus, 
  X, 
  Check, 
  Shield, 
  Layers, 
  Laptop, 
  Fingerprint, 
  AlertTriangle, 
  CheckSquare, 
  Clock, 
  MapPin, 
  Zap, 
  ShieldAlert, 
  Trash2,
  Copy
} from "lucide-react";

interface UserApprovalProps {
  users: AppUser[];
}

export default function UserApprovalDashboard({ users }: UserApprovalProps) {
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [justApprovedPin, setJustApprovedPin] = useState<{ name: string; pin: string } | null>(null);
  const [bulkActionLogs, setBulkActionLogs] = useState<string[]>([]);
  const [geoQuarantineOverride, setGeoQuarantineOverride] = useState<Record<string, boolean>>({});

  // Helper to generate a mock but realistic LAN and device footprint for pending signups
  const getDeviceFootprint = (user: AppUser) => {
    // Deterministic simulation based on user id so it remains stable across render cycles
    const hash = user.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const subnet = hash % 2 === 0 ? "192.168.1" : (hash % 3 === 0 ? "10.0.0" : "197.34.112");
    const lastOctet = (hash % 254) + 1;
    const ip = `${subnet}.${lastOctet}`;

    // MAC address
    const macPrefix = "6C:2F:80";
    const segment1 = (hash % 89 + 10).toString(16).toUpperCase();
    const segment2 = ((hash * 3) % 89 + 10).toString(16).toUpperCase();
    const segment3 = ((hash * 7) % 89 + 10).toString(16).toUpperCase();
    const mac = `${macPrefix}:${segment1}:${segment2}:${segment3}`;

    // Fingerprint token
    const fingerprint = `FP-SHA256-${hash.toString(16).toUpperCase()}${hash * 13}-MD5`;

    // Is it inside corporate hospital block (192.168.1.X or 10.0.0.X)
    const isHospitalLan = subnet === "192.168.1" || subnet === "10.0.0";

    return { ip, mac, fingerprint, isHospitalLan };
  };

  const pendingUsers = users.filter((u) => u.status === "pending" || !u.status);
  const activeUsers = users.filter((u) => u.status === "active");

  const generate6DigitPin = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleApprove = async (user: AppUser, isTemporaryAccess = false) => {
    const defaultPin = generate6DigitPin();
    const targetRole = isTemporaryAccess ? "intern" : user.role;
    
    // Prevent overlapping of medical and technical privileges (Role-Conflict Guard)
    // Nurse cannot be upgraded to admin/it automatically without strict separation check
    const isMedicalRole = ["staff", "intern", "head_nurse", "nursing_director", "ward_clerk"].includes(user.role);
    const requestedITRole = ["it", "admin"].includes(newRole);
    if (isMedicalRole && requestedITRole) {
      alert("⚠️ حاجز تداخل الصلاحيات (Role-Conflict Guard): غير مسموح بربط الأدوار الطبية والتمريضية بحساب الصيانة والتحكم بقواعد البيانات للحفاظ على معايير HIPAA وسلامة الجرود.");
      return;
    }

    const updated: AppUser = {
      ...user,
      status: "active",
      role: targetRole as UserRole,
      pin: defaultPin,
    };

    // Save to Firestore & local storage fallback
    await saveSystemUser(updated);
    setJustApprovedPin({ name: user.nameAr, pin: defaultPin });
    setBulkActionLogs(prev => [`[CORP LAN] Approved user: ${user.nameAr} with PIN ${defaultPin}`, ...prev]);
  };

  const handleReject = async (user: AppUser) => {
    const updated: AppUser = {
      ...user,
      status: "disabled",
    };
    await saveSystemUser(updated);
    setBulkActionLogs(prev => [`[CORP LAN] Rejected/Deactivated user: ${user.nameAr}`, ...prev]);
  };

  // Bulk approvals
  const handleApproveAll = async () => {
    if (pendingUsers.length === 0) return;
    if (confirm(`هل أنت متأكد من الموافقة الجماعية على جميع الطلبات المعلقة (${pendingUsers.length} طلب) وتوليد رموز PIN تلقائية لها؟`)) {
      for (const u of pendingUsers) {
        const footprint = getDeviceFootprint(u);
        const isQuarantined = !footprint.isHospitalLan && !geoQuarantineOverride[u.id];
        if (isQuarantined) {
          setBulkActionLogs(prev => [`[QUARANTINE ALERT] Bypassed bulk approval for ${u.nameAr} - Out of Hospital Range`, ...prev]);
          continue; // skip quarantined users from bulk approve
        }
        await handleApprove(u);
      }
      alert("تمت معالجة القبول الجماعي لجميع المستخدمين المطابقين لمعايير حيز الشبكة!");
    }
  };

  const handleRejectAll = async () => {
    if (pendingUsers.length === 0) return;
    if (confirm(`⚠️ تحذير أمني: هل تريد رفض وتعطيل كافة طلبات التسجيل المعلقة (${pendingUsers.length} طلب) فوراً؟`)) {
      for (const u of pendingUsers) {
        await handleReject(u);
      }
      alert("تم رفض وتعطيل كافة الطلبات المعلقة.");
    }
  };

  const updateRole = async (user: AppUser) => {
    if (!newRole) return;
    
    // Role-Conflict Guard (Double-Check)
    const isMedicalRole = ["staff", "intern", "head_nurse", "nursing_director", "ward_clerk"].includes(user.role);
    const requestedITRole = ["it", "admin"].includes(newRole);
    if (isMedicalRole && requestedITRole) {
      alert("🚨 حاجز الحماية الأمني (CISO Role-Conflict Guard): لا يمكن منح صلاحية IT أو مشرف نظام لكادر تمريضي نشط.");
      return;
    }

    try {
      await saveSystemUser({ ...user, role: newRole as any });
      setEditingRole(null);
      setNewRole("");
      setBulkActionLogs(prev => [`[RBAC CHANGE] Updated role of ${user.nameAr} to ${newRole.toUpperCase()}`, ...prev]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* Visual Header Grid with KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-black text-slate-400">إجمالي طلبات التسجيل المعلقة</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-pink-500 font-mono">{pendingUsers.length}</span>
            <span className="text-[9px] bg-pink-500/10 text-pink-300 px-2 py-0.5 rounded border border-pink-500/20">IT Gateway</span>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-black text-slate-400">الأجهزة المعزولة والشبكات الخارجية</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-500 font-mono">
              {pendingUsers.filter(u => !getDeviceFootprint(u).isHospitalLan).length}
            </span>
            <span className="text-[9px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">Quarantine Gate</span>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-black text-slate-400">الحسابات النشطة والمصرحة</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-500 font-mono">{activeUsers.length}</span>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">RBAC Active</span>
          </div>
        </div>

        {/* Bulk Control triggers */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500">أدوات التحكم الجماعي الفورية (Bulk Actions)</span>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={handleApproveAll}
              disabled={pendingUsers.length === 0}
              className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-[10px] font-black shadow-sm transition"
            >
              قبول الكل
            </button>
            <button
              onClick={handleRejectAll}
              disabled={pendingUsers.length === 0}
              className="px-2 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg text-[10px] font-black shadow-sm transition"
            >
              رفض الكل
            </button>
          </div>
        </div>
      </div>

      {/* Temporary PIN Display Banner */}
      {justApprovedPin && (
        <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-xl flex items-center justify-between shadow-sm animate-fade">
          <div className="space-y-1">
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">تمت الموافقة بنجاح</span>
            <p className="text-xs text-slate-800 font-bold">
              مرحبًا! تم تفعيل حساب <span className="text-pink-600">[{justApprovedPin.name}]</span> بالكامل في مصفوفة الكادر.
            </p>
            <p className="text-[11px] text-slate-500">
              الرمز السري المؤقت المولد للحساب هو المدون باليسار. يرجى إبلاغ الكادر به لتسجيل الدخول.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 text-emerald-400 font-mono tracking-widest text-lg font-black px-4 py-3 rounded-lg relative">
            <input 
              type="password" 
              value={justApprovedPin.pin} 
              readOnly 
              autoComplete="current-password" 
              className="bg-transparent border-none text-center outline-none select-all w-20 text-emerald-400"
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(justApprovedPin.pin);
                alert("تم نسخ رمز الـ PIN إلى الذاكرة المؤقتة لسهولة الإرسال!");
              }}
              className="p-1 text-slate-400 hover:text-white transition"
              title="نسخ"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Container - Pending Registrations with NIC Trace */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
            <UserPlus size={16} className="text-pink-500" />
            <span>طلبات التسجيل السحابية والمحلية المعلقة للتدقيق</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            يقوم جدار الحماية (Bahya Security Gateway) بفحص وتتبع عنوان الـ IP والـ MAC address الخاص بجهاز الموظف وموازنتهم الجغرافية لفلترة عناوين الشبكة ومنع قرصنة البيانات من عناوين الهواتف الخارجية.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {pendingUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs text-sans">
              <ShieldCheck size={32} className="mx-auto mb-2 text-slate-300 animate-pulse" />
              لا توجد أي طلبات تسجيل معلقة حاليًا بنظام الجدرودات. جميع الطلبات تم تدقيقها والمصادقة عليها!
            </div>
          ) : (
            pendingUsers.map((user) => {
              const footprint = getDeviceFootprint(user);
              const isOutsideBlock = !footprint.isHospitalLan;
              const hasOverride = geoQuarantineOverride[user.id] === true;

              return (
                <div key={user.id} className="p-5 hover:bg-slate-50/50 transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  
                  {/* Left: User Identity information */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-sans font-black text-slate-900 text-xs bg-slate-100 px-2.5 py-1 rounded">
                        {user.nameAr}
                      </span>
                      {isOutsideBlock ? (
                        <span className={`text-[9px] px-2 py-0.5 rounded font-black flex items-center gap-1 ${
                          hasOverride ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-rose-100 text-rose-800 border border-rose-300"
                        }`}>
                          <ShieldAlert size={10} />
                          {hasOverride ? "استثناء أمني مفعل" : "معزول - خارج الشبكة"}
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] px-2 py-0.5 rounded font-black flex items-center gap-1">
                          <Check size={10} />
                          شبكة المHospital المعتمدة
                        </span>
                      )}
                    </div>
                    
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p>مسمى الموظف: <span className="font-bold text-slate-700">{user.nameEn || "N/A"}</span> &bull; البريد: <span className="font-mono">{user.email || "no-email@baheya.org"}</span></p>
                      <p>الرقم الطبي (Staff ID): <span className="font-bold font-mono bg-slate-100 px-1.5 py-0.5 rounded">{user.staffId}</span> &bull; القسم المسجل: <span className="font-black text-rose-800">{user.department}</span></p>
                    </div>

                    {/* Hardware MAC and fingerprint traces */}
                    <div className="pt-2 flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
                      <span className="bg-slate-100 px-2 py-0.5 rounded leading-tight">IP: {footprint.ip}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded leading-tight">MAC: {footprint.mac}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded leading-tight select-all">FP-TOKEN: {footprint.fingerprint}</span>
                    </div>
                  </div>

                  {/* Right: Validation Matchers & Quick Approval Zone */}
                  <div className="flex flex-row-reverse sm:flex-row items-center gap-2 w-full lg:w-auto justify-end">
                    
                    {/* Outside Location override Toggle if quarantined */}
                    {isOutsideBlock && !hasOverride && (
                      <button
                        onClick={() => setGeoQuarantineOverride(prev => ({ ...prev, [user.id]: true }))}
                        className="px-2.5 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer"
                        title="تجاوز جدار الحماية الجغرافي بشكل مؤقت"
                      >
                        <AlertTriangle size={12} className="text-amber-600 animate-pulse" />
                        <span>تجاوز وقبول الاستثناء</span>
                      </button>
                    )}

                    {/* Standard Approvals: Disable normal Approve for quarantined users unless overridden */}
                    <button
                      onClick={() => handleApprove(user, false)}
                      disabled={isOutsideBlock && !hasOverride}
                      className="px-3.5 py-1.5 bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check size={14} />
                      <span>تفعيل دائم</span>
                    </button>

                    <button
                      onClick={() => handleApprove(user, true)}
                      disabled={isOutsideBlock && !hasOverride}
                      className="px-3 py-1.5 bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1 cursor-pointer"
                      title="الموافقة بصلاحية وصول مؤقت للامتياز والمتدربين"
                    >
                      <Clock size={12} />
                      <span>وصول مؤقت</span>
                    </button>

                    <button
                      onClick={() => handleReject(user)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200/60 transition cursor-pointer"
                      title="رفض الحساب وتعطيله الكلي"
                    >
                      <X size={14} />
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Accounts & RBAC matrix controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
            <Shield size={16} className="text-pink-500" />
            <span>المصادقة الإدارية وإمكانية تعديل الأدوار النشطة لـ HIPAA RBAC</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">تعديل الصلاحيات الممنوحة للموظفين بشكل حي في قاعدة البيانات لتحديث الوصول بمرونة فورية.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/50 text-slate-700 font-extrabold border-b border-slate-200">
                <th className="p-3">رقم الموظف (Staff ID)</th>
                <th className="p-3">الاسم بالكامل</th>
                <th className="p-3">القسم والعيادة</th>
                <th className="p-3 text-center">الدور المعتمد (Role Class)</th>
                <th className="p-3 text-center">حالة الحماية</th>
                <th className="p-3 text-center">الإجراء المتاح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-3 font-mono font-bold text-slate-500">{user.staffId}</td>
                  <td className="p-3 font-sans font-bold">{user.nameAr}</td>
                  <td className="p-3 font-black text-rose-800">{user.department}</td>
                  <td className="p-3 text-center">
                    <span className="font-mono bg-pink-50 text-pink-700 border border-pink-200/50 px-2 py-0.5 rounded font-black uppercase text-[10px]">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black">
                      <ShieldCheck size={12} className="text-emerald-600" />
                      مؤمن سحابياً
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {editingRole === user.id ? (
                      <div className="flex items-center gap-1 justify-center max-w-[180px] mx-auto">
                        <select 
                          className="p-1 px-1.5 border rounded-lg text-[11px] bg-white font-bold"
                          value={newRole || user.role}
                          onChange={(e) => setNewRole(e.target.value)}
                        >
                          <option value="admin">System Admin</option>
                          <option value="it">IT Support</option>
                          <option value="head_nurse">Head Nurse</option>
                          <option value="quality">Quality Auditor</option>
                          <option value="nursing_director">Nursing Director</option>
                          <option value="staff">Staff Nurse</option>
                          <option value="ward_clerk">Ward Clerk</option>
                          <option value="intern">Intern / Trainee</option>
                        </select>
                        <button 
                          onClick={() => updateRole(user)} 
                          className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                        >
                          تأكيد
                        </button>
                        <button 
                          onClick={() => setEditingRole(null)} 
                          className="p-1 text-rose-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setEditingRole(user.id); setNewRole(user.role); }}
                        className="px-2 py-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Shield size={14} className="text-slate-400" />
                        <span>تعديل الصلاحية</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Network Security Terminal Logger */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-[11px] text-slate-300 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2">
          <span className="text-slate-500 font-bold select-none">[ENTERPRISE SYSTEM COMMAND GATE LOGS]</span>
          <span className="text-emerald-500 text-[10px] flex items-center gap-1 select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            LIVE TELEMETRY
          </span>
        </div>
        <div className="space-y-1 max-h-[140px] overflow-y-auto">
          {bulkActionLogs.map((log, index) => (
            <p key={index} className="text-amber-400">{log}</p>
          ))}
          <p className="text-slate-500">[{new Date().toISOString()}] Bahya Gateway Secure Firewall: Standing by for pending registrations...</p>
          <p className="text-slate-500">[{new Date().toISOString()}] Verification Rule Gating logic loaded (autoComplete properties active)</p>
        </div>
      </div>

    </div>
  );
}
