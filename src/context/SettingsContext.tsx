import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface Settings {
  institutionNameAr: string;
  institutionNameEn: string;
  taglineAr: string;
  taglineEn: string;
  address: string;
  emergencyPhone: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Settings) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>({ 
    institutionNameAr: "مؤسسة بهية", 
    institutionNameEn: "Baheya Foundation",
    taglineAr: "في ضهر كل ست مصرية",
    taglineEn: "Breast Cancer Screening & Treatment",
    address: "الهرم / الشيخ زايد، الجيزة، مصر",
    emergencyPhone: "19745"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "config", "settings");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as Settings);
        }
      } catch (error) {
        console.warn("Firestore offline or configuration missing in SettingsContext. Using default values.", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Settings) => {
    try {
      const docRef = doc(db, "config", "settings");
      await setDoc(docRef, newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.warn("Firestore offline or configuration missing. Saving settings locally.", error);
      setSettings(newSettings);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};
