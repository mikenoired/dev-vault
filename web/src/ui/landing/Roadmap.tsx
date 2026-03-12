import SectionLabel from "./SectionLabel";

const roadmapItems = [
  {
    title: "50+ доступных к скачиванию документаций",
    text: "Готовая библиотека документаций и reference packs, которые можно подтянуть в локальное хранилище за пару кликов.",
  },
  {
    title: "Monolyth Cloud",
    text: "Облачный слой для синхронизации, совместного доступа и доставки знаний между устройствами и командами.",
  },
];

export default function Roadmap() {
  return <section id="roadmap" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <div className="max-w-xl">
        <SectionLabel>Roadmap</SectionLabel>
        <h2 className="font-display mt-4 text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">
          Дальше не только поиск, но и готовые knowledge packs plus cloud-слой.
        </h2>
        <p className="mt-5 text-base leading-8 text-foreground/64">
          Ближайшие релизы расширяют Monolyth в двух направлениях: готовый контент для быстрого старта и инфраструктура для командной работы.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roadmapItems.map((item, index) => (
          <article
            key={item.title}
            className={`rounded-[1.8rem] p-6 ${
              index === 0
                ? "surface-panel-amber"
                : "surface-panel-emerald"
            }`}
          >
            <div className="font-mono text-[11px] tracking-[0.3em] text-foreground/42 uppercase">
              planned
            </div>
            <h3 className="mt-8 font-display text-2xl leading-tight">{item.title}</h3>
            <p className="mt-4 text-sm leading-7 text-foreground/64">{item.text}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
}
