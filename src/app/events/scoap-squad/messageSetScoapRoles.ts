import { botConvoArray } from '../../service/scoap-squad/CreateNewScoapPoll';
import { Message } from 'discord.js';

export default async (message: Message): Promise<any> => {


	// Note - make sure to get rid of embedObject in array after scoap draft is completed

	// map message to correct botConvoObject object
	// const scoapEmbedIndex = scoapEmbedArray.map(embed => embed.current_channel).indexOf(message.channel);
	// if (scoapEmbedIndex === -1) return;
	console.log('botConvoArray ', botConvoArray);
	const botConvoIndex = botConvoArray.map(x => x.current_channel).indexOf(message.channel);
	console.log('botConvoIndex', botConvoIndex);
	if (botConvoIndex === -1) return;

	// const scoapEmbed = scoapEmbedArray[scoapEmbedIndex];
	const botConvo = botConvoArray[botConvoIndex];
	console.log('botConvo ', botConvo);

	console.log('received this message: ', message.content);
	console.log('last message (from message.channel): ', message.channel.lastMessageID);
	console.log('last message (from botConvo.channel): ', botConvo.getCurrentChannel().lastMessageID);
	console.log('this message: ', message.id);
	console.log('botConvoCurrentMessage: ', botConvo.getCurrentMessage().id);
	console.log('botConvoCurrentChannel: ', botConvo.getCurrentChannel().id);
	console.log('message channel: ', message.channel.id);
	console.log('last message Key: ', message.channel.messages.cache.lastKey());
	console.log('last message id: ', message.channel.messages.cache.last().id);
	console.log('last message Key(2): ', message.channel.messages.cache.lastKey(2));

	// only respond if this message is a direct response to botConvo.current_message
	// if (message.channel.messages.cache.lastKey(2)[0] === scoapEmbed.getCurrentMessage().id) {
	if (message.channel.messages.cache.lastKey(2)[0] === botConvo.getCurrentMessage().id) {
		console.log ('still kickin');
		if (!('1' in botConvo.getConvo().user_response_record)) {
			// if (botConvo.getCurrentMessageFlowIndex() === '1') {
			console.log('current message is 1');
			switch (true) {
			// isInteger(message.content)
			case (isInteger(message.content)):
				console.log('got integer', message.content);
				botConvo.getConvo().user_response_record[botConvo.getCurrentMessageFlowIndex()] = message.content,
				botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + 1).toString(), await handleCorrectInput(message));
				return;
			case (!isInteger(message.content)):
				botConvo.setCurrentMessageFlowIndex(botConvo.getCurrentMessageFlowIndex(), await handleWrongInput(message, 'number between 1 and 10'));
				return;
			}
			// } 
		} else if ('1' in botConvo.getConvo().user_response_record) {
			const roleCount = parseInt(botConvo.getConvo().user_response_record['1']);
			// [...Array(roleCount * 2).keys()].map(i => {
			if (!('roles' in botConvo.getConvo().user_response_record)) {
				botConvo.getConvo().user_response_record['roles'] = {};
				botConvo.getConvo().user_response_record.roles['1'] = {};
			}

			const roleIndex = Object.keys(botConvo.getConvo().user_response_record['roles']).length;
			if (roleIndex <= roleCount) {
				switch (true) {
				// isInteger(message.content)
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
						await message.channel.send(`Recorderd the following inputs ${botConvo.getConvo().user_response_record.roles}`);
						botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + 1).toString(), message);
					};
					// Note check if int
					break;
				}
			}
			

			// });
			
			console.log('response record ', botConvo.getConvo().user_response_record);
			
		}

		return;
	};

	return;

	// return console.log('channel did not match ', message.channel, scoapEmbed.current_channel);
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