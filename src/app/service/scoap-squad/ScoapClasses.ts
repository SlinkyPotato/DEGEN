import { Message, TextBasedChannels, MessageEmbed } from 'discord.js';
import { v1 as uuidv1 } from 'uuid';
import ScoapUtils from '../../utils/ScoapUtils';
import Log from '../../utils/Log';


export class BotConversation {
	timeout: number;
	convo: Record<string, any>;
	current_message_flow_index: string;
	current_channel: TextBasedChannels;
	current_message: Message;
	edit: boolean;
	edit_value: string;
	conversation_id: string;
	user_id: string;
	scoap_embed_id: string;

	constructor() {
		this.conversation_id = uuidv1();
	}

	getScoapEmbedId(): string {
		return this.scoap_embed_id;
	}

	getUserId(): string {
		return this.user_id;
	}

	getId(): string {
		return this.conversation_id;
	}

	getEditValue(): string {
		return this.edit_value;
	}

	getEdit(): boolean {
		return this.edit;
	}

	getTimeout(): number {
		return this.timeout;
	}

	getConvo(): Record<string, any> {
		return this.convo;
	}

	getCurrentMessageFlowIndex(): string {
		return this.current_message_flow_index;
	}

	getCurrentChannel(): TextBasedChannels {
		return this.current_channel;
	}

	getCurrentMessage(): Message {
		return this.current_message;
	}

	setScoapEmbedId(scoap_embed_id: string): this {
		this.scoap_embed_id = scoap_embed_id;
		return this;
	}

	setUserId(user_id: string): this {
		this.user_id = user_id;
		return this;
	}

	setEditValue(edit_value: string): this {
		this.edit_value = edit_value;
		return this;
	}

	setEdit(edit: boolean): this {
		this.edit = edit;
		return this;
	}

	setCurrentChannel(current_channel: TextBasedChannels): this {
		this.current_channel = current_channel;
		return this;
	}

	setCurrentMessage(current_message: Message): this {
		this.current_message = current_message;
		return this;
	}

	setTimeout(timeout: number): this {
		this.timeout = timeout;
		return this;
	}

	setConvo(convo: Record<string, any>): this {
		this.convo = convo;
		return this;
	}

	async setCurrentMessageFlowIndex(message_flow_index: string, channel: TextBasedChannels): Promise<this> {
		this.current_message_flow_index = message_flow_index;
		let role_number = '1';
		if (typeof this.getConvo().user_response_record.roles != 'undefined') {
			if (!this.getEdit()) {
				role_number = (Object.keys(this.getConvo().user_response_record.roles).length).toString();
			} else {
				role_number = '';
			}
		}

		if (message_flow_index === '6') {
			const role_number_string_old = this.convo.message_flow[message_flow_index][0].fields[0].value;
			const role_number_string_new = role_number_string_old + role_number;
			this.convo.message_flow[message_flow_index][0].fields[0].value = role_number_string_new;
			const currMsg = await channel.send({
				content: this.convo.message_flow[message_flow_index][0].fields[0].value,
			});
			this.convo.message_flow[message_flow_index][0].fields[0].value = role_number_string_old;
			this.setCurrentMessage(currMsg);
		} else if (message_flow_index === '1') {
			const currMsg = await channel.send({
				embeds: this.convo.message_flow[message_flow_index],
			});
			this.setCurrentMessage(currMsg);
		} else {
			const currMsg = await channel.send({
				content: this.convo.message_flow[message_flow_index][0].fields[0].value,
			});
			this.setCurrentMessage(currMsg);
		}
		
		return this;
	}

	async sleep(timeout: number): Promise<any> {
		return new Promise(resolve => setTimeout(resolve, timeout));
	}
}


export class ScoapEmbed {
	embed: Array<MessageEmbed>;
	scoap_author: string;
	current_channel: TextBasedChannels;
	current_message: string|Message;
	votable_emoji_array: Array<any>;
	notion_page_id: string;
	id: string;
	bot_convo_record: Record<string, any>;
	vote_record_id: string;
	reaction_user_ids: Record<string, any>;
	published_timestamp: number;

	constructor() {
		this.id = uuidv1();
		this.reaction_user_ids = {};
	}

