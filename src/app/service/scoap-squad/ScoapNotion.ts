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
import scoapSquadNotion from '../constants/scoapSquadNotion';


const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_SCOAP_SQUAD_DB_ID;

const notionDatabaseProperties = async () => {
	const dbProperties = await getNotionDatabaseProperties();
	return dbProperties;
};

export const updateScoapOnNotion = async (pageId: string, inputs: Record<string, any>): Promise<void> => {
	const multiSelectOptions = retrieveMultiSelectOptions(await notionDatabaseProperties(), scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.field_name, inputs.discord_tags);
	const newMultiSelectOptions = createNewMultiSelectOptions(multiSelectOptions[0], inputs.discord_tags);
	await appendBlockToPage(pageId, inputs.summary);
	await updateStatusSelectField(pageId, scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.status.categories.filled);
	const combinedMultiSelectOptions = newMultiSelectOptions.concat(multiSelectOptions[1]);
	await updateDiscordHandleMultiSelectField(pageId, combinedMultiSelectOptions);
};

export const createNewScoapOnNotion = async (inputs: Record<string, string>): Promise<string> => {
	const selectOptionOpen = retrieveSelectOption(await notionDatabaseProperties(), scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.status.field_name, scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.status.categories.open);
	const valueMap = createNotionProperties(selectOptionOpen, inputs.title, inputs.author);
	const newPageId = await createNewNotionPage(valueMap);
	await appendBlockToPage(newPageId, inputs.summary);
	return newPageId;
};

const getRandomColor = () => {
	return scoapSquadNotion.NOTION_COLORS[Math.floor(Math.random() * scoapSquadNotion.NOTION_COLORS.length)];
};

export const updateStatusSelectField = async (pageId: string, selectOption: string): Promise<void> => {
	const selectOptionObject = retrieveSelectOption(await notionDatabaseProperties(), scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.status.field_name, selectOption);
	const propertyValues: InputPropertyValueMap = {};
	propertyValues[scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.status.field_name] = {
		type: scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.status.type,
		id: selectOptionObject.id,
		select: selectOptionObject,
	} as SelectPropertyValue;
	await notion.pages.update({
		page_id: pageId,
		properties: propertyValues,
	});
};

const updateDiscordHandleMultiSelectField = async (pageId: string, multiSelectoptions: Array<any>): Promise<void> => {
	const propertyValues: InputPropertyValueMap = {};
	propertyValues[scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.field_name] = {
		type: scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.type,
		multi_select: multiSelectoptions,
	} as MultiSelectPropertyValue;
	await notion.pages.update({
		page_id: pageId,
		properties: propertyValues,
	});
};

const retrieveSelectOption = (properties: PropertyMap, fieldName: string, option: string): any => {
	let selectOptionResult = {};
	Object.entries(properties).forEach(([nme, property]) => {
		if (property.type === 'select' && nme === fieldName) {
			Object.entries(property.select.options).forEach(([_, selectOption]) => {
				if (selectOption.name === option) {
					selectOptionResult = selectOption;
				}
			});

		}
	});
	return selectOptionResult;
};

const retrieveMultiSelectOptions = (properties: PropertyMap, fieldName: string, options): any => {
	const existingMultiSelectOptions = [];
	const existingOptionsNameMapping = {};
	Object.entries(properties).forEach(([nme, property]) => {
		if (property.type === 'multi_select' && nme === fieldName) {
			Object.entries(property.multi_select.options).forEach(([_, mSelectOption]) => {
				if (options.includes(mSelectOption.name)) {
					existingOptionsNameMapping[mSelectOption.name] = mSelectOption.id;
					existingMultiSelectOptions.push(mSelectOption);
				}
			});
		}
	});
	return [existingOptionsNameMapping, existingMultiSelectOptions];
};

const createNewMultiSelectOptions = (existingOptionsNameMapping, options) => {
	const newMultiSelectOptions = [];
	for (const option of options) {
		if (!(option in existingOptionsNameMapping)) {
			const multiSelect = {
				name: option,
				color: getRandomColor(),
			};
			newMultiSelectOptions.push(multiSelect);
		}
	}
	return newMultiSelectOptions;
};

const getNotionDatabaseProperties = async (): Promise<PropertyMap> => {
	const { properties } = await notion.databases.retrieve({ database_id: databaseId });
	return properties;
};

const createNewNotionPage = async (properties: InputPropertyValueMap): Promise<string> => {
	const response = await notion.pages.create({
		parent: {
			database_id: databaseId,
		},
		properties: properties,
	});
	return response.id;
};

const appendBlockToPage = async (pageId, summary) => {
	await notion.blocks.children.append({
		block_id: pageId,
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

const createNotionProperties = (selectOption, scoapTitle: string, scoapAuthor: string): InputPropertyValueMap => {
	const propertyValues: InputPropertyValueMap = {};

	// title (Page)
	propertyValues[scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.project.field_name] = {
		type: scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.project.type,
		title: [
			{
				type: 'text',
				text: {
					content: scoapTitle,
				},
			},
		],
	} as TitlePropertyValue;

	// scoap author
	propertyValues[scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.author_discord_handle.field_name] = {
		type: scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.author_discord_handle.type,
		// id: property.id,
		rich_text: [
			{
				type: 'text',
				text: { content: scoapAuthor },
			},
		],
	} as RichTextPropertyValue;

	// multi select input
	// propertyValues[scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.field_name] = {
	// 	type: scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.scoap_squad_discord_handles.type,
	// 	multi_select: multi_select_options,
	// } as MultiSelectPropertyValue;

	// select
	propertyValues[scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.status.field_name] = {
		type: scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.status.type,
		id: selectOption.id,
		select: selectOption,
	} as SelectPropertyValue;

	// date input
	propertyValues[scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.date_created.field_name] = {
		type: scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.date_created.type,
		date: {
			start: new Date().toISOString(),
		},
	} as DatePropertyValue;

	return propertyValues;
};