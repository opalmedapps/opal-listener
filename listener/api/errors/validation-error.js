// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group <info@opalmedapps.tld>
//
// SPDX-License-Identifier: Apache-2.0

class ValidationError extends Error {
	constructor(err) {
		super("Validation Error");
		this.error = err;
		this.name = "ValidationError";
	}
}

module.exports = {ValidationError};