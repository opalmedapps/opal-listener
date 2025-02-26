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

// Initialize winston logger
const WinstonLogger = createLogger({
    // Set level log level
    level: LoggerLevel,
    // Set log format output in the log file
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        // Log level info and above in the log file.
        new transports.File({ filename:'./logs/opal-info.log', level: 'info'})
    ],
    exceptionHandlers: [
        // Log uncaught exceptions to a different file.
        new transports.File({ filename: './logs/opal-uncaughtExceptions.log'})
    ]
});

// Init debug transport that output to the console only if we are not in production.
if (process.env.NODE_ENV !== 'production') {
    WinstonLogger.add(new transports.Console({
        level: 'debug',
        format: format.combine(
            format.colorize(),
            format.simple(),
            format.timestamp()
        ),
    }));
}

WinstonLogger.log('info', `Initialized Winston with level: ${LoggerLevel}`);

module.exports = WinstonLogger;
