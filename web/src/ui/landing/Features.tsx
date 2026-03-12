import SectionLabel from "./SectionLabel";

const featureCards = [
  { eyebrow: "Capture", title: "Тащите Markdown, HTML, code snippets и конфиги в одно хранилище." },
  { eyebrow: "Search", title: "Переключайтесь между точным и semantic search без смены контекста." },
  { eyebrow: "Reuse", title: "Открывайте, редактируйте и копируйте нужный фрагмент за секунды." },
  { eyebrow: "Agents", title: "Отдавайте проверенный контекст через MCP вместо ручной проклейки заметок в агентные пайплайны." },
];

export default function Features() {
  return <section id="features" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <div className="max-w-xl">
        <SectionLabel>Возможности</SectionLabel>
        <h2 className="font-display mt-4 text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">
          Не очередной markdown dump, а рабочий инструмент для ежедневной разработки.
        </h2>
        <p className="mt-5 text-base leading-8 text-foreground/64">
          Monolyth заточен под быстрый доступ к техническому контексту: меньше вкладок, меньше поисков по чату, меньше повторной сборки знаний из обрывков.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {featureCards.map((card, index) => (
          <article
            key={card.title}
            className={`rounded-[1.7rem] p-6 ${
              index === 1
                ? "surface-panel-emerald"
                : "surface-panel-soft"
            } min-h-72 xl:p-7`}
          >
            <div className="font-mono text-[11px] tracking-[0.3em] text-foreground/42 uppercase">
              {card.eyebrow}
            </div>
            <h3 className="mt-8 max-w-[14ch] font-display text-[1.9rem] leading-[1.2] tracking-[-0.03em] text-balance">
              {card.title}
            </h3>
          </article>
        ))}
      </div>
    </div>
  </section>
}
