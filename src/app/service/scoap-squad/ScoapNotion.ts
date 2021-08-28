import { Client as NotionClient, APIErrorCode, ClientErrorCode, isNotionClientError } from '@notionhq/client';
import {
	InputPropertyValueMap,
	PropertyMap,
} from '@notionhq/client/build/src/api-endpoints';
import {
	PropertyValueWithoutId,
	SelectFilter,
	TextFilter,
	UserBase,
	RichText,
	Block,
	ParagraphBlock,
} from '@notionhq/client/build/src/api-types';






// const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });
// 		const databaseId = process.env.NOTION_SCOAP_SQUAD_DB_ID;
// 		// const response = await notion.databases.query({ database_id: databaseId });
// 		// console.log(response);
// 		// // console.log(response.results[1].parent);
// 		// console.log(response.results[0].properties);

// 		// const response2 = await notion.databases.retrieve({ database_id: databaseId });
// 		// console.log(response2);
// 		// console.log(response2.properties);
// 		// console.log(response2.properties.Status);
// 		// console.log(response2.properties.Status[response2.properties.Status.type].options[0].name);


// 		// response contains new page
// 		const response3 = await notion.pages.create({
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

// 		console.log('PAGE ', response3);

// 		const page_id = response3.id;
// 		console.log('PAGE ID ', page_id);


// 		try {
// 			const response4 = await notion.blocks.children.append({
// 				block_id: page_id,
// 				children: [
// 				  {
// 				    object: 'block',
// 				    type: 'paragraph',
// 				    paragraph: {
// 				      text: [
// 				        {
// 				          type: 'text',
// 				          text: {
// 				            content: '– Notion API Team',
// 				            // link: {
// 				            //   type: 'url',
// 				            //   url: 'https://twitter.com/NotionAPI',
// 				            // },
// 				          },
// 				        },
// 				      ],
// 				    },
// 				  } as ParagraphBlock,
// 				],
// 			});

// 			console.log('R4', response4);

// 		} catch (error: unknown) {
// 			 if (isNotionClientError(error)) {
// 			    // error is now strongly typed to NotionClientError
// 			    switch (error.code) {
// 			      case ClientErrorCode.RequestTimeout:
// 			      	console.log('ClientErrorCode', error);
// 			        // ...
// 			        break;
// 			      case APIErrorCode.ObjectNotFound:
// 			      	console.log('ObjectNotFound', error);
// 			        // ...
// 			        break;
// 			      case APIErrorCode.Unauthorized:
// 			      	console.log('APIErrorCode', error);
// 			        // ...
// 			        break;
// 			      // ...
// 			      default:
// 			        // you could even take advantage of exhaustiveness checking
// 			        console.log('DEFAULT', error);
// 			        // assertNever(error.code);
// 			    }
// 			  }

// 		}





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