/* istanbul ignore file */
import { createLogger, format, transports, Logger } from 'winston';
import c from 'ansi-colors';

const levelMarkers = {
    debug: () => c.grey('»'),
    info: () => c.blueBright('i'),
    warn: () => '\n' + c.bgYellow.black(` WARN `),
    error: () => '\n' + c.bgRed.black(` ERROR `),
};


function fullWidthLine(left: string, right: string) {
    const leftWidth = c.stripColor(left.trim()).length;
    const rightWidth = c.stripColor(right.trim()).length;
    const consoleWidth = process.stdout.columns || 0;

    let spaceCount = 1;
    if (consoleWidth > 0) {
        spaceCount = consoleWidth - leftWidth - rightWidth - 1;
        while (spaceCount <= 0) {
            spaceCount += consoleWidth;
        }
    }

    return left + ' '.repeat(spaceCount) + right;
}

function logFormat(info: any) {
    const logLine = `${levelMarkers[info.level]()} ${info.message}`;
    if (info.law) {
        return fullWidthLine(logLine, c.grey(`${info.law}`));
    }
    return logLine;
}

const logger = createLogger({
    level: 'info',
    exitOnError: false,
    transports: [
        new transports.Console({
            format: format.combine(
                format.printf(logFormat),
            ),
        }),
    ],
});

export { logger, Logger };
