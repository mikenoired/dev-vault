import { useEffect } from "react";

type HotkeyConfig = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  mod?: boolean; // Cmd on Mac, Ctrl on others
  shift?: boolean;
  alt?: boolean;
  preventDefault?: boolean;
};

export const useHotkey = (config: HotkeyConfig, handler: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      const { key, ctrl, meta, mod, shift, alt, preventDefault = true } = config;

      const matchKey = event.key.toLowerCase() === key.toLowerCase();
      const matchShift = !!shift === event.shiftKey;
      const matchAlt = !!alt === event.altKey;

      let matchMod = true;
      if (mod) {
        matchMod = isMac ? event.metaKey : event.ctrlKey;
      } else {
        if (ctrl !== undefined) matchMod = matchMod && !!ctrl === event.ctrlKey;
        if (meta !== undefined) matchMod = matchMod && !!meta === event.metaKey;
      }

      if (matchKey && matchMod && matchShift && matchAlt) {
        if (preventDefault) event.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config, handler]);
};
