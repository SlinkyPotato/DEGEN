export default class EarlyTermination extends Error {

	constructor(message: string) {
		super(message);

		Object.setPrototypeOf(this, EarlyTermination.prototype);
	}

}
