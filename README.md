# KLAPP - Visual App Builder for SolidJS

> **DISCLAIMER 1**: All code in this repository was written by GitHub Copilot Agent Mode powered by Claude 3.7 Sonnet.

> **DISCLAIMER 2**: This project is a work in progress and is not yet fully functional. It is intended for educational purposes for evaluating the capabilities of AI in code generation and manipulation. The project is not intended for production use and contain bugs and incomplete features.

> **DISCLAIMER 3**: The generated code is crap when compared to the code written by a human. 

## Overview

KLAPP is a low-code visual application builder for SolidJS that enables developers to create web applications through a combination of drag-and-drop visual editing and code editing. The application features a three-panel interface that synchronizes in real-time:

1. **Visual Designer** - Drag components onto a canvas to visually build your UI
2. **Code Editor** - Edit the generated SolidJS code directly using Monaco Editor
3. **Property Panel** - Modify component properties through a user-friendly interface

## Key Features

- **Bi-directional Synchronization**: Changes made in any panel (designer, code, properties) are immediately reflected in the others
- **Component Library**: Drag and drop UI components like buttons from the toolbox
- **Screen Management**: Create and manage multiple screens in your application
- **Advanced Code Editing**: Full-featured Monaco Editor with syntax highlighting and IntelliSense
- **AST-based Code Generation**: Uses Abstract Syntax Trees for precise code manipulation and formatting

## Technical Details

KLAPP is built using:

- **SolidJS**: Fast, reactive UI framework
- **Monaco Editor**: VS Code's editor component for code editing
- **Recast/Babel**: For AST-based code manipulation
- **Solid-DND**: Drag and drop functionality
- **TypeScript**: Type safety throughout the application

## How It Works

1. **Component Management**: Components are represented internally as objects with properties
2. **AST Manipulation**: Code changes use Abstract Syntax Tree manipulation to ensure proper formatting
3. **Change Source Tracking**: Prevents feedback loops by tracking where changes originate
4. **Reactive Data Flow**: SolidJS's reactive system keeps all views synchronized

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

- `src/components/` - UI components for the builder interface
- `src/utils/` - Utility functions including AST manipulation
- `src/App.tsx` - Main application component and state management

## Usage

1. **Add Components**: Drag components from the toolbox to the designer
2. **Edit Properties**: Select a component and modify its properties in the panel
3. **Code Editing**: Switch to code view to directly edit the generated SolidJS code
4. **Create Screens**: Add multiple screens to build multi-page applications

## License

[MIT License](LICENSE)
