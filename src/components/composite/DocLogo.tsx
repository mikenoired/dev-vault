import type { DocName } from "@/types";
import { Mdn, Nodejs, Python, React, Rust, Typescript } from "../../assets/doc-logos";

const logos = {
  python: Python,
  rust: Rust,
  react: React,
  typescript: Typescript,
  nodejs: Nodejs,
  mdn: Mdn,
} as const;

export default function DocLogo({ name }: { name: DocName }) {
  const Logo = logos[name];
  return <Logo className="size-5 text-muted-foreground shrink-0 mt-0.5" />;
}
