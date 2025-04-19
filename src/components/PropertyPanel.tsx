import { Component, Show, For } from 'solid-js';

interface PropertyPanelProps {
  selectedComponent: any;
  onUpdateProperty: (propertyName: string, propertyValue: any) => void;
}

export const PropertyPanel: Component<PropertyPanelProps> = (props) => {
  const handleChange = (propertyName: string, event: Event) => {
    const target = event.target as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;
    let value: any;

    // Handle different types of inputs
    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked;
    } else if (target.type === 'number') {
      value = parseFloat(target.value);
    } else {
      value = target.value;
    }

    props.onUpdateProperty(propertyName, value);
  };

  const renderPropertyEditor = (propertyName: string, propertyValue: any) => {
    // Skip id (should not be editable)
    if (propertyName === 'id') return null;

    // Render appropriate input type based on property type
    switch (typeof propertyValue) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={propertyValue}
            onInput={(e) => handleChange(propertyName, e)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={propertyValue}
            onInput={(e) => handleChange(propertyName, e)}
          />
        );

      case 'string':
        // For multi-line text like JSX or function definitions
        if (
          propertyName.startsWith('on') &&
          (propertyValue.includes('=>') || propertyValue.includes('function'))
        ) {
          return (
            <textarea
              value={propertyValue}
              onInput={(e) => handleChange(propertyName, e)}
              style={{ width: '100%', 'min-height': '80px' }}
            />
          );
        }

        // For regular strings
        return (
          <input
            type="text"
            value={propertyValue}
            onInput={(e) => handleChange(propertyName, e)}
          />
        );

      default:
        // For complex objects
        return (
          <textarea
            value={JSON.stringify(propertyValue, null, 2)}
            onInput={(e) => {
              try {
                const parsed = JSON.parse(e.currentTarget.value);
                props.onUpdateProperty(propertyName, parsed);
              } catch (err) {
                // Handle invalid JSON
                console.error('Invalid JSON input:', err);
              }
            }}
            style={{ width: '100%', 'min-height': '80px' }}
          />
        );
    }
  };

  return (
    <div class="property-grid">
      <h3 style={{ 'margin-top': '0' }}>Properties</h3>

      <Show
        when={props.selectedComponent}
        fallback={
          <div style={{ color: '#999' }}>
            Select a component to edit its properties
          </div>
        }
      >
        <For each={Object.entries(props.selectedComponent?.props || {})}>
          {([propertyName, propertyValue]) => (
            <div class="property-row">
              <div class="property-label">{propertyName}:</div>
              <div class="property-value">
                {renderPropertyEditor(propertyName, propertyValue)}
              </div>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
};

export default PropertyPanel;
