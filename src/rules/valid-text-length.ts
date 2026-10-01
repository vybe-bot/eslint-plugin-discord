import { extendsDjsType, getProperty, methodName, unwrapAssertions } from '../utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';

interface TextLimit {
    builders: ReadonlySet<string>;
    method: string;
    // set when the method takes an object (setFooter({ text }), setAuthor({ name }))
    key?: string;
    cap: number;
    what: string;
}

const SELECT_MENUS = new Set([
    'StringSelectMenuBuilder',
    'UserSelectMenuBuilder',
    'RoleSelectMenuBuilder',
    'MentionableSelectMenuBuilder',
    'ChannelSelectMenuBuilder'
]);

// LabelBuilder labels are covered by valid-label-length
const LIMITS: readonly TextLimit[] = [
    { builders: new Set(['EmbedBuilder']), method: 'setTitle', cap: 256, what: 'An embed title' },
    { builders: new Set(['EmbedBuilder']), method: 'setDescription', cap: 4096, what: 'An embed description' },
    { builders: new Set(['EmbedBuilder']), method: 'setFooter', key: 'text', cap: 2048, what: 'An embed footer' },
    { builders: new Set(['EmbedBuilder']), method: 'setAuthor', key: 'name', cap: 256, what: 'An embed author name' },
    { builders: new Set(['ButtonBuilder']), method: 'setLabel', cap: 80, what: 'A button label' },
    { builders: SELECT_MENUS, method: 'setPlaceholder', cap: 150, what: 'A select menu placeholder' },
    { builders: new Set(['StringSelectMenuOptionBuilder']), method: 'setLabel', cap: 100, what: 'A select option label' },
    {
        builders: new Set(['StringSelectMenuOptionBuilder']),
        method: 'setDescription',
        cap: 100,
        what: 'A select option description'
    },
    { builders: new Set(['ModalBuilder']), method: 'setTitle', cap: 45, what: 'A modal title' },
    { builders: new Set(['TextInputBuilder']), method: 'setLabel', cap: 45, what: 'A text input label' },
    { builders: new Set(['TextInputBuilder']), method: 'setPlaceholder', cap: 100, what: 'A text input placeholder' },
    { builders: new Set(['TextDisplayBuilder']), method: 'setContent', cap: 4000, what: 'A text display' }
];

interface ObjectFieldLimit {
    key: string;
    cap: number;
    what: string;
}

// object items passed to list methods, e.g. addFields({ name, value })
const LIST_LIMITS: readonly { builders: ReadonlySet<string>; methods: ReadonlySet<string>; fields: ObjectFieldLimit[] }[] = [
    {
        builders: new Set(['EmbedBuilder']),
        methods: new Set(['addFields', 'setFields', 'spliceFields']),
        fields: [
            { key: 'name', cap: 256, what: 'An embed field name' },
            { key: 'value', cap: 1024, what: 'An embed field value' }
        ]
    },
    {
        builders: new Set(['StringSelectMenuBuilder']),
        methods: new Set(['addOptions', 'setOptions', 'spliceOptions']),
        fields: [
            { key: 'label', cap: 100, what: 'A select option label' },
            { key: 'description', cap: 100, what: 'A select option description' }
        ]
    }
];

// The shortest length the string can have: exact for literals, and the fixed text of a
// template literal, which is a lower bound since interpolations only add characters.
function minimumLength(node: TSESTree.Node, services: ParserServicesWithTypeInformation): number | undefined {
    const target = node.type === AST_NODE_TYPES.SpreadElement ? undefined : unwrapAssertions(node as TSESTree.Expression);
    if (target === undefined) return undefined;
    if (target.type === AST_NODE_TYPES.Literal) return typeof target.value === 'string' ? target.value.length : undefined;
    if (target.type === AST_NODE_TYPES.TemplateLiteral) {
        return target.quasis.reduce((total, quasi) => total + (quasi.value.cooked ?? quasi.value.raw).length, 0);
    }
    if (target.type === AST_NODE_TYPES.Identifier || target.type === AST_NODE_TYPES.MemberExpression) {
        const type = services.getTypeAtLocation(target);
        if (type.isStringLiteral()) return type.value.length;
    }
    return undefined;
}

export default createRule({
    name: 'valid-text-length',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow text that exceeds Discord length limits on embeds, buttons, select menus, modals, and text displays.'
        },
        messages: {
            tooLong:
                '{{what}} can be at most {{cap}} characters, this one is at least {{length}}. Discord rejects the whole message. Shorten it or truncate dynamic text.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        function report(node: TSESTree.Node, what: string, cap: number): void {
            const length = minimumLength(node, services);
            if (length !== undefined && length > cap) {
                context.report({ node, messageId: 'tooLong', data: { what, cap, length } });
            }
        }

        function checkObjectFields(item: TSESTree.Node, fields: readonly ObjectFieldLimit[]): void {
            if (item.type !== AST_NODE_TYPES.ObjectExpression) return;
            for (const field of fields) {
                const prop = getProperty(item, field.key);
                if (prop !== undefined) report(prop.value, field.what, field.cap);
            }
        }

        return {
            CallExpression(node) {
                const name = methodName(node);
                if (name === undefined || node.callee.type !== AST_NODE_TYPES.MemberExpression) return;

                const single = LIMITS.filter((limit) => limit.method === name);
                const lists = LIST_LIMITS.filter((limit) => limit.methods.has(name));
                if (single.length === 0 && lists.length === 0) return;

                const receiverType = services.getTypeAtLocation(node.callee.object);

                const limit = single.find((entry) => extendsDjsType(checker, receiverType, entry.builders));
                const arg = node.arguments[0];
                if (limit !== undefined && arg !== undefined) {
                    if (limit.key === undefined) {
                        report(arg, limit.what, limit.cap);
                    } else if (arg.type === AST_NODE_TYPES.ObjectExpression) {
                        const prop = getProperty(arg, limit.key);
                        if (prop !== undefined) report(prop.value, limit.what, limit.cap);
                    }
                    return;
                }

                const list = lists.find((entry) => extendsDjsType(checker, receiverType, entry.builders));
                if (list === undefined) return;
                for (const listArg of node.arguments) {
                    if (listArg.type === AST_NODE_TYPES.ArrayExpression) {
                        for (const element of listArg.elements) {
                            if (element !== null) checkObjectFields(element, list.fields);
                        }
                    } else {
                        checkObjectFields(listArg, list.fields);
                    }
                }
            }
        };
    }
});
