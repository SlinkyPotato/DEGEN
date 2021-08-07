// let msg = `Collected ${reaction.emoji.name} from user ${user.username}`



	// if (vote_record.hasOwnProperty(user_id)) {						//user has already voted
// 		if (vote_record[user_id] === ''){										// revote
// 			vote_record[user_id] = emoji;
// 			return vote_record
// 		} else if (vote_record[user_id] === emoji){					// unvote
// 			vote_record[user_id] = '';
// 			return vote_record;
// 		} else if (vote_record[user_id] !== emoji){					// change vote
// 			await removeReaction(message, user_id);
// 			vote_record[user_id] = emoji;
// 			return vote_record;
// 		} else {
// 			console.log ('this should be impossible')
// 			return vote_record;
// 		}
// 	} else { 																							//user has not voted yet
// 		vote_record[user_id] = emoji;
// 		return vote_record;
// 	};
// };



// const updateEmbedFields = (emoji_name, embedFields) => {

	
// 	switch (true){
//       case emoji_name === constants.EMOJIS.one:
//       	{
//       	let updateString = updateProgressString(embedFields[1].name)
//       	embedFields[1] =  {
// 				name: updateStr,
// 				value: '\u200b',
// 				inline: true,
// 				};
//         return (embedFields);
// 	    };
	       
//       case emoji_name === constants.EMOJIS.two:
//       	{
//       	let st = embedFields[4].name.match(/\(([^)]+)\)/)[1];
//       	let current = st.split('/')[0];
//       	let target = st.split('/')[1];
//       	let newCurrent = parseInt(current) + 1;
//       	let percent = Math.round(100/parseInt(target)*newCurrent);
//       	let updateStr = `${percent}%(${newCurrent}/${target})`;
//       	embedFields[4] =  {
// 				name: updateStr,
// 				value: '\u200b',
// 				inline: true,
// 				};
//         return (embedFields);
// 	    };

//        case emoji_name === constants.EMOJIS.three: 
//        	{
//       	let st = embedFields[7].name.match(/\(([^)]+)\)/)[1];
//       	let current = st.split('/')[0];
//       	let target = st.split('/')[1];
//       	let newCurrent = parseInt(current) + 1;
//       	let percent = Math.round(100/parseInt(target)*newCurrent);
//       	let updateStr = `${percent}%(${newCurrent}/${target})`;
//         embedFields[7] =  {
// 				name: updateStr,
// 				value: '\u200b',
// 				inline: true,
// 				};
//         return (embedFields);
// 	    };

//       default:
//         console.log('This should never happen!');
//     }

// };