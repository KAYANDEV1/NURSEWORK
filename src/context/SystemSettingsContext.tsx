import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface OrganizationSettings {
  organizationNameAr: string;
  organizationNameEn: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  addressAr?: string;
  addressEn?: string;
  footerAr?: string;
  footerEn?: string;
}

interface SystemSettingsContextProps {
  settings: OrganizationSettings;
  updateSettings: (newSettings: Partial<OrganizationSettings>) => Promise<void>;
  loading: boolean;
}

const defaultSettings: OrganizationSettings = {
  organizationNameAr: "مستشفى الرعاية الطبية الموحدة",
  organizationNameEn: "Unified Care Medical Hospital",
  logoUrl: "",
  phone: "19600",
  email: "info@carehospital.org",
  addressAr: "الفرع الرئيسي - قسم الجودة",
  addressEn: "Main Branch - Quality Department",
  footerAr: "قسم الجودة ومراقبة المعايير الطبية الموحدة - تقرير إلكتروني موثق بموجب المعايير الدولية",
  footerEn: "Standardized Clinical Quality & Risk Management - Certified Electronic Form"
};

const SystemSettingsContext = createContext<SystemSettingsContextProps | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<OrganizationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, "organizationSettings", "main");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as OrganizationSettings;
        setSettings({ ...defaultSettings, ...data });
      } else {
        // Document does not exist yet. Let's write the default setup
        setDoc(docRef, defaultSettings).catch((err) => {
          console.warn("Failed to write initial default settings to Firestore:", err);
        });
        setSettings(defaultSettings);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error watching organizationSettings document:", error);
      // Fallback on error if Firestore is offline
      setSettings(defaultSettings);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<OrganizationSettings>) => {
    const docRef = doc(db, "organizationSettings", "main");
    try {
      const updated = { ...settings, ...newSettings };
      await setDoc(docRef, updated);
      setSettings(updated);
    } catch (err) {
      console.error("Failed to update organization settings in Firestore:", err);
      throw err;
    }
  };

  return (
    <SystemSettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
  }
  return context;
};
