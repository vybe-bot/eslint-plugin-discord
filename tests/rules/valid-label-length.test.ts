import dedent from 'dedent';

import rule from '../../src/rules/valid-label-length';

import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('valid-label-length', rule, {
    valid: [
        dedent`
            import { LabelBuilder } from 'discord.js';
            new LabelBuilder().setLabel('Short label');
        `,
        dedent`
            import { LabelBuilder } from 'discord.js';
            new LabelBuilder().setLabel('${'a'.repeat(45)}');
        `
    ],
    invalid: [
        {
            code: dedent`
                import { LabelBuilder } from 'discord.js';
                new LabelBuilder().setLabel('${'a'.repeat(46)}');
            `,
            errors: [{ messageId: 'tooLong' }]
        },
        {
            code: dedent`
                import { LabelBuilder } from 'discord.js';
                new LabelBuilder().setLabel('');
            `,
            errors: [{ messageId: 'empty' }]
        }
    ]
});
