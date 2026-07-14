// probe fixture: React 型なしで JSX を書くための最小 shim
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
}
