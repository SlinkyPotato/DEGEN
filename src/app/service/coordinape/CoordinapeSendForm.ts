import { DMChannel, GuildMember } from 'discord.js';
import { CommandContext } from 'slash-create';
import roleIds from '../constants/roleIds';

export default async (member: GuildMember, ctx?: CommandContext): Promise<any> => {
	ctx?.send(`Hi, ${ctx.user.mention}! I sent you a DM with more information.`);

	const dmChannel: DMChannel = await member.user.createDM();

	if (member.partial) {
		member = await member.fetch();
	}

	for (const role of member.roles.cache.values()) {
		if ((role.id === roleIds.level1) || (role.id === roleIds.level3) || (role.id === roleIds.level4)) {
			for (const role2 of member.roles.cache.values()) {
				if (role2.id === roleIds.level2) {
					await dmChannel.send({ content: 'Here is your form: <https://docs.google.com/forms/d/16qaDbz14C7d31pTZoOTRiDVShfzOimiwZlxUBit0Fmw/>' });
					return;
				}
			}

			await dmChannel.send({ content: 'Here is your form: <https://docs.google.com/forms/d/1-_uHDxyWFjDD92hdujqsylZgLmTLLuUnbJDaMSUX_hY>' });
			return;
		}
	}
};