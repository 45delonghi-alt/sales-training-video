// @types/react-dom を追加せずに使うための最小の型（createRoot だけ使う）
declare module 'react-dom/client' {
  import type {ReactNode} from 'react';
  export function createRoot(container: Element): {render(children: ReactNode): void; unmount(): void};
}
