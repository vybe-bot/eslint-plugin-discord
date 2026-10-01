import dedent from 'dedent';

import rule from '../../src/rules/valid-text-length';

import { createTypedRuleTester } from '../typed-rule-tester';

const text = (n: number): string => 'a'.repeat(n);

const ruleTester = createTypedRuleTester();

ruleTester.run('valid-text-length', rule, {
    valid: [
        // exactly at the caps
        dedent`
            import { EmbedBuilder } from 'discord.js';
            new EmbedBuilder().setTitle('${text(256)}').setFooter({ text: '${text(2048)}' });
        `,
        dedent`
            import { ButtonBuilder } from 'discord.js';
            new ButtonBuilder().setLabel('${text(80)}');
        `,
        // dynamic text, the length is a runtime value
        dedent`
            import { EmbedBuilder } from 'discord.js';
            declare const description: string;
            new EmbedBuilder().setDescription(description);
        `,
        // a template whose fixed text fits, interpolations are unknown
        dedent`
            import { TextDisplayBuilder } from 'discord.js';
            declare const user: string;
            new TextDisplayBuilder().setContent(\`Welcome \${user}!\`);
        `,
        // same method name on a non-discord.js class
        dedent`
            class Thing { setTitle(_: string) { return this; } }
            new Thing().setTitle('${text(300)}');
        `,
        dedent`
            import { EmbedBuilder } from 'discord.js';
            new EmbedBuilder().addFields({ name: 'Name', value: '${text(1024)}' });
        `
    ],
    invalid: [
        {
            code: dedent`
                import { EmbedBuilder } from 'discord.js';
                new EmbedBuilder().setTitle('${text(257)}');
            `,
            errors: [{ messageId: 'tooLong' }]
        },
        {
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder().setLabel('${text(81)}');
            `,
            errors: [{ messageId: 'tooLong' }]
        },
        {
            code: dedent`
                import { ModalBuilder } from 'discord.js';
                new ModalBuilder().setTitle('${text(46)}');
            `,
            errors: [{ messageId: 'tooLong' }]
        },
        {
            code: dedent`
                import { EmbedBuilder } from 'discord.js';
                new EmbedBuilder().setFooter({ text: '${text(2049)}' });
            `,
            errors: [{ messageId: 'tooLong' }]
        },
        // an embed field value over 1024 inside an array
        {
            code: dedent`
                import { EmbedBuilder } from 'discord.js';
                new EmbedBuilder().addFields([{ name: 'ok', value: '${text(1025)}' }]);
            `,
            errors: [{ messageId: 'tooLong' }]
        },
        {
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder().addOptions({ label: '${text(101)}', value: 'v' });
            `,
            errors: [{ messageId: 'tooLong' }]
        },
        // the fixed part of a template alone is already over the cap
        {
            code: dedent`
                import { TextDisplayBuilder } from 'discord.js';
                declare const user: string;
                new TextDisplayBuilder().setContent(\`\${user} ${text(4001)}\`);
            `,
            errors: [{ messageId: 'tooLong' }]
        },
        // a const string resolved through its literal type
        {
            code: dedent`
                import { TextInputBuilder } from 'discord.js';
                const LABEL = '${text(46)}';
                new TextInputBuilder().setLabel(LABEL);
            `,
            errors: [{ messageId: 'tooLong' }]
        }
    ]
});
