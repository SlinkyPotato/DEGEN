import { Collection, ObjectID } from 'mongodb';

export interface NextAuthAccountCollection extends Collection {
	compoundId: ObjectID,
	userId: ObjectID,
	providerType: string,
	providerId: string,
	providerAccountId: string,
	accessToken: string,
	accessSecret: string,
	refreshToken?: string,
	accessTokenExpires?: string,
	createdAt?: Date,
	updatedAt?: Date,
}