	getId(): string {
		return this.id;
	}

	getEmbed(): Array<MessageEmbed> {
		return this.embed;
	}

	getAuthor(): string {
		return this.scoap_author;
	}

	getUserId(): string {
		return this.scoap_author;
	}

	getCurrentChannel(): TextBasedChannels {
		return this.current_channel;
	}

	getCurrentMessage(): string|Message {
		return this.current_message;
	}

	getVotableEmojiArray(): Array<any> {
		return this.votable_emoji_array;
	}

	getNotionPageId(): string {
		return this.notion_page_id;
	}

	getBotConvoResponseRecord(): Record<string, any> {
		return this.bot_convo_record;
	}

	getVoteRecordId(): string {
		return this.vote_record_id;
	}

	getReactionUserIds(): Record<string, any> {
		return this.reaction_user_ids;
	}

	getPublishedTimestamp(): number {
		return this.published_timestamp;
	}

	setId(uuid: string): this {
		this.id = uuid;
		return this;
	}

	setEmbed(embed: Array<MessageEmbed>): this {
		this.embed = embed;
		return this;
	}

	setScoapAuthor(scoap_author: string): this {
		this.scoap_author = scoap_author;
		return this;
	}

	setCurrentChannel(current_channel: TextBasedChannels): this {
		this.current_channel = current_channel;
		return this;
	}

	setCurrentMessage(current_message: string|Message): this {
		this.current_message = current_message;
		return this;
	}

	setVotableEmojiArray(votable_emoji_array: Array<any>): this {
		this.votable_emoji_array = votable_emoji_array;
		return this;
	}

	setNotionPageId(notion_page_id: string): this {
		this.notion_page_id = notion_page_id;
		return this;
	}

	setBotConvoResponseRecord(bot_convo_record: Record<string, any>): this {
		this.bot_convo_record = bot_convo_record;
		return this;
	}

	setVoteRecordId(vote_record_id: string): this {
		this.vote_record_id = vote_record_id;
		return this;
	}

	setReactionUserIds(reaction_user_ids: Record<string, any>): this {
		this.reaction_user_ids = reaction_user_ids;
		return this;
	}

	setPublishedTimestamp(published_timestamp: number): this {
		this.published_timestamp = published_timestamp;
		return this;
	}

	addReactionUserId(key: string, reaction_user_id: string): this {
		if (!(key in this.reaction_user_ids)) {
			this.reaction_user_ids[key] = [reaction_user_id];
		} else {
			this.reaction_user_ids[key].push(reaction_user_id);
		}
		ScoapUtils.logToFile(`object added to reaction_user_id, key ${key}, user id ${reaction_user_id} \n this.reaction_user_ids: ${JSON.stringify(this.reaction_user_ids)}`);
		return this;
	}

	removeReactionUserId(key: string, reaction_user_id: string): this {
		const index = this.reaction_user_ids[key].indexOf(reaction_user_id);
		if (index !== -1) {
			this.reaction_user_ids[key].splice(index, 1);
			ScoapUtils.logToFile(`object removed from reaction_user_id, key ${key}, user id ${reaction_user_id} \n this.reaction_user_ids: ${JSON.stringify(this.reaction_user_ids)}`);
		}
		return this;
	}

	updateProgressString(emoji: string, update_progress_string: string): this {
		for (const [i, field] of this.embed[0].fields.entries()) {
			if (field.name.includes(emoji)) {
				this.embed[0].fields[i + 1].name = update_progress_string;
				return this;
			}
		}
	}
}

export class Vote {
	user_id: string;
	emoji: string;
	type: string;

	constructor(
		user_id: string,
		emoji: string,
		user_vote_ledger: Record<string, unknown>,
	) {
		this.user_id = user_id;
		this.emoji = emoji;
		this.type = this.checkVoteType(user_vote_ledger);
	}

	getUserId(): string {
		return this.user_id;
	}

	getEmoji(): string {
		return this.emoji;
	}

	getType(): string {
		return this.type;
	}

