import ServiceUtils from '../../utils/ServiceUtils';
import { sendFqMessage, switchRoles } from '../../service/first-quest/LaunchFirstQuest';
import LaunchFirstQuest from '../../service/first-quest/LaunchFirstQuest';
import { Message } from "discord.js";
import constants from '../../service/constants/constants';

export default async (message: Message): Promise<any> => {
	// gate everything that is not first-quest command
	if (!(['!first-quest', '!verification'].includes(message.content))) return;

	const guilds = await message.client.guilds.fetch();

	for (const oAuth2Guild of guilds.values()) {
		const guild = await oAuth2Guild.fetch();

		const guildMembers = await guild.members.fetch();

		for (const member of guildMembers.values()) {
			if ((member.user.username === message.author.username) && ServiceUtils.isBanklessDAO(guild)) {
				if (message.content === '!verification') {
					try {
						const fqUnverified = await member.roles.cache.find((role ,key) => {
							// console.log(role);
							console.log(member.user.username);
							console.log(message.author.username)
							console.log(role.name);
							console.log(constants.FIRST_QUEST_ROLES.unverified);
							return role.name === constants.FIRST_QUEST_ROLES.unverified
						});
						console.log('fqUnverified ', fqUnverified.name);

						if ( fqUnverified.name === constants.FIRST_QUEST_ROLES.unverified) {
							return await LaunchFirstQuest(member, message.channel).catch(e => {
								console.error('ERROR: ', e);
							});
						} 
					} catch {
						return await message.channel.send({content: 'You are already verified. if you want to run first-quest, try !first-quest'});
						// return await message.channel.send({content: 'Something went wrong, ' +
						// 							'please try to re-enter the discord server to restart ' +
						// 							'the verification process. ' +
						// 							'If you are unable to verify, please get ' +
						// 							'in touch with us. We will help you sort this out.'});
					}
				}

				try {
					const isWelcome = await member.roles.cache.find(role => {
						return ( (Object.values(constants.FIRST_QUEST_ROLES).indexOf(role.name) > -1) && (role.name !== constants.FIRST_QUEST_ROLES.unverified) );
					});

					console.log('isWelcome', isWelcome);

					if ((member.user === message.author) && isWelcome) {
						try {
							const fqCompleted = await member.roles.cache.find(role => role.name === constants.FIRST_QUEST_ROLES.first_quest_complete);
							console.log('fqCompleted ', fqCompleted);

							if ( fqCompleted.name === constants.FIRST_QUEST_ROLES.first_quest_complete) {
								await switchRoles(member, constants.FIRST_QUEST_ROLES.first_quest_complete, constants.FIRST_QUEST_ROLES.verified);

								await new Promise(r => setTimeout(r, 500));

								return await sendFqMessage(message.channel, member).catch(e => {

									console.error('ERROR: ', e);
								});
							}

						} catch {
							return await sendFqMessage(message.channel, member).catch(e => {

								console.error('ERROR: ', e);
							});
						}
					}
				} catch {
					console.error('something went wrong here')
				}
			}
		}

	}
};
