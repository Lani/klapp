import { Component, createSignal, For, Show } from 'solid-js';

interface ScreensPanelProps {
  screens: { id: string; name: string; content: string }[];
  activeScreenId: string;
  onSelectScreen: (id: string) => void;
  onAddScreen: (name: string) => void;
  onUpdateScreenName: (id: string, name: string) => void;
  onDeleteScreen: (id: string) => void;
}

export const ScreensPanel: Component<ScreensPanelProps> = (props) => {
  const [isAdding, setIsAdding] = createSignal(false);
  const [newScreenName, setNewScreenName] = createSignal('');
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [editingName, setEditingName] = createSignal('');

  const handleAddScreen = () => {
    if (newScreenName().trim()) {
      props.onAddScreen(newScreenName().trim());
      setNewScreenName('');
      setIsAdding(false);
    }
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEditing = () => {
    if (editingId() && editingName().trim()) {
      props.onUpdateScreenName(editingId()!, editingName().trim());
      setEditingId(null);
    }
  };

  const handleDeleteScreen = (id: string) => {
    if (props.screens.length > 1) {
      props.onDeleteScreen(id);
    } else {
      alert('Cannot delete the only screen in the application.');
    }
  };

  return (
    <div class="screens-list">
      <h3 style={{ 'margin-top': '0' }}>Screens</h3>

      <For each={props.screens}>
        {(screen) => (
          <div
            class={`screen-item ${props.activeScreenId === screen.id ? 'active' : ''}`}
          >
            <Show
              when={editingId() !== screen.id}
              fallback={
                <div style={{ display: 'flex', width: '100%' }}>
                  <input
                    type="text"
                    value={editingName()}
                    onInput={(e) => setEditingName(e.currentTarget.value)}
                    style={{ flex: '1' }}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditing()}
                    autofocus
                  />
                  <button
                    onClick={saveEditing}
                    style={{ 'margin-left': '5px' }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ 'margin-left': '5px' }}
                  >
                    ✗
                  </button>
                </div>
              }
            >
              <div
                style={{ cursor: 'pointer', flex: '1' }}
                onClick={() => props.onSelectScreen(screen.id)}
              >
                {screen.name}
              </div>
              <div class="screen-actions">
                <button onClick={() => startEditing(screen.id, screen.name)}>
                  ✏️
                </button>
                <button onClick={() => handleDeleteScreen(screen.id)}>
                  🗑️
                </button>
              </div>
            </Show>
          </div>
        )}
      </For>

      <Show
        when={!isAdding()}
        fallback={
          <div style={{ 'margin-top': '10px', display: 'flex' }}>
            <input
              type="text"
              value={newScreenName()}
              onInput={(e) => setNewScreenName(e.currentTarget.value)}
              placeholder="Screen name..."
              style={{ flex: '1' }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddScreen()}
              autofocus
            />
            <button onClick={handleAddScreen} style={{ 'margin-left': '5px' }}>
              Add
            </button>
            <button
              onClick={() => setIsAdding(false)}
              style={{ 'margin-left': '5px' }}
            >
              Cancel
            </button>
          </div>
        }
      >
        <button class="add-screen-btn" onClick={() => setIsAdding(true)}>
          + Add Screen
        </button>
      </Show>
    </div>
  );
};

export default ScreensPanel;
