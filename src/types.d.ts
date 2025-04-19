declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

// Add support for SolidJS directives
declare namespace JSX {
  interface Directives {
    createDraggable: any;
    createDroppable: any;
  }

  interface HTMLAttributes<T> extends DOMAttributes<T> {
    // Allow any custom attribute
    [name: string]: any;
  }
}
