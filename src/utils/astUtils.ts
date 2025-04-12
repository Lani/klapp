import * as acorn from 'acorn';
import * as recast from 'recast';

/**
 * Parse a component's source code to an AST (Abstract Syntax Tree)
 * 
 * @param code - The source code to parse
 */
export function parseComponent(code: string) {
  try {
    return recast.parse(code, {
      parser: {
        parse(source: string) {
          return acorn.parse(source, {
            sourceType: 'module',
            ecmaVersion: 2020,
            locations: true
          });
        }
      }
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
      const idAttr = attrs.find((attr: any) => 
        attr.type === 'JSXAttribute' && 
        attr.name.name === 'id' && 
        attr.value.value === id
      );

      if (idAttr) {
        foundNode = path.node;
        return false;
      }

      this.traverse(path);
      return undefined;
    }
  });

  return foundNode;
}

/**
 * Create a JSX attribute node with the given name and value
 */
function createJSXAttribute(name: string, value: any): any {
  // Simple string attribute
  if (typeof value === 'string') {
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
    return null; // Don't include false boolean props
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

/**
 * Update a component's properties in the AST
 */
export function updateComponentAST(code: string, componentId: string, props: Record<string, any>): string {
  try {
    const ast = parseComponent(code);
    if (!ast) return code;

    const componentNode = findElementById(ast, componentId);
    if (!componentNode) return code;

    // Get existing attributes that aren't in the props
    const existingAttrs = componentNode.openingElement.attributes || [];
    const keptAttrs = existingAttrs.filter((attr: any) => 
      attr.type === 'JSXAttribute' && 
      attr.name.name !== 'id' && 
      !Object.keys(props).includes(attr.name.name)
    );

    // Create new attributes from props
    const newAttrs = Object.entries(props)
      .map(([name, value]) => createJSXAttribute(name, value))
      .filter(attr => attr !== null);

    // Ensure ID attribute is always included
    const idAttr = existingAttrs.find((attr: any) => 
      attr.type === 'JSXAttribute' && 
      attr.name.name === 'id'
    );

    // Update the component's attributes
    componentNode.openingElement.attributes = [
      idAttr,
      ...keptAttrs,
      ...newAttrs
    ];

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
export function extractComponentProps(code: string, componentId: string): Record<string, any> {
  try {
    const ast = parseComponent(code);
    if (!ast) return {};

    const componentNode = findElementById(ast, componentId);
    if (!componentNode) return {};

    const props: Record<string, any> = {};
    const attrs = componentNode.openingElement.attributes || [];

    for (const attr of attrs) {
      if (attr.type !== 'JSXAttribute' || attr.name.name === 'id') continue;

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
            value = eval(`(${recast.print(attr.value.expression).code})`);
          } catch (e) {
            value = recast.print(attr.value.expression).code;
          }
        }
      }

      props[name] = value;
    }

    return props;
  } catch (error) {
    console.error('Failed to extract component props:', error);
    return {};
  }
}