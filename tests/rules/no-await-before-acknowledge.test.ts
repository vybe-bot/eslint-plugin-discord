import dedent from 'dedent';

import rule from '../../src/rules/no-await-before-acknowledge';

import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('no-await-before-acknowledge', rule, {
    valid: [
        // defers first, then does the slow work
        dedent`
            import type { ChatInputCommandInteraction } from 'discord.js';
            declare function loadStats(): Promise<string>;
            export async function execute(interaction: ChatInputCommandInteraction) {
                await interaction.deferReply();
                const stats = await loadStats();
                await interaction.editReply(stats);
            }
        `,
        // replies straight away
        dedent`
            import type { ButtonInteraction } from 'discord.js';
            export async function onButton(interaction: ButtonInteraction) {
                await interaction.reply({ content: 'Done' });
            }
        `,
        // the await belongs to a nested function, not the handler
        dedent`
            import type { ChatInputCommandInteraction } from 'discord.js';
            declare function later(fn: () => Promise<void>): void;
            declare function sync(): Promise<void>;
            export async function execute(interaction: ChatInputCommandInteraction) {
                later(async () => { await sync(); });
                await interaction.reply('ok');
            }
        `,
        // a helper that never answers the interaction is left alone
        dedent`
            import type { ChatInputCommandInteraction } from 'discord.js';
            declare function save(id: string): Promise<void>;
            export async function record(interaction: ChatInputCommandInteraction) {
                await save(interaction.user.id);
            }
        `,
        // a non-discord.js object with a reply method
        dedent`
            declare function load(): Promise<void>;
            const fake = { async reply(_: string) {} };
            export async function run() {
                await load();
                await fake.reply('x');
            }
        `
    ],
    invalid: [
        {
            code: dedent`
                import type { ChatInputCommandInteraction } from 'discord.js';
                declare function fetchLeaderboard(): Promise<string>;
                export async function execute(interaction: ChatInputCommandInteraction) {
                    const board = await fetchLeaderboard();
                    await interaction.reply(board);
                }
            `,
            errors: [{ messageId: 'awaitBeforeAcknowledge' }]
        },
        {
            code: dedent`
                import type { ButtonInteraction } from 'discord.js';
                export async function onButton(interaction: ButtonInteraction) {
                    const member = await interaction.guild?.members.fetch(interaction.user.id);
                    await interaction.update({ content: member?.displayName ?? 'unknown' });
                }
            `,
            errors: [{ messageId: 'awaitBeforeAcknowledge' }]
        },
        {
            code: dedent`
                import type { ChatInputCommandInteraction } from 'discord.js';
                declare function ask(prompt: string): Promise<string>;
                export const execute = async (interaction: ChatInputCommandInteraction) => {
                    const answer = await ask(interaction.options.getString('q', true));
                    await interaction.deferReply();
                    await interaction.editReply(answer);
                };
            `,
            errors: [{ messageId: 'awaitBeforeAcknowledge' }]
        }
    ]
});
