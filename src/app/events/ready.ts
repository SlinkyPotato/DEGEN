/**
 * Handler for Discord event `ready`.
 */

import GuestPassService from '../service/guest-pass/GuestPassService';
import ScoapFastifyServer from '../service/scoap-squad/ScoapFastifyServer';
import { Client } from 'discord.js';
import constants from '../service/constants/constants';
import { connect } from '../utils/db';



// import { Client as NotionClient, APIErrorCode, ClientErrorCode, isNotionClientError } from '@notionhq/client';
// import {
// 	InputPropertyValueMap,
// 	PropertyMap,
// } from '@notionhq/client/build/src/api-endpoints';
// import {
// 	PropertyValueWithoutId,
// 	SelectFilter,
// 	TextFilter,
// 	UserBase,
// 	RichText,
// 	Block,
// 	ParagraphBlock,
// 	SelectOption,
// 	SelectOptionWithId,
// 	MultiSelectPropertyValue,
// 	SelectPropertyValue,
// 	DatePropertyValue,
// 	TitlePropertyValue,
// 	RichTextPropertyValue,
// 	PropertyValue,
// 	InputPropertyValue,
// 	TitleInputPropertyValue,
// } from '@notionhq/client/build/src/api-types';
// import constants from '../service/constants/constants';
// import api-types from '@notionhq/client';
// import * as notion from 'notion-types';

// import { NotionAPI } from 'notion-client';


module.exports = {
	name: 'ready',
	once: true,

	async execute(client: Client) {
		console.log('The Sun will never set on the DAO. Neither will I. DEGEN & Serendipity are ready for service.');
		client.user.setActivity('Going Bankless, Doing the DAO');
		await connect(constants.DB_NAME_DEGEN);
		await connect(constants.DB_NAME_BOUNTY_BOARD);
		await GuestPassService(client);
		ScoapFastifyServer();

		// const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });
		// const databaseId = process.env.NOTION_SCOAP_SQUAD_DB_ID;
		// const db_properties = await getNotionDatabaseProperties(notion, databaseId);
		// const select_option_open = retrieveSelectOption(db_properties, constants.SCOAP_SQUAD_NOTION_FIELDS.status.field_name, constants.SCOAP_SQUAD_NOTION_FIELDS.status.categories.open);
		// console.log('SELECT option Open ', select_option_open);
		// const discord_handles = ['handle 1', 'handle 2', 'mynewhandle', 'newagain', 'newinadifferentcolor'];
		// const m_select_options = retrieveMultiSelectOptions(db_properties, constants.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.field_name, discord_handles);
		// console.log('MULTI options ', m_select_options);
		// const new_m_select_options = createNewMultiSelectOptions(m_select_options[0], discord_handles);
		// console.log('EXISTING m SEelect options: ', m_select_options[1]);
		// console.log('NEW m SEelect options: ', new_m_select_options);
		// const value_map = createNotionProperties(databaseId, m_select_options[1], select_option_open, 'title', 'author');
		// console.log('VALUE MAP ', value_map);
		// const newPageId = await createNewNotionPage(notion, databaseId, value_map);
		// console.log(newPageId);
		// appendBlockToPage(notion, newPageId, 'SUMMARY');
		// const select_option_filled = retrieveSelectOption(db_properties, constants.SCOAP_SQUAD_NOTION_FIELDS.status.field_name, constants.SCOAP_SQUAD_NOTION_FIELDS.status.categories.filled);
		// console.log(select_option_filled);
		// setTimeout(function() {
		// 	console.log('updateing...');
		//     // updateStatusSelectField(notion, newPageId, select_option_filled);
		//     const multi_select_options = new_m_select_options.concat(m_select_options[1]);
		//     updateDiscordHandleMultiSelectField(notion, newPageId, multi_select_options);
		// }, 5000);
		
	},
};

// const getRandomColor = () => {
// 	return constants.NOTION_COLORS[Math.floor(Math.random() * constants.NOTION_COLORS.length)];
// };

// const updateStatusSelectField = async (notion, page_id, select_option) => {
// 	const propertyValues: InputPropertyValueMap = {};
// 	const pageId = page_id;
// 	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.status.field_name] = {
// 		type: constants.SCOAP_SQUAD_NOTION_FIELDS.status.type,
// 		id: select_option.id,
// 		select: select_option,
// 	} as SelectPropertyValue;
// 	const response = await notion.pages.update({
// 		page_id: pageId,
// 		properties: propertyValues,
// 	});
// };

