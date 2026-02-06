import type { SVGProps } from "react";
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
} from "@/assets/doc-logos";
import type { SupportedLanguages } from "@/types";

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
export default function DocLogo({
  name,
  sizeClass = "size-5",
  className,
  ...props
}: { name: SupportedLanguages | string; sizeClass?: string } & SVGProps<SVGSVGElement>) {
  const Logo = logos[name as keyof typeof logos];
  return (
    <Logo
      {...props}
      className={`${sizeClass} text-muted-foreground shrink-0${className ? ` ${className}` : ""}`}
    />
  );
}
