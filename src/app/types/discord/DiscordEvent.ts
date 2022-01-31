export interface DiscordEvent {
    name: string,
    once: boolean,
    execute(...args: any[]): void
}
