/*
 * Filename     :   logger.js
 * Description  :   This file initializes the logger for the listener.
 * Created by   :   David Herrera, Robert Maglieri
 * Date         :   22 Mar 2017
 * Copyright    :   Copyright 2016, HIG, All rights reserved.
 * Licence      :   This file is subject to the terms and conditions defined in
 *                  file 'LICENSE.txt', which is part of this source code package.
 */

const {createLogger, format, transports} = require('winston');

// Choose log level according to the environment
const LoggerLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

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
    // Silent logger when running unit tests
    silent: process.env.DISABLED_LOGGING === 'true',
    // By default, we want to exit on error (true), except when explicitly setting false for pipeline tests
    exitOnError: process.env.EXIT_ON_ERROR !== 'false',
    // Set level log level
    level: LoggerLevel,
    // Set log format output in the log file
    format: format.combine(
        format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        format.json(),
        opalLogFormat
    ),
    transports: [
        // Log level info and above in the log file.
        new transports.File({ filename:'./listener/logs/opal-info.log', level: 'info'}),
        new transports.Console({level: 'debug'})
    ],
    exceptionHandlers: [
        // Log uncaught exceptions to a different file and the console
        new transports.File({ filename: './listener/logs/opal-uncaughtExceptions.log'}),
        new transports.Console(),
    ],
    rejectionHandlers: [
        // Log uncaught Promise rejections to a different file and the console
        new transports.File({ filename: './listener/logs/opal-uncaughtExceptions.log'}),
        new transports.Console(),
    ],
});

// Wrap logger to allow 3rd arguments to be of any type
const logWrapper = (level, message, data) => {
    WinstonLogger.log(level, message, {data: data});
}

WinstonLogger.log('info', `Initialized Winston with level: ${LoggerLevel}`);

module.exports = {
    ...WinstonLogger,
    log: logWrapper,
};
