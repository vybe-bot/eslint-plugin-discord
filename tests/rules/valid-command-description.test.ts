import dedent from 'dedent';

import rule from '../../src/rules/valid-command-description';

import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('valid-command-description', rule, {
    valid: [
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder().setName('ping').setDescription('A valid description under 100 characters');
        `,
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder().setName('test').setDescription('${'a'.repeat(100)}');
        `,
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            new SlashCommandStringOption().setName('opt').setDescription('Option description');
        `
    ],
    invalid: [
        {
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder().setName('ping').setDescription('${'a'.repeat(101)}');
            `,
            errors: [{ messageId: 'tooLong' }]
        },
        {
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder().setName('ping').setDescription('');
            `,
            errors: [{ messageId: 'empty' }]
        },
        {
            code: dedent`
                import { SlashCommandStringOption } from 'discord.js';
                new SlashCommandStringOption().setName('opt').setDescription('${'a'.repeat(105)}');
            `,
            errors: [{ messageId: 'tooLong' }]
        }
    ]
});
