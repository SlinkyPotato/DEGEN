import { CommandContext } from 'slash-create';
import db from '../../db/db';
import constants from '../../constants';
import { MongoError } from 'mongodb';

const BOUNTY_BOARD_URL = 'https://bankless.community';

export default async (ctx: CommandContext): Promise<any> => {
	if (ctx.user.bot) return;

	const { isBountyIdValid, bountyId } = module.exports.validateBountyId(ctx.options.claim['bounty-id']);
	if (!isBountyIdValid) {
		return ctx.send(`<@${ctx.user.id}>\n` +
			'Please enter a valid bounty hash ID: \n' +
			' - can be found on bountyboard website\n' +
			` - ${BOUNTY_BOARD_URL}`);
	}

	db.connect(constants.DB_COLLECTION_BOUNTY_BOARD, async (error: MongoError) => {
		if (error) {
			console.log('ERROR', error);
			return;
		}

		const dbBountyResult = await db.get().collection(constants.DB_COLLECTION_BOUNTY_BOARD).findOneAndUpdate({
			_id: bountyId,
		}, {
			$set: {
				claimedBy: ctx.user.id,
			},
		});

		if (dbBountyResult == null) {
			console.log(`${bountyId} bounty not found in db`);
			return ctx.send(`Sorry <@${ctx.user.id}>, we're not able to find the bounty.`);
		}

		await db.close();
		return ctx.send(`Bounty is now claimed by <@${ctx.user.id}>! Check it out at ${BOUNTY_BOARD_URL}/${bountyId}`);
	});
};

module.exports.validateBountyId = (bountyId: string): {isBountyIdValid: boolean, bountyId: string} => {
	console.log(bountyId);
	const BOUNTY_ID_REGEX = /^[a-f\d]{1,100}$/i;
	return {
		isBountyIdValid: !(bountyId == null || !BOUNTY_ID_REGEX.test(bountyId)),
		bountyId: bountyId,
	};
};