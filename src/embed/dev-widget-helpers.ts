/** Same path as next-address-primary `chevron-down.svg` (viewBox normalized). */
const CHEVRON_DOWN_PATH =
  "M23.688,0.28 C23.295,-0.11 22.659,-0.11 22.268,0.28 L11.984,11.57 L1.702,0.28 C1.31,-0.11 0.674,-0.11 0.282,0.28 C-0.11,0.68 -0.11,1.32 0.282,1.71 L11.225,13.72 C11.434,13.93 11.711,14.02 11.984,14 C12.258,14.02 12.535,13.93 12.745,13.72 L23.688,1.71 C24.079,1.32 24.079,0.68 23.688,0.28";

export function appendDevWidgetChevron(parent: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "na-dev-widget__chevron");
  svg.setAttribute("viewBox", "0 -5 24 24");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", CHEVRON_DOWN_PATH);
  svg.appendChild(path);
  parent.appendChild(svg);
  return svg;
}
