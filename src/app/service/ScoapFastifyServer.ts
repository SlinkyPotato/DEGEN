import constants from './../constants';
import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify';
// import { Server, IncomingMessage, ServerResponse } from 'http';
import ScoapPoll from './ScoapPoll';
import client from '../app';
import { TextChannel } from 'discord.js';
// import { Static, Type } from '@sinclair/typebox';

// security headers
const helmet = require('fastify-helmet');
const cors = require('fastify-cors');

// Instatiate Fastify
export const server: FastifyInstance = Fastify({});

// middleware
server.register(helmet);
server.register(cors, { origin: constants.SCOAP_HTTP_SERVER_CORS_WHITELIST });

const opts: RouteShorthandOptions = {
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    response: {
                        type: 'string',
                    },
                },
            },
        },
    },
};

// route definitions // (request, reply)
server.post('/scoap', opts, async (request) => {
    // console.log(typeof request.body);
    const channel = (await client.channels.fetch(
        constants.SCOAP_SQUAD_CHANNEL_ID
    )) as TextChannel;
    // const requestBody: object = request.body;
    const formData = await ScoapPoll(channel, request);
    return formData;
});

export default async (): Promise<void> => {
    try {
        await server.listen(constants.SCOAP_HTTP_SERVER_PORT);
        const address = server.server.address();
        // const port = typeof address === 'string' ? address : address?.port;

        console.log('fastify listening on: ', address);

        // return server
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
