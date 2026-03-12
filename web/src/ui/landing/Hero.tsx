import Audience from "./Audience";
import Download from "./Download";
import Features from "./Features";
import Roadmap from "./Roadmap";
import Workflow from "./Workflow";
import SearchPreview from "./SearchPreview";

const pillars = [
  {
    title: "Гибридный поиск",
    text: "FTS5 для точных совпадений и локальные embeddings для смыслового поиска без облака.",
  },
  {
    title: "Структура без шума",
    text: "Сниппеты, заметки, конфиги и документация лежат в одном потоке с тегами и быстрым превью.",
  },
  {
    title: "Keyboard-first",
    text: "Мгновенный поиск, command palette и работа без мыши для реального ежедневного использования.",
  },
  {
    title: "MCP для агентов",
    text: "Подключайте Monolyth как локальный knowledge layer для AI-агентов и IDE-автоматизации.",
  },
];

export default function Hero() {
  return (
    <main id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-112 w-md -translate-x-1/2 rounded-full bg-[#78ffd1]/12 blur-3xl" />
        <div className="absolute top-56 -right-32 h-88 w-88 rounded-full bg-[#ffb168]/10 blur-3xl" />
        <div className="landing-grid absolute inset-0 opacity-40" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pt-32 pb-20 sm:px-6 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-display mt-4 text-5xl leading-none font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
            Техническая память команды.
            <span className="block text-foreground/55">Быстрая, локальная, всегда под рукой.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-foreground/68 sm:text-xl">
            Monolyth собирает сниппеты, документацию, заметки и конфиги в один desktop workspace с instant search и структурой, которая не мешает работать.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#download"
              className="inline-flex min-w-48 items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform duration-200 hover:-translate-y-0.5"
            >
              Запросить ранний доступ
            </a>
            <a
              href="#features"
              className="inline-flex min-w-48 items-center justify-center rounded-full bg-white/6 px-6 py-3 text-sm font-medium text-foreground/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-white/10"
            >
              Посмотреть возможности
            </a>
          </div>
        </div>

        <div className="mt-16">
          <SearchPreview />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="surface-panel-soft rounded-[1.6rem] p-5 text-left">
              <div className="font-display text-xl">{pillar.title}</div>
              <p className="mt-3 text-sm leading-7 text-foreground/62">{pillar.text}</p>
            </div>
          ))}
        </div>
      </section>

      <Features />
      <Workflow />
      <Audience />
      <Roadmap />
      <Download />
    </main>
  );
}
