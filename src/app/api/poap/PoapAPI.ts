import axios, { AxiosRequestConfig } from 'axios';
import Log, { LogUtils } from '../../utils/Log';
import ValidationError from '../../errors/ValidationError';

export type AuthToken = {
	accessToken: string,
	scope: string,
	expiresIn: number,
	tokenType: string,
}

const PoapAPI = {
	URL: `https://${process.env.POAP_DOMAIN}/oauth/token`,
	
	generateToken: async (): Promise<AuthToken> => {
		Log.debug('generating POAP auth token');
		
		const postData = {
			audience: process.env.POAP_AUDIENCE,
			grant_type: 'client_credentials',
			client_id: process.env.POAP_CLIENT_ID,
			client_secret: process.env.POAP_CLIENT_SECRET,
		};
		
		const config: AxiosRequestConfig = {
			method: 'post',
			url: PoapAPI.URL,
			headers: {
				'Content-Type': 'application/json',
			},
		};
		try {
			Log.debug('attempting to request poap auth token');
			const response = await axios.post(PoapAPI.URL, postData, config);
			Log.debug('poap auth token response', {
				indexMeta: true,
				meta: {
					data: response.data,
				},
			});
			return {
				accessToken: response.data.access_token,
				scope: response.data.scope,
				expiresIn: response.data.expires_in,
				tokenType: response.data.token_type,
			};
		} catch (e) {
			LogUtils.logError('failed to request poap auth token', e);
			Log.warn('poap response', {
				indexMeta: true,
				meta: {
					error: e.toJSON,
				},
			});
			if (e.response.status == '400') {
				throw new ValidationError(`${e.response.data.message}`);
			}
			throw new Error('poap auth request failed');
		}
	},
};

export default PoapAPI;