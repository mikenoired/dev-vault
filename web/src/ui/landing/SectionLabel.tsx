export default function SectionLabel({ children }: { children: string }) {
  return (
    <div className="font-mono text-[11px] tracking-[0.36em] text-foreground/45 uppercase">
      {children}
    </div>
  );
}
