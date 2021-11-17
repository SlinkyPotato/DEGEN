export const AFKMentionResponse = (user: string): string => {
	const messageArray = [
		`${user} rage quit, give it a few days.`,
		`${user} is not here right now, but I'm here!`,
		`${user} has a life outside of discord ser...`,
		`${user} got rekt. They'll be back sometime soon.`,
		`${user} is away right now. Please leave a message after the beep.`,
		`${user} is off shopping for pretty jpegs.`,
		`${user} threw their keyboard against that wall yesterday. I haven't heard from them since.`,
	];
	return messageArray[Math.floor(Math.random() * messageArray.length)];
};