// const updateDiscordHandleMultiSelectField = async (notion, page_id, multi_select_options) => {
// 	const propertyValues: InputPropertyValueMap = {};
// 	const pageId = page_id;
// 	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.field_name] = {
// 		type: constants.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.type,
// 		multi_select: multi_select_options,
// 	} as MultiSelectPropertyValue;
// 	const response = await notion.pages.update({
// 		page_id: pageId,
// 		properties: propertyValues,
// 	});
// };

// const retrieveSelectOption = (properties: PropertyMap, field_name: string, option: string): any => {
// 	let select_option_result = {};
// 	Object.entries(properties).forEach(([name, property]) => {
// 	    if (property.type === 'select' && property.name === field_name) {
// 	    	Object.entries(property.select.options).forEach(([idx, select_option]) => {
// 	    		if (select_option.name === option) {
// 	    			select_option_result = select_option;
// 	    		};
// 	    	});

// 		};
// 	});
// 	return select_option_result;
// };

// const retrieveMultiSelectOptions = (properties: PropertyMap, field_name: string, options): any => {
// 	const existing_multi_select_options = [];
// 	const existing_options_name_mapping = {};
// 	Object.entries(properties).forEach(([name, property]) => {
// 	    if (property.type === 'multi_select') {
// 	    	console.log(property.multi_select.options);
// 	    	Object.entries(property.multi_select.options).forEach(([idx, m_select_option]) => {
// 	    		if (options.includes(m_select_option.name)) {
// 	    			existing_options_name_mapping[m_select_option.name] = m_select_option.id;
// 	    			existing_multi_select_options.push(m_select_option);
// 	    		};
// 	    	});
// 		}
// 	});
// 	return [existing_options_name_mapping, existing_multi_select_options];
// };

// const createNewMultiSelectOptions = (existing_options_name_mapping, options) => {
// 	const new_multi_slect_options = [];
// 	for (const option of options) {
// 		if (!(option in existing_options_name_mapping)) {
// 			const multi_select = {
// 				name: option,
// 				color: getRandomColor(),
// 			};
// 			new_multi_slect_options.push(multi_select);
// 		}
// 	}
// 	return new_multi_slect_options;
// };

// const getNotionDatabaseProperties = async (notion, databaseId): Promise<PropertyMap> => {
// 	const { properties } = await notion.databases.retrieve({ database_id: databaseId });
// 	console.log('PROPERTIES', properties);
// 	return properties;
// };

// const createNewNotionPage = async (notion, databaseId: string, properties: InputPropertyValueMap): Promise<string> => {
// 	const response = await notion.pages.create({
// 		parent: {
// 			database_id: databaseId,
// 		},
// 		properties: properties,
// 	});
// 	return response.id;
// };

// const appendBlockToPage = async (notion, page_id, summary) => {
// 	await notion.blocks.children.append({
// 		block_id: page_id,
// 		children: [
// 		  {
// 		    object: 'block',
// 		    type: 'paragraph',
// 		    paragraph: {
// 		      text: [
// 		        {
// 		          type: 'text',
// 		          text: {
// 		            content: summary,
// 		            // link: {
// 		            //   type: 'url',
// 		            //   url: 'https://bankless.com',
// 		            // },
// 		          },
// 		        },
// 		      ],
// 		    },
// 		  } as ParagraphBlock,
// 		],
// 	});
// };

// const createNotionProperties = (databaseId: string, multi_select_options, selectOption, scoap_title: string, scoap_author: string): InputPropertyValueMap => {
// 	const propertyValues: InputPropertyValueMap = {};

// 	// title (Page)
// 	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.project.field_name] = {
// 		type: constants.SCOAP_SQUAD_NOTION_FIELDS.project.type,
// 		title: [
// 		    {
// 				type: 'text',
// 				text: {
// 					content: scoap_title,
// 				},
// 			},
// 		],
// 	} as TitlePropertyValue;

// 	// scoap author
// 	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.author_discord_handle.field_name] = {
// 		type: constants.SCOAP_SQUAD_NOTION_FIELDS.author_discord_handle.type,
// 		// id: property.id,
// 		rich_text: [
// 		  {
// 		    type: 'text',
// 		    text: { content: scoap_author },
// 		  },
// 		],
// 	} as RichTextPropertyValue;

// 	// multi select input
// 	// propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.field_name] = {
// 	// 	type: constants.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.type,
// 	// 	multi_select: multi_select_options,
// 	// } as MultiSelectPropertyValue;

// 	// select
// 	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.status.field_name] = {
// 		type: constants.SCOAP_SQUAD_NOTION_FIELDS.status.type,
// 		id: selectOption.id,
// 		select: selectOption,
// 	} as SelectPropertyValue;

// 	// date input
// 	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.date_created.field_name] = {
// 		type: constants.SCOAP_SQUAD_NOTION_FIELDS.date_created.type,
// 		date: {
// 			start: new Date().toISOString(),
// 		},
// 	} as DatePropertyValue;

