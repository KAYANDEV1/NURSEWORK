import React, { useState } from "react";
import { X, Cloud, ShieldCheck, Database, Save } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

interface Props {
  onClose: () => void;
}

export default function CloudSettingsPanel({ onClose }: Props) {
  const { settings, updateSettings } = useSettings();
  const [institutionNameAr, setInstitutionNameAr] = useState(settings.institutionNameAr);
  const [institutionNameEn, setInstitutionNameEn] = useState(settings.institutionNameEn);
  const [taglineAr, setTaglineAr] = useState(settings.taglineAr);
  const [taglineEn, setTaglineEn] = useState(settings.taglineEn);
  const [address, setAddress] = useState(settings.address);
  const [emergencyPhone, setEmergencyPhone] = useState(settings.emergencyPhone);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings({ institutionNameAr, institutionNameEn, taglineAr, taglineEn, address, emergencyPhone });
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <Cloud className="w-6 h-6 text-blue-600" />
            إعدادات السحابة والربط
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">نظام الربط نشط</p>
                <p className="text-sm text-green-700">Firebase Cloud Firestore</p>
              </div>
            </div>
            <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-medium">متصل</span>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-5 h-5 text-gray-600" />
              <p className="font-semibold text-gray-900">اسم المؤسسة (للبرنامج)</p>
            </div>
            <input 
              type="text"
              placeholder="اسم المؤسسة بالعربية"
              className="w-full p-2 mt-2 border rounded-md text-sm"
              value={institutionNameAr}
              onChange={(e) => setInstitutionNameAr(e.target.value)}
            />
            <input 
              type="text"
              placeholder="Organization Name (English)"
              className="w-full p-2 mt-2 border rounded-md text-sm"
              value={institutionNameEn}
              onChange={(e) => setInstitutionNameEn(e.target.value)}
            />
            <input 
              type="text"
              placeholder="وصف/شعار بالعربي"
              className="w-full p-2 mt-2 border rounded-md text-sm"
              value={taglineAr}
              onChange={(e) => setTaglineAr(e.target.value)}
            />
            <input 
              type="text"
              placeholder="Tagline (English)"
              className="w-full p-2 mt-2 border rounded-md text-sm"
              value={taglineEn}
              onChange={(e) => setTaglineEn(e.target.value)}
            />
             <input 
              type="text"
              placeholder="العنوان"
              className="w-full p-2 mt-2 border rounded-md text-sm"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
             <input 
              type="text"
              placeholder="رقم الطوارئ"
              className="w-full p-2 mt-2 border rounded-md text-sm"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            إلغاء
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
