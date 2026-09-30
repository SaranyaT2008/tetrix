import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import i18n, { isLanguage, type LanguageCode } from "@/lib/i18n";

const STORAGE_KEY = "medilens.language";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (next: LanguageCode) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  // Adopt the stored choice, then the signed-in profile preference.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) {
      setLanguageState(stored);
      void i18n.changeLanguage(stored);
      document.documentElement.lang = stored;
      // The latest choice on this device wins; keep the profile in sync with it.
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", data.user.id)
        .maybeSingle();
      const pref = profile?.preferred_language;
      if (!cancelled && isLanguage(pref)) {
        setLanguageState(pref);
        void i18n.changeLanguage(pref);
        document.documentElement.lang = pref;
        window.localStorage.setItem(STORAGE_KEY, pref);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    void i18n.changeLanguage(next);
    document.documentElement.lang = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase.from("profiles").update({ preferred_language: next }).eq("id", data.user.id);
    })();
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
