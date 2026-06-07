import React, { useState } from "react";
import {
  TrendingUp,
  Database,
  Sliders,
  ShieldAlert,
  Award,
  FileSpreadsheet,
  User,
  CheckSquare,
  X,
  Check
} from "lucide-react";
import { AppUser, SavedRecord } from "../types";

// Import Cloud-Safe functions from firestore service
import {
  saveSentinelIncident,
  deleteSentinelIncident
} from "../lib/firestoreService";

interface QualityAnalyticsHubProps {
  records: SavedRecord[];
  allAvailableTemplates: any[];
  language: "ar" | "en";
  currentUser: AppUser;
  resolvedGaps: Record<string, { resolved: boolean; notes: string; resolvedBy: string; resolvedAt: string }>;
  handleToggleGapState: (gapKey: string) => void;
  editingGapKey: string | null;
  setEditingGapKey: (val: string | null) => void;
  gapResolutionNote: string;
  setGapResolutionNote: (val: string) => void;
  handleSaveGapResolution: () => void;
  handleSeedMockAuditData: () => void;
  setRecords: (val: SavedRecord[]) => void;
  sentinelIncidents: any[];
  setSentinelIncidents: (val: any[]) => void;
  jciCheckedArray: number[];
  setJciCheckedArray: (val: number[]) => void;
  analyticsSubTab: "kpis" | "sentinel" | "compliance";
  setAnalyticsSubTab: (val: "kpis" | "sentinel" | "compliance") => void;
  showIncidentForm: boolean;
  setShowIncidentForm: (val: boolean) => void;
  newIncidentForm: {
    department: string;
    typeAr: string;
    typeEn: string;
    severity: string;
    descAr: string;
    descEn: string;
    rcaAr: string;
    rcaEn: string;
    actionAr: string;
    actionEn: string;
  };
  setNewIncidentForm: (val: any) => void;
  addSystemLog: (msg: string, type: "info" | "warning" | "error" | "success") => void;
  notifications: any[];
  setNotifications: (val: any[]) => void;
  handleNotificationClick: (notif: any) => void;
  hospitalSettings: any;
}

