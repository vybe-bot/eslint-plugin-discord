import { extendsDjsType, methodName, staticNumber, unwrapAssertions } from '../utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

// A Components V2 message holds at most 40 components in total, nested ones included.
const MESSAGE_COMPONENT_CAP = 40;

const CONTAINER_ADD_METHODS = new Set([
    'addTextDisplayComponents',
    'addSectionComponents',
    'addSeparatorComponents',
    'addActionRowComponents',
    'addMediaGalleryComponents',
    'addFileComponents'
]);

const ITERATION_METHODS = new Set(['forEach', 'map', 'flatMap']);

type Services = ParserServicesWithTypeInformation;

function isBoundedCollection(node: TSESTree.Expression, services: Services, checker: ts.TypeChecker): boolean {
    const target = unwrapAssertions(node);
    if (target.type === AST_NODE_TYPES.ArrayExpression) {
        return target.elements.length <= MESSAGE_COMPONENT_CAP;
    }
    // items.slice(0, 10) or items.slice(-5)
    if (target.type === AST_NODE_TYPES.CallExpression && methodName(target) === 'slice') {
        const [start, end] = target.arguments;
        const endValue = end === undefined ? undefined : staticNumber(end, services);
        const startValue = staticNumber(start, services);
        if (endValue !== undefined && endValue >= 0) return endValue - Math.max(0, startValue ?? 0) <= MESSAGE_COMPONENT_CAP;
        if (end === undefined && startValue !== undefined && startValue < 0) {
            return -startValue <= MESSAGE_COMPONENT_CAP;
        }
        return false;
    }
    const type = services.getTypeAtLocation(target);
    return checker.isTupleType(type);
}

// i < 10, i <= 10, i < Math.min(items.length, 10)
function isBoundedForTest(test: TSESTree.Expression | null, services: Services): boolean {
    if (test === null || test.type !== AST_NODE_TYPES.BinaryExpression) return false;
    if (test.operator !== '<' && test.operator !== '<=') return false;
    const bound = test.right;
    const literal = staticNumber(bound, services);
    if (literal !== undefined) return literal <= MESSAGE_COMPONENT_CAP;
    if (
        bound.type === AST_NODE_TYPES.CallExpression &&
        bound.callee.type === AST_NODE_TYPES.MemberExpression &&
        bound.callee.object.type === AST_NODE_TYPES.Identifier &&
        bound.callee.object.name === 'Math' &&
        methodName(bound) === 'min'
    ) {
        return bound.arguments.some((arg) => {
            const value = staticNumber(arg, services);
            return value !== undefined && value <= MESSAGE_COMPONENT_CAP;
        });
    }
    return false;
}

// a top-level `break` in the loop body is treated as a cap the author wrote by hand
function bodyBreaks(body: TSESTree.Node): boolean {
    let found = false;
    const visit = (node: TSESTree.Node): void => {
        if (found) return;
        if (node.type === AST_NODE_TYPES.BreakStatement && node.label === null) {
            found = true;
            return;
        }
        if (
            node.type === AST_NODE_TYPES.ForStatement ||
            node.type === AST_NODE_TYPES.ForOfStatement ||
            node.type === AST_NODE_TYPES.ForInStatement ||
            node.type === AST_NODE_TYPES.WhileStatement ||
            node.type === AST_NODE_TYPES.DoWhileStatement ||
            node.type === AST_NODE_TYPES.SwitchStatement ||
            node.type === AST_NODE_TYPES.FunctionDeclaration ||
            node.type === AST_NODE_TYPES.FunctionExpression ||
            node.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
            return;
        }
        for (const key of Object.keys(node) as (keyof typeof node)[]) {
            if (key === 'parent') continue;
            const value = node[key] as unknown;
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child && typeof child === 'object' && 'type' in child) visit(child as TSESTree.Node);
                }
            } else if (value && typeof value === 'object' && 'type' in value) {
                visit(value as TSESTree.Node);
            }
        }
    };
    if (body.type === AST_NODE_TYPES.BlockStatement) body.body.forEach(visit);
    else visit(body);
    return found;
}

