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
import * as recast from 'recast';

// Component imports
import { ToolboxPanel } from './components/ToolboxPanel';
import { DesignerPanel } from './components/DesignerPanel';
import { PropertyPanel } from './components/PropertyPanel';
import { ScreensPanel } from './components/ScreensPanel';

// Parser utilities for AST manipulation
import { parseComponent, updateComponentAST } from './utils/astUtils';

// Helper function to create JSX attributes for the AST
function createJSXAttribute(name: string, value: any): any {
  // Skip children property as it should be rendered as content
  if (name === 'children') {
    return null;
  }

  // Simple string attribute
  if (typeof value === 'string') {
    // For onClick or other event handlers, use JSX expression container
    if (name.startsWith('on') && (value.includes('=>') || value.includes('function'))) {
      return recast.types.builders.jsxAttribute(
        recast.types.builders.jsxIdentifier(name),
        recast.types.builders.jsxExpressionContainer(
          recast.parse(value).program.body[0].expression
        )
      );
    }
    return recast.types.builders.jsxAttribute(
      recast.types.builders.jsxIdentifier(name),
      recast.types.builders.stringLiteral(value)
    );
  }
  
  // Boolean attribute
  if (typeof value === 'boolean') {
    if (value) {
      return recast.types.builders.jsxAttribute(
        recast.types.builders.jsxIdentifier(name),
        null
      );
    }
    // For explicit false values, use {false}
    const jsxValue = recast.types.builders.jsxExpressionContainer(
      recast.types.builders.booleanLiteral(false)
    );
    return recast.types.builders.jsxAttribute(
      recast.types.builders.jsxIdentifier(name),
      jsxValue
    );
  }

  // Number attribute
  if (typeof value === 'number') {
    const jsxValue = recast.types.builders.jsxExpressionContainer(
      recast.types.builders.numericLiteral(value)
    );
    return recast.types.builders.jsxAttribute(
      recast.types.builders.jsxIdentifier(name),
      jsxValue
    );
  }

  // Object/array attribute
  const jsxValue = recast.types.builders.jsxExpressionContainer(
    recast.parse('(' + JSON.stringify(value) + ')').program.body[0].expression
  );
  
  return recast.types.builders.jsxAttribute(
    recast.types.builders.jsxIdentifier(name),
    jsxValue
  );
}

const App: Component = () => {
  const [screens, setScreens] = createStore<{ id: string; name: string; content: string }[]>([
    { 
      id: '1', 
      name: 'Home', 
      content: `import { createSignal } from 'solid-js';

export default function Home() {
  return (
    <div>
    </div>
  );
}`
    }
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
      content: `import { createSignal } from 'solid-js';

export default function ${name}() {
  return (
    <div>
      <h1>${name} Screen</h1>
    </div>
  );
}`
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

  // Function to update screen content when edited in the code editor
  const updateScreenContent = (screenId: string, newContent: string) => {
    setScreens(
      screens.map((s: {id: string, name: string, content: string}) => 
        s.id === screenId ? { ...s, content: newContent } : s
      )
    );
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
        const newComponent = designerAPI.addComponent(draggingItem());
        
        // Update the screen's code to include the new component
        const activeScreenData = screens.find((s: {id: string}) => s.id === activeScreen());
        if (activeScreenData && newComponent) {
          // Insert component into the screen's JSX using AST
          const ast = parseComponent(activeScreenData.content);
          if (ast) {
            // Find the return statement in the component
            let returnStatement: any = null;
            
            recast.visit(ast, {
              visitReturnStatement(path) {
                returnStatement = path.node;
                return false;
              }
            });
            
            if (returnStatement && returnStatement.argument) {
              // Find the div in the return statement
              let divElement: any = null;
              
              recast.visit(returnStatement, {
                visitJSXElement(path) {
                  if (path.node.openingElement.name.name === 'div') {
                    divElement = path.node;
                    return false;
                  }
                  this.traverse(path);
                  return undefined;
                }
              });
              
              if (divElement) {
                // Create a button JSX element
                const buttonProps = Object.entries(newComponent.props)
                  .filter(([key]) => key !== 'children')
                  .map(([key, value]) => createJSXAttribute(key, value))
                  .filter(Boolean);
                
                const buttonElement = recast.types.builders.jsxElement(
                  // Opening tag with properties
                  recast.types.builders.jsxOpeningElement(
                    recast.types.builders.jsxIdentifier('button'),
                    buttonProps,
                    false
                  ),
                  // Closing tag
                  recast.types.builders.jsxClosingElement(
                    recast.types.builders.jsxIdentifier('button')
                  ),
                  // Children (text content)
                  [recast.types.builders.jsxText(newComponent.props.children || 'Button')]
                );
                
                // Add button to the div's children
                divElement.children.push(
                  recast.types.builders.jsxText('\n    '),  // Indentation
                  buttonElement,
                  recast.types.builders.jsxText('\n  ')     // Closing indentation
                );
                
                // Update the screen content
                const updatedContent = recast.print(ast).code;
                updateScreenContent(activeScreen(), updatedContent);
              }
            }
          }
        }
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
              onUpdateScreenContent={updateScreenContent}
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
