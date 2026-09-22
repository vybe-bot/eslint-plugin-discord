import { extendsDjsType, methodName } from '../utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

const SLASH_BUILDERS = new Set([
    'SlashCommandBuilder',
    'SlashCommandSubcommandBuilder',
    'SlashCommandSubcommandGroupBuilder',
    'SlashCommandStringOption',
    'SlashCommandIntegerOption',
    'SlashCommandNumberOption',
    'SlashCommandBooleanOption',
    'SlashCommandUserOption',
    'SlashCommandChannelOption',
    'SlashCommandRoleOption',
    'SlashCommandMentionableOption',
    'SlashCommandAttachmentOption'
]);

function staticString(arg: TSESTree.CallExpressionArgument): string | undefined {
    if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') return arg.value;
    if (arg.type === AST_NODE_TYPES.TemplateLiteral && arg.expressions.length === 0) {
        return arg.quasis[0]?.value.cooked ?? undefined;
    }
    return undefined;
}

export default createRule({
    name: 'valid-command-description',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce Discord description length limits (1–100 characters) on slash commands and options.'
        },
        messages: {
            tooLong: 'Command and option descriptions must be 100 characters or fewer. Discord rejects descriptions exceeding 100 characters (current length: {{length}}).',
            empty: 'Command and option descriptions cannot be empty.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);

        return {
            CallExpression(node) {
                if (methodName(node) !== 'setDescription') return;
                const arg = node.arguments[0];
                if (arg === undefined) return;

                let desc = staticString(arg);
                if (
                    desc === undefined &&
                    (arg.type === AST_NODE_TYPES.Identifier || arg.type === AST_NODE_TYPES.MemberExpression)
                ) {
                    const argType = services.getTypeAtLocation(arg);
                    if (argType.isStringLiteral()) desc = argType.value;
                }
                if (desc === undefined) return;

                if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
                const checker = services.program.getTypeChecker();
                const receiverType = services.getTypeAtLocation(node.callee.object);
                if (!extendsDjsType(checker, receiverType, SLASH_BUILDERS)) return;

                if (desc.length === 0) {
                    context.report({ node: arg, messageId: 'empty' });
                } else if (desc.length > 100) {
                    context.report({ node: arg, messageId: 'tooLong', data: { length: desc.length } });
                }
            }
        };
    }
});