function iterationCallbackCollection(fn: TSESTree.Node): TSESTree.Expression | undefined {
    const call = fn.parent;
    if (call?.type !== AST_NODE_TYPES.CallExpression || call.arguments[0] !== fn) return undefined;
    const name = methodName(call);
    if (name === undefined || !ITERATION_METHODS.has(name)) return undefined;
    return call.callee.type === AST_NODE_TYPES.MemberExpression ? call.callee.object : undefined;
}

// Walks out from the call to the enclosing function and returns the first loop that
// is not visibly capped. Iteration callbacks (items.forEach / items.map) count as loops.
function unboundedEnclosingLoop(
    node: TSESTree.Node,
    services: Services,
    checker: ts.TypeChecker
): TSESTree.Node | undefined {
    let child: TSESTree.Node = node;
    let current = node.parent;
    while (current) {
        switch (current.type) {
            case AST_NODE_TYPES.ForOfStatement:
                if (current.body === child && !isBoundedCollection(current.right, services, checker) && !bodyBreaks(current.body)) {
                    return current;
                }
                break;
            case AST_NODE_TYPES.ForInStatement:
            case AST_NODE_TYPES.WhileStatement:
            case AST_NODE_TYPES.DoWhileStatement:
                if (current.body === child && !bodyBreaks(current.body)) return current;
                break;
            case AST_NODE_TYPES.ForStatement:
                if (current.body === child && !isBoundedForTest(current.test, services) && !bodyBreaks(current.body)) {
                    return current;
                }
                break;
            case AST_NODE_TYPES.FunctionDeclaration:
            case AST_NODE_TYPES.FunctionExpression:
            case AST_NODE_TYPES.ArrowFunctionExpression: {
                const collection = iterationCallbackCollection(current);
                if (collection === undefined) return undefined;
                if (!isBoundedCollection(collection, services, checker)) return current.parent;
                break;
            }
            default:
                break;
        }
        child = current;
        current = current.parent;
    }
    return undefined;
}

export default createRule({
    name: 'no-unbounded-v2-components',
    meta: {
        type: 'problem',
        docs: {
            description:
                'Warn when Components V2 items are added to a container for every element of a list with no visible cap, which can exceed the 40-component message limit.'
        },
        messages: {
            unbounded:
                'Components are added to this container for each item of a list with no cap. A Components V2 message holds at most 40 components in total, so a long list makes Discord reject it. Cap the list (e.g. items.slice(0, 10)) or paginate.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        function isContainerAdd(node: TSESTree.CallExpression): boolean {
            const name = methodName(node);
            if (name === undefined || !CONTAINER_ADD_METHODS.has(name)) return false;
            if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return false;
            return extendsDjsType(checker, services.getTypeAtLocation(node.callee.object), 'ContainerBuilder');
        }

        return {
            CallExpression(node) {
                if (!isContainerAdd(node)) return;

                // container.addTextDisplayComponents(...items.map((item) => ...))
                for (const arg of node.arguments) {
                    if (arg.type !== AST_NODE_TYPES.SpreadElement) continue;
                    const spread = arg.argument;
                    if (
                        spread.type === AST_NODE_TYPES.CallExpression &&
                        (methodName(spread) === 'map' || methodName(spread) === 'flatMap') &&
                        spread.callee.type === AST_NODE_TYPES.MemberExpression &&
                        !isBoundedCollection(spread.callee.object, services, checker)
                    ) {
                        context.report({ node, messageId: 'unbounded' });
                        return;
                    }
                }

                if (unboundedEnclosingLoop(node, services, checker) !== undefined) {
                    context.report({ node, messageId: 'unbounded' });
                }
            }
        };
    }
});
