const ValidationError = require('../../errors/ValidationError');

/**
 * Utilities file for bounty commands
 */
const bountyUtils = {

	/**
	 * Validate the given string is a bounty id
	 * @param bountyId
	 */
	validateBountyId(bountyId: string): {isBountyIdValid: boolean, bountyId: string} {
		const BOUNTY_ID_REGEX = /^[a-f\d]{1,100}$/i;
		return {
			isBountyIdValid: !(bountyId == null || !BOUNTY_ID_REGEX.test(bountyId)),
			bountyId: bountyId,
		};
	},

	/**
	 * Validate the bounty types that are allowed
	 * @param bountyType
	 */
	validateBountyType(bountyType: string): void {
		const ALLOWED_BOUNTY_TYPES = ['OPEN', 'CREATED_BY_ME', 'CLAIMED_BY_ME'];
		if (bountyType == null || !ALLOWED_BOUNTY_TYPES.includes(bountyType)) {
			throw new ValidationError('invalid bounty type');
		}
	},
};

export default bountyUtils;