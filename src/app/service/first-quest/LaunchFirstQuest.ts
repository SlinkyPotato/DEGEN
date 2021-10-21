import {DMChannel, GuildMember, TextBasedChannels} from 'discord.js';

export default async (member: GuildMember, dmChan:TextBasedChannels | string ): Promise<any> => {

	const dmChannel: DMChannel = await getDMChannel(member, dmChan);

	const verificationMessage = await dmChannel.send({ content:
			'Hello! Welcome to BanklessDAO. We\'re glad you\'re here 🙂 \n \n' +
			'Before we start you have to prove that you are human by reacting with 👍 ' });

	await verificationMessage.react('👍');

	await verificationMessage.awaitReactions({
		max: 1,
		time: (10000 * 60),
		errors: ['time'],
		filter: async (reaction, user) => {
			return ['👍'].includes(reaction.emoji.name) && !user.bot;
		},
	})
		.then(async () => {
			await switchRoles(member, 'unverified', 'verified');

			await dmChannel.send({ content:'Verification successful!\n\n' });

			await sendFqMessage(dmChannel, member);
		})
		.catch(async (e) => {
			await dmChannel.send('Verification failed, please try again. You can restart the verification process by responding with **!verification** ');
			console.log(e);
		});
};

export const sendFqMessage = async (dmChannel: TextBasedChannels, member: GuildMember): Promise<void> => {
	const fqMessage = await retrieveFqMessage(member);

	const content = fqMessageContent[fqMessage.message_id];

	const firstQuestMessage = await dmChannel.send({ content: content });

	await firstQuestMessage.react(fqMessage.emoji);

	await firstQuestMessage.awaitReactions({
		max: 1,
		// time: (1000 * 60),
		errors: ['time'],
		filter: async (reaction, user) => {
			return [fqMessage.emoji].includes(reaction.emoji.name) && !user.bot;
		},
	})
		.then(async (collected) => {
			await switchRoles(member, fqMessage.start_role, fqMessage.end_role);
			// if (fqMessage.start_role === 'First Quest Complete') {
			// 	return await sendFqMessage(dmChannel, member);
			// } else {
			await sendFqMessage(dmChannel, member);
			// }
		})
		.catch(async (e) => {
			await dmChannel.send('The conversation timed out. ' +
				'All your progress has been saved. ' +
				'You can continue at any time by ' +
				'responding to this conversation ' +
				'with **!first-quest** ');
			console.log(e);
		});
};

const getDMChannel = async (member: GuildMember, dmChan: TextBasedChannels | string): Promise<DMChannel> => {
	if (dmChan === 'undefined') {
		return await member.user.createDM();
	} else {
		return dmChan as DMChannel;
	}
}

const switchRoles = async (member: GuildMember, fromRole: string, toRole: string): Promise<void> => {
	const guild = member.guild;

	const roles = await guild.roles.fetch();

	for (const role of roles.values()) {
		if (role.name === toRole) {
			await member.roles.add(role);
		}

		if (role.name === fromRole) {
			await member.roles.remove(role);
		}
	}
};

const retrieveFqMessage = async (member):Promise<any> => {

	const roles = member.roles.cache;

	for (const role of roles.values()) {
		if (rolesArray.includes(role.name)) {
			return getFqMessage(role.name);
		}
	}
};

const getFqMessage = (roleName: string) => {
	switch (roleName) {
	case ('verified'):
		return fqMessageFlow['verified'];
	case ('First Quest Welcome'):
		return fqMessageFlow['welcome'];
	case ('First Quest Membership'):
		return fqMessageFlow['membership'];
	case ('Firehose'):
		return fqMessageFlow['firehose'];
	case ('First Quest Scholar'):
		return fqMessageFlow['scholar'];
	case ('First Quest Guest Pass'):
		return fqMessageFlow['guest_pass'];
	case ('First Quest'):
		return fqMessageFlow['first_quest'];
	case ('First Quest Complete'):
		return fqMessageFlow['complete'];
	}
};

const rolesArray = [
	'verified',
	'First Quest Welcome',
	'First Quest Membership',
	'Firehose',
	'First Quest Scholar',
	'First Quest Guest Pass',
	'First Quest',
	'First Quest Complete',
];

const fqMessageFlow = {
	verified: { message_id: 'fq1', emoji: '🏦', start_role: 'verified', end_role: 'First Quest Welcome' },
	welcome: { message_id: 'fq2', emoji: '🏦', start_role: 'First Quest Welcome', end_role: 'First Quest Membership' },
	membership: { message_id: 'fq3', emoji: '🏦', start_role: 'First Quest Membership', end_role: 'Firehose' },
	firehose: { message_id: 'fq4', emoji: '✏️', start_role: 'Firehose', end_role: 'First Quest Scholar' },
	scholar: { message_id: 'fq5', emoji: '✏️', start_role: 'First Quest Scholar', end_role: 'First Quest Guest Pass' },
	guest_pass: { message_id: 'fq6', emoji: '✏️', start_role: 'First Quest Guest Pass', end_role: 'First Quest' },
	first_quest: { message_id: 'fq7', emoji: '🤠', start_role: 'First Quest', end_role: 'First Quest Complete' },
	complete: { message_id: 'fq8', emoji: '🌟', start_role: 'First Quest Complete', end_role: 'verified' },
};

