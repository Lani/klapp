import { Component, onMount, onCleanup, createEffect } from "solid-js";
import * as monaco from "monaco-editor";

// Configure Monaco global environment to handle web workers
if (window) {
  // Configure Monaco to use data URIs for web workers instead of separate files
  (window as any).MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      if (label === 'json') {
        return './json.worker.js';
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return './css.worker.js';
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return './html.worker.js';
      }
      if (label === 'typescript' || label === 'javascript') {
        return './ts.worker.js';
      }
      return './editor.worker.js';
    },
    // Fallback implementation that creates workers via blob URLs
    getWorker: function (_moduleId: string, label: string) {
      const workerCode = `
        self.MonacoEnvironment = {
          baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/'
        };
        importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/worker/workerMain.js');
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      return new Worker(URL.createObjectURL(blob));
    }
  };
}

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  theme?: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  editorRef?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export const MonacoEditor: Component<MonacoEditorProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  
  onMount(() => {
    if (!containerRef) return;
    
    // Create Monaco editor
    editor = monaco.editor.create(containerRef, {
      value: props.value || "",
      language: props.language || "javascript",
      theme: props.theme || "vs",
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      ...props.options
    });
    
    // Set up model change listener
    const changeModelDisposable = editor.onDidChangeModelContent(() => {
      const value = editor?.getValue() || "";
      props.onChange?.(value);
    });
    
    // Pass editor instance back via ref if provided
    if (props.editorRef && editor) {
      props.editorRef(editor);
    }
    
    // Update editor content when value prop changes
    let prevValue = props.value;
    createEffect(() => {
      const newValue = props.value;
      if (editor && newValue !== editor.getValue()) {
        editor.setValue(newValue);
      }
      prevValue = newValue;
    });
    
    onCleanup(() => {
      // Clean up editor resources
      changeModelDisposable.dispose();
      editor?.dispose();
    });
  });
  
  return (
    <div 
      ref={containerRef} 
      style={{ 
        "width": "100%", 
        "height": "100%",
        "min-height": "500px",
        "border": "1px solid #ddd"
      }} 
    />
  );
};

export default MonacoEditor;