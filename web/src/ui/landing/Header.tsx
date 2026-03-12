import { useEffect, useState } from "react";
import { LogoIcon, LogoName } from "../icons";
import { Sun, Moon } from 'lucide-react';

const THEME_STORAGE_KEY = "dev-vault-theme";
const navigationItems = [
  { label: "Возможности", href: "#features" },
  { label: "Поток", href: "#workflow" },
  { label: "Для кого", href: "#audience" },
  { label: "Roadmap", href: "#roadmap" },
];

type ThemeMode = "light" | "dark";

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

export default function Header() {
  const [theme, setTheme] = useState<ThemeMode>(() => getPreferredTheme());

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <header className="fixed top-0 left-0 z-50 w-full px-4 py-4">
      <div className="surface-panel mx-auto flex max-w-4xl items-center justify-between rounded-full pl-5 pr-4 py-3">
        <a href="#top" className="flex items-center gap-3 group">
          <LogoIcon className="h-6 w-auto dark:group-hover:text-green-300 transition-colors group-hover:text-green-700" title="Monolyth" />
          <LogoName className="h-6 dark:group-hover:text-green-300 transition-colors group-hover:text-green-700" />
        </a>

        <nav className="hidden items-center gap-6 text-sm text-foreground/70 md:flex">
          {navigationItems.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#download"
            className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background shadow-[0_12px_32px_rgba(255,255,255,0.12)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Скачать alpha
          </a>
          <button
            type="button"
            onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
            className="inline-flex h-10 items-center rounded-full bg-white/8 px-3 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-white/12 cursor-pointer"
            aria-label={theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
            aria-pressed={theme === "dark"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
