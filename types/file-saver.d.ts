// Minimal module declaration for `file-saver` to silence TypeScript when @types/file-saver
// Prefer installing the real types: `npm i -D @types/file-saver` and then remove this file.

declare module 'file-saver' {
  export function saveAs(data: Blob | File | string, filename?: string, disableAutoBOM?: boolean): void;
  export default saveAs;
}
