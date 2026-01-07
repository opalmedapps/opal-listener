// SPDX-FileCopyrightText: Copyright 2025 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import '../chai-setup.js';
import { expect } from 'chai';
import RequestData from './mock-request.js';

const requiredPropertiesBase = [
    'Parameters',
    'Request',
    'RequestType',
    'Timestamp',
    'UserID',
];

const requiredPropertiesApp = [
    'AppVersion',
    'DeviceId',
    'UserEmail',
];

const requiredPropertiesRegistration = [
    'BranchName',
    'SimulatedEncryption',
];

describe('Registration', function () {
    describe('export', function () {
        Object.entries(RequestData).forEach(([mockRequestName, mockRequest]) => {
            it(`should export '${mockRequestName}' with all required properties`, function () {
                // Build the full list of required properties depending on the type of request
                let requiredProperties = [];
                requiredProperties.push(...requiredPropertiesBase);
                if (['API', 'LEGACY'].includes(mockRequest.RequestType)) {
                    requiredProperties.push(...requiredPropertiesApp);
                }
                else if (['REGISTRATION', 'REGISTRATION_LEGACY'].includes(mockRequest.RequestType)) {
                    requiredProperties.push(...requiredPropertiesRegistration);
                }

                // Check that all required properties are present
                requiredProperties.forEach(property => {
                    expect(
                        mockRequest,
                        `'${mockRequestName}' is missing a required property`,
                    ).to.have.property(property);
                });
            });
        });
    });
});