const fqMessageContent = {
	fq1: '**The easiest way to get started with your Bankless DAO journey ' +
		'is by completing the first quest. ' +
		'During your first quest I will walk you through ' +
		'everything you need, to get up and running ' +
		'with Bankless DAO. When you\'re ready to start, let me know by ' +
		'clicking the 🏦 emoji at the end of this message.** \n\n' +

		'Here are the TOP 5 THINGS you should know: \n' +
		'1. To verify your full membership, follow these instructions. You NEED to have 35,000 BANK in your wallet. \n' +
		'<https://discordapp.com/channels/834499078434979890/834499890569543720/846235762109186058> \n\n' +

		'2. Notion is our source of information. If you\'re looking for something, it\'s probably there. \n' +
		'<https://www.notion.so/bankless/BanklessDAO-Wiki-82ba81e7da1c42adb7c4ab67a4f22e8f> \n\n' +

		'3. Our Community Calls are every Friday at 15:00 UTC. You can add any BanklessDAO meeting to your personal calendar. \n' +
		'<https://www.notion.so/bankless/Meetings-Calendar-794ea323caad40e19a8a22bc2ec6edb6> \n\n' +

		'4. Subscribe to our Newsletter: \n' +
		'<https://banklessdao.substack.com/> \n\n' +

		'5. Here\'s a quick cheatsheet on how to start engaging with the community \n' +
		'<https://www.notion.so/bankless/Getting-Started-Cheat-Sheet-2521514971984ad4b440e00b3a7a6312> \n\n' +

		'**Start your first quest now:** \n\n',
	fq2: '>> Important message: Support will never send you a Direct Message offering DAO assistance. You must request it by your DM. <<\n' +
		'>> Never ever ever reveal your private keys. << \n' +
		'-----------------------------------------\n' +
		'Welcome to your First Quests. First Quests were created by BanklessDAO members to give you a short and effective onboarding experience that will introduce you to Bankless, the tools we use to manage our community, and how to get involved. All new members start with these First Quests. After reading this message, you\'ll have already completed your first quest for Bankless - joining the discord. \n' +
		'\n' +
		'-----------------------------------------\n' +
		'\n' +
		'React to this message with the 🏦 emoji to access your next quest. \n' +
		'\n',
	fq3: 'Welcome! The purpose of this quest is to choose your membership path.\n' +
		'\n' +
		'-----------------------------------------\n' +
		'\n' +
		'Participating in the DAO has no financial requirements.\n' +
		'\n' +
		'However, obtaining Level 1 membership gives you access to our Membership Perks. Currently these perks are limited, but we will continue to add more, like an NFT focused channel, NFT raffles, PoolTogether pods, early access to media, and more!\n' +
		'\n' +
		'In the Discord, Level 1 members have verified they own at least 35,000 $BANK, while Level 0 members have not. This distinction is important as Level 1 members are able to participate in most channels, while Level 0 members are only able to write in a few.\n' +
		'\n' +
		'If you have the minimum 35,000 $BANK, follow the instructions in 👉dao-start-here👈 to get your tags and permissions. \n' +
		'Once verified, you\'ll have access to all channels. Welcome aboard! Come say hello in #👋intros and join a guild from #⚔guild-select\n' +
		'\n' +
		'If you do NOT have the minimum 35,000 $BANK, don’t worry! There is an upcoming quest where you will obtain a guest pass. Many of us have started with 0 $BANK and have earned our 35,000 in only a few weeks. \n\n' +

		'React to this message BELOW with the 🏦 emoji to access your next quest. ',
	fq4: 'Welcome! The purpose of this quest is to ease into our primary communication channel, Discord.\n' +
		'\n' +
		'If you’ve never used Discord before or are unfamiliar with its layout, please watch this short video:\n' +
		'<https://www.loom.com/share/a5e35879f22b4a0eb0bbc621458cb28c>\n' +
		'\n' +
		'-----------------------------------------\n' +
		'\n' +
		'You can only view a small subset of all discord channels. We\'re doing this because diving in right away can be like drinking from a firehose :firehose:  .\n' +
		'\n' +
		'Right now, let’s focus on the broader picture. Discord operates using text and audio channels, nested within “categories” that have different permissions. Let’s look at some of the important categories within the BanklessDAO Discord:\n' +
		'🏦 Welcome (Level 0): Channels in this category are open to anyone that joins the Discord.\n' +
		'🏦 BanklessDAO in Bites: Quickly plug yourself into meetings, polls, forums, and more\n' +
		'🏦 General (Level 1): The main hangout for general DAO conversations\n' +
		'🏦 Community Call: The CC is a vital source of information. Join us every Friday at 15:00 UTC\n' +
		'🏦 Guilds: We have a slew of different guilds. Participating in a Guild is the best way to get active. \n' +
		'----------------------------------------- \n' +
		'Take a few minutes to explore these channels with the following video and get a sense for how we communicate! \n' +
		'-----------------------------------------\n' +
		'React to this message with the ✏️  emoji to access your next quest. \n',
	fq5: 'Welcome! The purpose of this quest is to introduce you to why BanklessDAO exists.\n' +
		'----------------------------------------- \n' +
		'Bankless is a movement for pioneers seeking liberation from the tyranny of the traditional financial system. Going Bankless means adopting decentralized, permissionless, and censorship-resistant technology. Through these means, we will achieve financial self-sovereignty, security, and prosperity.\n' +
		'BanklessDAO is the decentralized autonomous organization that acts as a steward of the Bankless Movement progressing the world towards a future of greater freedom.\n' +
		'🔸 Mission: We will help the world go Bankless by creating user-friendly onramps for people to discover decentralized financial technologies through education, media, and culture.\n' +
		'🔸 Vision: To live in a world where anyone with an internet connection has access to the financial tools needed to achieve financial independence\n' +
		'🔸 Values: Education, Integrity, Decentralized Governance, and Culture\n' +
		'\n' +
		'🔴 Education: We learn from each other. We seek to become a trusted guide that empowers people all over the globe to adopt decentralized finance by sharing accurate, truthful, and objective information.\n' +
		'🔴 Integrity: We operate transparently and build trust through radically public discourse and financial auditability.\n' +
		'🔴 Decentralized Governance: We put decision making into the hands of the collective. We create legitimacy through an environment where the best ideas win.\n' +
		'🔴 Culture: We reward action and embrace risk. We empower our community to continually drive new initiatives by providing a space to self-organize and quickly move from idea to action.\n' +
		'-----------------------------------------\n' +
		'See below video for a summary. \n' +
		'-----------------------------------------\n' +
		'\n' +
		'React to this message with the ✏️  emoji to access your next quest.',
	fq6: 'Welcome! The purpose of this quest is to provide a pathway for members without 35,000 $BANK to get involved using our Guest Pass.\n' +
		'\n' +
		'-----------------------------------------\n' +
		'\n' +
		'We do not want the 35,000 $BANK entry cost to prohibit people from contributing to our mission of helping the world go bankless. So, we created the Guest Pass to allow the same privileges as Level 1 members (except for access to the Membership Perks category).\n' +
		'\n' +
		'Once you receive a Guest Pass, you can retain it by participating in the Discord. At a minimum, you will be expected to contribute to discussions, all the way up to attending weekly Guild calls and completing bounties. Guest passes are not permanent, and inactivity will cause your Guest Pass to be revoked.\n' +
		'\n' +
		'To obtain a Guest Pass, navigate to the 🎢get-involved  and introduce yourself, your background, what interests you in the DAO, and any skills or ways you think you might want to or be able to contribute! There are unlimited ways to contribute/participate, you don’t have to be a Shadowy Super Coder to join!\n' +
		'\n' +
		'Once you have a Guest Pass, you\'ll have access to all channels. Welcome aboard! Come say hello in #👋intros and join a guild from #⚔guild-select. If it feels overwhelming right now, don’t stress, just drop in to the intro channel and take it from there with guidance! \n' +
		'-----------------------------------------\n' +
		'\n' +
		'React to this message with the ✏️  emoji to access your next quest. \n',
	fq7: 'Welcome! You’ve made it to your true first quest, should you choose to accept (you should!)\n' +
		'\n' +
		'-----------------------------------------\n' +
		'\n' +
		'Even though you’ve made it to the DAO and have familiarized with our Discord, it can still feel like you’re drinking from a firehose :firehose: .\n' +
		'\n' +
		'To stay up to date, our Writer’s Guild has consistently produced a high-quality weekly rollup on all DAO activities.\n' +
		'\n' +
		'Your first quest on this journey west, O\' fellow Bankless adventurer is to sign up and be the first in line to learn about BanklessDAO alpha, such as access to the discussions about NFT sales, Metafactory merch drops, inter-DAO projects, and so much more!\n' +
		'https://banklessdao.substack.com/\n' +
		'\n' +
		'Once you’ve completed your first quest, react with a 🤠 \n' +
		'Bankless DAO\n' +
		'The revolution will not be banked. This is the official newsletter of the Bankless DAO. Expect updates on the weekly.\n' +
		'Image\n' +
		'-----------------------------------------------------\n',
	fq8: '\'Congratulations! You have reached the end of first quest. \\n\' +\n' +
		'\n' +
		'Click on the 🌟 to clean up your roles.\n' +
		'\n' +
		'Only click the reaction after you are done!\n' +
		'You might have to restart again, if you want to view the first quest channels. You have been warned!',
};