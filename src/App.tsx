import type { Component } from 'solid-js';
import { createSignal, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { 
  DragDropProvider, 
  DragDropSensors, 
  DragOverlay, 
  useDragDropContext, 
  closestCenter 
} from '@thisbeyond/solid-dnd';
import styles from './App.module.css';

// Component imports
import { ToolboxPanel } from './components/ToolboxPanel';
import { DesignerPanel } from './components/DesignerPanel';
import { PropertyPanel } from './components/PropertyPanel';
import { ScreensPanel } from './components/ScreensPanel';

// Parser utilities for AST manipulation
import { parseComponent, updateComponentAST } from './utils/astUtils';

const App: Component = () => {
  const [screens, setScreens] = createStore<{ id: string; name: string; content: string }[]>([
    { id: '1', name: 'Home', content: 'export default function Home() { return <div>Home Screen</div>; }' }
  ]);
  
  const [activeScreen, setActiveScreen] = createSignal('1');
  const [selectedComponent, setSelectedComponent] = createSignal<null | { id: string, type: string, props: Record<string, any> }>(null);
  const [draggingItem, setDraggingItem] = createSignal<any>(null);
  
  // Reference to hold the addComponent method from DesignerPanel
  const designerAPI = {} as { addComponent?: (data: any) => void };

  const addScreen = (name: string) => {
    const id = Date.now().toString();
    setScreens([...screens, { 
      id, 
      name, 
      content: `export default function ${name}() { return <div>${name} Screen</div>; }`
    }]);
  };

  const deleteScreen = (id: string) => {
    setScreens(screens.filter((screen: {id: string}) => screen.id !== id));
    if (activeScreen() === id && screens.length > 1) {
      setActiveScreen(screens[0].id);
    }
  };

  const updateScreenName = (id: string, name: string) => {
    setScreens(
      screens.map((screen: {id: string, name: string, content: string}) => 
        screen.id === id ? { ...screen, name } : screen
      )
    );
  };

  const updateComponentProperty = (property: string, value: any) => {
    const component = selectedComponent();
    if (!component) return;
    
    const updatedComponent = {
      ...component,
      props: { ...component.props, [property]: value }
    };
    setSelectedComponent(updatedComponent);
    
    // Update AST for the active screen with the new component properties
    const activeScreenData = screens.find((s: {id: string}) => s.id === activeScreen());
    if (activeScreenData) {
      const updatedContent = updateComponentAST(
        activeScreenData.content,
        component.id,
        updatedComponent.props
      );
      
      setScreens(
        screens.map((s: {id: string, name: string, content: string}) => 
          s.id === activeScreen() ? { ...s, content: updatedContent } : s
        )
      );
    }
  };
  
  const handleDragStart = (event: any) => {
    // If dragging from toolbox, get the data from the draggable
    if (event.draggable.id.startsWith('toolbox-')) {
      setDraggingItem(event.draggable.data);
    }
  };
  
  const handleDragEnd = (event: any) => {
    const { draggable, droppable } = event;
    if (draggable && droppable) {
      // Handle drop into canvas
      if (droppable.id === 'canvas' && draggingItem() && designerAPI.addComponent) {
        // Add the component to the canvas using the DesignerPanel's addComponent method
        designerAPI.addComponent(draggingItem());
      }
    }
    setDraggingItem(null);
  };

  return (
    <div class={styles.appBuilder}>
      <DragDropProvider
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetector={closestCenter}
      >
        <DragDropSensors />
        <div class={styles.panelContainer}>
          <div class={styles.leftPanel}>
            <ToolboxPanel />
          </div>
          
          <div class={styles.middlePanel}>
            <DesignerPanel 
              activeScreenId={activeScreen()} 
              screens={screens} 
              onSelectComponent={setSelectedComponent}
              selectedComponent={selectedComponent()}
              addComponent={designerAPI}
            />
          </div>
          
          <div class={styles.rightPanel}>
            <div class={styles.screensPanelContainer}>
              <ScreensPanel 
                screens={screens}
                activeScreenId={activeScreen()}
                onSelectScreen={setActiveScreen}
                onAddScreen={addScreen}
                onUpdateScreenName={updateScreenName}
                onDeleteScreen={deleteScreen}
              />
            </div>
            <div class={styles.propertyPanelContainer}>
              <PropertyPanel 
                selectedComponent={selectedComponent()} 
                onUpdateProperty={updateComponentProperty}
              />
            </div>
          </div>
        </div>
        
        <DragOverlay>
          {draggingItem() && (
            <div class="toolbox-item-overlay">
              {draggingItem().type}
            </div>
          )}
        </DragOverlay>
      </DragDropProvider>
    </div>
  );
};

export default App;