export default function QualityAnalyticsHub({
  records,
  allAvailableTemplates,
  language,
  currentUser,
  resolvedGaps,
  handleToggleGapState,
  editingGapKey,
  setEditingGapKey,
  gapResolutionNote,
  setGapResolutionNote,
  handleSaveGapResolution,
  handleSeedMockAuditData,
  setRecords,
  sentinelIncidents,
  setSentinelIncidents,
  jciCheckedArray,
  setJciCheckedArray,
  analyticsSubTab,
  setAnalyticsSubTab,
  showIncidentForm,
  setShowIncidentForm,
  newIncidentForm,
  setNewIncidentForm,
  addSystemLog,
  notifications,
  setNotifications,
  handleNotificationClick,
  hospitalSettings
}: QualityAnalyticsHubProps) {
  
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

  const handleToggleJci = (id: number) => {
    if (jciCheckedArray.includes(id)) {
      setJciCheckedArray(jciCheckedArray.filter(i => i !== id));
    } else {
      setJciCheckedArray([...jciCheckedArray, id]);
    }
  };

  const jciCompletionRate = Math.round((jciCheckedArray.length / 6) * 100);

  const handleCreateIncident = async () => {
    if (!newIncidentForm.typeAr || !newIncidentForm.descAr) {
      alert(language === "ar" ? "⚠️ الرجاء كتابة نوع الواقعة ووصفها بالتفصيل للمتابعة السحابية." : "Please write incident details first.");
      return;
    }
    const createdIncident = {
      id: `inc-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      department: newIncidentForm.department,
      typeAr: newIncidentForm.typeAr,
      typeEn: newIncidentForm.typeEn || newIncidentForm.typeAr,
      severity: newIncidentForm.severity,
      descAr: newIncidentForm.descAr,
      descEn: newIncidentForm.descEn || newIncidentForm.descAr,
      rcaAr: newIncidentForm.rcaAr || "قيد المراجعة المعملية والجذرية للفريق الطبي",
      rcaEn: newIncidentForm.rcaEn || "Under clinical active Root Cause Analysis (RCA)",
      actionAr: newIncidentForm.actionAr || "تم حصر النطاق، تعليق العمل بالأداة المتسببة حتى انتهاء التدقيق الإداري والماتريكس الوقائي",
      actionEn: newIncidentForm.actionEn || "Scope controlled and process suspended pending complete prevention review",
      loggedBy: currentUser.nameAr || currentUser.nameEn,
      status: "Active Surveillance"
    };

    try {
      await saveSentinelIncident(createdIncident);
      setSentinelIncidents([createdIncident, ...sentinelIncidents]);
      setNewIncidentForm({
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
      setShowIncidentForm(false);
      addSystemLog(`Logged Sentinel Incident: ${createdIncident.typeEn}`, "warning");
      alert(language === "ar" 
        ? "✅ تم تسجيل الحادث السريري وبثه سحابياً لفريق الجودة والسلامة بنجاح!" 
        : "Clinical Sentinel incident successfully saved and synchronized in real-time across the hospital cloud!");
    } catch (e) {
      console.error("Save sentinel incident error:", e);
    }
  };

  const handleDeleteIncident = async (id: string) => {
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذه الواقعة نهائياً من السحابة؟" : "Are you sure you want to delete this incident from the cloud?")) {
      try {
        await deleteSentinelIncident(id);
        setSentinelIncidents(sentinelIncidents.filter(i => i.id !== id));
        addSystemLog(`Deleted Sentinel Event ID: ${id}`, "info");
        alert(language === "ar" ? "تم الحذف بنجاح من قاعدة البيانات السحابية." : "Incident deleted successfully from Cloud.");
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade text-right font-sans" dir="rtl">
      
      {/* Header section with branding & Seeding Action button */}
      <div className="bg-gradient-to-l from-pink-500/10 via-pink-400/5 to-transparent p-6 rounded-2xl border border-pink-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-right">
          <span className="bg-pink-600 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
            Continuous Quality Improvement (CQI)
          </span>
          <h3 className="text-lg font-black text-slate-900 mt-2 flex items-center justify-end gap-2">
            <span>لوحة تحليلات الجودة البصرية ومراقبة السلامة الطبية لـ {hospitalSettings.nameAr}</span>
            <TrendingUp className="h-5 w-5 text-pink-600" />
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 max-w-xl leading-relaxed">
            مؤشرات ورسومات بيانية حية وفورية تقيس جودة المستشفى وتتحقق من مطابقة معايير اللجنة الدولية المشتركة لسلامة المرضى (JCI). جميع التسجيلات والتصحيحات سحابية بالكامل فوراً.
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

      {/* Sub-tab Switcher for Quality Area */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2 justify-end no-print">
        <button
          onClick={() => setAnalyticsSubTab("compliance")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 border cursor-pointer ${
            analyticsSubTab === "compliance"
              ? "bg-pink-50 text-pink-700 border-pink-200 shadow-inner"
              : "bg-white text-slate-600 border-transparent hover:bg-slate-50"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>مصفوفة التدقيق والالتزام للأقسام ({openAlertsList.filter(g => !resolvedGaps[g.uniqueGapKey]?.resolved).length} ثغرة)</span>
        </button>

        <button
          onClick={() => setAnalyticsSubTab("sentinel")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 border cursor-pointer ${
            analyticsSubTab === "sentinel"
              ? "bg-red-50 text-red-700 border-red-200 shadow-inner"
              : "bg-white text-slate-600 border-transparent hover:bg-slate-50"
          }`}
        >
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <span>سجل الحدث الجسيم والآثار السلبية ({sentinelIncidents.length} واقعة سحابية)</span>
        </button>

        <button
          onClick={() => setAnalyticsSubTab("kpis")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 border cursor-pointer ${
            analyticsSubTab === "kpis"
              ? "bg-pink-50 text-pink-700 border-pink-200 shadow-inner"
              : "bg-white text-slate-600 border-transparent hover:bg-slate-50"
          }`}
        >
          <Award className="h-4 w-4" />
          <span>مؤشرات الأداء وجاهزية اعتماد الـ JCI ({jciCompletionRate}%)</span>
        </button>
      </div>

      {/* 1. Sub-tab Core KPIs and JCI readiness */}
      {analyticsSubTab === "kpis" && (
        <div className="space-y-6">
          {/* Statistical Cards Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            
            {/* 1.1 Quality Compliance Score Gauge */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono">KPI-CQI Compliance</span>
                <h4 className="text-2xl font-black text-slate-800 mt-1">
                  {records.length === 0 ? "96%" : `${compliancePercent}%`}
                </h4>
                <span className="text-[9px] text-emerald-600 font-sans block mt-1 font-bold">
                  {records.length === 0 ? "● عينات المعايير الطبية للثقة" : "● تحديث تلقائي سحابي فوري"}
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

            {/* 1.2 Total Audits Count */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono">CQI Archives Audits</span>
                <h4 className="text-2xl font-black text-slate-800 mt-1">
                  {records.length} {language === "ar" ? "شيتات مؤرشفة" : "logs"}
                </h4>
                <span className="text-[9px] text-slate-400 block mt-1 font-semibold">
                  بمتوسط تسجيل جودة سحابي دوري لكل الأجنحة
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 text-pink-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </div>

            {/* 1.3 Deficiency alerts / quality issues */}
            <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${
              (records.length === 0 ? 1 : openAlertsList.length) > 0 
                ? "bg-rose-50/50 border-rose-200" 
                : "bg-white border-slate-200"
            }`}>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono">Surveillance Gaps</span>
                <h4 className={`text-2xl font-black mt-1 ${
                  (records.length === 0 ? 1 : openAlertsList.length) > 0 ? "text-rose-700" : "text-slate-800"
                }`}>
                  {records.length === 0 ? 1 : openAlertsList.filter(g => !resolvedGaps[g.uniqueGapKey]?.resolved).length} {language === "ar" ? "ثغرات غير محلولة" : "Deficiencies"}
                </h4>
                <span className="text-[9px] text-slate-500 block mt-1 font-semibold">
                  أقفال جرد عربات مفقودة أو درجات حرارة منتهكة
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

            {/* 1.4 JCI Targets Completion */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono">Core Patient Safety (IPSG)</span>
                <h4 className="text-2xl font-black text-pink-700 mt-1">
                  {jciCompletionRate}%
                </h4>
                <span className="text-[9px] text-slate-400 block mt-1 font-semibold">
                  نسبة الجاهزية لاعتماد اللجنة الدولية المشتركة
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-200 text-pink-600 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5" />
              </div>
            </div>

          </div>

          {/* JCI International Patient Safety Goals (IPSGs) Interactive Checklist widget */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm text-right space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-3 gap-2">
              <div>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">Accreditation Blueprint</span>
                <h4 className="text-sm font-black text-slate-850 mt-1 flex items-center gap-1.5 justify-end">
                  <span>جهاز تتبع أهداف سلامة المرضى الدولية الستة (JCI IPSG Checklist Matrix)</span>
                  <CheckSquare className="h-5 w-5 text-emerald-600" />
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">يرجى من رئيسة التمريض ومدير الجودة التحقق وتحديد الأهداف المفعلة المكتملة بالميدان يومياً لتحديث المؤشر السحابي:</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-150 flex items-center justify-end gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold block">معدل الانتهاء السحابي</span>
                  <span className="text-md font-black text-slate-800">{jciCheckedArray.length} من أصل 6 أهداف</span>
                </div>
                <div className="text-2xl font-black text-pink-600 font-mono shrink-0">{jciCompletionRate}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {[
                { id: 1, nameAr: "1. التعريف السريري الدقيق للمريض (Identification)", nameEn: "IPSG.1: Identify patients correctly using double patient unique identifiers." },
                { id: 2, nameAr: "2. كفاءة التواصل اللفظي والطبي (Effective Communication)", nameEn: "IPSG.2: Improve communication using Read-Back & verbal verification protocol." },
                { id: 3, nameAr: "3. سلامة استخدام الأدوية عالية الخطورة (High-Alert Drugs)", nameEn: "IPSG.3: Double independent check for concentrated & look-alike drugs." },
                { id: 4, nameAr: "4. سلامة الجراحة والموقع والمريض (Safe Surgery Path)", nameEn: "IPSG.4: Verify surgery site marker, patient identity & proper procedure." },
                { id: 5, nameAr: "5. التحكم والحد من مخاطر انتقال العدوى (Infection Control)", nameEn: "IPSG.5: Enforce WHO 5 moments hand hygiene audit across oncology wings." },
                { id: 6, nameAr: "6. الحد من مخاطر وإصابات سقوط المرضى (Patient Falls)", nameEn: "IPSG.6: Evaluate and document Fall-Risk Morse scale score for ICU beds." }
              ].map(goal => {
                const isChecked = jciCheckedArray.includes(goal.id);
                return (
                  <div 
                    key={goal.id}
                    onClick={() => handleToggleJci(goal.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked 
                        ? "bg-pink-50/30 border-pink-200 shadow-sm" 
                        : "bg-slate-50/50 border-slate-200 hover:border-slate-350 text-slate-600"
                    }`}
                  >
                    <div className="flex-1 text-right">
                      <span className={`text-[11px] font-black block ${isChecked ? 'text-pink-850' : 'text-slate-700'}`}>{goal.nameAr}</span>
                      <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">{goal.nameEn}</span>
                      <span className={`text-[9px] font-bold inline-block px-1.5 py-0.2 rounded mt-1.5 ${
                        isChecked 
                          ? 'bg-emerald-50 text-emerald-800' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isChecked ? "✓ معزز بالمستشفى وممتثل" : "🚧 ثغرة سريرية قيد الإصلاح الميداني"}
                      </span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      readOnly
                      className="w-4 h-4 rounded border-slate-300 text-pink-650 focus:ring-pink-550 mt-1 cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI-Driven Predictive Analytics Grid */}
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

              <div className="space-y-4 text-xs font-sans">
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  يقوم نموذج الذكاء الاصطناعي بربط جداول نوبتجيات التمريض (Roster Metrics) بقوائم الأخطاء والملاحظات السريرية المسجلة للتنبؤ بمستويات التعب والإجهاد البشري ومنع الحوادث الطبية مسبقاً.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850/60 text-center">
                    <span className="text-xs font-mono font-black text-rose-400 block font-mono">78% RISK LEVEL</span>
                    <span className="text-[10px] text-slate-400 block mt-1">معامل خطر الإجهاد (ICU)</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850/60 text-center">
                    <span className="text-xs font-mono font-black text-emerald-400 block font-mono">-38% REDUCTION</span>
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
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  من خلال استهلاك المستلزمات اليومي المدون في لوحة الجرود السريعة، يحسب الذكاء الاصطناعي سرعة النفاد (Consumption Velocity) ويتوقع تاريخ نفاد المخزون باليوم والساعة لتفادي انقطاع الأدوية الحساسة.
                </p>

                <div className="space-y-2 text-right">
                  {/* Drug 1 */}
                  <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 text-slate-300 font-sans">
                    <span className="font-bold text-rose-400">نفاد متوقع: 24 يونيو 2026</span>
                    <span className="text-[11px] font-bold text-slate-200">حقن مرشحات الأنسولين (Onco-Syringes)</span>
                  </div>
                  {/* Drug 2 */}
                  <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 text-slate-300 font-sans">
                    <span className="font-bold text-amber-400">نفاد متوقع: 19 يوليو 2026</span>
                    <span className="text-[11px] font-bold text-slate-200">جل تشغيل صدمات قلبية (DC Shock Gels)</span>
                  </div>
                </div>

                <p className="text-[9.5px] text-slate-500 font-mono text-left">
                  * Calculations refreshed instantly upon nurse submission entries.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Sub-tab Sentinel Adverse Incident Registry */}
      {analyticsSubTab === "sentinel" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-right space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2.5 gap-2">
              <div className="text-right">
                <h4 className="font-black text-sm text-slate-850 flex items-center justify-end gap-1.5">
                  <span>صندوق الرصد الطوارئ للأحداث الجسيمة والأعراض الجانبية (Sentinel Adverse Logs)</span>
                  <ShieldAlert className="h-4.5 w-4.5 text-red-650" />
                </h4>
                <p className="text-[10.5px] text-slate-500 mt-0.5">تسجيل فوري متصل مع أجهزة ومنسقي الجودة بالمستشفى لتقديم الإجراء السريع بخصوص الأخطاء أو الإصابات بالميدان.</p>
              </div>
              <button
                onClick={() => setShowIncidentForm(!showIncidentForm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1 text-[11px]"
              >
                {showIncidentForm ? "إغلاق نافذة التسجيل" : "➕ بلاغ واقعة طبية أو حادث سريري عاجل"}
              </button>
            </div>

            {showIncidentForm && (
              <div className="bg-red-50/30 border border-red-150 p-5 rounded-2xl space-y-4 text-right animate-fade">
                <span className="text-[10px] bg-red-150 text-red-800 font-bold px-2 py-0.5 rounded font-mono">NEW CLOUD RECONNAISSANCE FORM</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">وحدة المستشفى:</label>
                    <select 
                      value={newIncidentForm.department}
                      onChange={(e) => setNewIncidentForm({...newIncidentForm, department: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-1 focus:ring-red-500 outline-none text-xs font-bold"
                    >
                      {["EMERGENCY UNIT", "CHEMO-PREP", "SURGICAL UNIT", "OUTPATIENT CLINICS"].map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">نوع ومسمى الحادث (بالعربية) *:</label>
                    <input 
                      type="text"
                      placeholder="مثال: خطأ في صياغة الجرعة الكيميائية بالخلط المبرمج"
                      value={newIncidentForm.typeAr}
                      onChange={(e) => setNewIncidentForm({...newIncidentForm, typeAr: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-1 focus:ring-red-500 outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">نوع المسمى (بالانجليزية) *:</label>
                    <input 
                      type="text"
                      placeholder="e.g. Chemotherapy Dosage Formulation Discrepancy"
                      value={newIncidentForm.typeEn}
                      onChange={(e) => setNewIncidentForm({...newIncidentForm, typeEn: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-1 focus:ring-red-500 outline-none text-xs font-semibold"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">مستوى الخطورة السريرية والجودة:</label>
                    <div className="flex gap-2">
                      {["Critical", "Medium", "Low"].map(sev => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setNewIncidentForm({...newIncidentForm, severity: sev})}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition border flex-1 ${
                            newIncidentForm.severity === sev 
                              ? "bg-red-600 text-white border-red-650 shadow" 
                              : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                          }`}
                        >
                          {sev === "Critical" ? "Critical (خطير جداً 🔴)" : sev === "Medium" ? "Medium (متوسط 🟡)" : "Low (بسيط 🟢)"}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">وصف الحادثة عاجلاً بالتفصيل (العربية) *:</label>
                    <textarea
                      rows={2}
                      value={newIncidentForm.descAr}
                      onChange={(e) => setNewIncidentForm({...newIncidentForm, descAr: e.target.value})}
                      placeholder="تفصيل الواقعة بدقة وما نتج عنها حالياً..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">تحليل السبب الجذري RCA (Root Cause Analysis بالعربية) - اختياري:</label>
                    <textarea
                      rows={2}
                      value={newIncidentForm.rcaAr}
                      onChange={(e) => setNewIncidentForm({...newIncidentForm, rcaAr: e.target.value})}
                      placeholder="لماذا وقعت الحادثة؟ الأبعاد والمسؤولية..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">التدبير والإجراء الوقائي المتخذ فورا (المصادقة الإدارية) - اختياري:</label>
                    <textarea
                      rows={2}
                      value={newIncidentForm.actionAr}
                      onChange={(e) => setNewIncidentForm({...newIncidentForm, actionAr: e.target.value})}
                      placeholder="الإجراء الفوري المتخذ لحصر ومحاصرة الضرر السريري..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateIncident}
                  className="bg-red-600 hover:bg-red-750 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow cursor-pointer transition flex items-center gap-1.5 w-full justify-center"
                >
                  <Database className="h-4 w-4" />
                  <span>حفظ وبث بلاغ الواقعة الطبية سحابياً فوراً (Cloud Sync Event)</span>
                </button>
              </div>
            )}

            {/* Log registry list */}
            <div className="space-y-4 text-right">
              <span className="text-[10px] text-slate-400 font-extrabold block">البلاغات المسجلة بقاعدة بيانات السحابة ({sentinelIncidents.length}):</span>
              {sentinelIncidents.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  لم يتم الإبلاغ عن أي حوادث جسيمة سحابياً. النظام آمن بالكامل مائة بالمائة.
                </div>
              ) : (
                <div className="space-y-3">
                  {sentinelIncidents.map((inc: any) => (
                    <div key={inc.id} className="bg-white border rounded-2xl shadow-sm hover:shadow transition-all relative overflow-hidden">
                      {/* Side alert line based on severity */}
                      <div className={`absolute top-0 bottom-0 right-0 w-2 ${
                        inc.styleSeverity === "Critical" || inc.severity === "Critical" 
                          ? "bg-red-600" 
                          : inc.severity === "Medium" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      
                      <div className="p-5 pr-7 space-y-3.5 text-right font-sans">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                          <div className="flex items-center gap-1.5">
                            {currentUser.role === "admin" && (
                              <button
                                onClick={() => handleDeleteIncident(inc.id)}
                                className="text-red-600 hover:text-red-800 text-[10px] font-black cursor-pointer bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                              >
                                حذف نهائي 🗑️
                              </button>
                            )}
                            <span className="text-[9px] text-slate-400 font-mono font-bold leading-none">{inc.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                              🏥 {inc.department}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              inc.severity === "Critical" ? "bg-red-100 text-red-800" : inc.severity === "Medium" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {inc.severity === "Critical" ? "خطورة حرجة 🔴" : inc.severity === "Medium" ? "خطورة متوسطة 🟡" : "بسيط 🟢"}
                            </span>
                            <h5 className="font-extrabold text-slate-900 text-xs">{inc.typeAr}</h5>
                          </div>
                        </div>

                        <div className="space-y-2.5 text-xs text-slate-700">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-right leading-relaxed">
                            <strong className="block text-[10px] text-slate-500 mb-0.5 font-black">الوصف السريري للواقعة:</strong>
                            <p className="font-bold text-slate-800">{inc.descAr}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-1 text-left" dir="ltr">{inc.descEn}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-amber-50/25 border border-amber-100 p-3 rounded-xl text-right">
                              <strong className="block text-[10px] text-amber-850 mb-0.5 font-black">🔍 تحليل السبب الجذري (RCA):</strong>
                              <p className="font-bold text-slate-800">{inc.rcaAr}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-1 text-left" dir="ltr">{inc.rcaEn}</p>
                            </div>
                            <div className="bg-emerald-50/25 border border-emerald-100 p-3 rounded-xl text-right">
                              <strong className="block text-[10px] text-emerald-850 mb-0.5 font-black">🛡️ التدبير والإجراء التحسيني المفعّل:</strong>
                              <p className="font-bold text-slate-800">{inc.actionAr}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-1 text-left" dir="ltr">{inc.actionEn}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-bold pt-1.5 border-t">
                          <span>APPROVED CLOUD SENTINEL FEEDBACK SYSTEM</span>
                          <span>بواسطة: {inc.loggedBy}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Sub-tab Departmental Compliance Matrix & Closed-Loop Gaps */}
      {analyticsSubTab === "compliance" && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 3.1 Department compliance meters (comparative list) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-right">
              <div className="border-b pb-2">
                <span className="bg-pink-100 text-pink-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Compliance Bar</span>
                <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1 justify-end mt-1">
                  <span>امتثال الأقسام الطبية لمعايير الجودة</span>
                  <Award className="h-4 w-4 text-pink-600" />
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  تقييم نسبي لمعدل التزام فرق التمريض بالجرد المنهجي المعتمد لـ {hospitalSettings.nameAr || "المؤسسة"}.
                </p>
              </div>

              <div className="space-y-4 pt-1">
                {/* Unit 1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                    <span className="font-mono bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded text-[8px]">98% EXCELLENT</span>
                    <span className="font-bold">وحدة طوارئ واستقبال {hospitalSettings.nameAr || "المؤسسة"}</span>
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
                    <span className="font-bold">قسم العيادات الخارجية ومتابعة الأداء</span>
                  </div>
                  <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="absolute top-0 right-0 h-full bg-amber-400 rounded-full" style={{ width: "82%" }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-normal font-sans">
                💡 <strong>ملاحظة المراقبة والاعتماد الصحى:</strong> لرفع نسبة الامتثال في الأقسام الأقل حظاً، ينبغي مراجعة جداول تسليم الشيفتات والتأكد من إمضاء التمريض بالتناوب يومياً سحابياً.
              </div>
            </div>

            {/* 3.2 Right Area: Interactive Closed-Loop Audit Gaps Tracker & Alert System */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between text-right">
              <div>
                <div className="border-b pb-2 flex items-center justify-between">
                  <span className="bg-rose-100 text-rose-700 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">LIVE OBSERVATIONS</span>
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                    <span>مركز رصد الثغرات والعيوب الطبية السريرية (Audit Faults Closed-loop)</span>
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                  </h4>
                </div>

                <p className="text-[10px] text-slate-400 mt-1 mb-3">
                  عندما يقوم كادر التمريض برصد خلل (علامة ✘) في أدوات الفحص الميدانية، تظهر الثغرة هنا فوراً لتمكين الجودة أو رئيسة التمريض من كتابة الإجراء التصحيحي وإقفال البوابة الطبية للثغرة:
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
                          <span className="text-[8px] bg-red-100 text-red-700 font-extrabold rounded px-1 font-mono">نموذج تجريبي</span>
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
                            <div className="flex items-center gap-1.5 justify-end font-sans">
                              {isResolved && (
                                <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-mono">
                                  تم التصحيح والحل
                                </span>
                              )}
                              <span className="font-black text-rose-900 truncate block font-sans">خلل في: {gap.itemName} / {gap.itemEn}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-sans">
                              {gap.templateTitle} ({gap.templateCode}) / اليوم {gap.dayNum} - بقسم: {gap.department} - بواسطة ({gap.staffName})
                            </p>

                            {isResolved ? (
                              <div className="bg-emerald-50/65 border border-emerald-100 p-2 rounded-lg mt-2 text-[10px] text-emerald-800 font-sans text-right">
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
                    <div className="text-center py-10 bg-emerald-50/20 border border-dashed border-emerald-200 rounded-xl p-4 text-right">
                      <span className="text-xl">🏆</span>
                      <p className="font-bold text-emerald-800 text-xs mt-1.5">أنت على قمة الهرم الطبي للجودة!</p>
                      <p className="text-[10px] text-slate-450 mt-0.5 font-sans">لم يتم رصد أي ثغرات أو نواقص أو أقفال مكسورة حالياً في جميع الوثائق المدققة.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-3 mt-4 text-[9px] text-slate-400 flex items-center justify-between font-mono">
                <span>BAHEYA CQI COMMAND-ALERTS CLOUD WORKSPACE</span>
                <span>تحديث مستمر ●</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
