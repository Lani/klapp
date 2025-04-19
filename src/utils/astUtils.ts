import * as acorn from 'acorn';
import jsx from 'acorn-jsx';
import * as recast from 'recast';
import * as babelParser from '@babel/parser';

/**
 * Parse a component's source code to an AST (Abstract Syntax Tree)
 *
 * @param code - The source code to parse
 */
export function parseComponent(code: string) {
  try {
    // Use recast with babel parser that properly handles JSX
    return recast.parse(code, {
      parser: {
        parse(source: string) {
          return babelParser.parse(source, {
            sourceType: 'module',
            plugins: ['jsx'],
            tokens: true,
          });
        },
      },
    });
  } catch (error) {
    console.error('Failed to parse component code:', error);
    return null;
  }
}

/**
 * Find a JSX element in the AST by its ID attribute
 */
function findElementById(ast: any, id: string): any {
  let foundNode = null;

  recast.visit(ast, {
    visitJSXElement(path) {
      const attrs = path.node.openingElement.attributes || [];
      const idAttr = attrs.find(
        (attr: any) =>
          attr.type === 'JSXAttribute' &&
          attr.name.name === 'id' &&
          attr.value &&
          attr.value.value === id,
      );

      if (idAttr) {
        foundNode = path.node;
        return false;
      }

      this.traverse(path);
      return undefined;
    },
  });

  return foundNode;
}

/**
 * Create a JSX attribute node with the given name and value
 */
function createJSXAttribute(name: string, value: any): any {
  // Skip children property as it should be rendered as content
  if (name === 'children') {
    return null;
  }

  // Simple string attribute
  if (typeof value === 'string') {
    // For onClick or other event handlers, use JSX expression container
    if (
      name.startsWith('on') &&
      (value.includes('=>') || value.includes('function'))
    ) {
      return recast.types.builders.jsxAttribute(
        recast.types.builders.jsxIdentifier(name),
        recast.types.builders.jsxExpressionContainer(
          recast.parse(value).program.body[0].expression,
        ),
      );
    }
    return recast.types.builders.jsxAttribute(
      recast.types.builders.jsxIdentifier(name),
      recast.types.builders.stringLiteral(value),
    );
  }

  // Boolean attribute
  if (typeof value === 'boolean') {
    if (value) {
      return recast.types.builders.jsxAttribute(
        recast.types.builders.jsxIdentifier(name),
        null,
      );
    }
    // For explicit false values, use {false}
    const jsxValue = recast.types.builders.jsxExpressionContainer(
      recast.types.builders.booleanLiteral(false),
    );
    return recast.types.builders.jsxAttribute(
      recast.types.builders.jsxIdentifier(name),
      jsxValue,
    );
  }

  // Number attribute
  if (typeof value === 'number') {
    const jsxValue = recast.types.builders.jsxExpressionContainer(
      recast.types.builders.numericLiteral(value),
    );
    return recast.types.builders.jsxAttribute(
      recast.types.builders.jsxIdentifier(name),
      jsxValue,
    );
  }

  // Object/array attribute
  const jsxValue = recast.types.builders.jsxExpressionContainer(
    recast.parse('(' + JSON.stringify(value) + ')').program.body[0].expression,
  );

  return recast.types.builders.jsxAttribute(
    recast.types.builders.jsxIdentifier(name),
    jsxValue,
  );
}

/**
 * Update a component's properties in the AST
 */
export function updateComponentAST(
  code: string,
  componentId: string,
  props: Record<string, any>,
): string {
  try {
    const ast = parseComponent(code);
    if (!ast) return code;

    const componentNode = findElementById(ast, componentId);
    if (!componentNode) return code;

    // Extract the children content (text) from props
    const childrenContent = props.children || '';

    // Get existing attributes that aren't in the props
    const existingAttrs = componentNode.openingElement.attributes || [];

    // Remove any duplicate ID attributes, keeping only the first one
    const idAttrSeen = new Set<string>();
    const uniqueExistingAttrs = existingAttrs.filter((attr: any) => {
      if (attr.type !== 'JSXAttribute') return true;
      if (attr.name.name === 'id') {
        if (idAttrSeen.has('id')) return false;
        idAttrSeen.add('id');
      }
      return true;
    });

    // Filter out attributes we're going to replace
    const keptAttrs = uniqueExistingAttrs.filter(
      (attr: any) =>
        attr.type === 'JSXAttribute' &&
        attr.name.name !== 'id' &&
        attr.name.name !== 'children' &&
        !Object.keys(props).includes(attr.name.name),
    );

    // Create new attributes from props, excluding children
    const newAttrs = Object.entries(props)
      .filter(([name]) => name !== 'children')
      .map(([name, value]) => createJSXAttribute(name, value))
      .filter((attr) => attr !== null);

    // Ensure ID attribute is always included
    const idAttr = uniqueExistingAttrs.find(
      (attr: any) => attr.type === 'JSXAttribute' && attr.name.name === 'id',
    );

    // Update the component's attributes
    componentNode.openingElement.attributes = [
      idAttr,
      ...keptAttrs,
      ...newAttrs,
    ];

    // Update the children text content if provided
    if (childrenContent && componentNode.children) {
      // Remove all current children
      componentNode.children = [recast.types.builders.jsxText(childrenContent)];
    }

    return recast.print(ast).code;
  } catch (error) {
    console.error('Failed to update component AST:', error);
    return code;
  }
}

