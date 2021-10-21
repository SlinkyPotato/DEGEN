import ValidationError from '../errors/ValidationError';
import { LogUtils } from './Log';
import dayjs, { Dayjs } from 'dayjs';

const DateUtils = {

	/**
	 * Retrieve Date object from ISO8601 date string format
	 * @param date
	 */
	getDate(date: string): Dayjs {
		try {
			return dayjs(date, 'YYYY-MM-DD');
		} catch (e) {
			LogUtils.logError('failed to parse date ISO', e);
			throw new ValidationError('Please try `UTC` date in format yyyy-mm-dd, i.e 2030-08-15');
		}
	},
};

export default DateUtils;