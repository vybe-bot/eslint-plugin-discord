import { extendsDjsType, methodName } from '../utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

// calls that answer an interaction within Discord's 3 second window
const ACKNOWLEDGE_METHODS = new Set(['reply', 'deferReply', 'deferUpdate', 'update', 'showModal', 'respond']);

type FunctionNode =
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression;

function isFunction(node: TSESTree.Node): node is FunctionNode {
    return (
        node.type === AST_NODE_TYPES.FunctionDeclaration ||
        node.type === AST_NODE_TYPES.FunctionExpression ||
        node.type === AST_NODE_TYPES.ArrowFunctionExpression
    );
}

// source-order walk of a function body that does not enter nested functions
function walkOwnBody(fn: FunctionNode, visit: (node: TSESTree.Node) => void): void {
    const step = (node: TSESTree.Node): void => {
        visit(node);
        for (const key of Object.keys(node) as (keyof typeof node)[]) {
            if (key === 'parent') continue;
            const value = node[key] as unknown;
            const children = Array.isArray(value) ? value : [value];
            for (const child of children) {
                if (!child || typeof child !== 'object' || !('type' in child)) continue;
                const childNode = child as TSESTree.Node;
                if (isFunction(childNode)) continue;
                step(childNode);
            }
        }
    };
    step(fn.body);
}

export default createRule({
    name: 'no-await-before-acknowledge',
    meta: {
        type: 'suggestion',
        docs: {
            description:
                'Warn when an interaction handler awaits other work before replying or deferring, which risks the 3 second acknowledgement window (10062 Unknown interaction).'
        },
        messages: {
            awaitBeforeAcknowledge:
                'This await runs before the interaction is acknowledged. Discord drops interactions that are not answered within 3 seconds (10062 Unknown interaction). Call interaction.deferReply() or deferUpdate() first, then do the work and use editReply().'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        function isAcknowledgeCall(node: TSESTree.Node): node is TSESTree.CallExpression {
            if (node.type !== AST_NODE_TYPES.CallExpression) return false;
            const name = methodName(node);
            if (name === undefined || !ACKNOWLEDGE_METHODS.has(name)) return false;
            if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return false;
            return extendsDjsType(checker, services.getTypeAtLocation(node.callee.object), 'BaseInteraction');
        }

        function checkFunction(fn: FunctionNode): void {
            if (!fn.async) return;

            let firstAcknowledge: number | undefined;
            const awaits: TSESTree.AwaitExpression[] = [];
            walkOwnBody(fn, (node) => {
                if (isAcknowledgeCall(node)) {
                    firstAcknowledge = Math.min(firstAcknowledge ?? Infinity, node.range[0]);
                } else if (node.type === AST_NODE_TYPES.AwaitExpression) {
                    awaits.push(node);
                }
            });
            // a function that never answers the interaction is not a handler this rule can judge
            if (firstAcknowledge === undefined) return;

            const early = awaits.find(
                (node) => node.range[0] < firstAcknowledge! && !isAcknowledgeCall(node.argument)
            );
            if (early !== undefined) {
                context.report({ node: early, messageId: 'awaitBeforeAcknowledge' });
            }
        }

        return {
            FunctionDeclaration: checkFunction,
            FunctionExpression: checkFunction,
            ArrowFunctionExpression: checkFunction
        };
    }
});
