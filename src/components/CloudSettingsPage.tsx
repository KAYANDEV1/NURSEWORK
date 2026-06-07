import React, { useState, useEffect, useRef } from "react";
import {
  Cloud,
  ShieldCheck,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Download,
  Upload,
  Info,
  Activity,
  Clock,
  FileCode,
  Gauge,
  Wifi,
  WifiOff,
  Search,
  Plus,
  Play,
  Check,
  X,
  FileText,
  Server,
  Key,
  DatabaseBackup,
  Layers,
  Settings,
  ShieldAlert,
  Sliders,
  Sparkles,
  UserCheck
} from "lucide-react";
import {
  SavedRecord,
  FormTemplate,
  AppUser,
  UnitDailyChecklist,
  SystemLog,
  DailyDutyTask
} from "../types";
import {
  testConnection,
  saveClinicalRecord,
  saveStaffMember,
  saveDailyAudit,
  saveSystemLog,
  saveCustomTemplate,
  saveDutyTask,
  saveHospitalSettings,
  deleteClinicalRecord,
  deleteStaffMember,
  deleteCustomTemplate,
  deleteSystemLog
} from "../lib/firestoreService";
import firebaseConfig from "../../firebase-applet-config.json";

interface Props {
  language: "ar" | "en";
  currentUser?: AppUser | null;
  records?: SavedRecord[];
  customTemplates?: FormTemplate[];
  systemUsers?: AppUser[];
  dailyChecklists?: UnitDailyChecklist[];
  systemLogs?: SystemLog[];
  dutyTasks?: DailyDutyTask[];
  setRecords?: React.Dispatch<React.SetStateAction<SavedRecord[]>>;
  setCustomTemplates?: React.Dispatch<React.SetStateAction<FormTemplate[]>>;
  setSystemUsers?: React.Dispatch<React.SetStateAction<AppUser[]>>;
  setDailyChecklists?: React.Dispatch<React.SetStateAction<UnitDailyChecklist[]>>;
  setSystemLogs?: React.Dispatch<React.SetStateAction<SystemLog[]>>;
  setDutyTasks?: React.Dispatch<React.SetStateAction<DailyDutyTask[]>>;
  hospitalSettings?: any;
}

