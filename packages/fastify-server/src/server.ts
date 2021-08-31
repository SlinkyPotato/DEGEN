import fastify from 'fastify';

const server = fastify();

server.get('/ping', async (request, reply) => {
	return 'pong\n';
});

server.get<{
	Querystring: IQuerystring,
	Headers: IHeaders,
}>('/auth', async (request, reply) => {
	const { username, password } = request.query;
	const customerHeader = request.headers['h-Custom'];
	// do something with data
	return 'logged in !';
});

server.listen(8080, (error, address) => {
	if (error) {
		console.log(error);
		process.exit(1);
	}
	console.log(`Server listening at ${address}`);
});
