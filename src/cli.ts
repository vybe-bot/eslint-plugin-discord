import * as path from 'node:path';
import * as process from 'node:process';
import ts from 'typescript';
import { ESLint } from 'eslint';
import { createSharedProgramConfig } from './index';

export interface CliOptions {
    projectDir: string;
    tsconfigPath: string;
}

export function parseArgs(args: string[]): { options: CliOptions; help: boolean; version: boolean } {
    let projectDir = process.cwd();
    let tsconfigPath = '';
    let help = false;
    let version = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '-h' || arg === '--help') {
            help = true;
        } else if (arg === '-v' || arg === '--version') {
            version = true;
        } else if (arg === '-p' || arg === '--project') {
            const next = args[++i];
            if (next) {
                if (next.endsWith('.json')) {
                    tsconfigPath = path.resolve(next);
                    projectDir = path.dirname(tsconfigPath);
                } else {
                    projectDir = path.resolve(next);
                }
            }
        } else if (!arg.startsWith('-')) {
            projectDir = path.resolve(arg);
        }
    }

    if (!tsconfigPath) {
        const found = ts.findConfigFile(projectDir, ts.sys.fileExists, 'tsconfig.json');
        tsconfigPath = found ?? path.join(projectDir, 'tsconfig.json');
    }

    return {
        options: { projectDir, tsconfigPath },
        help,
        version
    };
}

export async function runCli(args: string[] = process.argv.slice(2)): Promise<number> {
    const { options, help, version } = parseArgs(args);

    if (help) {
        console.log(`Usage: discord-check [options] [path]

Single-pass TypeScript typecheck + Discord API rule validator.

Options:
  -p, --project <path>   Path to tsconfig.json or project directory
  -v, --version          Show version
  -h, --help             Show this help message
`);
        return 0;
    }

    if (version) {
        console.log('1.1.1');
        return 0;
    }

    if (!ts.sys.fileExists(options.tsconfigPath)) {
        console.error(`Error: Cannot find tsconfig file at ${options.tsconfigPath}`);
        return 1;
    }

    const configFile = ts.readConfigFile(options.tsconfigPath, ts.sys.readFile);
    if (configFile.error) {
        console.error(
            ts.formatDiagnostic(configFile.error, {
                getCanonicalFileName: (f) => f,
                getCurrentDirectory: () => options.projectDir,
                getNewLine: () => '\n'
            })
        );
        return 1;
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(options.tsconfigPath),
        { noEmit: true },
        options.tsconfigPath
    );

    // 1. Build TypeScript program once
    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);

    // 2. Collect TypeScript diagnostics
    const tsDiagnostics = ts.getPreEmitDiagnostics(program);

    // 3. Run ESLint with shared program in same process
    const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: createSharedProgramConfig(program, path.dirname(options.tsconfigPath)) as any
    });

    const eslintResults = await eslint.lintFiles(parsedConfig.fileNames);

    // 4. Report all diagnostics
    let errorCount = 0;
    let warningCount = 0;

    const formatHost: ts.FormatDiagnosticsHost = {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => options.projectDir,
        getNewLine: () => '\n'
    };

    for (const diag of tsDiagnostics) {
        if (diag.category === ts.DiagnosticCategory.Error) {
            errorCount++;
        } else if (diag.category === ts.DiagnosticCategory.Warning) {
            warningCount++;
        }
        console.log(ts.formatDiagnosticsWithColorAndContext([diag], formatHost).trimEnd());
    }

    for (const res of eslintResults) {
        const relPath = path.relative(options.projectDir, res.filePath).replace(/\\/g, '/');
        for (const msg of res.messages) {
            if (msg.severity === 2) {
                errorCount++;
            } else if (msg.severity === 1) {
                warningCount++;
            }
            const severityLabel = msg.severity === 2 ? 'error' : 'warning';
            const ruleId = msg.ruleId ?? 'ESLINT';
            console.log(`${relPath}:${msg.line}:${msg.column} - ${severityLabel} TS9001: [${ruleId}] ${msg.message}`);
        }
    }

    if (errorCount > 0) {
        return 1;
    }

    return 0;
}


