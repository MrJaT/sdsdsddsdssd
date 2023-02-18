const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9');
const {SlashCommandBuilder} = require("@discordjs/builders");
const { TOKEN } = require('./config.json');
const { CLIENT_ID } = require('./config.json')
const rest = new REST({version: '9'}).setToken(TOKEN);
( async () => {
    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            {
                body: [
                    data = new SlashCommandBuilder()
                        .setName("도움말")
                        .setDescription("명령어들을 봅니다"),
                    data = new SlashCommandBuilder()
                        .setName("인증서")
                        .setDescription("인증서 발급"),
                    data = new SlashCommandBuilder()
                        .setName("웹훅")
                        .addStringOption(option => option.setName("웹훅").setDescription("웹훅 URL을 입력해주세요").setRequired(true)),
                    data = new SlashCommandBuilder()
                        .setName("역할")
                        .addStringOption(option => option.setName("멘션").setDescription("지급할 권한을 멘션해주세요").setRequired(true)),
                    data = new SlashCommandBuilder()
                        .setName("키등록 ")
                        .addStringOption(option => option.setName("라이센스").setDescription("서버에 라이센스를 적용합니다!").setRequired(true)),
                    data = new SlashCommandBuilder()
                        .setName("복구")
                        .addStringOption(option => option.setName("복구키").setDescription("유저를 복구 합니다!").setRequired(true)),
                    data = new SlashCommandBuilder()
                        .setName("연장")
                        .addStringOption(option => option.setName("기존 라이센스").setDescription("라이센스를 연장합니다!").setRequired(true))
                        .addStringOption(option => option.setName("교체할 라이센스").setDescription("라이센스를 연장합니다!").setRequired(true)),
                    data = new SlashCommandBuilder()
                        .setName("조회")
                        .addStringOption(option => option.setName("복구키").setDescription("복구키의 정보를 불러옵니다").setRequired(true))
                ]
            }
        )
    } catch (err) {
        console.log(err)
    }
})()
