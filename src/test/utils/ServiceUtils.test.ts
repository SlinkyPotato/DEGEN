import { GuildMember } from 'discord.js';
import { Collection } from '@discordjs/collection';
import ServiceUtils from '../../app/utils/ServiceUtils';
import roleIDs from '../../app/service/constants/roleIds';

const guildMembers: Collection<string, any> = new Collection();

const guild = {
    id: process.env.DISCORD_SERVER_ID,
    name: 'BanklessDAO',
    members: {
        fetch: jest.fn(() => Promise.resolve(guildMembers))
    },
    fetch: jest.fn(() => Promise.resolve(guild))
}

jest.mock('discord.js', () => {
    return {
        GuildMember: jest.fn(() => {
            return {
                bannable: true,
                nickname: null,
                displayName: null,
                user: {
                    username: null,
                    tag: null,
                },
                ban: jest.fn(() => Promise.resolve()),
                send: jest.fn(() => Promise.resolve()),
                guild: guild,
                roles: {
                    cache: new Collection()
                },
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
        // Populate collection of guild members
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
    })

    beforeEach(() => {
        guildMember = new GuildMember(null, null, guild as any);
    })

    describe('Username spam filter', () => {

        it('should skip filter for member that is at least level 1', async () => {
            guildMember.nickname = '0xLucas';
            guildMember.user.username = '0xLucas'
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            Object.defineProperty(guildMember.roles, 'cache', { get: () => 
                new Collection([[roleIDs.genesisSquad, {id: roleIDs.genesisSquad}]])
            });
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(false);
            expect(guildMember.guild.fetch).toHaveBeenCalledTimes(0);
            expect(guildMember.ban).toHaveBeenCalledTimes(0);
            expect(guildMember.send).toHaveBeenCalledTimes(0);
        });

        it('should skip filter for member this is not bannable', async () => {
            guildMember.nickname = '0xLucas';
            guildMember.user.username = '0xLucas';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            Object.defineProperty(guildMember, 'bannable', { get: () => false });
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(false);
            expect(guildMember.guild.fetch).toHaveBeenCalledTimes(0);
            expect(guildMember.ban).toHaveBeenCalledTimes(0);
            expect(guildMember.send).toHaveBeenCalledTimes(0);
        });

        it('should not ban user with no matching nickname', async () => {
            guildMember.nickname = 'New Pioneer';
            guildMember.user.username = 'New Pioneer';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(false);
            expect(guildMember.ban).toHaveBeenCalledTimes(0);
            expect(guildMember.send).toHaveBeenCalledTimes(0);
        });

        it('should not ban user with no matching username', async () => {
            guildMember.user.username = 'New Pioneer';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(false);
            expect(guildMember.ban).toHaveBeenCalledTimes(0);
            expect(guildMember.send).toHaveBeenCalledTimes(0);
        });

        it('should not ban user with additional numbers', async () => {
            guildMember.nickname = '0xLucas2';
            guildMember.user.username = 'Imposter';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(false);
            expect(guildMember.ban).toHaveBeenCalledTimes(0);
            expect(guildMember.send).toHaveBeenCalledTimes(0);
        });

        it('should ban user when message fails to send', async () => {
            guildMember.nickname = '0xLucas';
            guildMember.user.username = 'Imposter';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            guildMember.send = jest.fn(() => Promise.reject(
                "DiscordAPIError Code 50007: Cannot send messages to this user.")) as any
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
            expect(guildMember.send).toHaveBeenCalledTimes(1);
        });

        it('should ban user with matching nickname', async () => {
            guildMember.nickname = '0xLucas';
            guildMember.user.username = 'Imposter';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
            expect(guildMember.send).toHaveBeenCalledTimes(1);
        });

        it('should ban user with matching username', async () => {
            guildMember.user.username = '0xLucas';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
            expect(guildMember.send).toHaveBeenCalledTimes(1);
        });

        it('should ban user with matching nickname that has different case', async () => {
            guildMember.nickname = '0xlucas';
            guildMember.user.username = 'Imposter';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
            expect(guildMember.send).toHaveBeenCalledTimes(1);
        });

        it('should ban user with confusable diacritical mark in nickname', async () => {
            guildMember.nickname = '0xLucàs';
            guildMember.user.username = 'Imposter';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
            expect(guildMember.send).toHaveBeenCalledTimes(1);
        });

        it('should ban user with matching nickname with an emoji', async () => {
            guildMember.nickname = '0xLucas🏴';
            guildMember.user.username = 'Imposter';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
            expect(guildMember.send).toHaveBeenCalledTimes(1);
        });

        it('should ban user with matching nickname that has no spaces', async () => {
            guildMember.nickname = 'AboveAverageJoe';
            guildMember.user.username = 'Imposter';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
            expect(guildMember.send).toHaveBeenCalledTimes(1);
        });

        it('should ban user with confusable greek letter in nickname', async () => {
            guildMember.nickname = 'Αbove Average Joe'; // first Α is a greek letter
            guildMember.user.username = 'Imposter';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
            expect(guildMember.send).toHaveBeenCalledTimes(1);
        });

        it('should ban user with confusable cyrillic letter in username', async () => {
            guildMember.user.username = 'Аbove Average Joe'; // first Α is a cyrillic letter
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
            expect(guildMember.send).toHaveBeenCalledTimes(1);
        });

        it('should ban user with compatible ligature in nickname', async () => {
            guildMember.nickname = 'ﬀﬀbanks';
            guildMember.user.username = 'Imposter';
            Object.defineProperty(guildMember.user, 'tag', { get: () => `${guildMember.user.username}#1234`});
            Object.defineProperty(guildMember, 'displayName', { get: () => `${guildMember.nickname ? guildMember.nickname : guildMember.user.username}`});
            expect(await ServiceUtils.runUsernameSpamFilter(guildMember)).toBe(true);
            expect(guildMember.ban).toHaveBeenCalledTimes(1);
            expect(guildMember.send).toHaveBeenCalledTimes(1);
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

    describe('Check user roles', () => {
        it('should return false for user that is not admin', () => {
            Object.defineProperty(guildMember.roles, 'cache', { get: () => 
                new Collection([
                    [roleIDs.level1, {id: roleIDs.level1}], 
                    [roleIDs.level2, {id: roleIDs.level2}]
                ])
            });
            const result = ServiceUtils.hasRole(guildMember, roleIDs.admin)
            expect(result).toBe(false);
        })

        it('should return true for user that is admin', () => {
            Object.defineProperty(guildMember.roles, 'cache', { get: () => 
                new Collection([
                    [roleIDs.admin, {id: roleIDs.admin}]
                ])
            });
            const result = ServiceUtils.hasRole(guildMember, roleIDs.admin)
            expect(result).toBe(true);
        })

        it('should return false for user that is not admin or genesis', () => {
            Object.defineProperty(guildMember.roles, 'cache', { get: () => 
                new Collection([
                    [roleIDs.level1, {id: roleIDs.level1}], 
                    [roleIDs.level2, {id: roleIDs.level2}]
                ])
            });
            const result = ServiceUtils.hasSomeRole(guildMember, [roleIDs.admin, roleIDs.genesisSquad])
            expect(result).toBe(false);
        })

        it('should return true for user that is admin or genesis', () => {
            Object.defineProperty(guildMember.roles, 'cache', { get: () => 
                new Collection([
                    [roleIDs.admin, {id: roleIDs.admin}], 
                    [roleIDs.level2, {id: roleIDs.level2}]
                ])
            });
            const result = ServiceUtils.hasSomeRole(guildMember, [roleIDs.admin, roleIDs.genesisSquad])
            expect(result).toBe(true);
        })

        it('should return false for user that is not at least level 2', () => {
            Object.defineProperty(guildMember.roles, 'cache', { get: () => 
                new Collection([
                    [roleIDs.level1, {id: roleIDs.level1}]
                ])
            });
            const result = ServiceUtils.isAtLeastLevel2(guildMember)
            expect(result).toBe(false);
        })

        it('should return true for user that is at least level 2', () => {
            Object.defineProperty(guildMember.roles, 'cache', { get: () => 
                new Collection([
                    [roleIDs.level1, {id: roleIDs.level1}],
                    [roleIDs.level3, {id: roleIDs.level3}]
                ])
            });
            const result = ServiceUtils.isAtLeastLevel2(guildMember)
            expect(result).toBe(true);
        })
    })
});