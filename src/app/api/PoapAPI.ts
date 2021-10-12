import axios from 'axios';

const PoapAPI = axios.create({
	baseURL: 'https://api.poap.xyz/',
	timeout: 5000,
});

export default PoapAPI;