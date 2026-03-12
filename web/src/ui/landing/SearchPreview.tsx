export default function SearchPreview() {
  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-4xl bg-[#0c111b]/90 p-3 shadow-[0_40px_140px_rgba(3,8,20,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(112,255,199,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,166,77,0.16),transparent_30%)]" />
      <div className="relative rounded-[1.55rem] bg-[#0a0f17]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f67280]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f8b250]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#8ad772]" />
          </div>
        </div>
        <div className="surface-divider h-px w-full" />

        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-5 lg:pr-0">
            <div className="rounded-2xl bg-white/4 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[11px] tracking-[0.3em] text-[#7ceac3] uppercase">instant search</div>
                  <div className="mt-1 text-sm text-white/45">hybrid mode: fts + semantic</div>
                </div>
                <div className="rounded-full bg-black/20 px-3 py-1 font-mono text-xs text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  &lt; 50ms FTS
                </div>
              </div>

              <div className="mb-4 rounded-2xl bg-[#081219] px-4 py-3 font-mono text-sm text-[#dffef3] shadow-[0_10px_30px_rgba(2,12,10,0.18),inset_0_1px_0_rgba(124,234,195,0.14)]">
                query: "postgres retry policy docker compose"
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: "Docker compose: postgres with healthcheck and retry",
                    meta: "snippet · infra · updated 2d ago",
                    tone: "bg-[#10221f] text-[#dffef3] shadow-[inset_0_1px_0_rgba(124,234,195,0.14)]",
                  },
                  {
                    title: "Connection pool tuning for async Rust services",
                    meta: "doc · backend · semantic match 0.88",
                    tone: "bg-white/[0.03] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                  },
                  {
                    title: "Operational checklist before production migration",
                    meta: "note · team docs · tagged runbook",
                    tone: "bg-white/[0.03] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                  },
                ].map((item) => (
                  <div key={item.title} className={`rounded-2xl p-4 ${item.tone}`}>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="mt-2 font-mono text-xs tracking-wide opacity-70">{item.meta}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative p-5 lg:pl-6">
            <div className="surface-divider absolute top-5 bottom-5 left-0 hidden w-px lg:block" />
            <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] tracking-[0.28em] text-[#ffbd73] uppercase">preview</div>
                  <div className="mt-1 text-sm text-white/45">snippet.ts</div>
                </div>
                <span className="rounded-full bg-white/6 px-2.5 py-1 font-mono text-[11px] text-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  Cmd+Enter copy
                </span>
              </div>

              <pre className="overflow-hidden rounded-2xl bg-black/25 p-4 font-mono text-[12px] leading-6 text-white/78">
                <code>{`const retryPolicy = {
  attempts: 5,
  backoff: "exponential",
  timeoutMs: 1500,
};`}</code>
              </pre>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div className="font-mono text-[11px] tracking-[0.2em] text-white/38 uppercase">tags</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/70">
                    {["rust", "postgres", "infra", "runbook"].map((tag) => (
                      <span key={tag} className="rounded-full bg-white/6 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
