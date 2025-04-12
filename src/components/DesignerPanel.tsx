import { Component, createSignal, onMount, For, Show, createEffect, on, createMemo } from "solid-js";
import { createDroppable } from "@thisbeyond/solid-dnd";
import { generateComponentId, extractComponentProps, updateComponentAST, parseComponentsFromJSX } from "../utils/astUtils";
import MonacoEditor from "./MonacoEditor";
import * as monaco from 'monaco-editor';

// Define change sources to prevent feedback loops
type ChangeSource = 'code' | 'property-grid' | 'designer' | 'initial';

interface DesignerPanelProps {
  activeScreenId: string;
  screens: { id: string; name: string; content: string }[];
  onSelectComponent: (component: any) => void;
  selectedComponent: any;
  addComponent?: any; // Will be set by App.tsx when a drop occurs
  onUpdateScreenContent?: (screenId: string, content: string) => void;
}

export const DesignerPanel: Component<DesignerPanelProps> = (props) => {
  const [components, setComponents] = createSignal<any[]>([]);
  const [activeTab, setActiveTab] = createSignal<'design' | 'code'>('design');
  const [codeValue, setCodeValue] = createSignal<string>('');
  const [editorInstance, setEditorInstance] = createSignal<monaco.editor.IStandaloneCodeEditor | null>(null);
  // Track the source of the last change to prevent feedback loops
  const [changeSource, setChangeSource] = createSignal<ChangeSource>('initial');
  
  // Find the active screen
  const activeScreen = () => props.screens.find(screen => screen.id === props.activeScreenId);

  // Create a memo to track the active screen's content
  const activeScreenContent = createMemo(() => {
    const screen = activeScreen();
    return screen?.content || '';
  });

  // Update code editor content and components when active screen changes
  createEffect(() => {
    const screenId = props.activeScreenId; // Dependency to track screen changes
    const content = activeScreenContent();
    
    if (content) {
      setCodeValue(content);
      
      // Update the editor directly if it exists and the code tab is active
      // But only if the change didn't originate from the code editor itself
      const editor = editorInstance();
      const source = changeSource();
      if (editor && activeTab() === 'code' && source !== 'code') {
        const currentPos = editor.getPosition();
        if (editor.getValue() !== content) {
          editor.setValue(content);
          // Restore cursor position after content update
          if (currentPos) {
            editor.setPosition(currentPos);
            editor.revealPositionInCenter(currentPos);
          }
        }
      }
      
      // Only update components if change didn't come from the designer
      if (source !== 'designer') {
        // Parse components from the screen content
        try {
          const extractedComponents = parseComponentsFromJSX(content);
          setComponents(extractedComponents);
        } catch (error) {
          console.error("Error parsing components:", error);
        }
      }
    }
  });

  // Update code value when screen content changes from outside
  // This ensures property changes are reflected in the code view
  createEffect(() => {
    const screen = activeScreen();
    if (screen) {
      setCodeValue(screen.content);
    }
  });

  // Store the editor instance when it's created
  const handleEditorRef = (editor: monaco.editor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);
  };

  // Method to add a component to the canvas
  const addComponent = (componentData: any) => {
    if (!componentData) return;
    
    const newComponent = {
      id: componentData.props.id || generateComponentId(),
      type: componentData.type,
      props: componentData.props
    };
    
    setChangeSource('designer');
    setComponents([...components(), newComponent]);
    props.onSelectComponent(newComponent);
    return newComponent;
  };

  // Watch for external add component props
  if (props.addComponent) {
    props.addComponent.addComponent = addComponent;
  }

  onMount(() => {
    // Parse the active screen's content to extract existing components
    const screen = activeScreen();
    if (screen) {
      // For now, we're just starting with an empty canvas
      // In a more advanced version, we would parse the JSX to create component objects
      setComponents([]);
    }
  });

  // Update components when active screen changes
  createEffect(() => {
    const screen = props.activeScreenId;
    // Reset components when switching screens
    setComponents([]);
  });

  // Effect to update the component when its properties change in the property grid
  createEffect(on(() => props.selectedComponent, (selectedComponent) => {
    if (!selectedComponent) return;
    
    // Skip updating components if the change came from the code editor
    // This prevents feedback loops
    if (changeSource() === 'code') return;
    
    // Update the component in our local list when its properties change
    setChangeSource('property-grid');
    setComponents(prevComponents => 
      prevComponents.map(comp => 
        comp.id === selectedComponent.id ? selectedComponent : comp
      )
    );
    
    // If the code view is active, update it immediately when properties change
    if (activeScreen() && activeTab() === 'code') {
      // We're setting code value even if design tab is active to maintain sync
      setCodeValue(activeScreen()!.content);
    }
  }));

  // Handle drop from toolbox
  const handleDrop = (dragData: any) => {
    if (!dragData) return;
    
    const newComponent = {
      id: dragData.props.id || generateComponentId(),
      type: dragData.type,
      props: dragData.props
    };
    
    setChangeSource('designer');
    setComponents([...components(), newComponent]);
    props.onSelectComponent(newComponent);
  };

  // Handle code change in the editor
  const handleCodeChange = (newValue: string) => {
    setCodeValue(newValue);
    setChangeSource('code');
    
    // Parse the code for components and update the designer
    try {
      const extractedComponents = parseComponentsFromJSX(newValue);
      setComponents(extractedComponents);
      
      // If a component is currently selected, update its properties from the code
      const selectedComp = props.selectedComponent;
      if (selectedComp) {
        // Find the same component in the newly extracted components
        const updatedComponent = extractedComponents.find(comp => comp.id === selectedComp.id);
        if (updatedComponent) {
          // Update the selected component with the new properties from code
          props.onSelectComponent(updatedComponent);
        }
      }
    } catch (error) {
      console.error("Error parsing components from code:", error);
    }
    
    // Update the screen content in the parent component
    const screen = activeScreen();
    if (screen && props.onUpdateScreenContent) {
      props.onUpdateScreenContent(screen.id, newValue);
    }
  };

  // Render a component based on its type
  const renderComponent = (component: any) => {
    const isSelected = props.selectedComponent && props.selectedComponent.id === component.id;
    
    switch (component.type) {
      case "Button":
        return (
          <div 
            class={`component-item ${isSelected ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              props.onSelectComponent(component);
            }}
          >
            <button 
              id={component.props.id}
              class={component.props.class}
              disabled={component.props.disabled === true}
            >
              {component.props.children}
            </button>
          </div>
        );
      
      default:
        return (
          <div 
            class={`component-item ${isSelected ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              props.onSelectComponent(component);
            }}
          >
            Unknown component: {component.type}
          </div>
        );
    }
  };

  const droppable = createDroppable("canvas", {
    // Only accept the components from our toolbox
    accept: ["toolbox-Button"],
  });

  return (
    <div class="designer-container">
      {/* Tab navigation */}
      <div class="designer-tabs">
        <button 
          class={`tab-button ${activeTab() === 'design' ? 'active' : ''}`}
          onClick={() => setActiveTab('design')}
        >
          Design
        </button>
        <button 
          class={`tab-button ${activeTab() === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          Code
        </button>
      </div>

      {/* Design view */}
      <Show when={activeTab() === 'design'}>
        <div 
          class="designer-canvas"
          use:droppable
          onClick={() => props.onSelectComponent(null)}
        >
          <Show when={components().length === 0}>
            <div style={{ "text-align": "center", "padding": "50px", "color": "#999" }}>
              Drag components from the toolbox to build your UI
            </div>
          </Show>
          
          <For each={components()}>
            {(component) => renderComponent(component)}
          </For>
        </div>
      </Show>

      {/* Code view */}
      <Show when={activeTab() === 'code'}>
        <div class="code-editor-container">
          <MonacoEditor 
            value={codeValue()} 
            onChange={handleCodeChange}
            language="javascript"
            editorRef={handleEditorRef}
            options={{ 
              readOnly: false,
              lineNumbers: 'on',
              roundedSelection: true,
              scrollBeyondLastLine: false,
              theme: 'vs'
            }}
          />
        </div>
      </Show>
    </div>
  );
};

export default DesignerPanel;