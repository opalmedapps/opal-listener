// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group <info@opalmedapps.tld>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

class ValidationError extends Error {
	constructor(err) {
		super("Validation Error");
		this.error = err;
		this.name = "ValidationError";
	}
}

module.exports = {ValidationError};
