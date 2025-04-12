import { Component, createSignal, onMount, For, Show } from "solid-js";
import { createDroppable } from "@thisbeyond/solid-dnd";
import { generateComponentId, extractComponentProps, updateComponentAST } from "../utils/astUtils";

interface DesignerPanelProps {
  activeScreenId: string;
  screens: { id: string; name: string; content: string }[];
  onSelectComponent: (component: any) => void;
  selectedComponent: any;
  addComponent?: any; // Will be set by App.tsx when a drop occurs
}

export const DesignerPanel: Component<DesignerPanelProps> = (props) => {
  const [components, setComponents] = createSignal<any[]>([]);
  
  // Find the active screen
  const activeScreen = () => props.screens.find(screen => screen.id === props.activeScreenId);

  // Method to add a component to the canvas
  const addComponent = (componentData: any) => {
    if (!componentData) return;
    
    const newComponent = {
      id: componentData.props.id || generateComponentId(),
      type: componentData.type,
      props: componentData.props
    };
    
    setComponents([...components(), newComponent]);
    props.onSelectComponent(newComponent);
    return newComponent;
  };

  // Watch for external add component props
  if (props.addComponent) {
    props.addComponent.addComponent = addComponent;
  }

  onMount(() => {
    // Initial setup - could parse the screen content to extract existing components
    setComponents([]);
  });

  // Handle drop from toolbox
  const handleDrop = (dragData: any) => {
    if (!dragData) return;
    
    const newComponent = {
      id: dragData.props.id || generateComponentId(),
      type: dragData.type,
      props: dragData.props
    };
    
    setComponents([...components(), newComponent]);
    props.onSelectComponent(newComponent);
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
              disabled={component.props.disabled}
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
    </div>
  );
};

export default DesignerPanel;