import { Client as NotionClient } from '@notionhq/client';
import {
	InputPropertyValueMap,
	PropertyMap,
} from '@notionhq/client/build/src/api-endpoints';
import {
	MultiSelectPropertyValue,
	SelectPropertyValue,
	DatePropertyValue,
	TitlePropertyValue,
	RichTextPropertyValue,
	ParagraphBlock,
} from '@notionhq/client/build/src/api-types';
import constants from '../constants/constants';

const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_SCOAP_SQUAD_DB_ID;

const notionDatabaseProperties = async () => {
	const db_properties = await getNotionDatabaseProperties(notion, databaseId);
	return db_properties;
};

export const updateScoapOnNotion = async (page_id: string, inputs: Record<string, any>) => {
	const m_select_options = retrieveMultiSelectOptions(await notionDatabaseProperties(), constants.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.field_name, inputs.discord_tags);
	const new_m_select_options = createNewMultiSelectOptions(m_select_options[0], inputs.discord_tags);
	await appendBlockToPage(notion, page_id, inputs.summary);
	const select_option_filled = retrieveSelectOption(await notionDatabaseProperties(), constants.SCOAP_SQUAD_NOTION_FIELDS.status.field_name, constants.SCOAP_SQUAD_NOTION_FIELDS.status.categories.filled);
	await updateStatusSelectField(notion, page_id, select_option_filled);
	const multi_select_options = new_m_select_options.concat(m_select_options[1]);
	await updateDiscordHandleMultiSelectField(notion, page_id, multi_select_options);
};

export const createNewScoapOnNotion = async (inputs: Record<string, string>): Promise<string> => {
	const select_option_open = retrieveSelectOption(await notionDatabaseProperties(), constants.SCOAP_SQUAD_NOTION_FIELDS.status.field_name, constants.SCOAP_SQUAD_NOTION_FIELDS.status.categories.open);
	const value_map = createNotionProperties(databaseId, select_option_open, inputs.title, inputs.author);
	const newPageId = await createNewNotionPage(notion, databaseId, value_map);
	appendBlockToPage(notion, newPageId, inputs.summary);
	return newPageId;
};

const getRandomColor = () => {
	return constants.NOTION_COLORS[Math.floor(Math.random() * constants.NOTION_COLORS.length)];
};

const updateStatusSelectField = async (notion, page_id, select_option) => {
	const propertyValues: InputPropertyValueMap = {};
	const pageId = page_id;
	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.status.field_name] = {
		type: constants.SCOAP_SQUAD_NOTION_FIELDS.status.type,
		id: select_option.id,
		select: select_option,
	} as SelectPropertyValue;
	await notion.pages.update({
		page_id: pageId,
		properties: propertyValues,
	});
};

const updateDiscordHandleMultiSelectField = async (notion, page_id, multi_select_options) => {
	const propertyValues: InputPropertyValueMap = {};
	const pageId = page_id;
	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.field_name] = {
		type: constants.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.type,
		multi_select: multi_select_options,
	} as MultiSelectPropertyValue;
	await notion.pages.update({
		page_id: pageId,
		properties: propertyValues,
	});
};

const retrieveSelectOption = (properties: PropertyMap, field_name: string, option: string): any => {
	let select_option_result = {};
	Object.entries(properties).forEach(([name, property]) => {
	    if (property.type === 'select' && property.name === field_name) {
	    	Object.entries(property.select.options).forEach(([idx, select_option]) => {
	    		if (select_option.name === option) {
	    			select_option_result = select_option;
	    		};
	    	});

		};
	});
	return select_option_result;
};

const retrieveMultiSelectOptions = (properties: PropertyMap, field_name: string, options): any => {
	const existing_multi_select_options = [];
	const existing_options_name_mapping = {};
	Object.entries(properties).forEach(([name, property]) => {
	    if (property.type === 'multi_select') {
	    	Object.entries(property.multi_select.options).forEach(([idx, m_select_option]) => {
	    		if (options.includes(m_select_option.name)) {
	    			existing_options_name_mapping[m_select_option.name] = m_select_option.id;
	    			existing_multi_select_options.push(m_select_option);
	    		};
	    	});
		}
	});
	return [existing_options_name_mapping, existing_multi_select_options];
};

const createNewMultiSelectOptions = (existing_options_name_mapping, options) => {
	const new_multi_slect_options = [];
	for (const option of options) {
		if (!(option in existing_options_name_mapping)) {
			const multi_select = {
				name: option,
				color: getRandomColor(),
			};
			new_multi_slect_options.push(multi_select);
		}
	}
	return new_multi_slect_options;
};

const getNotionDatabaseProperties = async (notion, databaseId): Promise<PropertyMap> => {
	const { properties } = await notion.databases.retrieve({ database_id: databaseId });
	return properties;
};

const createNewNotionPage = async (notion, databaseId: string, properties: InputPropertyValueMap): Promise<string> => {
	const response = await notion.pages.create({
		parent: {
			database_id: databaseId,
		},
		properties: properties,
	});
	return response.id;
};

const appendBlockToPage = async (notion, page_id, summary) => {
	await notion.blocks.children.append({
		block_id: page_id,
		children: [
		  {
		    object: 'block',
		    type: 'paragraph',
		    paragraph: {
		      text: [
		        {
		          type: 'text',
		          text: {
		            content: summary,
		            // link: {
		            //   type: 'url',
		            //   url: 'https://bankless.com',
		            // },
		          },
		        },
		      ],
		    },
		  } as ParagraphBlock,
		],
	});
};

const createNotionProperties = (databaseId: string, selectOption, scoap_title: string, scoap_author: string): InputPropertyValueMap => {
	const propertyValues: InputPropertyValueMap = {};

	// title (Page)
	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.project.field_name] = {
		type: constants.SCOAP_SQUAD_NOTION_FIELDS.project.type,
		title: [
		    {
				type: 'text',
				text: {
					content: scoap_title,
				},
			},
		],
	} as TitlePropertyValue;

	// scoap author
	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.author_discord_handle.field_name] = {
		type: constants.SCOAP_SQUAD_NOTION_FIELDS.author_discord_handle.type,
		// id: property.id,
		rich_text: [
		  {
		    type: 'text',
		    text: { content: scoap_author },
		  },
		],
	} as RichTextPropertyValue;

	// multi select input
	// propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.field_name] = {
	// 	type: constants.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.type,
	// 	multi_select: multi_select_options,
	// } as MultiSelectPropertyValue;

	// select
	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.status.field_name] = {
		type: constants.SCOAP_SQUAD_NOTION_FIELDS.status.type,
		id: selectOption.id,
		select: selectOption,
	} as SelectPropertyValue;

	// date input
	propertyValues[constants.SCOAP_SQUAD_NOTION_FIELDS.date_created.field_name] = {
		type: constants.SCOAP_SQUAD_NOTION_FIELDS.date_created.type,
		date: {
			start: new Date().toISOString(),
		},
	} as DatePropertyValue;

	return propertyValues;
};