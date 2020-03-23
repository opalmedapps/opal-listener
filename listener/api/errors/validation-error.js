class ValidationError extends Error {
	constructor(err) {
		super("Validation Error");
		this.error = err;
		this.name = "ValidationError";
	}
}

module.exports = {ValidationError};