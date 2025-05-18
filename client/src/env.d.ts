/// <reference types="vite/client" />

declare module '*.yaml' {
  const content: any;
  export default content;
}

declare module '*.yaml?raw' {
  const content: string;
  export default content;
}
