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

function isNestedBlock(node) {
  return Boolean(
    node && (node.type === "rule" || (node.type === "atrule" && node.nodes)),
  );
}

function findUnorderedRule(rule, compare, nestedRulesLast) {
  for (const child of rule.nodes || []) {
    if (isNestedBlock(child)) {
      const invalidNestedRule = findUnorderedRule(
        child,
        compare,
        nestedRulesLast,
      );
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

  if (nestedRulesLast) {
    let foundNestedBlock = false;
    for (const child of rule.nodes || []) {
      if (isNestedBlock(child)) {
        foundNestedBlock = true;
      } else if (child.type === "decl" && foundNestedBlock) {
        return rule;
      }
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

function sortableUnits(rule, sourceCode, nestedRulesLast) {
  const nodes = rule.nodes || [];

  return nodes.flatMap((node, index) => {
    if (node.type !== "decl" && !(nestedRulesLast && isNestedBlock(node))) {
      return [];
    }

    let startIndex = index;
    while (startIndex > 0 && nodes[startIndex - 1].type === "comment") {
      startIndex -= 1;
    }

    const previousNode = nodes[startIndex - 1];
    if (
      nodes[startIndex]?.type === "comment" &&
      (previousNode?.type === "decl" || isNestedBlock(previousNode)) &&
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
    return [{ node, range: [start, end] }];
  });
}

function fixesFor(rule, compare, fixer, sourceCode, nestedRulesLast) {
  const fixes = [];
  const units = sortableUnits(rule, sourceCode, nestedRulesLast);
  const sorted = units
    .map((unit, originalIndex) => ({ ...unit, originalIndex }))
    .sort((left, right) => {
      const leftIsDeclaration = left.node.type === "decl";
      const rightIsDeclaration = right.node.type === "decl";

      if (!leftIsDeclaration || !rightIsDeclaration) {
        if (leftIsDeclaration === rightIsDeclaration) {
          return left.originalIndex - right.originalIndex;
        }
        return leftIsDeclaration ? -1 : 1;
      }

      const order = compare(left.node.prop, right.node.prop);
      return order || left.originalIndex - right.originalIndex;
    });

  const movesNestedBlock = units.some(
    (unit, index) =>
      unit.node !== sorted[index].node &&
      (isNestedBlock(unit.node) || isNestedBlock(sorted[index].node)),
  );

  units.forEach((unit, index) => {
    if (unit.node !== sorted[index].node) {
      fixes.push(
        fixer.replaceTextRange(
          unit.range,
          sourceCode.text.slice(...sorted[index].range),
        ),
      );
    }
  });

  if (!movesNestedBlock) {
    for (const child of rule.nodes || []) {
      if (isNestedBlock(child)) {
        fixes.push(
          ...fixesFor(child, compare, fixer, sourceCode, nestedRulesLast),
        );
      }
    }
  }

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

module.exports = function createSortRule({
  description,
  messageId,
  compare,
  nestedRulesLast = false,
}) {
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

          const unorderedRule = findUnorderedRule(
            root,
            compare,
            nestedRulesLast,
          );
          if (!unorderedRule) {
            return;
          }

          context.report({
            node,
            messageId,
            loc: locationFor(unorderedRule),
            fix: (fixer) =>
              fixesFor(root, compare, fixer, sourceCode, nestedRulesLast),
          });
        },
      };
    },
  };
};
