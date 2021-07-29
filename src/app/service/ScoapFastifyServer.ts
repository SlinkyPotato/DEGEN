import constants from './../constants';
import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'
import ScoapPoll from './ScoapPoll'
import client from '../app'
import { TextChannel } from 'discord.js';
import { Static, Type } from '@sinclair/typebox'

//security headers
const helmet = require('fastify-helmet')
const cors = require('fastify-cors')

//Instatiate Fastify
export const server: FastifyInstance = Fastify({})

//middleware
server.register(helmet);
server.register(cors,{ origin: constants.SCOAP_HTTP_SERVER_CORS_WHITELIST });

const opts: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          response: {
            type: 'string'
          }
        }
      }
    }
  }
}

//route definitions
server.post('/scoap', opts, async (request, reply) => {
	// console.log(typeof request.body);
	const channel = await client.channels.fetch(constants.SCOAP_SQUAD_CHANNEL_ID) as TextChannel;
	// const requestBody: object = request.body;
	var formData = await ScoapPoll(channel, request);
	return formData
})

export default async (): Promise<void> => {
	try {
	    await server.listen(constants.SCOAP_HTTP_SERVER_PORT)
	    const address = server.server.address()
	    const port = typeof address === 'string' ? address : address?.port

	    console.log('fastify listening on: ', address)

	    // return server

	  } catch (err) {
	    server.log.error(err)
	    process.exit(1)
	  }
};





// server.post<{ Body: ScoapType; Response: ScoapType }>(
//    "/scoap",
//    {
//      schema: {
//        body: Scoap,
//        response: {
//          200: Scoap,
//        },
//      },
//    }, 
//    async (req, rep) => {
//    	const channel = await client.channels.fetch(constants.SCOAP_SQUAD_CHANNEL_ID) as TextChannel;

//      const { body: scoap } = req;
//      /* user has type
//      * const user: StaticProperties<{
//      *  name: TString;
//      *  mail: TOptional<TString>;
//      * }>
//      */
//           var formData = await ScoapPoll(channel, req.body);
//      rep.status(200).send(scoap);
//    }
//  );

// //SCOAP object schema & type definition
// const Scoap = Type.Object({
// 	scoap: Type.String(),
// });
// type ScoapType = Static<typeof Scoap>;