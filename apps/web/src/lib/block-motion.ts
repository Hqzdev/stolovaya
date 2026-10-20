const selector = ".motion-block, .motion-row, .motion-item";

export class BlockMotion {
  private readonly registered = new WeakSet<HTMLElement>();
  private readonly reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  private readonly visibility: IntersectionObserver;
  private readonly changes: MutationObserver;

  constructor(private readonly root: HTMLElement) {
    this.visibility = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            const element = entry.target as HTMLElement;
            this.reveal(element);
          });
      },
      { threshold: 0, rootMargin: "0px 0px 36px 0px" },
    );
    this.changes = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node instanceof HTMLElement && !this.root.contains(node))
            this.elements(node).forEach((element) =>
              this.visibility.unobserve(element),
            );
        }
      }
      const added = new Set<HTMLElement>();
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement)
            this.elements(node).forEach((element) => added.add(element));
        }
      }
      this.register([...added]);
    });
  }

  start(): void {
    this.register(this.elements(this.root));
    this.changes.observe(this.root, { childList: true, subtree: true });
    this.reducedMotion.addEventListener("change", this.onMotionPreference);
    this.root.addEventListener("focusin", this.onFocus);
  }

  stop(): void {
    this.changes.disconnect();
    this.visibility.disconnect();
    this.reducedMotion.removeEventListener("change", this.onMotionPreference);
    this.root.removeEventListener("focusin", this.onFocus);
  }

  private elements(root: HTMLElement): HTMLElement[] {
    return [
      ...(root.matches(selector) ? [root] : []),
      ...root.querySelectorAll<HTMLElement>(selector),
    ];
  }

  private register(elements: HTMLElement[]): void {
    const fresh = elements.filter(
      (element) => this.root.contains(element) && !this.registered.has(element),
    );
    const positions = fresh.map((element) => ({
      element,
      top: element.getBoundingClientRect().top,
    }));
    const groups = new Map<Element | null, number>();
    positions.forEach(({ element, top }) => {
      const step = groups.get(element.parentElement) || 0;
      groups.set(element.parentElement, step + 1);
      this.registered.add(element);
      element.dataset.motionStep ??= String(Math.min(step, 5));
      if (!this.reducedMotion.matches && top > window.innerHeight + 36) {
        element.dataset.motionState = "waiting";
        this.visibility.observe(element);
      } else if (element.dataset.motionState === "waiting") {
        this.reveal(element);
      }
    });
  }

  private reveal(element: HTMLElement): void {
    element.dataset.motionState = "visible";
    this.visibility.unobserve(element);
  }

  private readonly onMotionPreference = (): void => {
    if (this.reducedMotion.matches)
      this.root
        .querySelectorAll<HTMLElement>('[data-motion-state="waiting"]')
        .forEach((element) => this.reveal(element));
  };

  private readonly onFocus = (event: FocusEvent): void => {
    if (!(event.target instanceof HTMLElement)) return;
    let element: HTMLElement | null = event.target;
    while (element && element !== this.root) {
      if (element.dataset.motionState === "waiting") this.reveal(element);
      element = element.parentElement;
    }
  };
}
