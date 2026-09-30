import { cn } from "@/lib/utils";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-glass-border bg-glass p-1 text-xs font-semibold backdrop-blur",
        className,
      )}
    >
      {LANGUAGES.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => setLanguage(option.code)}
          aria-pressed={language === option.code}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            language === option.code
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}
