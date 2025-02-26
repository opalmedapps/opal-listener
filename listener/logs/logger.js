/*
 * Filename     :   logger.js
 * Description  :   This file intiliazes the logger for Opal.
 * Created by   :   David Herrera, Robert Maglieri
 * Date         :   22 Mar 2017
 * Copyright    :   Copyright 2016, HIG, All rights reserved.
 * Licence      :   This file is subject to the terms and conditions defined in
 *                  file 'LICENSE.txt', which is part of this source code package.
 */

const {createLogger, format, transports} = require('winston');

// Choose log level according to environement.
const LoggerLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Set custom format for login.
const opalLogFormat = format.printf((info) => {
    const { level, message, timestamp, data } = info;
    return `${timestamp} - ${level.toUpperCase()}: ${message} ${(data) ? `- DATA: ${data}` : ``}`;
});

// Initialize winston logger
const WinstonLogger = createLogger({
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
        new transports.File({ filename:'./logs/opal-info.log', level: 'info'}),
        new transports.Console({level: 'debug'})
    ],
    exceptionHandlers: [
        // Log uncaught exceptions to a different file and console.
        new transports.File({ filename: './logs/opal-uncaughtExceptions.log'}),
        new transports.Console({level: 'debug'})
    ]
});

WinstonLogger.log('info', `Initialized Winston with level: ${LoggerLevel}`);

module.exports = WinstonLogger;
