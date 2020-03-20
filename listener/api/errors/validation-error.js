class ValidationError extends Error {
	constructor(msg = "") {
		super(`SQL Error: ${msg}`);
		this.name = "SQLError";
	}
}

module.exports = {ValidationError};