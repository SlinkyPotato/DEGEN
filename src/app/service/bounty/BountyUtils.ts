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
};

export default bountyUtils;