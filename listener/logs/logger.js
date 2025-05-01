// SPDX-FileCopyrightText: Copyright 2016 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// This file initializes the logger for Opal.

const {createLogger, format, transports} = require('winston');

// Choose log level according to environment.
const defaultLoggerLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// allow the log level to be specifically set via env variable
const loggerLevel = process.env.LOG_LEVEL ?? defaultLoggerLevel;

// Set custom format for login.
const opalLogFormat = format.printf((info) => {
    const { level, message, timestamp, data } = info;
    let formattedData = formatErrorData(data);
    return `${timestamp} - ${level.toUpperCase()}: ${message}${formattedData ? `: ${formattedData}` : ''}`;
});

// Format error data according to data type passed to the logger wrapper
const formatErrorData = (data) => {
    if (typeof data === 'undefined') return '';
    else if (data instanceof Error) return `${data}${data.cause ? `: ${formatErrorData(data.cause)}` : ''}`;
    else if (typeof data === 'object') return JSON.stringify(data);

    return data;
}

// Initialize winston logger
const WinstonLogger = createLogger({
    // Silent logger when running unit tests.
    silent: process.env.DISABLE_LOGGING === 'true',
    // Set level log level
    level: loggerLevel,
    // Set log format output in the log file
    format: format.combine(
        format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        format.json(),
        opalLogFormat
    ),
    transports: [
        new transports.File({ filename:'./listener/logs/error.log', level: 'error'}),
        new transports.Console()
    ],
    exceptionHandlers: [
        // Log uncaught exceptions to a different file and console.
        new transports.File({ filename: './listener/logs/exceptions.log'}),
        new transports.Console()
    ]
});

// Wrap logger to allow 3rd arguments to be of any type.
const logWrapper = (level, message, data) => {
    WinstonLogger.log(level, message, {data: data});
}

WinstonLogger.log('info', `Initialized Winston with level: ${loggerLevel}`);

module.exports = {
    ...WinstonLogger,
    log: logWrapper,
};
