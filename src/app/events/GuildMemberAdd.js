/**
 * Handler for Discord event `guildMemberAdd`.
 */

module.exports = async(member) => {
    const embed = new MessageEmbed()
        .setTitle('Welcome!')
        .setColor(0xff0000)
        .setDescription(
            'Have a look around and enjoy your time in the server!',
    );
    member.send(`Hi ${member}, welcome to the BanklessDAO!`);
    member.send(embed);
    member.guild.channels
        .find((c) => c.name === 'welcome')
        .send(`Welcome to the DAO, <@${member.user.id}>`);
}