import SectionLabel from "./SectionLabel";

const audiences = [
  "Backend и full-stack разработчики с большой личной базой знаний",
  "DevOps-инженеры, которым нужны повторяемые runbook-и и рабочие конфиги",
  "Команды, которые хотят локальный knowledge base без SaaS-зависимости",
];

export default function Audience() {
  return <section id="audience" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <div>
        <SectionLabel>Для кого</SectionLabel>
        <h2 className="font-display mt-4 text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">
          Для разработчиков, у которых знания уже не помещаются в голове и вкладках.
        </h2>
      </div>
      <div className="flex flex-col gap-4">
        {audiences.map((audience) => (
          <div key={audience} className="surface-panel-soft rounded-[1.4rem] px-5 py-4 text-sm leading-7 text-foreground/74">
            {audience}
          </div>
        ))}
      </div>
    </div>
  </section>
}
