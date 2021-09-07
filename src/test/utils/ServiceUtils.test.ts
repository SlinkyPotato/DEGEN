import { GuildMember } from 'discord.js';
import { Collection } from '@discordjs/collection';
import ServiceUtils from '../../app/utils/ServiceUtils';
import roleIDs from '../../app/service/constants/roleIds';

const guildMembers: Collection<string, any> = new Collection();
const channels: Collection<string, any> = new Collection();

const guild = {
    id: process.env.DISCORD_SERVER_ID,
    name: 'BanklessDAO',
    members: {
        fetch: jest.fn(() => Promise.resolve(guildMembers))
    },
    channels: {
        cache: channels
    }
}

jest.mock('discord.js', () => {
    return {
        GuildMember: jest.fn(() => {
            return {
                nickname: null,
                user: {
                    username: null
                },
                ban: jest.fn(() => Promise.resolve(guildMembers.get('1'))),
                guild: {
                    fetch: jest.fn(() => Promise.resolve(guild))
                }
            };
        })
    };
});

jest.mock('../../app/app', () => {
    return {
        client: jest.fn()
    }
});

describe('Service Utils', () => {
    let guildMember: GuildMember;

    beforeAll(() => {
        guildMembers.set('1', {
            roles: {
                cache: new Collection([
                    [roleIDs.genesisSquad, {id: roleIDs.genesisSquad}]
                ])
            },
            user: {
                username: '0xLucas'
            }
        })
        guildMembers.set('2', {
            roles: {
                cache: new Collection([
                    [roleIDs.admin, {id: roleIDs.admin}],
                    [roleIDs.grantsCommittee, {id: roleIDs.grantsCommittee}],
                    [roleIDs.level4, {id: roleIDs.level4}]
                ])
            },
            user: {
                username: 'Above Average Joe'
            }
        })
        guildMembers.set('3', {
            roles: {
                cache: new Collection([
                    [roleIDs.developersGuild, {id: roleIDs.developersGuild}],
                    [roleIDs.level4, {id: roleIDs.level4}],
                ])
            },
            user: {
                username: 'Vitalik Buterin'
            }
        })
        guildMembers.set('4', {
            roles: {
                cache: new Collection([
                    [roleIDs.level2, {id: roleIDs.level2}],
                ])
            },
            user: {
                username: 'ffffbanks'
            }
        })
        channels.set(process.env.DISCORD_CHANNEL_BOT_AUDIT_ID, {
            send: jest.fn()
        })
    })

    beforeEach(() => {
        guildMember = new GuildMember(null, null, guild as any);
    })

    describe('Username spam filter', () => {

        it('should not ban user with no matching nickname', async () => {
            guildMember.nickname = 'New Pioneer';
            guildMember.user.username = 'New Pioneer';
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(false);
            expect(guildMember.ban).toHaveBeenCalledTimes(0);
        });

        it('should not ban user with no matching username', async () => {
            guildMember.user.username = 'New Pioneer';
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(false);
            expect(guildMember.ban).toHaveBeenCalledTimes(0);
        });

        it('should ban user with matching nickname', async () => {
            guildMember.nickname = '0xLucas';
            guildMember.user.username = 'Imposter';
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
        });

        it('should ban user with matching username', async () => {
            guildMember.user.username = '0xLucas';
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
        });

        it('should ban user with matching nickname that has different case', async () => {
            guildMember.nickname = '0xlucas';
            guildMember.user.username = 'Imposter';
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
        });

        it('should ban user with confusable diacritical mark in nickname', async () => {
            guildMember.nickname = '0xLucàs';
            guildMember.user.username = 'Imposter';
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
        });

        it('should ban user with matching nickname that has no spaces', async () => {
            guildMember.nickname = 'AboveAverageJoe';
            guildMember.user.username = 'Imposter';
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
        });

        it('should ban user with confusable greek letter in nickname', async () => {
            guildMember.nickname = 'Αbove Average Joe'; // first Α is a greek letter
            guildMember.user.username = 'Imposter';
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
        });

        it('should ban user with confusable cyrillic letter in username', async () => {
            guildMember.user.username = 'Аbove Average Joe'; // first Α is a cyrillic letter
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
        });

        it('should ban user with compatible ligature in nickname', async () => {
            guildMember.nickname = 'ﬀﬀbanks';
            guildMember.user.username = 'Imposter';
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
        });
    })

    describe('Get members with roles', () => {
        it('should return 0 members', async () => {
            const members = await ServiceUtils.getMembersWithRoles(guild as any, [roleIDs.guestPass])
            expect(members.size).toBe(0);
        })

        it('should return 1 member', async () => {
            const members = await ServiceUtils.getMembersWithRoles(guild as any, [roleIDs.genesisSquad])
            expect(members.size).toBe(1);
        })

        it('should return 2 members', async () => {
            const members = await ServiceUtils.getMembersWithRoles(guild as any, [roleIDs.genesisSquad, roleIDs.admin])
            expect(members.size).toBe(2);
        })

        it('should return 3 members', async () => {
            const members = await ServiceUtils.getMembersWithRoles(guild as any, [roleIDs.genesisSquad, roleIDs.admin, roleIDs.developersGuild])
            expect(members.size).toBe(3);
        })
    })
});