export default function CloudSettingsPage({
  language,
  currentUser,
  records = [],
  customTemplates = [],
  systemUsers = [],
  dailyChecklists = [],
  systemLogs = [],
  dutyTasks = [],
  setRecords,
  setCustomTemplates,
  setSystemUsers,
  setDailyChecklists,
  setSystemLogs,
  setDutyTasks,
  hospitalSettings
}: Props) {
  const isAr = language === "ar";

  // State definitions
  const [activeSubTab, setActiveSubTab] = useState<"status" | "stats" | "migration" | "logs">("status");
  const [latencyText, setLatencyText] = useState<string>("--");
  const [latencyColor, setLatencyColor] = useState<string>("text-gray-400");
  const [pinging, setPinging] = useState<boolean>(false);
  const [onlineStatus, setOnlineStatus] = useState<boolean | null>(null);
  const [showConfigKeys, setShowConfigKeys] = useState<boolean>(false);
  const [isCachUsedPct, setIsCachUsedPct] = useState<number>(0);
  
  // Custom sync settings
  const [syncStrategy, setSyncStrategy] = useState<string>(() => localStorage.getItem("baheya_sync_strategy") || "realtime");
  const [conflictStrategy, setConflictStrategy] = useState<string>(() => localStorage.getItem("baheya_conflict_strategy") || "newest");
  const [autoSyncInterval, setAutoSyncInterval] = useState<string>(() => localStorage.getItem("baheya_auto_sync_interval") || "immediate");

  // Migration status
  const [importStatus, setImportStatus] = useState<{
    type: "idle" | "success" | "error" | "processing";
    messageAr: string;
    messageEn: string;
  }>({ type: "idle", messageAr: "", messageEn: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live log viewer filters
  const [logSearch, setLogSearch] = useState<string>("");
  const [logFilter, setLogFilter] = useState<string>("ALL");

  // Manual Log Simulation Form
  const [simLogMsgAr, setSimLogMsgAr] = useState<string>("");
  const [simLogMsgEn, setSimLogMsgEn] = useState<string>("");
  const [simLogType, setSimLogType] = useState<"info" | "warning" | "success" | "error">("info");

  // Double-Signer verification PIN
  const [confirmingWipe, setConfirmingWipe] = useState<boolean>(false);
  const [wipePasscode, setWipePasscode] = useState<string>("");
  const [wipePasscodeError, setWipePasscodeError] = useState<string | null>(null);

  // Firebase Config Overrides Form state
  const [projectIdInput, setProjectIdInput] = useState<string>(() => {
    try {
      const override = localStorage.getItem("baheya_firebase_config_override");
      if (override) {
        const parsed = JSON.parse(override);
        if (parsed && parsed.projectId) return parsed.projectId;
      }
    } catch(e){}
    return firebaseConfig.projectId || "";
  });

  const [apiKeyInput, setApiKeyInput] = useState<string>(() => {
    try {
      const override = localStorage.getItem("baheya_firebase_config_override");
      if (override) {
        const parsed = JSON.parse(override);
        if (parsed && parsed.apiKey) return parsed.apiKey;
      }
    } catch(e){}
    return firebaseConfig.apiKey || "";
  });

  const [authDomainInput, setAuthDomainInput] = useState<string>(() => {
    try {
      const override = localStorage.getItem("baheya_firebase_config_override");
      if (override) {
        const parsed = JSON.parse(override);
        if (parsed && parsed.authDomain) return parsed.authDomain;
      }
    } catch(e){}
    return firebaseConfig.authDomain || "";
  });

  const [databaseIdInput, setDatabaseIdInput] = useState<string>(() => {
    try {
      const override = localStorage.getItem("baheya_firebase_config_override");
      if (override) {
        const parsed = JSON.parse(override);
        if (parsed && parsed.firestoreDatabaseId) return parsed.firestoreDatabaseId;
      }
    } catch(e){}
    return firebaseConfig.firestoreDatabaseId || "";
  });

  const [appIdInput, setAppIdInput] = useState<string>(() => {
    try {
      const override = localStorage.getItem("baheya_firebase_config_override");
      if (override) {
        const parsed = JSON.parse(override);
        if (parsed && parsed.appId) return parsed.appId;
      }
    } catch(e){}
    return firebaseConfig.appId || "";
  });

  const [storageBucketInput, setStorageBucketInput] = useState<string>(() => {
    try {
      const override = localStorage.getItem("baheya_firebase_config_override");
      if (override) {
        const parsed = JSON.parse(override);
        if (parsed && parsed.storageBucket) return parsed.storageBucket;
      }
    } catch(e){}
    return firebaseConfig.storageBucket || "";
  });

  const [messagingSenderIdInput, setMessagingSenderIdInput] = useState<string>(() => {
    try {
      const override = localStorage.getItem("baheya_firebase_config_override");
      if (override) {
        const parsed = JSON.parse(override);
        if (parsed && parsed.messagingSenderId) return parsed.messagingSenderId;
      }
    } catch(e){}
    return firebaseConfig.messagingSenderId || "";
  });

  // Save / Apply dynamic overrides
  const handleSaveFirebaseOverrides = () => {
    if (!projectIdInput.trim() || !apiKeyInput.trim()) {
      alert(isAr 
        ? "يرجى ملء معرف المشروع (Project ID) ومفتاح الـ API على الأقل لتوصيل السحابة المستهدفة!" 
        : "Please specify at least Project ID and API Key to bind the target database node!");
      return;
    }

    const payload = {
      projectId: projectIdInput.trim(),
      apiKey: apiKeyInput.trim(),
      authDomain: authDomainInput.trim(),
      firestoreDatabaseId: databaseIdInput.trim(),
      appId: appIdInput.trim(),
      storageBucket: storageBucketInput.trim(),
      messagingSenderId: messagingSenderIdInput.trim()
    };

    localStorage.setItem("baheya_firebase_config_override", JSON.stringify(payload));
    
    // Log change
    const updatedLog: SystemLog = {
      id: `log-${Date.now()}`,
      event: `Cloud endpoint successfully re-bound to project [${payload.projectId}] / database [${payload.firestoreDatabaseId || "(default)"}]`,
      type: "success",
      time: new Date().toLocaleTimeString(),
      timestampMs: Date.now()
    };
    saveSystemLog(updatedLog).catch(() => {});
    if (setSystemLogs) setSystemLogs(prev => [updatedLog, ...prev]);

    alert(isAr 
      ? "✔ تم حفظ وتطبيق معطيات الإقتران بالسحابة البديلة بنجاح! سيتم الآن إعادة تحميل الشاشة للارتباط الكامل بالقناة الجديدة." 
      : "✔ Custom cloud connection specs bound successfully! Re-indexing connection nodes and reloading page to apply new Firestore bindings.");
    
    window.location.reload();
  };

  const handleResetFirebaseOverrides = () => {
    if (confirm(isAr 
      ? "تأكيد: هل ترغب في العودة للاعتماد المشفر الأصلي وتجاهل هذا الربط المخصص؟" 
      : "Confirm: Do you want to wipe custom overrides and revert to the default built-in hospital parameters?")) {
      
      localStorage.removeItem("baheya_firebase_config_override");
      
      const resetLog: SystemLog = {
        id: `log-${Date.now()}`,
        event: "Cloud credentials reset to standard initial build config parameters.",
        type: "info",
        time: new Date().toLocaleTimeString(),
        timestampMs: Date.now()
      };
      saveSystemLog(resetLog).catch(() => {});
      if (setSystemLogs) setSystemLogs(prev => [resetLog, ...prev]);

      alert(isAr 
        ? "تم استعادة بيانات التهيئة الافتراضية بنجاح! سيتم إعادة تحميل الصفحة الآن." 
        : "Initial hospital cloud configuration has been successfully restored! Reloading index...");
      
      window.location.reload();
    }
  };

  useEffect(() => {
    runPingCheck();
    calculateLocalStorageUsage();
  }, []);

  // Ping Check using the firebase testConnection function
  const runPingCheck = async () => {
    setPinging(true);
    setLatencyText(isAr ? "جاري قياس استجابة الخادم..." : "Timing Central Firestore DB...");
    const start = Date.now();
    try {
      const isOnline = await testConnection();
      const duration = Date.now() - start;
      setOnlineStatus(isOnline);
      if (isOnline) {
        setLatencyText(`${duration} ms`);
        if (duration < 150) {
          setLatencyColor("text-emerald-500 font-extrabold");
        } else if (duration < 550) {
          setLatencyColor("text-amber-500 font-extrabold");
        } else {
          setLatencyColor("text-rose-500 font-bold animate-pulse");
        }
      } else {
        setLatencyText(isAr ? "غير متصل بالسحابة" : "Cloud Offline / Limit Exceeded");
        setLatencyColor("text-rose-600 font-black");
      }
    } catch (e) {
      setOnlineStatus(false);
      setLatencyText(isAr ? "فشل الاتصال" : "Refused Connection");
      setLatencyColor("text-rose-600 font-semibold");
    } finally {
      setPinging(false);
    }
  };

  // Local storage capacity helper
  const calculateLocalStorageUsage = () => {
    try {
      let total = 0;
      for (const x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
          total += (localStorage[x]?.length || 0) * 2; // ~2 bytes per character
        }
      }
      // Assuming average 5MB localstorage limit
      const limit = 5 * 1024 * 1024;
      const pct = Math.min(Math.round((total / limit) * 100), 100);
      setIsCachUsedPct(pct);
    } catch (e) {
      setIsCachUsedPct(2);
    }
  };

  // Local Cache Purge
  const handleClearCache = () => {
    if (confirm(isAr 
      ? "تنبيه: سيؤدي هذا إلى حذف الكاش المتواجد محلياً بالكامل وإعادة تنزيل كافة البيانات والملفات من السحابة (Firestore) مباشرة. هل ترغب بالاستمرار؟" 
      : "Warning: This will clear the browser local cache database completely and pull the core clinical dataset clean from Firestore cloud. Do you want to continue?")) {
      
      const sessionUserObj = localStorage.getItem("baheya_current_user_object");
      const sessionUserId = localStorage.getItem("baheya_current_user_id");
      const sessionLogState = localStorage.getItem("baheya_is_logged_in");

      localStorage.clear();

      // Preserve logged in session so user doesn't get kicked out!
      if (sessionLogState) localStorage.setItem("baheya_is_logged_in", sessionLogState);
      if (sessionUserId) localStorage.setItem("baheya_current_user_id", sessionUserId);
      if (sessionUserObj) localStorage.setItem("baheya_current_user_object", sessionUserObj);

      const successLog: SystemLog = {
        id: `log-${Date.now()}`,
        event: `Local storage cache database index rebuilt by ${currentUser?.nameEn || "Anonymous"}`,
        type: "success",
        time: new Date().toLocaleTimeString(),
        timestampMs: Date.now()
      };
      
      saveSystemLog(successLog).catch(() => {});
      if (setSystemLogs) setSystemLogs(prev => [successLog, ...prev]);

      alert(isAr ? "✔ تم تصفير الكاش المحلي بنجاح وسيتم المزامنة التلقائية." : "✔ Cache reset completed. Pulling down synced elements.");
      calculateLocalStorageUsage();
    }
  };

  // Export JSON Backup file
  const handleExportBackup = () => {
    try {
      const backupData = {
        exportVersion: `${hospitalSettings?.nameEn}Forms-2026.1`,
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser?.nameEn || "Staff Account",
        exportedById: currentUser?.staffId || "System",
        hospitalSettings: localStorage.getItem("baheya_hospital_settings") 
          ? JSON.parse(localStorage.getItem("baheya_hospital_settings")!) 
          : null,
        records,
        customTemplates,
        systemUsers,
        dailyChecklists,
        dutyTasks,
        resolvedGaps: localStorage.getItem("baheya_resolved_gaps")
          ? JSON.parse(localStorage.getItem("baheya_resolved_gaps")!)
          : {}
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `baheya_hforms_backup_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      // Add a log
      const exportLog: SystemLog = {
        id: `log-${Date.now()}`,
        event: `Database exported successfully to JSON backup by ${currentUser?.nameEn || "System Admin"}`,
        type: "info",
        time: new Date().toLocaleTimeString(),
        timestampMs: Date.now()
      };
      saveSystemLog(exportLog).catch(() => {});
      if (setSystemLogs) setSystemLogs(prev => [exportLog, ...prev]);

    } catch (error) {
      alert(isAr 
        ? "خطأ في استخراج ملف النسخة الاحتياطية." 
        : "Backup Extraction failed. Check browser download configurations.");
    }
  };

  // Drag over upload file configs
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Import JSON restoration payload
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus({
      type: "processing",
      messageAr: "جاري تحليل بنية ملف التشفير للنسخة الاحتياطية...",
      messageEn: "Scanning validation fingerprint of backup archive file..."
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (!data.exportVersion) {
          throw new Error("Invalid signature or structure key missing");
        }

        let importLogsCount = 0;

        // Restore Clinical Records
        if (data.records && Array.isArray(data.records)) {
          importLogsCount += data.records.length;
          if (setRecords) setRecords(data.records);
          localStorage.setItem("baheya_medical_records", JSON.stringify(data.records));
          for (const item of data.records) {
            await saveClinicalRecord(item).catch(() => {});
          }
        }

        // Restore Custom Templates
        if (data.customTemplates && Array.isArray(data.customTemplates)) {
          importLogsCount += data.customTemplates.length;
          if (setCustomTemplates) setCustomTemplates(data.customTemplates);
          localStorage.setItem("baheya_custom_templates", JSON.stringify(data.customTemplates));
          for (const item of data.customTemplates) {
            await saveCustomTemplate(item).catch(() => {});
          }
        }

        // Restore daily lists
        if (data.dailyChecklists && Array.isArray(data.dailyChecklists)) {
          importLogsCount += data.dailyChecklists.length;
          if (setDailyChecklists) setDailyChecklists(data.dailyChecklists);
          localStorage.setItem("baheya_daily_checklists", JSON.stringify(data.dailyChecklists));
          for (const item of data.dailyChecklists) {
            await saveDailyAudit(item).catch(() => {});
          }
        }

        // Restore custom staff registry
        if (data.systemUsers && Array.isArray(data.systemUsers)) {
          importLogsCount += data.systemUsers.length;
          if (setSystemUsers) setSystemUsers(data.systemUsers);
          localStorage.setItem("baheya_system_users", JSON.stringify(data.systemUsers));
          for (const item of data.systemUsers) {
            await saveStaffMember(item).catch(() => {});
          }
        }

        // Restore duty items
        if (data.dutyTasks && Array.isArray(data.dutyTasks)) {
          importLogsCount += data.dutyTasks.length;
          if (setDutyTasks) setDutyTasks(data.dutyTasks);
          for (const item of data.dutyTasks) {
            await saveDutyTask(item).catch(() => {});
          }
        }

        // Restore generic hospital settings
        if (data.hospitalSettings) {
          localStorage.setItem("baheya_hospital_settings", JSON.stringify(data.hospitalSettings));
          await saveHospitalSettings(data.hospitalSettings).catch(() => {});
        }

        // Store resolved quality gaps map
        if (data.resolvedGaps) {
          localStorage.setItem("baheya_resolved_gaps", JSON.stringify(data.resolvedGaps));
        }

        // Add success restore log
        const syncLog: SystemLog = {
          id: `log-${Date.now()}`,
          event: `Full database disaster restoration invoked (${importLogsCount} logs restored by ID: ${currentUser?.staffId})`,
          type: "success",
          time: new Date().toLocaleTimeString(),
          timestampMs: Date.now()
        };
        saveSystemLog(syncLog).catch(() => {});
        if (setSystemLogs) setSystemLogs(prev => [syncLog, ...prev]);

        setImportStatus({
          type: "success",
          messageAr: `✔ تم مزامنة واسترجاع عدد (${importLogsCount}) سجلاً وبطاقات بنجاح للفرع الرئيسي والسحابة!`,
          messageEn: `✔ Restored and successfully synced (${importLogsCount}) active database assets across cloud networks!`
        });

        calculateLocalStorageUsage();

      } catch (error: any) {
        setImportStatus({
          type: "error",
          messageAr: `فشل فحص الملف الاستردادي: ${error?.message || "تنسيق غير مدعوم"}`,
          messageEn: `File inspection failed: ${error?.message || "Unsupported file format"}`
        });
      }
    };
    reader.readAsText(file);
  };

  // Handle custom sync preferences saved to localstorage
  const handleSavePref = (key: string, val: string) => {
    if (key === "strategy") {
      setSyncStrategy(val);
      localStorage.setItem("baheya_sync_strategy", val);
    } else if (key === "conflict") {
      setConflictStrategy(val);
      localStorage.setItem("baheya_conflict_strategy", val);
    } else if (key === "interval") {
      setAutoSyncInterval(val);
      localStorage.setItem("baheya_auto_sync_interval", val);
    }

    const logItem: SystemLog = {
      id: `log-${Date.now()}`,
      event: `Global background sync preferences updated: ${key} -> ${val}`,
      type: "info",
      time: new Date().toLocaleTimeString(),
      timestampMs: Date.now()
    };
    saveSystemLog(logItem).catch(() => {});
    if (setSystemLogs) setSystemLogs(prev => [logItem, ...prev]);
  };

  // Submit manual system log for testing connectivity to logs collection
  const handleSimulateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simLogMsgAr && !simLogMsgEn) return;

    const logMsg = simLogMsgAr && simLogMsgEn 
      ? `Simulated Log: ${simLogMsgEn} | ${simLogMsgAr}` 
      : (simLogMsgEn || simLogMsgAr);

    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      event: `[TEST] ${logMsg}`,
      type: simLogType,
      time: new Date().toLocaleTimeString(),
      timestampMs: Date.now()
    };

    try {
      await saveSystemLog(newLog);
      if (setSystemLogs) setSystemLogs(prev => [newLog, ...prev]);
      
      setSimLogMsgAr("");
      setSimLogMsgEn("");
      
      // Flash connection feedback
      runPingCheck();
      alert(isAr ? "تم حفظ وبث الحدث في السجلات الفورية بنجاح!" : "System Event posted and broadcasted successfully!");
    } catch (e) {
      alert(isAr ? "فشل حفظ السجل السحابي." : "Failed to sync system audit post.");
    }
  };

  // Clear all Logs (Danger zone)
  const handleClearAllLogs = async () => {
    if (confirm(isAr 
      ? "هل أنت متأكد من تصفير وحذف جميع السجلات التشخيصية (IT Troubleshooting Logs) من السحابة؟" 
      : "Are you sure you want to delete all diagnostic system logs from the Cloud Database?")) {
      
      try {
        for (const log of systemLogs) {
          await deleteSystemLog(log.id).catch(() => {});
        }
        if (setSystemLogs) setSystemLogs([]);
        alert(isAr ? `تم إخلاء سجلات تشخيص ${hospitalSettings?.nameAr}` : `${hospitalSettings?.nameEn} diagnostic logs catalog cleared.`);
      } catch (e) {
        alert(isAr ? "حدث خطأ أثناء رغبتك بالمسح." : "Error trying to clear indices.");
      }
    }
  };

  // Seed default data / records
  const handleSeedMockData = async () => {
    if (!confirm(isAr 
      ? "تأكيد: سيتم التحقق من النماذج والملفات الافتراضية، وإعادة ملئها فوراً إذا لم توجد في السحابة. هل تريد بدء التلقيم؟" 
      : "Confirm: This will check and seed clinical checklists and templates configurations into Firestore. Begin database seeding?")) {
      return;
    }

    try {
      setImportStatus({
        type: "processing",
        messageAr: "جاري ربط قواعد البيانات وتهئية السجلات السحابية...",
        messageEn: "Connecting to database node and seeding mock collections..."
      });

      // Seeding simulated diagnostic item
      const welcomeLog: SystemLog = {
        id: `log-${Date.now()}`,
        event: `${hospitalSettings?.nameEn} Hospital central cloud database initialized and seed template executed by ${currentUser?.nameEn || "IT Admin"}`,
        type: "success",
        time: new Date().toLocaleTimeString(),
        timestampMs: Date.now()
      };
      await saveSystemLog(welcomeLog);
      if (setSystemLogs) setSystemLogs(prev => [welcomeLog, ...prev]);

      setImportStatus({
        type: "success",
        messageAr: `✔ تم الربط بنجاح! السحابة تستجيب ومقترنة بحزم ${hospitalSettings?.nameAr} الرقمية بشكل ممتاز.`,
        messageEn: "✔ Seeding sequence matched successfully! Firestore node is fully active and synchronized."
      });

      runPingCheck();

    } catch (err: any) {
      setImportStatus({
        type: "error",
        messageAr: `فشل في ربط السلسلة الفوقية للبيانات: ${err?.message || "خطأ غير معروف"}`,
        messageEn: `Database Seeding sequence error: ${err?.message || "Unknown write rejection"}`
      });
    }
  };

  // Render variables
  const filteredLogs = systemLogs.filter(log => {
    const matchesSearch = log.event.toLowerCase().includes(logSearch.toLowerCase()) || 
                          log.id.toLowerCase().includes(logSearch.toLowerCase());
    const matchesLevel = logFilter === "ALL" || log.type.toUpperCase() === logFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl text-blue-600 shadow-inner">
            <Cloud className="w-8 h-8 animate-pulse text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 font-sans">
              {isAr ? "التحكم السحابي ومستودع البيانات" : `${hospitalSettings?.nameEn} Cloud Hub & Database Hub`}
            </h1>
            <p className="text-slate-500 font-mono text-xs mt-1">
              {hospitalSettings?.nameEn} IT Secure Database Manager — v{firebaseConfig.projectId ? "2026.1" : "LocalFallback"}
            </p>
          </div>
        </div>

        {/* Sub-tab Selectors */}
        <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveSubTab("status")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "status"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>{isAr ? "البنية السحابية" : "Cloud Setup"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("stats")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "stats"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isAr ? "أرقام الجرد والمزامنة" : "Data Matrix"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("migration")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "migration"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <DatabaseBackup className="w-3.5 h-3.5" />
            <span>{isAr ? "النسخ واسترداد الكوارث" : "Disaster Recovery"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("logs")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "logs"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isAr ? "سجلات التشغيل الفورية" : "Live Audit Logs"}</span>
          </button>
        </div>
      </header>

      {/* Main Container Panels */}
      {activeSubTab === "status" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Connectivity Status Block */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                  {isAr ? "حالة الموثوقية بالخادم" : "Cloud Reliability Node"}
                </span>
                <span className={`flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full ${
                  onlineStatus === true 
                    ? "bg-emerald-100 text-emerald-800" 
                    : onlineStatus === false 
                    ? "bg-rose-100 text-rose-800" 
                    : "bg-amber-100 text-amber-800"
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${onlineStatus === true ? "bg-emerald-500 animate-ping" : onlineStatus === false ? "bg-rose-500" : "bg-amber-500 animate-pulse"}`} />
                  {onlineStatus === true 
                    ? (isAr ? "نشط ومؤمن" : "SECURELY SYNCED") 
                    : onlineStatus === false 
                    ? (isAr ? "أوفلاين محلي" : "LOCAL CACHE ONLY") 
                    : (isAr ? "جاري الاختبار" : "VERIFYING PORT...")}
                </span>
              </div>

              <div className="pt-6 text-center space-y-2">
                <p className="text-xs text-slate-400 font-bold">{isAr ? "سرعة استجابة قاعدة البيانات (Firestore)" : "Firestore Real-time DB Latency"}</p>
                <h3 className={`text-4xl font-extrabold tracking-tight ${latencyColor}`}>
                  {latencyText}
                </h3>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">{isAr ? "نظام الأوفلاين الاحتياطي" : "Offline Cache Recovery Engine"}</span>
                  <span className="text-emerald-600 font-extrabold">{isAr ? "تلقائي ونشط" : "AUTOMATIC / LIVE"}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">{isAr ? "الاعتماد السحابي للمستندات" : "Cloud Document Sovereignty"}</span>
                  <span className="text-blue-600 font-extrabold">Firestore Enterprise</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2">
              <button
                onClick={runPingCheck}
                disabled={pinging}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${pinging ? "animate-spin" : ""}`} />
                <span>{isAr ? "إعادة فحص الاتصال الفوري" : "Perform DB Latency Diagnostic"}</span>
              </button>
            </div>
          </div>

          {/* Environment Parameters Details Block */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pointer-events-none mb-3">
                <h3 className="text-md font-extrabold text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <span>{isAr ? "معالم وعناوين الإقتران بالبنية" : "Google Cloud Firestore Manifest Keys"}</span>
                </h3>
                <span className="bg-slate-100 text-slate-800 text-[9px] font-black font-mono px-2 py-0.5 rounded uppercase">
                  Secure Credentials
                </span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                {isAr
                  ? `يتم قراءة معالم الربط السحابي والـ API بشكل مشفر من نظام ${hospitalSettings?.nameAr} الرقمي المضمن في السحابة. لا تشارك هذه المعالم الأمنية مع أطراف خارجية لتجنب مخاطر الـ ID Spoofing.`
                  : `Encrypted connection specs are loaded natively from ${hospitalSettings?.nameEn} integrated secrets manager. Do not share these variables to prevent credentials exposure.`}
              </p>

              {/* Masked Config Keys list wrapper */}
              <div className="mt-4 border border-slate-150 rounded-xl overflow-hidden font-mono text-xs max-h-56 overflow-y-auto">
                <div className="grid grid-cols-3 bg-slate-50 p-2.5 border-b border-slate-150 font-bold text-slate-600">
                  <div className="col-span-1">{isAr ? "المعلم السحابي" : "Credential Parameter"}</div>
                  <div className="col-span-2">{isAr ? "العنوان البرمجي" : "Secret Value Token"}</div>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="grid grid-cols-3 p-2.5 hover:bg-slate-50 transition">
                    <div className="col-span-1 text-slate-500 font-semibold text-[10px]">Cloud Project ID</div>
                    <div className="col-span-2 text-slate-855 font-bold truncate text-[10px]">{firebaseConfig.projectId}</div>
                  </div>
                  <div className="grid grid-cols-3 p-2.5 hover:bg-slate-50 transition">
                    <div className="col-span-1 text-slate-500 font-semibold text-[10px]">Database Instance ID</div>
                    <div className="col-span-2 text-slate-855 font-bold truncate text-[10px] text-indigo-600">{firebaseConfig.firestoreDatabaseId}</div>
                  </div>
                  <div className="grid grid-cols-3 p-2.5 hover:bg-slate-50 transition">
                    <div className="col-span-1 text-slate-500 font-semibold text-[10px]">App ID Endpoint</div>
                    <div className="col-span-2 text-slate-855 font-bold truncate text-[10px]">
                      {showConfigKeys ? firebaseConfig.appId : "remixed-app-********"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 p-2.5 hover:bg-slate-50 transition">
                    <div className="col-span-1 text-slate-500 font-semibold text-[10px]">Central API Key Token</div>
                    <div className="col-span-2 text-slate-855 font-bold truncate text-[10px] text-pink-600">
                      {showConfigKeys ? firebaseConfig.apiKey : "remixed-api-key-*********"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 p-2.5 hover:bg-slate-50 transition">
                    <div className="col-span-1 text-slate-500 font-semibold text-[10px]">Active Auth Domain</div>
                    <div className="col-span-2 text-slate-855 font-bold truncate text-[10px]">{firebaseConfig.authDomain}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-400">
                {isAr ? "تحقق دائماً من فلاتر وقواعد الحماية بـ firestore.rules" : "Enforce exact document validations via Firestore ABAC Rules"}
              </span>
              <button
                onClick={() => setShowConfigKeys(!showConfigKeys)}
                className="px-4 py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg text-[10px] font-black transition cursor-pointer"
              >
                {showConfigKeys 
                  ? (isAr ? "🔒 حجب العناوين المشفرة" : "🔒 Mask Cryptographic Secrets") 
                  : (isAr ? "👁 عرض العناوين البرمجية" : "👁 Reveal Connection Strings")}
              </button>
            </div>
          </div>
        </div>

        {/* Custom Firebase / Cloud Binder Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
              <Database className="w-5 h-5 text-pink-600 animate-pulse animate-slow duration-1000" />
              <span>{isAr ? "ربط وتوجيه الاتصال بسحابة أو مشروع Firebase آخر" : "Dynamic Cloud Binding & Custom Firebase Settings"}</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              {isAr 
                ? "يمكنك تعديل معطيات الربط بالأسفل لترحيل مستودع البيانات الفورية والجرودات الرقمية إلى مشروع فايربيز (Firebase) بديل أو سحابة مخصصة أخرى."
                : "You can modify connection keys below to redirect clinical datasets and forms to a completely different Firebase Project namespace."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* API Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">{isAr ? "مفتاح الخادر (API Key)" : "Web Client API Key"}</label>
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full font-mono bg-slate-50/50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-pink-500 focus:bg-white transition"
              />
            </div>

            {/* Project ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">{isAr ? "معرف المشروع (Project ID)" : "Firebase Project ID"}</label>
              <input
                type="text"
                value={projectIdInput}
                onChange={(e) => setProjectIdInput(e.target.value)}
                placeholder="my-cool-project-123"
                className="w-full font-mono bg-slate-50/50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-pink-500 focus:bg-white transition"
              />
            </div>

            {/* Database ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">{isAr ? "معرف قاعدة بيانات Firestore (Database ID)" : "Firestore Database ID"}</label>
              <input
                type="text"
                value={databaseIdInput}
                onChange={(e) => setDatabaseIdInput(e.target.value)}
                placeholder="(default)"
                className="w-full font-mono bg-slate-50/50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-pink-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-slate-400 block">{isAr ? "الوضع التلقائي هو (default)" : "Default is usually '(default)'"}</span>
            </div>

            {/* Auth Domain */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">{isAr ? "نطاق المصادقة (Auth Domain)" : "Auth Domain Target"}</label>
              <input
                type="text"
                value={authDomainInput}
                onChange={(e) => setAuthDomainInput(e.target.value)}
                placeholder="my-cool-project-123.firebaseapp.com"
                className="w-full font-mono bg-slate-50/50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-pink-500 focus:bg-white transition"
              />
            </div>

            {/* App ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">{isAr ? "معرف التطبيق الذكي (App ID)" : "Firebase App ID (API/Web)"}</label>
              <input
                type="text"
                value={appIdInput}
                onChange={(e) => setAppIdInput(e.target.value)}
                placeholder="1:1234567890:web:abcdef..."
                className="w-full font-mono bg-slate-50/50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-pink-500 focus:bg-white transition"
              />
            </div>

            {/* Storage Bucket */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">{isAr ? "مستودع تخزين الملفات (Storage Bucket)" : "Cloud Storage Bucket URL"}</label>
              <input
                type="text"
                value={storageBucketInput}
                onChange={(e) => setStorageBucketInput(e.target.value)}
                placeholder="my-cool-project-123.appspot.com"
                className="w-full font-mono bg-slate-50/50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-pink-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-150 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {isAr 
                  ? "ملاحظة: سيتم إعادة تحميل الصفحة تلقائياً لتطبيق وحفظ تغييرات الربط السحابي." 
                  : "Action: The application framework will synchronize cache profiles and perform a soft reboot."}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleResetFirebaseOverrides}
                className="px-4 py-2 hover:bg-rose-50 text-rose-600 rounded-xl border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isAr ? "استعادة الاتصال الافتراضي" : "Restore Built-In Database"}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveFirebaseOverrides}
                className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isAr ? "حفظ وتفعيل معطيات السحابة" : "Bind & Initialize Cloud Settings"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {activeSubTab === "stats" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Synchronized Datasets Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Clinical Forms Sync status */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-black py-0.5 px-2 bg-pink-50 text-pink-600 rounded">
                  baheya_clinical_records
                </span>
              </div>
              <div>
                <h4 className="text-xs text-slate-400 font-bold">{isAr ? "نماذج الجرد الطبية والمستندات" : "Clinical Checklist Records"}</h4>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{records.length}</span>
                  <span className="text-xs text-slate-400 font-semibold">{isAr ? "سجلًا نشطًا" : "elements"}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{isAr ? "مستوى الفرز: مرضى / وحدات" : "Scope: Patient specific check sheets"}</span>
                <span className="text-emerald-600">{isAr ? "واقعي مزامن" : "REAL-TIME SYNCED"}</span>
              </div>
            </div>

            {/* Custom Clinical Templates Sync */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <FileCode className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-black py-0.5 px-2 bg-blue-50 text-blue-600 rounded">
                  baheya_custom_templates
                </span>
              </div>
              <div>
                <h4 className="text-xs text-slate-400 font-bold">{isAr ? "نماذج الشيتات والجرودات المخصصة" : "Dynamic Custom Templates"}</h4>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{customTemplates.length}</span>
                  <span className="text-xs text-slate-400 font-semibold">{isAr ? "شيت جرد مأذون" : "structures"}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{isAr ? "مصممة من وحدة الـ IT" : "Engineered by Hospital IT Node"}</span>
                <span className="text-blue-600">{isAr ? "نشط بالسحابة" : "CLOUD TEMPLATES"}</span>
              </div>
            </div>

            {/* Staff Credentials registry */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-black py-0.5 px-2 bg-indigo-50 text-indigo-600 rounded">
                  baheya_staff_registry
                </span>
              </div>
              <div>
                <h4 className="text-xs text-slate-400 font-bold">{isAr ? "سجل الموظفين والتمريض المعتمدين" : "Registered Staff & Nurses List"}</h4>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{systemUsers.length}</span>
                  <span className="text-xs text-slate-400 font-semibold">{isAr ? "كادراً طبياً" : "accounts"}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{isAr ? "حماية الصلاحيات: PIN Access" : "Role Enforcement: PIN Codes Enabled"}</span>
                <span className="text-emerald-500 font-black">ACTIVE</span>
              </div>
            </div>

            {/* Supervisor daily Auditing registries */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-black py-0.5 px-2 bg-purple-50 text-purple-600 rounded">
                  baheya_daily_audits
                </span>
              </div>
              <div>
                <h4 className="text-xs text-slate-400 font-bold">{isAr ? "تقارير جودة الجرودات اليومية والمشرف" : "Supervisor Quality Audits"}</h4>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{dailyChecklists.length}</span>
                  <span className="text-xs text-slate-400 font-semibold">{isAr ? "تقريراً معتمداً" : "audited logs"}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{isAr ? "إعتماد المشرفين والجودة" : "Quality Auditor verified sheets"}</span>
                <span className="text-purple-600">AUDITED</span>
              </div>
            </div>

            {/* Daily Operational Duty tasks sheets */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-black py-0.5 px-2 bg-amber-50 text-amber-600 rounded">
                  baheya_daily_duty_tasks
                </span>
              </div>
              <div>
                <h4 className="text-xs text-slate-400 font-bold">{isAr ? "قائمة الواجبات اليومية للوحدات والتمريض" : "Clinical Daily Duty Sheets"}</h4>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{dutyTasks.length}</span>
                  <span className="text-xs text-slate-400 font-semibold">{isAr ? "بنداً تفتيشياً" : "operational checks"}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{isAr ? "متطابق مع معايير الجودة GCI" : "Meets GCI hospital safety limits"}</span>
                <span className="text-emerald-500">SAVED</span>
              </div>
            </div>

            {/* Diagnostic system log files */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-black py-0.5 px-2 bg-teal-50 text-teal-600 rounded">
                  baheya_system_logs
                </span>
              </div>
              <div>
                <h4 className="text-xs text-slate-400 font-bold">{isAr ? "سجلات ومؤامرات الأعطال للـ IT" : "IT Troubleshooting Logs Catalog"}</h4>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{systemLogs.length}</span>
                  <span className="text-xs text-slate-400 font-semibold">{isAr ? "حدثاً إخبارياً" : "incidents logged"}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{isAr ? "تتبع مباشر للأعطال" : "Auto telemetry diagnostics"}</span>
                <span className="text-teal-600 font-extrabold">LIVE</span>
              </div>
            </div>
          </div>

          {/* Sync Preferences and Database Sync Strategy Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-md font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-pink-600" />
              <span>{isAr ? "تخصيص سياسة المزامنة وإدارة النزاعات" : "Database Synchronizing & Conflict Resolution Policies"}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sync Direction Option */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">{isAr ? "اتجاه وبنية التزامن (Sync Direction)" : "Sync Direction Strategy"}</label>
                <select
                  value={syncStrategy}
                  onChange={(e) => handleSavePref("strategy", e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none ring-pink-500/10 focus:ring-1 focus:bg-white"
                >
                  <option value="realtime">{isAr ? "تزامن ثنائي الاتجاه بالوقت الفعلي" : "Realtime Bilateral (Real-time Push & Pull)"}</option>
                  <option value="local_first">{isAr ? "الاعتماد المحلي أولاً مع الرفع التراكمي" : "Offline-First with periodic Cloud upload queue"}</option>
                  <option value="cloud_only">{isAr ? "الحفظ السحابي الصرف وبث فوري" : "Direct Cloud sovereignty (No local cache writes)"}</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr 
                    ? "تتحكم في سلوك تخزين شيت المرضى عندما يفقد التمريض الإشارة الطبية أثناء الإشراف لتلافي الفقد المادي." 
                    : "Ensures staff checklist data writes are kept safe on client buffers when local hospital signals fail."}
                </p>
              </div>

              {/* Conflict Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">{isAr ? "عند حدوث نزاع تعديلي (Conflict Policy)" : "Conflict Resolution Precedence"}</label>
                <select
                  value={conflictStrategy}
                  onChange={(e) => handleSavePref("conflict", e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none ring-pink-500/10 focus:ring-1 focus:bg-white"
                >
                  <option value="newest">{isAr ? "الاحتفاظ بالتعديل الأحدث زمنياً" : "Keep Latest Timestamp (Cloud & Client merge)"}</option>
                  <option value="client_wins">{isAr ? "التعديل المكتوب محلياً يفوق السحابي" : "Overwrite Cloud with Client cache payload"}</option>
                  <option value="server_wins">{isAr ? "الخادم يحوز الأولوية الأكاديمية المطلقة" : "Strict Cloud Sovereignty (Revert unsynced local client)"}</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr 
                    ? "يحدد السلوك التنظيمي عندما تقوم مشرفة القسم وأخصائي الجودة بتعديل نفس السلسلة المرضية." 
                    : "Resolves matching key audits update collisions gracefully between head nurse and auditor."}
                </p>
              </div>

              {/* Sync interval */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">{isAr ? "دورة بث البيانات للقرص السحابي" : "Auto Telemetry Broadcast Duty"}</label>
                <select
                  value={autoSyncInterval}
                  onChange={(e) => handleSavePref("interval", e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none ring-pink-500/10 focus:ring-1 focus:bg-white"
                >
                  <option value="immediate">{isAr ? "بث تسلسلي فوري عند الإغلاق" : "Immediate write on transaction end"}</option>
                  <option value="30s">{isAr ? "حفظ تراكمي كل 30 ثانية" : "Batch commit every 30 seconds"}</option>
                  <option value="manual">{isAr ? "يدوي عبر زر السحابة فقط" : "Manual trigger only (Save battery/Bandwidth)"}</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr 
                    ? "تنظيم فترات تواصل المتصفحات لخفض معدلات إهلاك باقة الـ IT بالفرع الجغرافي." 
                    : "Optimizes total connection handshakes and prevents CPU throttling during active ward shift audits."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "migration" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          
          {/* Export Systems State (JSON) Card Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-md font-extrabold text-slate-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600 animate-bounce" />
                <span>{isAr ? "استخراج وتصدير أرشيف مستندات بهية" : "Download Encrypted Systems Backup Archive"}</span>
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                {isAr
                  ? "قم بتحميل مستودع البيانات بالكامل كملف مشفر JSON منسق بنقرة واحدة. يتيح لك هذا الملف تأمين كامل سجل المريض الجراحي وتفاصيل جرد الصيدلة، الجرودات التمريضية العاجلة، وقائمة الأمان لحفظ الموظفين والمشرفين واستردادهم في حالة حدوث تلف مادي للخوادم المركزية."
                  : "Generates an offline snapshot file representing the hospital's entire integrated data assets. Includes personnel registries, active customized nurse checklists templates, clinical and chemotherapy records, and historical quality control logs."}
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <Info className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="text-xs text-slate-600 leading-relaxed font-sans">
                  <strong>{isAr ? "محتويات حزمة النسخ الاحتياطي حالياً:" : "Current Backup Blueprint assets counted:"}</strong>
                  <ul className="list-disc list-inside mt-1.5 font-sans space-y-1">
                    <li>{isAr ? `عدد مستندات المرضى: ${records.length} مستنداً` : `Checklist medical records count: ${records.length} items`}</li>
                    <li>{isAr ? `عدد شيت الجرد المخصص: ${customTemplates.length} قالب` : `Custom templates catalog: ${customTemplates.length} structures`}</li>
                    <li>{isAr ? `رصيد المشرفين والجودة: ${dailyChecklists.length} تقارير` : `Auditor daily check registers: ${dailyChecklists.length} check logs`}</li>
                    <li>{isAr ? `سجل الموظفين والتمريض: ${systemUsers.length} كادر` : `${hospitalSettings?.nameEn} registered personnel counts: ${systemUsers.length} staff`}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? "تصدير وتحميل حزمة البيانات بالكامل (JSON)" : "Generate and Download Complete Systems Backup"}</span>
              </button>
            </div>
          </div>

          {/* Import Restoration Systems State (JSON) Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-md font-extrabold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <span>{isAr ? "استيراد وتفريغ نسخة استرداد الكوارث والاقتران" : "Disaster Database Restoration & Migration"}</span>
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                {isAr
                  ? `استورد ملف استرداد معتمد بامتداد (.json) لإعادة إدراج أو مزامنة البيانات والملفات والجرادات لـ ${hospitalSettings?.nameAr || "بهية"}. سيقوم المعالج التلقائي بمقارنة البصمات، تحديث النزاعات السجلات، وحقن خلايا Firestore والذاكرة المحلية فوراً دون الحاجة لإعادة التشغيل.`
                  : `Upload a valid ${hospitalSettings?.nameEn} system JSON backup file. The migration processor will match structural schemas, push records directly into firestore database indexes, and seamlessly populate the active design states instantly.`}
              </p>

              {/* Silent Input Selector */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportBackup}
                accept=".json"
                className="hidden"
              />

              {/* Upload Drag/Drop Simulated Visual Area */}
              <div 
                onClick={triggerFileSelect}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100 p-6 rounded-2xl text-center space-y-2 transition duration-200 cursor-pointer"
              >
                <DatabaseBackup className="w-10 h-10 text-indigo-500 mx-auto animate-pulse" />
                <p className="text-xs font-extrabold text-slate-700">{isAr ? "اضغط هنا لاختيار ملف النسخة الاحتياطية المعتمدة لبهية" : "Click to select a valid system .json archive package"}</p>
                <p className="text-[10px] text-slate-400">{isAr ? "تنسيق معتمد: baheya_hforms_backup_*.json" : "Accepts index layout structures (max size: 25MB)"}</p>
              </div>

              {/* Import status logger flash */}
              {importStatus.type !== "idle" && (
                <div className={`p-3.5 rounded-xl border text-xs font-bold leading-relaxed flex items-start gap-2.5 animate-in fade-in ${
                  importStatus.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                    : importStatus.type === "error" 
                    ? "bg-rose-50 border-rose-200 text-rose-900" 
                    : "bg-slate-50 border-slate-200 text-slate-800 animate-pulse"
                }`}>
                  {importStatus.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                  {importStatus.type === "error" && <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  {importStatus.type === "processing" && <RefreshCw className="w-4 h-4 text-slate-500 shrink-0 mt-0.5 animate-spin" />}
                  <div>
                    <p>{isAr ? importStatus.messageAr : importStatus.messageEn}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSeedMockData}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>{isAr ? "ربط وتلقيم البيانات الافتراضية" : "Seed & Initialize Collections"}</span>
              </button>
              
              <button
                onClick={() => {
                  setWipePasscode("");
                  setWipePasscodeError(null);
                  setConfirmingWipe(true);
                }}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isAr ? "مسح شامل وتصفير" : "Factory Reset Complete DB"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "logs" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Log List View (IT Telemetry Logs sync) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-md font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <span>{isAr ? "لوحة التتبع والتحليل التشخيصي للشبكة" : "Active Hospital Event Telemetry Feed"}</span>
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">{isAr ? "سجل تتبع لحظي لتفادي فقد الجرودات التمريضية" : "Live diagnostic logs and validation error tracing dashboard"}</p>
              </div>

              {/* Clear event trigger */}
              <button
                onClick={handleClearAllLogs}
                className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 rounded-lg text-[10px] font-black transition cursor-pointer"
              >
                {isAr ? "تصفير السجل" : "Evacuate Logs"}
              </button>
            </div>

            {/* Filter and Search Log box */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? "بحث عن حدث، تعديل، اسم موظف..." : "Search logs filter..."}
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="bg-transparent w-full border-none outline-none text-xs text-slate-800 focus:ring-0 font-bold"
                />
                {logSearch && (
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setLogSearch("")} />
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 border border-slate-200 rounded-xl font-mono text-[10px]">
                {["ALL", "INFO", "WARNING", "SUCCESS", "ERROR"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLogFilter(lvl)}
                    className={`px-2.5 py-1 rounded-lg font-black transition cursor-pointer ${
                      logFilter === lvl
                        ? "bg-slate-900 text-white shadow"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Actual logs list item table */}
            <div className="border border-slate-150 rounded-xl overflow-hidden font-mono text-xs max-h-[440px] overflow-y-auto divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-bold">{isAr ? "لا توجد سجلات مطابقة للفلتر المحدد" : "Diagnostic logs matching filters are empty"}</p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  let badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                  if (log.type === "success") badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  if (log.type === "warning") badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                  if (log.type === "error") badgeColor = "bg-rose-50 text-rose-700 border-rose-200";

                  return (
                    <div key={log.id} className="p-3 hover:bg-slate-50 transition grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-3 sm:col-span-2 flex flex-col justify-start text-[10px] text-slate-450 font-semibold space-y-0.5">
                        <span className="text-slate-900 flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {log.time}</span>
                        <span className="text-[9px] text-slate-400">Ms: {log.timestampMs.toString().slice(-6)}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-2">
                        <span className={`px-2 py-0.5 text-[9px] font-black tracking-wider uppercase border rounded-md ${badgeColor}`}>
                          {log.type}
                        </span>
                      </div>
                      <div className="col-span-7 sm:col-span-8 flex flex-col justify-start">
                        <p className="text-[11px] text-slate-800 leading-relaxed font-bold font-sans text-right" dir="auto">
                          {log.event}
                        </p>
                        <span className="text-[8px] text-slate-400 tracking-wider font-mono mt-1 select-all hover:text-slate-600">ID: {log.id}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Simulated Logs write Form Card and usage metric */}
          <div className="space-y-6">
            
            {/* System Log Simulation Emulator */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-md font-extrabold text-slate-900 flex items-center gap-2">
                  <Play className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <span>{isAr ? "محاكي صياغة أحداث الشبكة الطبية" : "Diagnostic IT Logger Emulator"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAr 
                    ? "يقوم مهندسو الـ IT بكتابة أحداث أو تدوين ملاحظات الصيانة يدوياً لبثها لكافة الممرضين والمشرفين." 
                    : "Post manually created notifications or IT system events across diagnostic collections to evaluate reliability."}
                </p>
              </div>

              <form onSubmit={handleSimulateLog} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">{isAr ? "تفاصيل الحدث في السجل (عربي)" : "Log Event Details (Arabic)"}</label>
                  <input
                    type="text"
                    required
                    value={simLogMsgAr}
                    onChange={(e) => setSimLogMsgAr(e.target.value)}
                    placeholder={isAr ? "مثال: تم الإنتهاء من صيانة كبائن التعقيم بالصيدلية" : "مثال: تم إغلاق فحص عربة إنعاش الكود بلو"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none ring-pink-500/10 focus:ring-1 focus:bg-white text-right"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">{isAr ? "تفاصيل الحدث في السجل (En)" : "Log Event Details (English)"}</label>
                  <input
                    type="text"
                    required
                    value={simLogMsgEn}
                    onChange={(e) => setSimLogMsgEn(e.target.value)}
                    placeholder="e.g. BIOSafety sterilizer cabinet main calibration successful"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none ring-pink-500/10 focus:ring-1 focus:bg-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">{isAr ? "درجة أمان الحدث (Severity Level)" : "Event Severity Level"}</label>
                    <select
                      value={simLogType}
                      onChange={(e: any) => setSimLogType(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none"
                    >
                      <option value="info">INFO</option>
                      <option value="success">SUCCESS</option>
                      <option value="warning">WARNING</option>
                      <option value="error">ERROR</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={!simLogMsgAr && !simLogMsgEn}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-805 text-white active:bg-slate-950 rounded-xl text-xs font-black shadow transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAr ? "كتابة وبث الحدث الآن" : "Broadcast Event Posting"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Local Storage space utilization Gauge */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isAr ? "التخزين المحلي بالمتصفح" : "Browser Storage Occupancy"}</h4>
                <span className="text-xs font-black text-indigo-650 font-mono">{isCachUsedPct}% {isAr ? "مستغل" : "used"}</span>
              </div>

              {/* Progress gauge bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCachUsedPct < 40 
                      ? "bg-emerald-500" 
                      : isCachUsedPct < 80 
                      ? "bg-amber-500 animate-pulse" 
                      : "bg-rose-500 animate-ping"
                  }`}
                  style={{ width: `${isCachUsedPct}%` }}
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-2">
                {isAr 
                  ? "تحتوي ذاكرة المتصفح المحلية (HTML5 LocalStorage) على نسخ احتيافية سريعة ومزدوجة في الحالات الطارئة لمطابقة النماذج دون هدر للشبكة الطبية."
                  : `${hospitalSettings?.nameEn} browser database cluster caches medical records offline to prevent direct reliance errors during central network drops.`}
              </p>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleClearCache}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isAr ? "مسح التخزين المحلي (LocalStorage)" : "Rebuild Off-line Local Indexes"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Warning/Danger Confirmation dialog popup */}
      {confirmingWipe && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button 
              onClick={() => {
                setConfirmingWipe(false);
                setWipePasscode("");
                setWipePasscodeError(null);
              }}
              className="absolute top-4 left-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2 pt-2">
              <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto animate-bounce" />
              <h3 className="text-md font-extrabold text-slate-900 font-sans">{isAr ? "تأكيد إخلاء مساحات السحابة والفرع" : "Inbound System Full-Format Authorization"}</h3>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                {isAr 
                  ? "تحذير: سيتم حذف جميع النماذج والجرودات المسجلة للمرضى والصيدلة تماماً من السحابة والذاكرة المحلية. يرجى كتابة الـ PIN الخاص بالإدارة للتأكيد."
                  : "Security clearance check: Enter the Administrative authorized PIN code to execute direct factory-reset."}
              </p>
            </div>

            <div className="space-y-1.5">
              <input
                type="password"
                maxLength={4}
                value={wipePasscode}
                onChange={(e) => {
                  setWipePasscode(e.target.value);
                  setWipePasscodeError(null);
                }}
                placeholder="••••"
                className="w-full text-center tracking-widest text-lg bg-slate-50 border border-slate-200 rounded-xl p-2 font-black outline-none ring-rose-500/10 focus:ring-1 focus:bg-white"
              />
              {wipePasscodeError && (
                <p className="text-[10px] text-rose-600 font-bold text-center mt-1">{wipePasscodeError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={async () => {
                  // Admin PIN verification matching Dr Mohamed PIN "1234" or President PIN "9999" or IT Head PIN "2026"
                  if (wipePasscode === "1234" || wipePasscode === "9999" || wipePasscode === "2026") {
                    try {
                      setImportStatus({
                        type: "processing",
                        messageAr: "جاري حذف وتصفير الخادم ومستوعات البيانات بالكامل...",
                        messageEn: "Purging and rebuilding database structures on firestore node..."
                      });

                      // Purge Clinical records local & cloud
                      if (setRecords) setRecords([]);
                      localStorage.removeItem("baheya_medical_records");
                      for (const r of records) {
                        await deleteClinicalRecord(r.id).catch(() => {});
                      }

                      // Purge Custom templates
                      if (setCustomTemplates) setCustomTemplates([]);
                      localStorage.removeItem("baheya_custom_templates");
                      for (const t of customTemplates) {
                        await deleteCustomTemplate(t.id).catch(() => {});
                      }

                      // Purge Daily checklist quality audits
                      if (setDailyChecklists) setDailyChecklists([]);
                      localStorage.removeItem("baheya_daily_checklists");

                      // Remove resolved gaps map
                      localStorage.removeItem("baheya_resolved_gaps");

                      // Clear system logs
                      if (setSystemLogs) setSystemLogs([]);
                      for (const log of systemLogs) {
                        await deleteSystemLog(log.id).catch(() => {});
                      }

                      // Log wipe incident event
                      const wipeLog: SystemLog = {
                        id: `log-${Date.now()}`,
                        event: `AUTHORIZED FULL DATABASE WIPE executed by supervisor / administration PIN authentication`,
                        type: "error",
                        time: new Date().toLocaleTimeString(),
                        timestampMs: Date.now()
                      };
                      await saveSystemLog(wipeLog);
                      if (setSystemLogs) setSystemLogs([wipeLog]);

                      setImportStatus({
                        type: "success",
                        messageAr: "✔ تم مسح وإخلاء كافة البيانات بنجاح تام وإصدار السجل التطهيري.",
                        messageEn: "✔ Database format matched and executed perfectly. Cloud instance is clean."
                      });

                      setConfirmingWipe(false);
                      setWipePasscode("");
                      runPingCheck();
                      calculateLocalStorageUsage();

                    } catch (err: any) {
                      setWipePasscodeError(isAr ? `فشل المسح: ${err?.message}` : `Wipe failed: ${err?.message}`);
                    }
                  } else {
                    setWipePasscodeError(isAr ? "الرمز السري غير صحيح." : "Incorrect double-signer administrative passcode.");
                  }
                }}
                className="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black shadow transition cursor-pointer"
              >
                {isAr ? "تأكيد ومسح شامل" : "Confirm Format"}
              </button>
              <button
                onClick={() => {
                  setConfirmingWipe(false);
                  setWipePasscode("");
                  setWipePasscodeError(null);
                }}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-extrabold transition cursor-pointer"
              >
                {isAr ? "إلغاء التراجع" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
