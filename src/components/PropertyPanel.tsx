import { Component, For, Show } from "solid-js";

interface PropertyPanelProps {
  selectedComponent: null | { id: string; type: string; props: Record<string, any> };
  onUpdateProperty: (property: string, value: any) => void;
}

export const PropertyPanel: Component<PropertyPanelProps> = (props) => {
  // Handle input change for different property types
  const handleChange = (property: string, event: Event) => {
    const target = event.target as HTMLInputElement;
    let value: any;
    
    if (target.type === 'checkbox') {
      value = target.checked;
    } else if (target.type === 'number') {
      value = parseFloat(target.value);
    } else {
      value = target.value;
    }
    
    props.onUpdateProperty(property, value);
  };

  // Render property input based on value type
  const renderPropertyInput = (property: string, value: any) => {
    // Skip rendering 'id' property since it's not meant to be edited
    if (property === 'id') return null;
    
    const inputId = `prop-${property}`;
    
    // Handle different property types
    if (typeof value === 'boolean') {
      return (
        <input 
          id={inputId}
          type="checkbox" 
          checked={value} 
          onChange={(e) => handleChange(property, e)}
        />
      );
    }
    
    if (typeof value === 'number') {
      return (
        <input 
          id={inputId}
          type="number" 
          value={value} 
          onChange={(e) => handleChange(property, e)}
        />
      );
    }
    
    // Default to text input
    return (
      <input 
        id={inputId}
        type="text" 
        value={value} 
        onChange={(e) => handleChange(property, e)}
        style={{ "width": "100%" }}
      />
    );
  };

  return (
    <div class="property-grid">
      <Show 
        when={props.selectedComponent} 
        fallback={
          <div style={{ "text-align": "center", "color": "#999", "padding": "20px" }}>
            Select a component to edit its properties
          </div>
        }
      >
        <h3 style={{ "margin-top": "0" }}>
          {props.selectedComponent?.type} Properties
        </h3>
        
        <For each={Object.entries(props.selectedComponent?.props || {})}>
          {([property, value]) => (
            <Show when={property !== 'id'}>
              <div class="property-row">
                <div class="property-label">
                  {property}:
                </div>
                <div class="property-value">
                  {renderPropertyInput(property, value)}
                </div>
              </div>
            </Show>
          )}
        </For>
      </Show>
    </div>
  );
};

export default PropertyPanel;