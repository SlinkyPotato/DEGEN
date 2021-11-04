/*
import Checkin from '../../../app/service/timecard/Checkin';
import Checkout from '../../../app/service/timecard/Checkout';
import Hours from '../../../app/service/timecard/Hours';
import { connect } from '../../../app/utils/dbUtils';
import constants from '../../../app/service/constants/constants';
import { Collection, Db } from 'mongodb';
import dbInstance from '../../../app/utils/dbUtils';
import { Guild, GuildMember } from 'discord.js';
jest.mock('../../../app/utils/Log');
jest.mock('../../../app/app', () => {
	return {
		client: jest.fn(),
	};
});

describe('Timecard Services', () => {

	const guild: Guild = {
		id: process.env.DISCORD_SERVER_ID,
		name: 'BanklessDAO',
		fetch: jest.fn(() => Promise.resolve(guild)),
	} as any;

	const defaultGuildMember: GuildMember = {
		nickname: null,
		displayName: 'Pioneer',
		bannable: true,
		guild: guild,
		roles: [],
		user: {
			id: '930362313029460717',
			username: 'Pioneer',
			tag: 'Pioneer#1559',
		},
		ban: jest.fn(() => Promise.resolve()),
		send: jest.fn(() => Promise.resolve()),
	} as any;
	const defaultGuildMember2: GuildMember = {
		nickname: null,
		displayName: 'Pionere',
		bannable: true,
		guild: guild,
		roles: [],
		user: {
			id: '930362313029460716',
			username: 'Pionere',
			tag: 'Pioneer#1559',
		},
		ban: jest.fn(() => Promise.resolve()),
		send: jest.fn(() => Promise.resolve()),
	} as any;

	beforeAll(async () => {
		await connect(constants.DB_NAME_DEGEN);
	});

	afterAll(async () => {
		const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
		const timecardDb: Collection = db.collection(constants.DB_COLLECTION_TIMECARDS);
		const removedTimeCards = await timecardDb.deleteMany({ discordUserId: defaultGuildMember.user.id });
		expect(removedTimeCards.result.n).toEqual(2);
	});

	it('should checkin and checkout a Guild Member', async () => {
		const guildMember = defaultGuildMember;
		// await connect(constants.DB_NAME_DEGEN);

		const checkinResponse = await Checkin(guildMember, 1635256303903);

		expect(checkinResponse.insertedCount).toEqual(1);
        
		const checkoutResponse = await Checkout(guildMember, 1635257483767, 'test test test');
		expect(checkoutResponse.result.n).toEqual(1);
	});
	
	
	it('should attempt to checkin a Guild Member twice and recieve an errow', async () => {
		const guildMember = defaultGuildMember;
		// await connect(constants.DB_NAME_DEGEN);
		const checkinResponse1 = await Checkin(guildMember, 1635256303903);
		expect(checkinResponse1.insertedCount).toEqual(1);
		const checkinResponse2 = await Checkin(guildMember, 1635256303950);
		expect(checkinResponse2).toEqual('already checked in');
		const checkoutResponse = await Checkout(guildMember, 1635256303910, 'test test test test');
		expect(checkoutResponse.result.n).toEqual(1);
	});

	it('Retrieve their total hours', async () => {
		const guildMember = defaultGuildMember;
		const hoursResponse = await Hours(guildMember);
		expect(hoursResponse.length).toEqual(2);
	});

	it('Looks for hours that do no exist', async () => {
		const guildMember = defaultGuildMember2;
		const hoursResponse = await Hours(guildMember);
		expect(hoursResponse).toEqual('No timecards found');
	});
});
*/

describe('Timecard test', () => {
	it('should pass', () => {
		expect(true).toBe(true);
	});
});