	checkVoteType(user_vote_ledger: Record<string, any>): string {
		if (Object.prototype.hasOwnProperty.call(user_vote_ledger, this.user_id)) {
			// user has already voted
			if (user_vote_ledger[this.user_id] === '') {
				Log.debug('vote type check: REVOTE');
				return 'REVOTE';
			} else if (user_vote_ledger[this.user_id] === this.emoji) {
				Log.debug('vote type check: UNVOTE');
				return 'UNVOTE';
			} else if (user_vote_ledger[this.user_id] !== this.emoji) {
				Log.debug('vote type check: CHANGEVOTE');
				return 'CHANGEVOTE';
			}
		} else {
			user_vote_ledger[this.user_id] = this.emoji;
			Log.debug('vote type check: NEWVOTE');
			return 'NEWVOTE';
		}
	}
}

export class VoteRecord {
	// {user_id<string>: emoji<unicode>}
	user_vote_ledger: Record<string, string>;
	// {emoji<unicode>: progress string<str>}
	progress_strings: Record<string, string>;
	// {emoji<unicode>: current_total<int>}
	emote_totals: Record<string, number>;
	// {emoji<unicode>: required_total<int>}
	emote_required: Record<string, number>;
	id: string;

	constructor() {
		this.id = uuidv1();
	}

	getId(): any {
		return this.id;
	}
	
	getUserVoteLedger(): Record<string, string> {
		return this.user_vote_ledger;
	}

	getProgressStrings(): Record<string, string> {
		return this.progress_strings;
	}

	getEmoteTotals(): Record<string, number> {
		return this.emote_totals;
	}

	getEmoteRequired(): Record<string, number> {
		return this.emote_required;
	}

	setId(uuid: string): this {
		this.id = uuid;
		return this;
	}

	setUserVoteLedger(user_vote_ledger: Record<string, string>): this {
		this.user_vote_ledger = user_vote_ledger;
		return this;
	}

	setProgressStrings(progress_strings: Record<string, string>): this {
		this.progress_strings = progress_strings;
		return this;
	}

	setEmoteTotals(emote_totals: Record<string, number>): this {
		this.emote_totals = emote_totals;
		return this;
	}

	setEmoteRequired(emote_required: Record<string, number>): this {
		this.emote_required = emote_required;
		return this;
	}

	update(vote: Record<string, any>): this {
		this.updateEmoteTotals(vote);
		this.updateProgressStrings(vote);
		this.updateUserVoteLedger(vote);
		return this;
	}

	updateUserVoteLedger(vote: Record<string, any>): this {
		if (vote.type === 'UNVOTE') {
			this.user_vote_ledger[vote.user_id] = '';
		} else {
			this.user_vote_ledger[vote.user_id] = vote.emoji;
		}
		return this;
	}

	updateEmoteTotals = (vote: Record<string, any>): this => {
		const old_emoji = this.user_vote_ledger[vote.user_id];
		switch (vote.type) {
		case 'NEWVOTE':
			++this.emote_totals[vote.emoji];
			return this;
		case 'REVOTE':
			++this.emote_totals[vote.emoji];
			return this;
		case 'CHANGEVOTE':
			--this.emote_totals[old_emoji];
			++this.emote_totals[vote.emoji];
			return this;
		case 'UNVOTE':
			--this.emote_totals[vote.emoji];
			return this;
		}
	};

	updateProgressStrings(vote: Record<string, any>): this {
		const old_emoji = this.user_vote_ledger[vote.user_id];
		if (vote.type === 'CHANGEVOTE') {
			this.progress_strings[old_emoji] = this.generateProgressString(old_emoji);
			this.progress_strings[vote.emoji] = this.generateProgressString(vote.emoji);
		} else if (vote.type === 'UNVOTE') {
			this.progress_strings[old_emoji] = this.generateProgressString(old_emoji);
		} else {
			this.progress_strings[vote.emoji] = this.generateProgressString(vote.emoji);
		}
		return this;
	}

	calcPercentages(emoji: string): string {
		const percent = Math.round((100 / this.emote_required[emoji]) * this.emote_totals[emoji]);
		return percent.toString();
	}

	generateProgressString(emoji: string): string {
		return `${this.calcPercentages(emoji)}%(${this.emote_totals[emoji]}/${
			this.emote_required[emoji]
		})`;
	}
}
