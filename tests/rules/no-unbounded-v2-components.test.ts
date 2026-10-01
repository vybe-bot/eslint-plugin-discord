import dedent from 'dedent';

import rule from '../../src/rules/no-unbounded-v2-components';

import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('no-unbounded-v2-components', rule, {
    valid: [
        // a fixed number of adds outside any loop
        dedent`
            import { ContainerBuilder } from 'discord.js';
            new ContainerBuilder()
                .addTextDisplayComponents((t) => t.setContent('a'))
                .addSeparatorComponents((s) => s);
        `,
        // the list is capped with slice
        dedent`
            import { ContainerBuilder } from 'discord.js';
            declare const items: string[];
            const container = new ContainerBuilder();
            for (const item of items.slice(0, 10)) {
                container.addTextDisplayComponents((t) => t.setContent(item));
            }
        `,
        // an indexed loop with a literal bound
        dedent`
            import { ContainerBuilder } from 'discord.js';
            declare const items: string[];
            const container = new ContainerBuilder();
            for (let i = 0; i < Math.min(items.length, 10); i++) {
                container.addTextDisplayComponents((t) => t.setContent(items[i] ?? ''));
            }
        `,
        // a hand-written cap with break
        dedent`
            import { ContainerBuilder } from 'discord.js';
            declare const items: string[];
            const container = new ContainerBuilder();
            let count = 0;
            for (const item of items) {
                if (count++ >= 10) break;
                container.addTextDisplayComponents((t) => t.setContent(item));
            }
        `,
        // a small literal array
        dedent`
            import { ContainerBuilder } from 'discord.js';
            const container = new ContainerBuilder();
            ['a', 'b', 'c'].forEach((label) => {
                container.addTextDisplayComponents((t) => t.setContent(label));
            });
        `,
        // spread of a capped map
        dedent`
            import { ContainerBuilder, TextDisplayBuilder } from 'discord.js';
            declare const items: string[];
            new ContainerBuilder().addTextDisplayComponents(
                ...items.slice(0, 5).map((item) => new TextDisplayBuilder().setContent(item))
            );
        `,
        // loops that do not touch a container
        dedent`
            import { EmbedBuilder } from 'discord.js';
            declare const items: string[];
            const embed = new EmbedBuilder();
            for (const item of items) embed.setDescription(item);
        `
    ],
    invalid: [
        {
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                declare const players: { name: string }[];
                const container = new ContainerBuilder();
                for (const player of players) {
                    container.addTextDisplayComponents((t) => t.setContent(player.name));
                }
            `,
            errors: [{ messageId: 'unbounded' }]
        },
        {
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                declare const players: { name: string }[];
                const container = new ContainerBuilder();
                players.forEach((player) => {
                    container.addSectionComponents((s) => s.addTextDisplayComponents((t) => t.setContent(player.name)));
                });
            `,
            errors: [{ messageId: 'unbounded' }]
        },
        {
            code: dedent`
                import { ContainerBuilder, TextDisplayBuilder } from 'discord.js';
                declare const items: string[];
                new ContainerBuilder().addTextDisplayComponents(
                    ...items.map((item) => new TextDisplayBuilder().setContent(item))
                );
            `,
            errors: [{ messageId: 'unbounded' }]
        },
        {
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                declare const items: string[];
                const container = new ContainerBuilder();
                for (let i = 0; i < items.length; i++) {
                    container.addSeparatorComponents((s) => s);
                }
            `,
            errors: [{ messageId: 'unbounded' }]
        }
    ]
});
