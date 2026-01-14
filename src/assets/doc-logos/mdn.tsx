import type { SVGProps } from "react";

const Mdn = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" id="a" viewBox="0 0 150 150" {...props}>
    <title>MDN Web Docs logo</title>
    <defs>
      <style>{".c{fill:#1870f0}"}</style>
    </defs>
    <path
      d="M0 0h150v150H0V0Z"
      style={{
        fill: "none",
      }}
    />
    <path
      d="M60.03 15.74 23.25 134.18H8.21L44.86 15.74h15.17zM60.03 15.74H73.4v118.44H60.03zM125.23 15.74 88.58 134.18H73.53l36.65-118.44h15.05z"
      className="c"
    />
    <path d="M125.23 15.74h13.37v118.44h-13.37z" className="c" />
  </svg>
);

export { Mdn };
