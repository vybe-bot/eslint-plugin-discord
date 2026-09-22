import { extendsDjsType, methodName } from '../utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

function staticString(arg: TSESTree.CallExpressionArgument): string | undefined {
    if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') return arg.value;
    if (arg.type === AST_NODE_TYPES.TemplateLiteral && arg.expressions.length === 0) {
        return arg.quasis[0]?.value.cooked ?? undefined;
    }
    return undefined;
}

export default createRule({
    name: 'valid-label-length',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce Discord LabelBuilder label length limits (1–45 characters).'
        },
        messages: {
            tooLong: 'LabelBuilder label must be 45 characters or fewer. Discord rejects labels exceeding 45 characters (current length: {{length}}). Put longer text in setDescription().',
            empty: 'Label text cannot be empty.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);

        return {
            CallExpression(node) {
                if (methodName(node) !== 'setLabel') return;
                const arg = node.arguments[0];
                if (arg === undefined) return;

                let label = staticString(arg);
                if (
                    label === undefined &&
                    (arg.type === AST_NODE_TYPES.Identifier || arg.type === AST_NODE_TYPES.MemberExpression)
                ) {
                    const argType = services.getTypeAtLocation(arg);
                    if (argType.isStringLiteral()) label = argType.value;
                }
                if (label === undefined) return;

                if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
                const checker = services.program.getTypeChecker();
                const receiverType = services.getTypeAtLocation(node.callee.object);
                if (!extendsDjsType(checker, receiverType, 'LabelBuilder')) return;

                if (label.length === 0) {
                    context.report({ node: arg, messageId: 'empty' });
                } else if (label.length > 45) {
                    context.report({ node: arg, messageId: 'tooLong', data: { length: label.length } });
                }
            }
        };
    }
});