/**
 * Generate a unique component ID
 */
export function generateComponentId(): string {
  return `comp-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract component props from AST
 */
export function extractComponentProps(
  code: string,
  componentId: string,
): Record<string, any> {
  try {
    const ast = parseComponent(code);
    if (!ast) return {};

    const componentNode = findElementById(ast, componentId);
    if (!componentNode) return {};

    const props: Record<string, any> = {};
    const attrs = componentNode.openingElement.attributes || [];

    for (const attr of attrs) {
      if (attr.type !== 'JSXAttribute') continue;

      const name = attr.name.name;
      let value: any;

      // No value (boolean true)
      if (!attr.value) {
        value = true;
      }
      // String literal
      else if (attr.value.type === 'StringLiteral') {
        value = attr.value.value;
      }
      // JSX expression container
      else if (attr.value.type === 'JSXExpressionContainer') {
        if (attr.value.expression.type === 'BooleanLiteral') {
          value = attr.value.expression.value;
        } else if (attr.value.expression.type === 'NumericLiteral') {
          value = attr.value.expression.value;
        } else {
          try {
            // For complex expressions, just get the code as string
            value = recast.print(attr.value.expression).code;
          } catch (e) {
            value = String(attr.value.expression);
          }
        }
      }

      props[name] = value;
    }

    // Extract children content (text)
    if (componentNode.children && componentNode.children.length > 0) {
      const textContent = componentNode.children
        .filter((child: any) => child.type === 'JSXText')
        .map((child: any) => child.value)
        .join('')
        .trim();

      if (textContent) {
        props.children = textContent;
      }
    }

    return props;
  } catch (error) {
    console.error('Failed to extract component props:', error);
    return {};
  }
}

/**
 * Parse JSX components from code and extract their properties
 * This function will extract components and their properties from JSX code
 */
export function parseComponentsFromJSX(code: string): any[] {
  try {
    const ast = parseComponent(code);
    if (!ast) return [];

    const components: any[] = [];

    // Visit all JSX elements in the code
    recast.visit(ast, {
      visitJSXElement(path) {
        const node = path.node;
        const elementName = node.openingElement.name.name;

        // We're only interested in button components for now
        if (elementName === 'button') {
          const props: Record<string, any> = {};
          const attrs = node.openingElement.attributes || [];

          // Keep track of seen IDs to avoid duplicates
          const seenIds = new Set<string>();

          // Extract all attributes, avoiding duplicate IDs
          attrs.forEach((attr: any) => {
            if (attr.type !== 'JSXAttribute') return;

            const name = attr.name.name;

            // Skip duplicate ID attributes
            if (name === 'id' && seenIds.has(name)) return;
            if (name === 'id') seenIds.add(name);

            let value: any;

            // No value (boolean true)
            if (!attr.value) {
              value = true;
            }
            // String literal
            else if (attr.value.type === 'StringLiteral') {
              value = attr.value.value;
            }
            // JSX expression container
            else if (attr.value.type === 'JSXExpressionContainer') {
              if (attr.value.expression.type === 'BooleanLiteral') {
                value = attr.value.expression.value;
              } else if (attr.value.expression.type === 'NumericLiteral') {
                value = attr.value.expression.value;
              } else {
                // For complex expressions, serialize to string
                value = recast.print(attr.value.expression).code;
              }
            }

            props[name] = value;
          });

          // Extract the button text (children)
          if (node.children && node.children.length > 0) {
            // Handle text content
            props.children = node.children
              .filter((child: any) => child.type === 'JSXText')
              .map((child: any) => child.value)
              .join('')
              .trim();
          }

          // Create component object
          components.push({
            id: props.id || generateComponentId(),
            type: 'Button',
            props,
          });
        }

        this.traverse(path);
        return undefined;
      },
    });

    return components;
  } catch (error) {
    console.error('Failed to parse components from JSX:', error);
    return [];
  }
}
