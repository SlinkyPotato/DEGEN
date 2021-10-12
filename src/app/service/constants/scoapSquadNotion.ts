export default Object.freeze({
	
	SCOAP_SQUAD_NOTION_FIELDS: {
		project: {
			type: 'title',
			field_name: 'Project',
		},
		author_discord_handle: {
			type: 'rich_text',
			field_name: 'Author Discord Handle',
		},
		scoap_squad_discord_handles: {
			type: 'multi_select',
			field_name: 'Scoap Squad Discord Handles',
		},
		status: {
			type: 'select',
			field_name: 'Status',
			categories: {
				open: 'Open',
				filled: 'Filled (Ongoing)',
				closed: 'Project Completed',
				cancelled: 'Cancelled',
			},
		},
		date_created: {
			type: 'date',
			field_name: 'Date Created',
		},
	},

	NOTION_COLORS: ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'],
});