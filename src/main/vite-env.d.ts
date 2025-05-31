/// <reference types="vite/client" />

// Asset imports
declare module '*.png?asset' {
  const src: string
  export default src
}
