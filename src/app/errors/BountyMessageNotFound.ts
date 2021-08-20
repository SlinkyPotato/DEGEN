export default class BountyMessageNotFound extends Error {

	constructor(message: string) {
		super(message);

		Object.setPrototypeOf(this, BountyMessageNotFound.prototype);
	}
}
