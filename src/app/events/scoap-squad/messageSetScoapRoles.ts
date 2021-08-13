import { publishScoapPoll } from '../../service/scoap-squad/CreateNewScoapPoll';
import { scoapEmbedArray, botConvoArray } from '../../app';
import { Message } from 'discord.js';
import constants from '../../service/constants/constants';

export default async (message: Message): Promise<any> => {

	// console.log(' THE ARRAYS ');
	// console.log(scoapEmbedArray);
	// console.log(botConvoArray);

	// Note - make sure to get rid of embedObject in array after scoap draft is completed

	// map message to correct botConvoObject object
	// console.log('botConvoArray ', botConvoArray);
	const botConvoIndex = botConvoArray.map(x => x.current_channel).indexOf(message.channel);
	// console.log('botConvoIndex', botConvoIndex);
	if (botConvoIndex === -1) return;

	// const scoapEmbed = scoapEmbedArray[scoapEmbedIndex];
	const botConvo = botConvoArray[botConvoIndex];

	// only act if this message is a direct response to botConvo.current_message
	if (message.channel.messages.cache.lastKey(2)[0] === botConvo.getCurrentMessage().id) {
		// user_rersponse_record still empty
		if (!('1' in botConvo.getConvo().user_response_record)) {
			switch (true) {
			case (isInteger(message.content) && (parseInt(message.content) < 10) && (parseInt(message.content) >= 1)):
				console.log('got integer', message.content);
				botConvo.getConvo().user_response_record[botConvo.getCurrentMessageFlowIndex()] = message.content,
				botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + 1).toString(), await handleCorrectInput(message));
				return;
			// (!isInteger(message.content) || (parseInt(message.content) >= 10))
			default:
				botConvo.setCurrentMessageFlowIndex(botConvo.getCurrentMessageFlowIndex(), await handleWrongInput(message, 'number between 1 and 9'));
				return;
			}
		// user already answered question 1 -> we have total number of roles to start our loop
		} else if ('1' in botConvo.getConvo().user_response_record) {
			const roleCount = parseInt(botConvo.getConvo().user_response_record['1']);
			if (!('roles' in botConvo.getConvo().user_response_record)) {
				botConvo.getConvo().user_response_record['roles'] = {};
				botConvo.getConvo().user_response_record.roles['1'] = {};
			}

			const roleIndex = Object.keys(botConvo.getConvo().user_response_record['roles']).length;
			if (roleIndex <= roleCount) {
				switch (true) {
				case (botConvo.getCurrentMessageFlowIndex() === '2'):
					botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + 1).toString(), await handleCorrectInput(message));
					botConvo.getConvo().user_response_record.roles[roleIndex.toString()]['title'] = message.content;
					break;
				case (botConvo.getCurrentMessageFlowIndex() === '3'):
					botConvo.getConvo().user_response_record.roles[(roleIndex).toString()]['role_count'] = message.content;
					if (roleIndex < roleCount) {
						botConvo.getConvo().user_response_record.roles[(roleIndex + 1).toString()] = {};
						botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) - 1).toString(), await handleCorrectInput(message));
					} else if (roleIndex == roleCount) {
						// await message.channel.send(`Recorderd the following inputs ${botConvo.getConvo().user_response_record.roles}`);
						botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + 1).toString(), message);

						console.log('response record ', botConvo.getConvo().user_response_record);
						const scoapEmbedIndex = scoapEmbedArray.map(embed => embed.current_channel).indexOf(message.channel);
						const scoapEmbed = scoapEmbedArray[scoapEmbedIndex];
						Array(parseInt(botConvo.getConvo().user_response_record['1'])).fill(0).map((_, i) => {
							// console.log('i ', i);

							const role = botConvo.getConvo().user_response_record.roles[(i + 1).toString()];
							const emoji = constants.EMOJIS[(i + 1).toString()];
							scoapEmbed.getVotableEmojiArray().push(emoji);

							scoapEmbed.getEmbed().fields.push(
								{
									name: `${emoji} ${role.title}`,
									value: '\u200b',
									inline: true,
								},
								{
									name: `0 % (0/${role.role_count})`,
									value: '\u200b',
									inline: true,
								},
								{
									name: '\u200b',
									value: '\u200b',
									inline: false,
								},
							);
						});
						const verifyMessage = await message.channel.send('Please verify final draft', { embed: scoapEmbed.getEmbed() });
						await verifyMessage.react('👍');
						await verifyMessage.react('❌');
						console.log('embedArray ', scoapEmbedArray);
						console.log('botConvoArray ', botConvoArray);
						return publishScoapPoll(verifyMessage, scoapEmbed, botConvo);

					};
					break;
				}
			}
		}

		return;
	};

	return;
};

function isInteger(value) {
	return /^\d+$/.test(value);
}

const handleWrongInput = async (message, expected) => {
	return await message.channel.send(`Expected ${expected}, but received input "${message.content}". Please try again.`);
} ;

const handleCorrectInput = async (message) => {
	return await message.channel.send(`Received input "${message.content}".`);
} ;

