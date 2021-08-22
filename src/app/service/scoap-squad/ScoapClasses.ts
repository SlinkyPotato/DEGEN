import { Channel, Message, TextBasedChannels, MessageEmbed } from 'discord.js';
import constants from '../constants/constants';

export class BotConversation {
	timeout: number;
	expired: boolean;
	convo: any;
	current_message_flow_index: string;
	current_channel: TextBasedChannels;
	current_message: Message;

	getTimeout(): number {
		return this.timeout;
	}

	getExpired(): boolean {
		return this.expired;
	}

	getConvo(): any {
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

	setExpired(expired: boolean): this {
		this.expired = expired;
		return this;
	}

	setConvo(convo: any): this {
		this.convo = convo;
		return this;
	}

	async setCurrentMessageFlowIndex(message_flow_index: string, channel: TextBasedChannels): Promise<this> {
		this.current_message_flow_index = message_flow_index;
		let role_number = '1';
		if (typeof this.getConvo().user_response_record.roles != 'undefined') {
			role_number = (Object.keys(this.getConvo().user_response_record.roles).length).toString();
		}

		if (message_flow_index === '6') {
			const role_number_string_old = this.convo.message_flow[message_flow_index][0].fields[0].value;
			const role_number_string_new = role_number_string_old + role_number;
			this.convo.message_flow[message_flow_index][0].fields[0].value = role_number_string_new;
			const currMsg = await channel.send({
				embeds: this.convo.message_flow[message_flow_index],
			});
			this.convo.message_flow[message_flow_index][0].fields[0].value = role_number_string_old;
			this.setCurrentMessage(currMsg);
		} else {
			const currMsg = await channel.send({
				embeds: this.convo.message_flow[message_flow_index],
			});
			this.setCurrentMessage(currMsg);
		}
		
		return this;
	}

	async sleep(timeout: number): Promise<any> {
		return new Promise(resolve => setTimeout(resolve, timeout));
	};
};


export class ScoapEmbed {
	embed: Record<string, any>;
	scoap_author: string;
	current_channel: Channel;
	current_message: Message;
	votable_emoji_array: Array<any>;

	getEmbed(): any {
		return this.embed;
	}

	getAuthor(): string {
		return this.scoap_author;
	}

	getCurrentChannel(): Channel {
		return this.current_channel;
	}

	getCurrentMessage(): Message {
		return this.current_message;
	}

	getVotableEmojiArray(): Array<any> {
		return this.votable_emoji_array;
	}

	setEmbed(embed: any): this {
		this.embed = embed;
		return this;
	}

	setScoapAuthor(scoap_author: string): this {
		this.scoap_author = scoap_author;
		return this;
	}

	setCurrentChannel(current_channel: Channel): this {
		this.current_channel = current_channel;
		return this;
	}

	setCurrentMessage(current_message: Message): this {
		this.current_message = current_message;
		return this;
	}

	setVotableEmojiArray(votable_emoji_array: Array<any>): this {
		this.votable_emoji_array = votable_emoji_array;
		return this;
	}

	updateProgressString(emoji: string, update_progress_string: string): this {
		for (const [i, field] of this.embed.fields.entries()) {
			if (field.name.includes(emoji)) {
				this.embed.fields[i + 1].name = update_progress_string;
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
				console.log('vote type check: REVOTE');
				return 'REVOTE';
			} else if (user_vote_ledger[this.user_id] === this.emoji) {
				console.log('vote type check: UNVOTE');
				return 'UNVOTE';
			} else if (user_vote_ledger[this.user_id] !== this.emoji) {
				console.log('vote type check: CHANGEVOTE');
				return 'CHANGEVOTE';
			}
		} else {
			user_vote_ledger[this.user_id] = this.emoji;
			console.log('vote type check: NEWVOTE');
			return 'NEWVOTE';
		}
	}
}

export class VoteRecord {
	// {user_id<string>: emoji<unicode>}
	user_vote_ledger: any;
	// {emoji<unicode>: progress string<str>}
	progress_strings: any;
	// {emoji<unicode>: current_total<int>}
	emote_totals: any;
	// {emoji<unicode>: required_total<int>}
	emote_required: any;
	
	getUserVoteLedger(): any {
		return this.user_vote_ledger;
	}

	getProgressStrings(): any {
		return this.progress_strings;
	}

	getEmoteTotals(): any {
		return this.emote_totals;
	}

	getEmoteRequired(): any {
		return this.emote_required;
	}

	setUserVoteLedger(user_vote_ledger: any): this {
		this.user_vote_ledger = user_vote_ledger;
		return this;
	}

	setProgressStrings(progress_strings: any): this {
		this.progress_strings = progress_strings;
		return this;
	}

	setEmoteTotals(emote_totals: any): this {
		this.emote_totals = emote_totals;
		return this;
	}

	setEmoteRequired(emote_required: any): this {
		this.emote_required = emote_required;
		return this;
	}

	update(vote: Record<string, any>): this {
		this._updateEmoteTotals(vote);
		this._updateProgressStrings(vote);
		this._updateUserVoteLedger(vote);
		return this;
	}

	_updateUserVoteLedger(vote: Record<string, any>): this {
		if (vote.type === 'UNVOTE') {
			this.user_vote_ledger[vote.user_id] = '';
		} else {
			this.user_vote_ledger[vote.user_id] = vote.emoji;
		}
		return this;
	}

	_updateEmoteTotals = (vote: Record<string, any>): this => {
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

	_updateProgressStrings(vote: Record<string, any>): this {
		const old_emoji = this.user_vote_ledger[vote.user_id];
		console.log(`updating progress string, inputs: ${vote.emoji}, ${old_emoji}, ${vote.type}`, this.emote_totals, this.emote_required);
		if (vote.type === 'CHANGEVOTE') {
			this.progress_strings[old_emoji] = this._generateProgressString(old_emoji);
			this.progress_strings[vote.emoji] = this._generateProgressString(vote.emoji);
		} else if (vote.type === 'UNVOTE') {
			this.progress_strings[old_emoji] = this._generateProgressString(old_emoji);
		} else {
			this.progress_strings[vote.emoji] = this._generateProgressString(vote.emoji);
		}
		return this;
	}

	_calcPercentages(emoji: string): string {
		const percent = Math.round((100 / this.emote_required[emoji]) * this.emote_totals[emoji]);
		return percent.toString();
	}

	_generateProgressString(emoji: string): string {
		return `${this._calcPercentages(emoji)}%(${this.emote_totals[emoji]}/${
			this.emote_required[emoji]
		})`;
	}
}
