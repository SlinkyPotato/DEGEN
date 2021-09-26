import { Collection as DiscordCollection } from '@discordjs/collection';
import { GuildMember } from 'discord.js';
import { Collection, Db, MongoClient } from 'mongodb';
import EarlyTermination from '../../../app/errors/EarlyTermination';
import ValidationError from '../../../app/errors/ValidationError';
import { updateUserForPOAP } from '../../../app/events/poap/AddUserForEvent';
import constants from '../../../app/service/constants/constants';
import StartPOAP from '../../../app/service/poap/StartPOAP';
import dbInstance from '../../../app/utils/dbUtils';
import ServiceUtils from '../../../app/utils/ServiceUtils';

jest.mock('../../../app/utils/dbUtils');
jest.mock('../../../app/utils/ServiceUtils');
jest.mock('../../../app/events/poap/AddUserForEvent');

jest.mock('../../../app/utils/POAPUtils', () => {
	return {
		validateUserAccess: jest.fn(() => Promise.resolve()),
		validateEvent: jest.fn(() => Promise.resolve()),
	};
});

jest.mock('discord.js', () => {
	return {
		GuildMember: jest.fn(() => {
			return {
				id: '83254665220',
				user: {
					tag: 'hydrabolt#0001',
					id: '83254665220',
				},
				send: jest.fn(() => Promise.resolve(message)),
			};
		}),
	};
});

jest.mock('../../../app/app', () => {
	return {
		client: jest.fn(),
	};
});

const messages: DiscordCollection<string, any> = new DiscordCollection();
const message = {
	channel: {
		fetch: jest.fn(() => Promise.resolve({
			awaitMessages: jest.fn(() => Promise.resolve(messages)),
		})),
	},
};

describe('Start POAP', () => {
	let connection: MongoClient;
	let db: Db;
	let poapSettingsDB: Collection;
	let poapParticipantsDB: Collection;
	let guildMember: GuildMember;
	const voiceChannels: DiscordCollection<string, any> = new DiscordCollection();
	const guildMembers: DiscordCollection<string, any> = new DiscordCollection();

	beforeAll(async () => {
		// Setup mock database
		connection = await MongoClient.connect(global.__MONGO_URI__, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		db = connection.db();
		(dbInstance.dbConnect as jest.MockedFunction<any>).mockReturnValue(Promise.resolve(db));
		
		// Initialize collections
		poapSettingsDB = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
		poapParticipantsDB = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);

		// Create mock guild members
		guildMembers.set('8098123713', {
			user: {
				id: '8098123713',
			},
		});
		guildMembers.set('97124907112', {
			user: {
				id: '97124907112',
			},
		});

		// Create mock voice channels
		voiceChannels.set('1000', {
			name: 'dev workroom',
			id: '1000',
			members: guildMembers,
			guild: {
				id: process.env.DISCORD_SERVER_ID,
			},
		});
		voiceChannels.set('1001', {
			name: 'writers room',
			id: '1001',
			members: guildMembers,
			guild: {
				id: process.env.DISCORD_SERVER_ID,
			},
		});
		(ServiceUtils.getAllVoiceChannels as jest.MockedFunction<any>).mockReturnValue(voiceChannels);
	});

	beforeEach(async () => {
		guildMember = new GuildMember(null, null, null);
		messages.clear();
		await db.collection(constants.DB_COLLECTION_POAP_SETTINGS).deleteMany({});
		await db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS).deleteMany({});
	});

	afterAll(async () => {
		await connection.close();
	});

	it('should throw ValidationError if user has active event', async () => {
		// Populate database with user that has active event
		await poapSettingsDB.insertOne({
			discordUserId: '80002',
			isActive: true,
		});

		Object.defineProperty(guildMember, 'id', { get: () => '80002' });

		await expect(() => StartPOAP(guildMember, null)).rejects.toThrow(ValidationError);
	});

	it('should throw EarlyTermination if user responds no', async () => {
		// User responds with no
		messages.set('9740875342', {
			content: 'no',
		});

		await expect(() => StartPOAP(guildMember, null)).rejects.toThrow(EarlyTermination);
	});

	it('should throw ValidationError if channel has active event', async () => {
		// Populate database with channel that has active event
		await poapSettingsDB.insertOne({
			discordServerId: process.env.DISCORD_SERVER_ID,
			voiceChannelId: '1000',
			isActive: true,
		});

		// User responds with first channel in list (voice channel id: 1000)
		messages.set('9740875342', {
			content: '1',
		});

		await expect(() => StartPOAP(guildMember, null)).rejects.toThrow(ValidationError);
	});

	it('should insert new event into database', async () => {
		// User responds with first channel in list (voice channel id: 1000)
		messages.set('9740875342', {
			content: '1',
		});

		await StartPOAP(guildMember, null);

		expect(await poapSettingsDB.findOne({
			discordUserId: guildMember.user.id,
			isActive: true,
			voiceChannelId: '1000',
			voiceChannelName: 'dev workroom',
			discordServerId: process.env.DISCORD_SERVER_ID,
		})).not.toBeNull();
	});

	it('should delete previous partcipants when creating new event for channel', async () => {
		// Populate database with partcipant leftover from previous event in channel
		await poapParticipantsDB.insertOne({
			discordUserId: '80002',
			voiceChannelId: '1000',
			discordServerId: process.env.DISCORD_SERVER_ID,
		});

		// User responds with first channel in list (voice channel id: 1000)
		messages.set('9740875342', {
			content: '1',
		});

		await StartPOAP(guildMember, null);

		const result = await poapParticipantsDB.find().count();
		expect(result).toBe(0);
	});
	
	it('should update existing event for channel with new event details', async () => {
		// Populate database with inactive existing event in channel
		await poapSettingsDB.insertOne({
			discordServerId: process.env.DISCORD_SERVER_ID,
			voiceChannelId: '1000',
			isActive: false,
			discordUserId: '99999999',
			event: 'An old event',
		});

		// User responds with first channel in list (voice channel id: 1000)
		messages.set('9740875342', {
			content: '1',
		});

		await StartPOAP(guildMember, null);

		const result = await poapSettingsDB.findOne({
			discordServerId: process.env.DISCORD_SERVER_ID,
			voiceChannelId: '1000',
		});
		expect(result.isActive).toBeTruthy();
		expect(result.discordUserId).toBe(guildMember.user.id);
	});

	it('should add present members to new poap event', async () => {
		// User responds with first channel in list (voice channel id: 1000)
		messages.set('9740875342', {
			content: '1',
		});

		await StartPOAP(guildMember, null);

		const channelMembers: DiscordCollection<string, any> = voiceChannels.get('1000').members;
		expect(updateUserForPOAP).toBeCalledTimes(channelMembers.size);
	});
});