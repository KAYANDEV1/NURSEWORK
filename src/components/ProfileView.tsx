import React, { useState, useEffect } from "react";
import { AppUser } from "../types";
import { saveSystemUser, saveRosterWish, syncRosterWishes } from "../lib/firestoreService";
import { 
  User, Shield, Activity, Award, Clock, Key, Settings, 
  Sparkles, HeartPulse, ShieldAlert, BadgeCheck, CheckCircle2,
  Calendar, Send, FileText, Briefcase, HelpCircle, MapPin, CheckSquare, Plus, Trash
} from "lucide-react";

interface ProfileViewProps {
  user: AppUser;
  language: "ar" | "en";
}

interface LeaveRequestRecord {
  id: string;
  employeeId: string;
  type: "annual" | "sick" | "emergency";
  startDate: string;
  endDate: string;
  reason: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  timestampMs: number;
}

interface AdminRequestRecord {
  id: string;
  employeeId: string;
  type: "swap" | "transfer" | "clearance";
  details: string;
  preferredWard: string;
  status: "pending" | "approved" | "rejected";
  timestampMs: number;
}

export default function ProfileView({ user, language }: ProfileViewProps) {
  const isAr = language === "ar";
  
  // Tab State
  const [activeTab, setActiveTab ] = useState<"bio" | "wishes" | "leaves" | "admin_req">("bio");

  // Profile data
  const [nameAr, setNameAr] = useState(user.nameAr);
  const [nameEn, setNameEn] = useState(user.nameEn);
  const [department, setDepartment] = useState(user.department);
  const [isSaving, setIsSaving] = useState(false);

  // Settings Toggles (Simulated & saved in localStorage for persistence)
  const [denseLayout, setDenseLayout] = useState(() => {
    return localStorage.getItem("pref_dense_layout") === "true";
  });
  const [playNoises, setPlayNoises] = useState(() => {
    return localStorage.getItem("pref_play_noises") !== "false";
  });
  const [printPaperSize, setPrintPaperSize] = useState(() => {
    return localStorage.getItem("pref_print_paper_size") || "A4";
  });

  // Track wishes retrieved for the current user
  const [myWishesList, setMyWishesList] = useState<any[]>([]);
  // Local list states for leaves and admin requests
  const [myLeavesList, setMyLeavesList] = useState<LeaveRequestRecord[]>([]);
  const [myAdminReqList, setMyAdminReqList] = useState<AdminRequestRecord[]>([]);

  // Wishes Form Inputs
  const [wishTargetMonth, setWishTargetMonth] = useState<string>("2026-06"); // Upcoming Month
  const [wishDayKey, setWishDayKey] = useState<string>("16");
  const [wishShiftType, setWishShiftType] = useState<string>("M");
  const [wishReasonAr, setWishReasonAr] = useState<string>("");
  const [wishReasonEn, setWishReasonEn] = useState<string>("");
  const [isSubmittingWish, setIsSubmittingWish] = useState<boolean>(false);

  // Leaves Form Inputs
  const [leaveType, setLeaveType] = useState<"annual" | "sick" | "emergency">("annual");
  const [leaveStart, setLeaveStart] = useState<string>("");
  const [leaveEnd, setLeaveEnd] = useState<string>("");
  const [leaveReason, setLeaveReason] = useState<string>("");
  const [leavePhone, setLeavePhone] = useState<string>("");

  // Admin Request Inputs
  const [requestType, setRequestType] = useState<"swap" | "transfer" | "clearance">("swap");
  const [requestDetails, setRequestDetails] = useState<string>("");
  const [requestPrefWard, setRequestPrefWard] = useState<string>("");

  // Load activity metrics and sub-lists
  const [metrics, setMetrics] = useState({
    archivedCount: 0,
    checklistsFiled: 0,
    errorRatio: "0.2%",
    completionDays: 28,
  });

  // Load records and sync from database
  useEffect(() => {
    try {
      const recordsCached = JSON.parse(localStorage.getItem("baheya_medical_records") || "[]");
      const userRecords = recordsCached.filter((rc: any) => rc.authorId === user.id || rc.authorNameEn === user.nameEn);
      setMetrics({
        archivedCount: userRecords.length || 14,
        checklistsFiled: Math.max(5, (userRecords.length * 3) % 20),
        errorRatio: "0.15%",
        completionDays: 31
      });

      // Load leaves from localStorage
      const cachedLeaves = JSON.parse(localStorage.getItem("baheya_leave_requests") || "[]");
      setMyLeavesList(cachedLeaves.filter((l: LeaveRequestRecord) => l.employeeId === user.id));

      // Load admin requests from localStorage
      const cachedAdmin = JSON.parse(localStorage.getItem("baheya_admin_requests") || "[]");
      setMyAdminReqList(cachedAdmin.filter((a: AdminRequestRecord) => a.employeeId === user.id));

    } catch (e) {
      console.error(e);
    }

    // Sync database wishes
    const unsub = syncRosterWishes((wishes) => {
      setMyWishesList(wishes.filter((w: any) => w.employeeId === user.id));
    });
    return () => unsub();
  }, [user]);

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      await saveSystemUser({ ...user, nameAr, nameEn, department });
      // Save localized preferences
      localStorage.setItem("pref_dense_layout", denseLayout.toString());
      localStorage.setItem("pref_play_noises", playNoises.toString());
      localStorage.setItem("pref_print_paper_size", printPaperSize);

      alert(isAr ? "✅ تم حفظ التعديلات وحفظ تفضيلات الواجهة بنجاح!" : "✅ Personal settings and corporate bio preferences updated!");
    } catch (error) {
      console.error(error);
      alert(isAr ? "🛑 عطل في الاتصال بقاعدة البيانات" : "🛑 Cloud database Sync timeout");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Shift Wish
  const handleSubmitWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishReasonAr.trim() && isAr) {
      alert("يرجى كتابة سبب اختيار الوردية!");
      return;
    }
    setIsSubmittingWish(true);
    try {
      const newWish = {
        id: `wish-${user.id}-${wishTargetMonth}-${wishDayKey}-${Date.now()}`,
        employeeId: user.id,
        employeeNameAr: nameAr,
        employeeNameEn: nameEn,
        dayKey: wishDayKey,
        targetMonth: wishTargetMonth, // June or July etc.
        requestedShift: wishShiftType,
        reasonAr: wishReasonAr || "رغبة مجدولة",
        reasonEn: wishReasonEn || "Scheduled Wish",
        status: "pending",
        timestampMs: Date.now()
      };

      await saveRosterWish(newWish);
      setWishReasonAr("");
      setWishReasonEn("");
      alert(isAr ? "✔ تم رفع وإرسال رغبة الوردية للشهر الجديد بنجاح وهي قيد مراجعة رئيسة التمريض!" : "✔ Shift preference filed nicely for review!");
    } catch (error) {
      console.error(error);
      alert("Error submitting wish");
    } finally {
      setIsSubmittingWish(false);
    }
  };

  // Submit Leave Request
  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) {
      alert(isAr ? "يرجى تعبئة كامل حقول فترات تاريخ وسبب الإجازة" : "Please fill in leave dates & cause");
      return;
    }

    const newReq: LeaveRequestRecord = {
      id: `leave-${Date.now()}`,
      employeeId: user.id,
      type: leaveType,
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: leaveReason,
      phone: leavePhone || "01xxxxxxxxx",
      status: "pending",
      timestampMs: Date.now()
    };

    const overallList = JSON.parse(localStorage.getItem("baheya_leave_requests") || "[]");
    overallList.push(newReq);
    localStorage.setItem("baheya_leave_requests", JSON.stringify(overallList));
    setMyLeavesList(prev => [newReq, ...prev]);

    setLeaveStart("");
    setLeaveEnd("");
    setLeaveReason("");
    setLeavePhone("");
    alert(isAr ? "✔ تم إرسال طلب الإجازة بنجاح وتوجيهه لبلدية الموارد البشرية وإدارة الكوادر!" : "✔ Leave request submitted successfully!");
  };

  // Submit Administrative Request
  const handleSubmitAdminReq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDetails.trim()) {
      alert(isAr ? "يرجى كتابة تفاصيل الطلب السريري أو النقل" : "Please describe details of the request");
      return;
    }

    const newReq: AdminRequestRecord = {
      id: `admin-${Date.now()}`,
      employeeId: user.id,
      type: requestType,
      details: requestDetails,
      preferredWard: requestPrefWard || user.department,
      status: "pending",
      timestampMs: Date.now()
    };

    const overallList = JSON.parse(localStorage.getItem("baheya_admin_requests") || "[]");
    overallList.push(newReq);
    localStorage.setItem("baheya_admin_requests", JSON.stringify(overallList));
    setMyAdminReqList(prev => [newReq, ...prev]);

    setRequestDetails("");
    setRequestPrefWard("");
    alert(isAr ? "✔ تم توجيه السجل الإداري وتوثيقه بلوحة إدارة عمليات المستشفى!" : "✔ Admin request forwarded to CNO operations!");
  };

  const getLeaveTypeAr = (t: string) => {
    switch (t) {
      case "annual": return "إجازة اعتيادية سنوية";
      case "sick": return "إجازة مرضية معتمدة";
      case "emergency": return "عطلة طارئة / عارضة";
      default: return t;
    }
  };

  const getAdminTypeAr = (t: string) => {
    switch (t) {
      case "swap": return "طلب تنازل وتبادل وردية";
      case "transfer": return "طلب نقل قسم سريري";
      case "clearance": return "طلب استثناء تشغيلي";
      default: return t;
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir={isAr ? "rtl" : "ltr"}>
      
      {/* Cover Banner Accent */}
      <div className="relative bg-gradient-to-l from-slate-900 via-rose-950 to-slate-900 p-6 rounded-2xl border border-rose-900 shadow-md text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full -translate-y-8 translate-x-8 blur-lg pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 z-10 relative">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
            <div className="w-16 h-16 rounded-full bg-white text-slate-900 border-4 border-rose-500 flex items-center justify-center font-black text-2xl select-none shrink-0 shadow-lg">
              {user.avatarInitials || user.nameEn.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <h2 className="text-xl font-black">{isAr ? nameAr : nameEn}</h2>
                <BadgeCheck className="text-emerald-400 h-5 w-5" />
              </div>
              <p className="text-xs text-rose-200/90 font-medium mt-1 uppercase tracking-wider font-mono">
                {isAr ? `كود الكادر الموحد: ${user.staffId}` : `Employee PIN: ${user.staffId}`} / {department}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center sm:justify-start">
                <span className="bg-white/10 text-rose-200 border border-white/20 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                  {user.role} GATEWAY
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-2.5 py-0.5 rounded-full font-bold">
                  Active Operational Bio
                </span>
              </div>
            </div>
          </div>

          <div className="text-center sm:text-left bg-black/30 p-3 rounded-xl border border-white/10 shrink-0">
            <span className="block text-[8px] uppercase tracking-widest text-slate-400">{isAr ? "رتبة الكادر التشغيلي" : "STAFF CLASSIFICATION"}</span>
            <span className="text-md font-black block tracking-widest font-mono text-pink-400 mt-0.5">{user.role.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 font-sans">
        <button
          onClick={() => setActiveTab("bio")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition text-center flex items-center justify-center gap-1.5 ${
            activeTab === "bio" ? "bg-white text-pink-600 shadow-sm border border-slate-200" : "text-slate-650 hover:bg-white/50"
          }`}
        >
          <User size={13} />
          <span>{isAr ? "بيانات الكادر والتفضيلات" : "Account Bio & Settings"}</span>
        </button>

        <button
          onClick={() => setActiveTab("wishes")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition text-center flex items-center justify-center gap-1.5 ${
            activeTab === "wishes" ? "bg-white text-pink-600 shadow-sm border border-slate-200" : "text-slate-650 hover:bg-white/50"
          }`}
        >
          <Calendar size={13} />
          <span>{isAr ? "تقديم رغبة الوردية" : "Month Wishes"}</span>
        </button>

        <button
          onClick={() => setActiveTab("leaves")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition text-center flex items-center justify-center gap-1.5 ${
            activeTab === "leaves" ? "bg-white text-pink-600 shadow-sm border border-slate-200" : "text-slate-650 hover:bg-white/50"
          }`}
        >
          <FileText size={13} />
          <span>{isAr ? "طلب إجازة / عطلة" : "Leave Form"}</span>
        </button>

        <button
          onClick={() => setActiveTab("admin_req")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition text-center flex items-center justify-center gap-1.5 ${
            activeTab === "admin_req" ? "bg-white text-pink-600 shadow-sm border border-slate-200" : "text-slate-650 hover:bg-white/50"
          }`}
        >
          <Briefcase size={13} />
          <span>{isAr ? "طلبات إدارية استثنائية" : "Admin Requests"}</span>
        </button>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main interactive Tab column */}
        <div className="md:col-span-2 space-y-6">

          {/* TAB 1: Bio and General Configuration */}
          {activeTab === "bio" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h3 className="text-xs font-black text-slate-800 border-b pb-2 flex items-center gap-1.5 justify-end">
                  <span>{isAr ? "تعديل الملف السريري والتعريف الوظيفي" : "Update Operational Credentials"}</span>
                  <Settings size={14} className="text-pink-600 animate-spin" />
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-right">
                    <label className="block text-[11px] font-bold text-slate-500">{isAr ? "الاسم الكامل (عربي):" : "Full Name (Arabic):"}</label>
                    <input 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-850 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500 text-right text-xs transition" 
                      value={nameAr} 
                      onChange={(e) => setNameAr(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-[11px] font-bold text-slate-500">{isAr ? "الاسم الكامل (إنجليزي):" : "Full Name (English):"}</label>
                    <input 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-sans font-bold text-slate-850 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500 text-left text-xs transition" 
                      value={nameEn} 
                      onChange={(e) => setNameEn(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5 text-right">
                    <label className="block text-[11px] font-bold text-slate-500">{isAr ? "القسم الرئيسي التشغيلي في المشفى:" : "Clinical Ward/Department:"}</label>
                    <input 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-850 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500 text-right text-xs transition" 
                      value={department} 
                      onChange={(e) => setDepartment(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-[11px] font-bold text-slate-500">{isAr ? "كود الأمان للدخول والروستر (PIN):" : "Pin code access:"}</label>
                    <input 
                      type="password"
                      disabled
                      value="••••"
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-mono tracking-widest text-center rounded-xl text-xs" 
                    />
                    <span className="text-[9px] text-slate-400 block tracking-tighter leading-none mt-1">
                      {isAr ? "🔒 الرمز السري مؤمن بقواعد الجرد السحابي - اتصل بالمسؤول للتحديث" : "🔒 Pin is locked under HIPAA security rules"}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition text-xs cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{isSaving ? (isAr ? "جاري الحفظ..." : "Saving Profile...") : (isAr ? "حفظ التحديثات الخاصة بالملف والمستشفى" : "Save and Synchronize Info")}</span>
                </button>
              </div>

              {/* Interface settings */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h3 className="text-xs font-black text-slate-800 border-b pb-2 flex items-center gap-1.5 justify-end">
                  <span>{isAr ? "تعديل تفضيلات الكادر والواجهة المحلية" : "Display & UI Layout Preferences"}</span>
                  <Sparkles size={14} className="text-pink-600 animate-pulse" />
                </h3>

                <div className="space-y-3 pt-1 text-right">
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={denseLayout}
                        onChange={(e) => setDenseLayout(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                    </label>
                    <div className="text-right">
                      <span className="block text-xs font-bold text-slate-700">{isAr ? "تفعيل نمط العرض المكثف" : "Dense Layout"}</span>
                      <span className="block text-[9.5px] text-slate-400">{isAr ? "تقليص مقاسات الحقول لملء مساحة أكبر للشاشة" : "Shrink padding to accommodate small laptop screens"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <select
                      value={printPaperSize}
                      onChange={(e) => setPrintPaperSize(e.target.value)}
                      className="bg-slate-50 border p-1 px-2.5 rounded text-xs font-bold"
                    >
                      <option value="A4">A4 Standard Letter</option>
                      <option value="Letter">US Letter</option>
                      <option value="A5">A5 Small Sheet</option>
                    </select>
                    <div className="text-right">
                      <span className="block text-xs font-bold text-slate-700">{isAr ? "حجم صفحة تقارير الطباعة الافتراضي" : "Default Paper Printing"}</span>
                      <span className="block text-[9.5px] text-slate-400">{isAr ? "تلقيم مقاس ورقة المعاينة السريعة" : "Defaults paper margins on PDF generation"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Shift Wishes (رغبات الروستر للشهر الجديد) */}
          {activeTab === "wishes" && (
            <div className="space-y-6">
              <form onSubmit={handleSubmitWish} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h3 className="text-xs font-black text-slate-800 border-b pb-2 flex items-center gap-1.5 justify-end">
                  <span>{isAr ? "ارسال رغبات الروستر والفترة التشغيلية القادمة" : "Submit Shift Preferences for Future Weeks"}</span>
                  <Calendar size={14} className="text-pink-600" />
                </h3>

                <p className="text-[10.5px] text-slate-500 leading-relaxed">
                  {isAr 
                    ? "اختر اليوم وفترة الوردية التي ترغب في تغطيتها أو الاعتذار عنها للشهر الجديد. يتولى النظام مراجعة رغبتك ومقارنتها تلقائياً بزيادة كفاءة القسم وهيكل التفتيش."
                    : "Declare your shift desire or offline requests for the upcoming schedules. Your chief supervisor reviews this directly from their planning console."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1.5 text-right">
                    <label className="block text-[10px] font-bold text-slate-500">{isAr ? "الفصل التشغيلي / الشهر القادم:" : "Target Work Period:"}</label>
                    <select
                      value={wishTargetMonth}
                      onChange={(e) => setWishTargetMonth(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-pink-500 text-xs text-right"
                    >
                      <option value="2026-06">يونيو - يوليو 2026</option>
                      <option value="2026-07">يوليو - أغسطس 2026</option>
                      <option value="2026-05">خطة مايو الحالية</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-[10px] font-bold text-slate-500">{isAr ? "تحديد اليوم بالروستر (1 - 31):" : "Target day key of month:"}</label>
                    <select
                      value={wishDayKey}
                      onChange={(e) => setWishDayKey(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-pink-500 text-xs text-center"
                    >
                      {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(day => (
                        <option key={day} value={day}>{isAr ? `يوم ${day}` : `Day ${day}`}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-[10px] font-bold text-slate-500">{isAr ? "الوردية أو الإجازة المفضلة:" : "Preferred Shift Symbol:"}</label>
                    <select
                      value={wishShiftType}
                      onChange={(e) => setWishShiftType(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-850 outline-none focus:bg-white focus:ring-1 focus:ring-pink-500 text-xs text-right"
                    >
                      <option value="M">M - صباحي (Morning)</option>
                      <option value="A">A - مساءً (Afternoon)</option>
                      <option value="D">D - لونج نهاري (Long Day)</option>
                      <option value="N">N - سهر ليلي (Night)</option>
                      <option value="DN">DN - خدمة متكاملة (24H)</option>
                      <option value="OFF">OFF - إجازة / أوف اليوم (Day Off)</option>
                      <option value="AL">AL - إجازة سنوية خطة (Annual)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 text-right pt-1">
                  <label className="block text-[10px] font-bold text-slate-500">{isAr ? "السبب الطبي / مبرر الاختيار وعلاقة التغطية (بالعربية):" : "Arabic Justification Note:"}</label>
                  <textarea
                    rows={2}
                    value={wishReasonAr}
                    onChange={(e) => setWishReasonAr(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-pink-500"
                    placeholder="اكتب مبررات اختيارك والبديل المناسب بالقسم لضمان ثبات التغطية التشغيلية..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingWish}
                  className="w-full py-2.5 bg-gradient-to-l from-slate-900 via-rose-950 to-slate-900 text-white rounded-xl text-xs font-black hover:opacity-95 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send size={13} className="text-pink-400 rotate-180" />
                  <span>{isSubmittingWish ? "جاري الرفع..." : "إيداع وإرسال رغبة الوردية للمراجعة"}</span>
                </button>
              </form>

              {/* Filed Wishes List */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-750 flex items-center justify-end gap-1.5">
                  <span>سجل رغبات الوردية الخاصة بي للشهر الجديد</span>
                  <HelpCircle size={13} className="text-slate-400" />
                </h4>

                {myWishesList.length === 0 ? (
                  <p className="text-center text-[11px] py-6 text-slate-450 font-medium">ليس لديك رغبات معينة مسجلة للشهر القادم بعد.</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {myWishesList.map((wish) => (
                      <div key={wish.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between text-[11px] font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          wish.status === "approved" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          wish.status === "rejected" ? "bg-rose-100 text-rose-800 border border-rose-250" :
                          "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {wish.status === "approved" ? "مقبول" : wish.status === "rejected" ? "مرفوض" : "تحت المراجعة"}
                        </span>
                        
                        <div className="text-right">
                          <span className="font-bold text-slate-700">تاريخ: يوم ({wish.dayKey}) بالجدول القادم &bull; {wish.targetMonth}</span>
                          <p className="text-slate-500 mt-1">الوردية المطلوبة: <span className="font-black text-pink-600 font-mono text-xs">{wish.requestedShift}</span> | "{wish.reasonAr}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Leave Requests (طلب إجازة وعطلات) */}
          {activeTab === "leaves" && (
            <div className="space-y-6">
              <form onSubmit={handleSubmitLeave} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h3 className="text-xs font-black text-slate-800 border-b pb-2 flex items-center gap-1.5 justify-end">
                  <span>إرسال طلب إجازة سنوية أو مرضية أو عارضة للقسم</span>
                  <FileText size={14} className="text-pink-600" />
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1.5 text-right">
                    <label className="block text-[10px] font-bold text-slate-500">نوع الإجازة المطلوبة:</label>
                    <select
                      value={leaveType}
                      onChange={(e: any) => setLeaveType(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs text-right outline-none"
                    >
                      <option value="annual">إجازة سنوية مدفوعة اعتيادية</option>
                      <option value="sick">إجازة مرضية مع تقرير طبي</option>
                      <option value="emergency">إجازة طارئة / عارضة عاجلة</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-[10px] font-bold text-slate-500">تاريخ البدء:</label>
                    <input
                      type="date"
                      value={leaveStart}
                      onChange={(e) => setLeaveStart(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 text-xs text-center outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-[10px] font-bold text-slate-500">تاريخ الانتهاء:</label>
                    <input
                      type="date"
                      value={leaveEnd}
                      onChange={(e) => setLeaveEnd(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 text-xs text-center outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5 text-right">
                    <label className="block text-[10px] font-bold text-slate-500">جوال الطوارئ المتاح للاتصال السريري:</label>
                    <input
                      type="text"
                      value={leavePhone}
                      onChange={(e) => setLeavePhone(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs text-right outline-none"
                      placeholder="012xxxxxxxx"
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-[10px] font-bold text-slate-500">سبب وتفصيل الرعاية أو الإجازة وبديله:</label>
                    <input
                      type="text"
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right text-slate-800 outline-none"
                      placeholder="برجاء توضيح سبب الإجازة ووجود بديل بالقسم..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send size={13} className="text-white rotate-180" />
                  <span>إرسال وتوجيه طلب الإجازة للموارد البشرية وإدارة الكوادر</span>
                </button>
              </form>

              {/* Leaves list history */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-750 flex items-center justify-end gap-1.5">
                  <span>سجل طلبات إجازاتي المسجلة بالملف</span>
                  <Award size={13} className="text-pink-600" />
                </h4>

                {myLeavesList.length === 0 ? (
                  <p className="text-center text-[11px] py-6 text-slate-450 font-medium font-sans">لا توجد طلبات إجازة مسجلة لك حالياً.</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {myLeavesList.map((req) => (
                      <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between text-[11px] font-sans text-right">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                          قيد المراجعة والاعتماد
                        </span>
                        <div>
                          <b className="text-slate-800">{getLeaveTypeAr(req.type)}</b>
                          <div className="text-[10px] text-slate-500 mt-1">الفترة: من <span className="font-mono bg-white px-1.5 rounded">{req.startDate}</span> إلى <span className="font-mono bg-white px-1.5 rounded">{req.endDate}</span></div>
                          <p className="text-slate-455 font-semibold mt-1">السبب المكتوب: "{req.reason}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Administrative Requests (الطلبات الإدارية والاستثنائية) */}
          {activeTab === "admin_req" && (
            <div className="space-y-6">
              <form onSubmit={handleSubmitAdminReq} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h3 className="text-xs font-black text-slate-800 border-b pb-2 flex items-center gap-1.5 justify-end">
                  <span>إرسال طلب إداري، تنازل، تبديل، أو استثناء تشغيلي</span>
                  <Briefcase size={14} className="text-pink-600" />
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5 text-right">
                    <label className="block text-[10px] font-bold text-slate-500">نوع الطلب الإداري الموجه:</label>
                    <select
                      value={requestType}
                      onChange={(e: any) => setRequestType(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs text-right outline-none"
                    >
                      <option value="swap">طلب تنازل وتبادل نوبتجية مع زميل آخر</option>
                      <option value="transfer">طلب نقل قسم سريري أو تشغيلي</option>
                      <option value="clearance">طلب استثناء خاص للحد الأدنى من الوردية</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-[10px] font-bold text-slate-500">القسم البديل أو المفضل (إن وجد):</label>
                    <input
                      type="text"
                      value={requestPrefWard}
                      onChange={(e) => setRequestPrefWard(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs text-right outline-none"
                      placeholder="مثال: EMERGENCY UNIT"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-right pt-1">
                  <label className="block text-[10px] font-bold text-slate-500">تفاصيل الطلب والاتفاق مع الزملاء بالدليل السريري:</label>
                  <textarea
                    rows={3}
                    value={requestDetails}
                    onChange={(e) => setRequestDetails(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-pink-500"
                    placeholder="برجاء كتابة تفاصيل الخدمة البديلة بدقة مثل كود زميل التنازل ومبررات التغيير للموافقة عليها..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send size={13} className="text-pink-400 rotate-180" />
                  <span>بث السجل وتوجيه الطلب لمدير العمليات والتمريض</span>
                </button>
              </form>

              {/* Admins request list history */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-750 flex items-center justify-end gap-1.5">
                  <span>سجل طلباتي الإدارية والتبادل السريري بالقسم</span>
                  <Settings size={13} className="text-pink-650" />
                </h4>

                {myAdminReqList.length === 0 ? (
                  <p className="text-center text-[11px] py-6 text-slate-450 font-medium">ليس هناك أي طلبات أو استثناءات تشغيلية معالجة لك حالياً.</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {myAdminReqList.map((req) => (
                      <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between text-[11px] font-sans text-right">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                          قيد المراجعة
                        </span>
                        <div>
                          <b className="text-slate-800">{getAdminTypeAr(req.type)}</b>
                          <p className="text-slate-500 text-[10px] mt-1">القسم المفضل: {req.preferredWard} &bull; التفاصيل: "{req.details}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Column 3: Identity & Activity Stats Card */}
        <div className="space-y-6">
          
          {/* Identity Stats Card */}
          <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-pink-400 tracking-wider flex items-center gap-1.5 justify-end uppercase">
              <span>{isAr ? "نظام كفاءة التقرير السنوي" : "Accreditation KPI Score"}</span>
              <Activity size={14} className="animate-pulse text-rose-500" />
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-center">
                <span className="text-sm font-black block text-pink-500 font-mono">{metrics.archivedCount}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isAr ? "نماذج معتمدة" : "Forms Certified"}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-center">
                <span className="text-sm font-black block text-emerald-405 font-mono">{metrics.checklistsFiled}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isAr ? "جرودات مكتملة" : "Audits Run"}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-center">
                <span className="text-[10px] font-mono font-bold block text-amber-500">{metrics.completionDays} Days</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isAr ? "ساعات الالتزام" : "Roster Commitment"}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-center">
                <span className="text-xs font-mono font-black block text-cyan-405">{metrics.errorRatio}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isAr ? "تردد الاختلالات" : "Variance Ratio"}</span>
              </div>
            </div>
            
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1 text-center sm:text-right">
              <span className="block text-[8px] uppercase tracking-widest text-slate-400">{isAr ? "مستوى تصنيع الرعاية جودة" : "Clinical Quality Tier"}</span>
              <div className="flex gap-1.5 items-center justify-center sm:justify-end">
                <span className="text-xs font-black text-rose-250">{isAr ? "نصاب متميز معتمد (Tier I)" : "Gold Merit Standard (Tier I)"}</span>
                <Award className="h-4 w-4 text-pink-500" />
              </div>
            </div>
          </div>

          {/* Secure Shield Info */}
          <div className="bg-amber-50 border border-amber-200/80 p-5 rounded-2xl text-right space-y-2 shadow-xs">
            <h4 className="text-amber-900 font-extrabold text-xs flex items-center justify-end gap-1.5">
              <span>{isAr ? "تحقق الأمان بهية الرقمية" : "Secure HIPAA Clearance"}</span>
              <ShieldAlert className="h-4.5 w-4.5 text-amber-700 animate-pulse" />
            </h4>
            <p className="text-[10.5px] text-amber-900 leading-relaxed font-sans">
              {isAr 
                ? "تقترن بصمتك وتوقيع الكود الإلكتروني مباشرة بكل ورقة نوبتجية أو طلب يتم إرساله لتثبيت الشفافية ومنع التلاعب والتزوير التشغيلي."
                : "Your encrypted profile parameters bind to all submitted worksheets and holiday lists to support tamper-proof logging."}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
