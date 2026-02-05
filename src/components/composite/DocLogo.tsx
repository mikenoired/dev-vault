import type { SupportedLanguages } from "@/types";
import {
  Bun,
  ElysiaJS,
  Hono,
  Mdn,
  Nextjs,
  Nodejs,
  Nuxtjs,
  Python,
  React,
  Rust,
  Typescript,
} from "../../assets/doc-logos";

const logos = {
  python: Python,
  rust: Rust,
  react: React,
  typescript: Typescript,
  nodejs: Nodejs,
  mdn: Mdn,
  hono: Hono,
  bun: Bun,
  elysiajs: ElysiaJS,
  nextjs: Nextjs,
  nuxtjs: Nuxtjs,
} as const;

// FIXME: Make types sizable without this strange hook
export default function DocLogo({ name }: { name: SupportedLanguages | string }) {
  const Logo = logos[name as keyof typeof logos];
  return <Logo className="size-5 text-muted-foreground shrink-0" />;
}
