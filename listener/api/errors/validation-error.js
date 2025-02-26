// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
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
