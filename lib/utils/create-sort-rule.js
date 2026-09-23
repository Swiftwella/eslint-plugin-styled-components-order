"use strict";

const postcss = require("postcss");

function isStyledTag(node) {
  if (!node) {
    return false;
  }

  if (node.type === "Identifier") {
    return node.name === "css" || node.name === "styled";
  }

  if (node.type === "MemberExpression") {
    return isStyledTag(node.object);
  }

  if (node.type === "CallExpression") {
    return isStyledTag(node.callee);
  }

  return false;
}

function maskInterpolation(start, end) {
  if (start.line === end.line) {
    return " ".repeat(Math.max(0, end.column - start.column + 3));
  }

  return (
    "\n".repeat(end.line - start.line) + " ".repeat(Math.max(0, end.column + 1))
  );
}

function getTemplateCss(node) {
  const quasis = node.quasi.quasis;
  const first = quasis[0];
  let css =
    "\n".repeat(first.loc.start.line - 1) +
    " ".repeat(first.loc.start.column + 1) +
    first.value.raw;

  for (let index = 1; index < quasis.length; index += 1) {
    const previous = quasis[index - 1];
    const current = quasis[index];
    css += maskInterpolation(previous.loc.end, current.loc.start);
    css += current.value.raw;
  }

  return css;
}

function declarationsFor(rule) {
  return (rule.nodes || []).filter((node) => node.type === "decl");
}

function findUnorderedRule(rule, compare) {
  for (const child of rule.nodes || []) {
    if (child.type === "rule" || child.type === "atrule") {
      const invalidNestedRule = findUnorderedRule(child, compare);
      if (invalidNestedRule) {
        return invalidNestedRule;
      }
    }
  }

  const declarations = declarationsFor(rule);
  for (let index = 1; index < declarations.length; index += 1) {
    if (compare(declarations[index - 1].prop, declarations[index].prop) > 0) {
      return rule;
    }
  }

  return null;
}

function nodeRange(node, sourceCode) {
  const start = sourceCode.getIndexFromLoc({
    line: node.source.start.line,
    column: node.source.start.column - 1,
  });
  const end = sourceCode.getIndexFromLoc({
    line: node.source.end.line,
    column: node.source.end.column - 1,
  });

  return [start, end + 1];
}

function declarationUnits(rule, sourceCode) {
  const nodes = rule.nodes || [];

  return nodes.flatMap((declaration, index) => {
    if (declaration.type !== "decl") {
      return [];
    }

    let startIndex = index;
    while (startIndex > 0 && nodes[startIndex - 1].type === "comment") {
      startIndex -= 1;
    }

    const previousNode = nodes[startIndex - 1];
    if (
      nodes[startIndex]?.type === "comment" &&
      previousNode?.type === "decl" &&
      nodes[startIndex].source.start.line === previousNode.source.end.line
    ) {
      startIndex += 1;
    }

    let endIndex = index;
    while (
      nodes[endIndex + 1]?.type === "comment" &&
      nodes[endIndex + 1].source.start.line === nodes[endIndex].source.end.line
    ) {
      endIndex += 1;
    }

    const start = nodeRange(nodes[startIndex], sourceCode)[0];
    const end = nodeRange(nodes[endIndex], sourceCode)[1];
    return [{ declaration, range: [start, end] }];
  });
}

function fixesFor(rule, compare, fixer, sourceCode) {
  const fixes = [];

  for (const child of rule.nodes || []) {
    if (child.type === "rule" || child.type === "atrule") {
      fixes.push(...fixesFor(child, compare, fixer, sourceCode));
    }
  }

  const units = declarationUnits(rule, sourceCode);
  const sorted = units
    .map((unit, originalIndex) => ({ ...unit, originalIndex }))
    .sort((left, right) => {
      const order = compare(left.declaration.prop, right.declaration.prop);
      return order || left.originalIndex - right.originalIndex;
    });

  units.forEach((unit, index) => {
    if (unit.declaration !== sorted[index].declaration) {
      fixes.push(
        fixer.replaceTextRange(
          unit.range,
          sourceCode.text.slice(...sorted[index].range),
        ),
      );
    }
  });

  return fixes;
}

function locationFor(rule) {
  const declarations = declarationsFor(rule);
  return {
    start: {
      line: declarations[0].source.start.line,
      column: declarations[0].source.start.column - 1,
    },
    end: {
      line: declarations.at(-1).source.end.line,
      column: declarations.at(-1).source.end.column,
    },
  };
}

module.exports = function createSortRule({ description, messageId, compare }) {
  return {
    meta: {
      type: "layout",
      docs: {
        description,
        recommended: true,
      },
      messages: {
        [messageId]: description,
      },
      schema: [],
      fixable: "code",
    },

    create(context) {
      const sourceCode = context.sourceCode || context.getSourceCode();

      return {
        TaggedTemplateExpression(node) {
          if (!isStyledTag(node.tag)) {
            return;
          }

          let root;
          try {
            root = postcss.parse(getTemplateCss(node));
          } catch {
            return;
          }

          const unorderedRule = findUnorderedRule(root, compare);
          if (!unorderedRule) {
            return;
          }

          context.report({
            node,
            messageId,
            loc: locationFor(unorderedRule),
            fix: (fixer) => fixesFor(root, compare, fixer, sourceCode),
          });
        },
      };
    },
  };
};
