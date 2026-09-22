import { TSESLint } from '@typescript-eslint/utils';

declare const plugin: TSESLint.FlatConfig.Plugin;
declare const recommended: TSESLint.FlatConfig.ConfigArray;

export { plugin as default, recommended };