// 	return propertyValues;
// };


// const createNewNotionPage = async (notion, databaseId, input_values) => {
// 	// response contains new page
// 	const response = await notion.pages.create({
// 	    parent: {
// 	      database_id: databaseId,
// 	    },
// 	    properties: {
// 	      Project: {
// 	        type: 'title',
// 	        title: [
// 	          {
// 	            type: 'text',
// 	            text: {
// 	              content: 'newtest',
// 	            },
// 	          },
// 	        ],
	
// 	      },
// 	      Status: {
// 	      type: 'select',
// 		     select: {
// 					id: '275b5e34-2d75-473b-8876-49f3648be7a4',
// 					// name: 'Open',
// 					// color: 'green',
// 		    },
// 		  },
// 	    },

// 	});

// 	console.log('PAGE ', response);

// 	const page_id = response.id;
// 	console.log('PAGE ID ', page_id);


// 	try {
// 		const response4 = await notion.blocks.children.append({
// 			block_id: page_id,
// 			children: [
// 			  {
// 			    object: 'block',
// 			    type: 'paragraph',
// 			    paragraph: {
// 			      text: [
// 			        {
// 			          type: 'text',
// 			          text: {
// 			            content: '– Notion API Team',
// 			            // link: {
// 			            //   type: 'url',
// 			            //   url: 'https://twitter.com/NotionAPI',
// 			            // },
// 			          },
// 			        },
// 			      ],
// 			    },
// 			  } as ParagraphBlock,
// 			],
// 		});

// 		console.log('R4', response4);

// 	} catch (error: unknown) {
// 		 if (isNotionClientError(error)) {
// 		    // error is now strongly typed to NotionClientError
// 		    switch (error.code) {
// 		      case ClientErrorCode.RequestTimeout:
// 		      	console.log('ClientErrorCode', error);
// 		        // ...
// 		        break;
// 		      case APIErrorCode.ObjectNotFound:
// 		      	console.log('ObjectNotFound', error);
// 		        // ...
// 		        break;
// 		      case APIErrorCode.Unauthorized:
// 		      	console.log('APIErrorCode', error);
// 		        // ...
// 		        break;
// 		      // ...
// 		      default:
// 		        // you could even take advantage of exhaustiveness checking
// 		        console.log('DEFAULT', error);
// 		        // assertNever(error.code);
// 		    }
// 		  }

// 	}
// };




// const updateNotionDb = async (text: RichTextTextInput): any => {
// 	const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });
// 	const databaseId = process.env.NOTION_SCOAP_SQUAD_DB_ID;
// 	try {
// 		const response = await notion.pages.create({
// 			parent: { database_id: databaseId },
// 			properties: {
// 				Project: {
// 					title:[
// 						text,
// 					],
// 				},
// 			},
// 		});
// 	    console.log(response);
// 	    console.log('Success! Entry added.');
// 	  } catch (error) {
// 	    console.error(error.body);
// 	  }
// };


	// const response = await notion.databases.query({ database_id: databaseId });
	// console.log(response);
	// // console.log(response.results[1].parent);
	// console.log(response.results[0].properties);

	// const response2 = await notion.databases.retrieve({ database_id: databaseId });
	// console.log(response2);
	// console.log(response2.properties);
	// console.log(response2.properties.Status);
	// console.log(response2.properties.Status[response2.properties.Status.type].options[0].name);




// WORKING
// const response3 = await notion.pages.create({
// 		    parent: {
// 		      database_id: databaseId,
// 		    },
// 		    properties: {
// 		      Project: {
// 		        type: 'title',
// 		        title: [
// 		          {
// 		            type: 'text',
// 		            text: {
// 		              content: 'newtest',
// 		            },
// 		          },
// 		        ],
		
// 		      },
// 		      Status: {
// 		      type: 'select',
// 			     select: {
// 						id: '275b5e34-2d75-473b-8876-49f3648be7a4',
// 						// name: 'Open',
// 						// color: 'green',
// 			    },
// 			  },
// 		    },

// 		});


// async function exerciseWriting(databaseId: string, properties: PropertyMap) {
//   console.log("\n\n********* Exercising Writing *********\n\n")

//   const RowsToWrite = 10

//   // generate a bunch of fake pages with fake data
//   for (let i = 0; i < RowsToWrite; i++) {
//     const propertiesData = makeFakePropertiesData(properties)

//     await notion.pages.create({
//       parent: {
//         database_id: databaseId,
//       },
//       properties: propertiesData,
//     })
//   }

//   console.log(`Wrote ${RowsToWrite} rows after ${startTime}`)
// }