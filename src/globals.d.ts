export {};

declare global {
  interface Memory {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  }

  interface Performance {
    memory?: Memory;
  }
}
