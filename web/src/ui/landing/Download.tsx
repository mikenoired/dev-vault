import SectionLabel from "./SectionLabel"

export default function Download() {
  return <section id="download" className="relative mx-auto max-w-7xl px-4 pt-8 pb-24 sm:px-6 lg:px-8">
    <div className="rounded-[2.2rem] bg-[linear-gradient(135deg,rgba(120,255,209,0.18),rgba(255,176,107,0.14),rgba(255,255,255,0.05))] p-8 shadow-[0_28px_90px_rgba(4,8,18,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-10 lg:p-14">
      <SectionLabel>Ранний доступ</SectionLabel>
      <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">
            Monolyth сейчас в alpha. Ищем команды, у которых поиск по техническому знанию уже стал узким местом.
          </h2>
          <p className="mt-5 text-base leading-8 text-foreground/72">
            Desktop-first, offline-first, быстрый импорт и локальная индексация. Если это ваш сценарий, лендинг уже готов вести дальше на waitlist или download flow.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="mailto:hello@devvault.app"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
          >
            hello@devvault.app
          </a>
          <a
            href="#top"
            className="inline-flex items-center justify-center rounded-full bg-white/8 px-6 py-3 text-sm font-medium text-foreground/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            Наверх
          </a>
        </div>
      </div>
    </div>
  </section>
}
