import { Component, For } from "solid-js";
import { createDraggable } from '@thisbeyond/solid-dnd';
import { generateComponentId } from "../utils/astUtils";

// Define toolbox components with their default properties
const toolboxComponents = [
  {
    type: "Button",
    label: "Button",
    defaultProps: {
      children: "Button",
      onClick: "() => console.log('Button clicked')",
      class: "btn",
      disabled: false
    }
  },
  // More components can be added here later
];

export const ToolboxPanel: Component = () => {
  return (
    <div class="toolbox">
      <h2 style={{ "text-align": "center", "padding": "10px", "margin": "0", "border-bottom": "1px solid #ddd" }}>
        Component Toolbox
      </h2>
      
      <For each={toolboxComponents}>
        {(component) => {
          const draggable = createDraggable(`toolbox-${component.type}`, {
            type: component.type,
            props: {
              ...component.defaultProps,
              id: generateComponentId()
            }
          });
          
          return (
            <div
              class="toolbox-item"
              use:draggable
            >
              {component.label}
            </div>
          );
        }}
      </For>
    </div>
  );
};

export default ToolboxPanel;