import { Download, Library, Search } from "lucide-react";
import SectionLabel from "./SectionLabel";

const workflowSteps = [
  {
    icon: Library,
    id: "01",
    title: "Соберите всё, что обычно теряется",
    text: "API заметки, shell-команды, куски конфигов, инструкции из README и документацию из браузера.",
  },
  {
    icon: Download,
    id: "02",
    title: "Проиндексируйте локально",
    text: "SQLite FTS5 даёт быстрые точные результаты, а AI-слой можно включить без зависимости от сети.",
  },
  {
    icon: Search,
    id: "03",
    title: "Находите ответ быстрее, чем открывается вкладка",
    text: "Split-view и предпросмотр позволяют принимать решение прямо в поисковой выдаче.",
  },
];

export default function Workflow() {
  return <section id="workflow" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {workflowSteps.map((step) => (
          <div key={step.id} className="surface-panel-soft rounded-3xl p-5">
            <div className="font-mono text-sm text-[#7ceac3]">{step.id}</div>
            <h3 className="mt-5 font-display text-2xl leading-tight">
              <step.icon className="inline-block size-4.5 align-baseline mr-2" />
              {step.title.split(" ").map((word, i) => (
                  <span key={i} className={i === 0 ? "font-bold" : ""}>
                    {word}{" "}
                  </span>
                ))}
            </h3>
            <p className="mt-4 text-sm leading-7 text-foreground/62">{step.text}</p>
          </div>
        ))}
      </div>
  </section>
}
