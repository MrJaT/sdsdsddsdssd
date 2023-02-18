const config = require('./config.json')
const { Client, Collection, Intents, MessageEmbed, MessageActionRow, MessageButton, CategoryChannel, WebhookClient } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const modules = require('./module/module.js')
const database = require('./module/db.js')
let db = database.db
const cron = require('node-cron');
const PORT = config.PORT

//web module
const express = require('express')
const app = express()
const axios = require('axios')
const url = require('url')
const path = require('path');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'))
app.use(express.static(`${__dirname}/views`));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

const sleep = (ms) => {
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

cron.schedule('* * * * * *', function () {
    db.all('SELECT * FROM Key', async (err, data) => {
        try{
            let curr = new Date();
            let utc = 
                curr.getTime() + 
                (curr.getTimezoneOffset() * 60 * 1000);
            let KR_TIME_DIFF = 9 * 60 * 60 * 1000;
            let kr_curr = new Date(utc + (KR_TIME_DIFF));
            let now_day = curr.toLocaleString('ko', { timeZone: 'Asia/Seoul' })
            for(var i = 0; i < data.length; i++) {
                if(data[i].day === now_day) {
                    sleep(2000)
                    db.run(`UPDATE Key SET key = "${data[i].key}", day = "${data[i].day}", id = "${data[i].id}", backup_key = "${data[i].backup_key}", expiration = "false" WHERE key = "${data[i].key}"`, function (err) {
                        if (err) {
                            return console.error(err.message);
                        }
                        console.log(`Row(s) Expiration updated: ${this.changes}`);
                    })
                }
            }
        }catch(err){
            console.log(err)
        }
    })
});


app.get('/callback', async (req, res) => {
    try {
    const { code } = req.query
    const { state } = req.query
    if(state === undefined) {
        return res.render(`error`, {
            message: "서버 아이디가 감지 되지 못했어요!"
        })
    } else if (code === undefined) {
        return res.render(`error`, {
            message: "CODE가 감지 되지 못했습니다!"
        })
    }

        try{
            const formData = new url.URLSearchParams({
                client_id: config.CLIENT_ID,
                client_secret: config.CLIENT_SECRET,
                grant_type: "authorization_code",
                code: code.toString(),
                redirect_uri: config.set_redirect_url
            })
            const response = await axios.post(
                'https://discord.com/api/v9/oauth2/token',
                formData.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            ).catch(function (error) {
                if (error.response) {
                  console.log(error.response.data);
                  console.log(error.response.status);
                  console.log(error.response.headers);
                  return;
                } else if (error.request) {
                  console.log(error.request);
                  return;
                } else {
                  console.log('Error', error.message);
                  return;
                }
                console.log(error.config);
                return;
              });
            
            let data = response.data
            if(data == undefined) {
                res.send(400);
                return "data not fined"
            }
            let value = {
                access_token: data.access_token,
                expires_in: data.expires_in,
                refresh_token: data.refresh_token,
                token_type: data.token_type,
            }       
            db.all('SELECT * FROM User', async (err, data) => {
                    let user_info = await modules.response.token_data(value) 
                    let user_name = `${user_info.username}#${user_info.discriminator}`
                    let Prevention_sub = data.map(v => {
                        if(v.id === user_info.id) {
                            return v
                        }
                    })
                    let Prevention = Prevention_sub.filter((element, i) => element !== undefined);

                    db.all('SELECT * FROM Server', async (err, dataa) => {
                        let role_id = dataa.map(v => {
                            if(v.id === state) {
                                return v
                            }
                        })
                        let role_id_data = role_id.filter((element, i) => element !== undefined);
                        db.all('SELECT * FROM Key', async (err, dataaa) => {
                            let backup = dataaa.map(v => {
                                if(v.id === state) {
                                    return v
                                }
                            })
                            let backup_key = backup.filter((element, i) => element !== undefined);
                            if(backup_key[0].expiration === "false") {
                                return res.render(`error`, {
                                    message: "해당 서버는 라이센스가 만료된 서버 입니다"
                                })
                            }
                            for(var i = 0; i < Prevention.length; i++) {
                                if(Prevention[i].server === state) {
                                    try {
                                    if(role_id_data[0].web_hook != "null") {
                                        let webhook = new WebhookClient({ url: `${role_id_data[0].web_hook}` })
        
                                        let embed = new MessageEmbed()
                                        .setTitle('재인증 확인 로그')
                                        .setColor(`0x2F3136`)
                                        .setDescription(`**${user_name}**님이 서버에 재인증 하셨습니다`)
        
                                        webhook.send({
                                            username: "[PORO LOG]",
                                            avatarURL: `https://cdn.discordapp.com/avatars/${user_info.id}/${user_info.avatar}`,
                                            embeds: [embed]
                                        })
                                    }
                                }catch(err) {

                                }
                                    console.log(`${client.guilds.cache.get(state).name}(${state})\n${user_name}(${user_info.id}) 님 가입`)
                                    modules.response.add_role(state, user_info.id, role_id_data[0].roleid).catch(err => {
                                        console.log(err)
                                    })
                                    res.json({
                                        success: true
                                    })
                                    return;
                                    break;
                                }
                            }
                            try{
                            if(role_id_data[0].web_hook != "null") {
                                let webhook = new WebhookClient({ url: `${role_id_data[0].web_hook}` })

                                let embed = new MessageEmbed()
                                .setTitle('인증 확인 로그')
                                .setColor(`0x2F3136`)
                                .setDescription(`**${user_name}**님이 서버에 인증 하셨습니다`)

                                webhook.send({
                                    username: "[PORO LOG]",
                                    avatarURL: `https://cdn.discordapp.com/avatars/${user_info.id}/${user_info.avatar}`,
                                    embeds: [embed]
                                })
                            }
                        }catch(err) {
                                    
                        }
                            modules.response.add_role(state, user_info.id, role_id_data[0].roleid).catch(err => {
                                console.log(err)
                            })
                            console.log(`${client.guilds.cache.get(state).name}(${state})\n${user_name}(${user_info.id}) 님 가입!`)
                            db.run(`INSERT INTO User (id, access_token, refresh_token, server, backup_key) VALUES ("${user_info.id}", "${value.access_token}", "${value.refresh_token}", "${state}", "${backup_key[0].backup_key}")`)
                            res.json({
                                success: true
                            })
                            return;
                        })
                    })
            })
    } catch(err) {
        console.log(err)
    }
} catch(err) {
    console.log(err);
    res.json({
        success: false
    })
}
})

client.on('ready', () => {
    console.log("BOT ON")
    setInterval(() => {
        client.user.setActivity(`${client.guilds.cache.size}개의 서버에서 활동`);
      }, 10000);
})

client.on("messageCreate", async (message) => {
    if (message.content[0] !== "!") return;
    
    const request = message.content.substring(1).split(" ")[0];

    if(request === "도움말") {
        let embeded = new MessageEmbed()
        .setTitle("✅ Success ✅ ")
        .setColor("GREEN")
        .setDescription('복구봇 명령어\n**봇에게 관리자 권한을 필수로 주세요!**\n')
        .addField('!인증서', '인증서 발급')
        .addField('!웹훅 "URL"', '유저 가입 로그를 전송합니다')
        .addField('!역할 [@멘션]', '역할 설정\nㅤ')
        .addField('🔒보안 관련 명령어🔒', "밑에 사항에는 복구 키가 그대로 들어나는 명령어 입니다\nㅤ", true)
        .addField('!키등록 "라이센스"', '서버에 라이센스를 적용합니다!\n> "" << 이 따움표 안에 넣어달라는건 무조건 지켜주세요!')
        .addField('!복구 "복구키"', '유저를 복구 합니다!\n> "" << 이 따움표 안에 넣어달라는건 무조건 지켜주세요!')
        .addField('!연장 "기존 라이센스" "교체할 라이센스"', '라이센스를 연장합니다!\n> "" << 이 따움표 안에 넣어달라는건 무조건 지켜주세요!')
        .addField('!조회 "복구키"', '서버의 정보를 불러옵니다\n> "" << 이 따움표 안에 넣어달라는건 무조건 지켜주세요!')
        return message.reply({embeds: [embeded]}).catch(console.error);
    }

    //총판 명령어 
    if(request === "생성") {
        try{
            let regex = new RegExp('"[^"]+"', 'g');
            var arguments = [];
            var json = message.content
            json.match(regex)?.forEach(element => {
                if (!element) return;
                return arguments.push(element.replace(/"/g, ''));
            })

            if(!config.owner.includes(message.author.id)) {
                var embeded = new MessageEmbed()
                .setTitle(":x:  ERROR :x: ")
                .setColor("RED")
                .setDescription('해당 명령어는 봇 개발자 전용 명령어 입니다!')
                return message.reply({embeds: [embeded]}).catch(console.error);
            }

            if(arguments[0] === undefined) {
                var embeded = new MessageEmbed()
                .setTitle(":x:  ERROR :x: ")
                .setColor("RED")
                .setDescription('생성할 라이센스 수를 입력하세요')
                return message.reply({embeds: [embeded]}).catch(console.error);
            }
            if(arguments[1] === undefined) {
                var embeded = new MessageEmbed()
                .setTitle(":x:  ERROR :x: ")
                .setColor("RED")
                .setDescription('라이센스 일 수를 입력해주세요')
                return message.reply({embeds: [embeded]}).catch(console.error);
            }

            let convert_to_number = Number(arguments[0])
            let convert_to_number_day = Number(arguments[1])
            let list = []
            for(var i = 0; i < convert_to_number; i++) {
                let key = `PORO-L-${Math.random().toString(36).substr(2,11)}-days${convert_to_number_day}`
                let backup_key = `PORO-B-${Math.random().toString(31).substr(2,11)}`
                list.push(key)
                db.all('SELECT * FROM Key', async (err, data) => {
                    db.run(`INSERT INTO Key (key, day, id, backup_key, expiration) VALUES ("${key}", "${convert_to_number_day}", "null", "null", "null")`)
                })
            }
            var embeded = new MessageEmbed()
            .setTitle("✅ Success ✅ ")
            .setColor("GREEN")
            .addField("생성된 키", "```" + `${list.toString().replaceAll(',', '\n')}` + "```")
            return message.reply({embeds: [embeded]}).catch(console.error);
        }catch(err) {
            console.log(err)
        }
    }

    if(request === "삭제") {
            let regex = new RegExp('"[^"]+"', 'g');
            var arguments = [];
            var json = message.content
            json.match(regex)?.forEach(element => {
                if (!element) return;
                return arguments.push(element.replace(/"/g, ''));
            })

            if(!config.owner.includes(message.author.id)) {
                var embeded = new MessageEmbed()
                .setTitle(":x:  ERROR :x: ")
                .setColor("RED")
                .setDescription('해당 명령어는 봇 개발자 전용 명령어 입니다!')
                return message.reply({embeds: [embeded]}).catch(console.error);
            }

            if(arguments[0] === undefined) {
                var embeded = new MessageEmbed()
                .setTitle(":x:  ERROR :x: ")
                .setColor("RED")
                .setDescription('삭제 할 라이센스를 입력해주세요')
                return message.reply({embeds: [embeded]}).catch(console.error);
            }

            db.all('SELECT * FROM Key', async (err, data) => {
                try{
                    let finds = data.some(v => v.key === arguments[0])
                    if(finds === true) {
                        db.all('SELECT * FROM Key', async (err, data) => {
                            let key_find = data.map(v => { 
                                if(v.key === arguments[0]) {
                                    return v
                                }
                            })
                            let key_set = key_find.filter((element, i) => element !== undefined);
                            db.run(`DELETE FROM User WHERE server = '${key_set[0].id}';`)
                            db.run(`DELETE FROM Server WHERE id = '${key_set[0].id}';`)
                            db.run(`DELETE FROM Key WHERE key = '${arguments[0]}';`)

                        let embeded = new MessageEmbed()
                        .setTitle("✅ Success ✅ ")
                        .setColor("GREEN")
                        .addField("삭제된 키", "```" + `${arguments[0]}` + "```")
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    })
                    } else {
                        let embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('라이센스를 찾지 못했습니다')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }
                } catch(err) {
                    console.log(err)
                }
            })
    }

    if(request === "검색") {
        if(!config.owner.includes(message.author.id)) {
            var embeded = new MessageEmbed()
            .setTitle(":x:  ERROR :x: ")
            .setColor("RED")
            .setDescription('해당 명령어는 봇 개발자 전용 명령어 입니다!')
            return message.reply({embeds: [embeded]}).catch(console.error);
        }
        
        if(config.owner.includes(message.author.id)) {
            db.all('SELECT * FROM Key', async (err, data) => {
                try { 
                    let regex = new RegExp('"[^"]+"', 'g');
                    var arguments = [];
                    var json = message.content
                    json.match(regex)?.forEach(element => {
                        if (!element) return;
                        return arguments.push(element.replace(/"/g, ''));
                    })

                    if(arguments[0] === undefined) {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ADMIN ERROR :x: ")
                        .setColor("RED")
                        .setDescription('서버 아이디를 입력 해주세요 \n> !조회 "서버 아이디" ')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }

                    let findis = data.some(v => v.id === arguments[0])
                    let key_find = data.map(v => { 
                        if(v.id === arguments[0]) {
                            return v
                        }
                    })
                    let key_set = key_find.filter((element, i) => element !== undefined);
                    if(findis === true) {
                        db.all('SELECT * FROM User', async (err, dataa) => {
                            try {
                                let server_id = dataa.map(v => {
                                    if(v.server === arguments[0]) {
                                        return v
                                    }
                                })
                                let server_id_data = server_id.filter((element, i) => element !== undefined);
                                let guild_name = client.guilds.cache.get(key_set[0].id).name
                                var embeded = new MessageEmbed()
                                .setTitle("✅ Success ✅ ")
                                .setColor("GREEN")
                                .setDescription(`**ADMIN 조회 정보**\n\n등록한 라이센스 : ${key_set[0].key}\n등록한 서버 : ${guild_name}(${key_set[0].id})\n만료일 : ${key_set[0].day}\n복구 키 : ${key_set[0].backup_key}\n가입한 유저 수 : ${server_id_data.length}`)
                                return message.reply({embeds: [embeded]}).catch(console.error);
                            } catch(err) {
                                var embeded = new MessageEmbed()
                                .setTitle(":x:  ERROR :x: ")
                                .setColor("RED")
                                .setDescription('서버를 찾을 수 없습니다')
                                return message.reply({embeds: [embeded]}).catch(console.error);
                            }
                        })
                    } else if (findis === false) {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('없는 서버 입니다')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    } else {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('올바르지 서버 아이디 입니다')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }
                } catch (err) {
                    console.log(err)
                }
            })
        }
    }

    if(request === "인증서") {
        if (!message.member.permissions.has("ADMINISTRATOR")) return;
        db.all('SELECT * FROM Key', async (err, data) => {
            try{
                let findis = data.some(v => v.id === message.guild.id)
                if(findis === false) {
                    message.channel.send("등록되지 않은 서버 입니다")
                    return;
                }
                let key_find = data.map(v => { 
                    if(v.id === message.guild.id) {
                        return v
                    }
                })
                let key_set = key_find.filter((element, i) => element !== undefined);
                if(key_set[0].expiration === "false") {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('라이센스 키가 만료 되었습니다')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }
                db.all('SELECT * FROM Server', async (err, dataa) => {
                        let role_id = dataa.map(v => {
                            if(v.id === message.guild.id) {
                                return v
                            }
                        })
                        let role_id_data = role_id.filter((element, i) => element !== undefined);
                        if(role_id_data[0].roleid === "null") {
                            message.channel.send("역할을 등록해주세요!\n> !역할 [@역할]")
                            return;
                        }
                        let row = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setLabel('✅ 인증하기')
                                .setURL(config.URL + `&state=${message.guild.id}`)
                                .setStyle('LINK')
                        );
                        let embed = new MessageEmbed()
                        .setTitle(`${message.guild.name}`)
                        .setColor("#5865F2")
                        .setDescription(`[여기](${config.URL + `&state=${message.guild.id}`})를 누르시면 인증이 완료됩니다!\n\n- **해당 인증을 하시면 서버가 자동으로 가입 될 수 있습니다**\n    ㄴ 서버가 터졌을 때를 대비하기 위함이니 안심하셔도됩니다!`)
                        return message.channel.send({embeds: [embed], components: [row] })
                })
            } catch(err) {
                console.log(err)
            }
        })
    }

    if(request === "복구") {
            if (!message.member.permissions.has("ADMINISTRATOR")) return;
            let regex = new RegExp('"[^"]+"', 'g');
            var arguments = [];
            var json = message.content
            json.match(regex)?.forEach(element => {
                if (!element) return;
                return arguments.push(element.replace(/"/g, ''));
            })

            if(arguments[0] === undefined) {
                var embeded = new MessageEmbed()
                .setTitle(":x:  ERROR :x: ")
                .setColor("RED")
                .setDescription('복구 키가 포함 되지 않았습니다\n> !복구 "키" ')
                return message.reply({embeds: [embeded]}).catch(console.error);
            }
            db.all('SELECT * FROM Key', async (err, data) => {
                try{
                    let finds = data.some(v => v.backup_key === arguments[0])
                    let key_find = data.map(v => { 
                        if(v.backup_key === arguments[0]) {
                            return v
                        }
                    })
                    let key_set = key_find.filter((element, i) => element !== undefined);
                    if(message.guild.id != key_set[0].id) {
                        console.log(`[!] ${message.guild.id}에서 ${message.author.tag}(${message.author.id})님이  ${key_set[0].id}의 ${key_set[0].backup_key}를 사용했습니다`)
                    }
                    if(finds === true) {
                        message.delete()
                        db.all('SELECT * FROM User', async (err, dataa) => {
                            let backup_finds = dataa.some(v => v.backup_key === arguments[0])
                            let server_id = dataa.map(v => {
                                if(v.backup_key === arguments[0]) {
                                    return v
                                }
                            })
                            let server_id_data = server_id.filter((element, i) => element !== undefined);
                            var embeded_saerch = new MessageEmbed()
                            .setTitle("🕑 Wait...")
                            .setColor("GREEN")
                            .setDescription(`유저를 복구 중입니다. 최대 1시간이 소요될 수 있습니다. (예상 복구 인원 : ${server_id_data.length})`)
                            let embeded_saerch_send = await message.channel.send({embeds: [embeded_saerch]}).catch(console.error);
                            if(backup_finds === true) {
                                let count = 0
                                for(i = 0; i < server_id_data.length; i++) {
                                    sleep(2000)
                                    let refresh = await modules.response.refresh_token(server_id_data[i].refresh_token)
                                    let add_user = await modules.response.add_user(server_id_data[i].id, refresh, message.guild.id)
                                    if(add_user === true) {
                                        count += 1
                                    }
                                }
                                embeded_saerch_send.delete()
                                var embeded = new MessageEmbed()
                                .setTitle("✅ Success ✅ ")
                                .setColor("GREEN")
                                .setDescription(`복구 완료!\n\n복구 인원 : ${count}(예상했던 인원 : ${server_id_data.length})\n\n**모든 유저 밑 서버 정보가 업데이트 되었습니다!**`)
                                return message.channel.send({embeds: [embeded]}).catch(console.error);
                            } else {
                                var embeded = new MessageEmbed()
                                .setTitle(":x:  ERROR :x: ")
                                .setColor("RED")
                                .setDescription('해당 복구 키에 등록된 유저가 없습니다')
                                return message.reply({embeds: [embeded]}).catch(console.error);
                            }
                        })
                    } else {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('없는 복구 키 입니다')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }
                } catch(err) {
                    console.log(err)
                }
        })
    }

    if(request === "키등록") {
        if (!message.member.permissions.has("ADMINISTRATOR")) return;
        let regex = new RegExp('"[^"]+"', 'g');
        var arguments = [];
        var json = message.content
        json.match(regex)?.forEach(element => {
            if (!element) return;
            return arguments.push(element.replace(/"/g, ''));
        })
        if(arguments[0] === undefined) {
            var embeded = new MessageEmbed()
            .setTitle(":x:  ERROR :x: ")
            .setColor("RED")
            .setDescription('라이센스 키가 포함 되지 않았습니다\n> !키등록 "라이센스 키" ')
            return message.reply({embeds: [embeded]}).catch(console.error);
        }

        db.all('SELECT * FROM Server', async (err, dataa) => {
            try{
                let finds = dataa.some(v => v.id === message.guild.id)
                if(finds === true) {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('이 서버로 이미 등록된 라이센스가 있습니다')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }

                db.all('SELECT * FROM Key', async (err, data) => {
                    let finds = data.some(v => v.key === arguments[0])
                    if(finds === true) {
                        let key_find = data.map(v => { 
                            if(v.key === arguments[0]) {
                                return v
                            }
                        })
                        let key_set = key_find.filter((element, i) => element !== undefined);

                        if(key_set[0].id != "null") {
                            return message.channel.send("이미 등록된 라이센스입니다.")
                        }
                        if(key_set[0].expiration === "false") {
                            var embeded = new MessageEmbed()
                            .setTitle(":x:  ERROR :x: ")
                            .setColor("RED")
                            .setDescription('라이센스 키가 만료 되었습니다')
                            return message.reply({embeds: [embeded]}).catch(console.error);
                        }


                        let curr = new Date();
                        let utc = 
                            curr.getTime() + 
                            (curr.getTimezoneOffset() * 60 * 1000);
                        let KR_TIME_DIFF = 9 * 60 * 60 * 1000;
                        let kr_curr = new Date(utc + (KR_TIME_DIFF));
                        let day_set = new Date(kr_curr.setDate(kr_curr.getDate() + Number(key_set[0].day))).toLocaleString('ko', { timeZone: 'Asia/Seoul' }).split(".")
                        let backup_key = `PORO-B-${Math.random().toString(31).substr(2,11)}`
                        db.run(`UPDATE Key SET key = "${arguments[0]}", day = "${day_set[0]}.${day_set[1]}.${day_set[2]}.${day_set[3]}", id = "${message.guild.id}", backup_key = "${backup_key}", expiration = "true" WHERE key = "${arguments[0]}"`, function (err) {
                            if (err) {
                                return console.error(err.message);
                            }
                            console.log(`Row(s)  Server updated: ${this.changes}`);
                        })
                        db.run(`INSERT INTO Server (id, roleid, web_hook) VALUES ("${message.guild.id}", "null", "null")`)
                        var embeded = new MessageEmbed()
                        .setTitle("✅ Success ✅ ")
                        .setColor("GREEN")
                        .setDescription(`등록 성공!\nDM을 확인 해 주세요!`)
                        message.reply({embeds: [embeded]}).catch(console.error);
                        var embeded_author = new MessageEmbed()
                        .setTitle("✅ Success ✅ ")
                        .setColor("GREEN")
                        .setDescription(`등록 성공!\n등록 서버 : ${client.guilds.cache.get(message.guild.id).name}(${message.guild.id})\n백업 키 : ${backup_key}`)
                        return message.author.send({embeds: [embeded_author]}).catch(console.error);
                    } else if (finds === false) {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('없는 라이센스 키 입니다')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    } else {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('올바르지 않은 라이센스 키 입니다')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }
                })
            } catch(err) {
                console.log(err)
            }
        })
    }
            
        if(request === "역할") {
            if (!message.member.permissions.has("ADMINISTRATOR")) return;
            db.all('SELECT * FROM Key', async (err, data) => {
                try{
                    let findis = data.some(v => v.id === message.guild.id)
                    if(findis === false) {
                        message.channel.send("등록되지 않은 서버 입니다")
                        return;
                    }
                    let key_find = data.map(v => { 
                        if(v.id === message.guild.id) {
                            return v
                        }
                    })
                    let key_set = key_find.filter((element, i) => element !== undefined);
                    if(key_set[0].expiration === "false") {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('라이센스 키가 만료 되었습니다')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }

                let regex = new RegExp('"[^"]+"', 'g');
                var arguments = [];
                var json = message.content
                json.match(regex)?.forEach(element => {
                    if (!element) return;
                    return arguments.push(element.replace(/"/g, ''));
                })

                if(message.mentions.roles.first()) {
                    let user_id = message.mentions.roles.first().id
                    db.run(`UPDATE Server SET roleid = "${user_id}" WHERE id = "${message.guild.id}"`, function (err) {
                        if (err) {
                            return console.error(err.message);
                        }
                        console.log(`Row(s) roleid updated: ${this.changes}`);
                    })

                    var embeded = new MessageEmbed()
                    .setTitle("✅ Success ✅ ")
                    .setColor("GREEN")
                    .setDescription(`등록 성공!\n<@&${user_id}>`)
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }

                if(arguments[0] === undefined) {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('지급할 역할을 입력 해 주세요\n> !역할 "역할 id" or @멘션 ')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }

                db.run(`UPDATE Server SET roleid = "${arguments[0]}" WHERE id = "${message.guild.id}"`, function (err) {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log(`Row(s) roleid updated: ${this.changes}`);
                })
                
                var embeded = new MessageEmbed()
                .setTitle("✅ Success ✅ ")
                .setColor("GREEN")
                .setDescription(`등록 성공!\n<@&${arguments[0]}>`)
                return message.reply({embeds: [embeded]}).catch(console.error);
            } catch(err) {
                console.log(err)
            }
        })
    }

    if(request === "연장") {
        if (!message.member.permissions.has("ADMINISTRATOR")) return;
        db.all('SELECT * FROM Key', async (err, data) => {
            try {
                let regex = new RegExp('"[^"]+"', 'g');
                var arguments = [];
                var json = message.content
                json.match(regex)?.forEach(element => {
                    if (!element) return;
                    return arguments.push(element.replace(/"/g, ''));
                })

                if(arguments[0] === undefined) {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('연장할 라이센스 키를 입력해주세요\n> !연장 "연장할 라이센스 코드"')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }
                let findis = data.some(v => v.key === arguments[0])
                let key_find = data.map(v => { 
                    if(v.id === message.guild.id) {
                        return v
                    }
                })
                let key_set = key_find.filter((element, i) => element !== undefined);
                if(findis === true) {
                    let key_find_refresh = data.map(v => { 
                        if(v.key === arguments[0]) {
                            return v
                        }
                    })
                    let key_set_refresh = key_find_refresh.filter((element, i) => element !== undefined);

                    if(key_set[0].expiration === "true") {
                            var embeded = new MessageEmbed()
                            .setTitle(":x:  ERROR :x: ")
                            .setColor("RED")
                            .setDescription('아직 만료 되지 않은 라이센스 입니다')
                            return message.reply({embeds: [embeded]}).catch(console.error);
                        }
                        if(key_set_refresh[0].id != "null") {
                            return message.channel.send("연장하실려는 라이센스는 이미 등록된 라이센스 입니다!")
                        }

                    let curr = new Date();
                    let utc = 
                        curr.getTime() + 
                        (curr.getTimezoneOffset() * 60 * 1000);
                    let KR_TIME_DIFF = 9 * 60 * 60 * 1000;
                    let kr_curr = new Date(utc + (KR_TIME_DIFF));
                    let day_set = new Date(kr_curr.setDate(kr_curr.getDate() + Number(key_set[0].day))).toLocaleString('ko', { timeZone: 'Asia/Seoul' }).split(".")
                    if(day_set[0] == "Invalid Date") {
                        db.run(`UPDATE Key SET key = "${key_set[0].key}", day = "unlimited", id = "${message.guild.id}", backup_key = "${key_set[0].backup_key}", expiration = "true" WHERE key = "${key_set[0].key}"`, function (err) {
                            if (err) {
                                return console.error(err.message);
                            }
                            console.log(`Row(s)  Server extension Key updated: ${this.changes}`);
                        })
                    } else {
                    db.run(`UPDATE Key SET key = "${key_set[0].key}", day = "${day_set[0]}.${day_set[1]}.${day_set[2]}.${day_set[3]}", id = "${message.guild.id}", backup_key = "${key_set[0].backup_key}", expiration = "true" WHERE key = "${key_set[0].key}"`, function (err) {
                        if (err) {
                            return console.error(err.message);
                        }
                        console.log(`Row(s)  Server extension Key updated: ${this.changes}`);
                    })
                    }
                    db.run(`DELETE FROM Key WHERE key = '${arguments[0]}';`, function (err) {
                        if (err) {
                            return console.error(err.message);
                        }
                        console.log(`Row(s) DELE extension Key updated: ${this.changes}`);
                    })

                    var embeded = new MessageEmbed()
                    .setTitle("✅ Success ✅ ")
                    .setColor("GREEN")
                    .setDescription(`연장 성공!(${key_set_refresh[0].day}일)`)
                    return message.reply({embeds: [embeded]}).catch(console.error);

                } else if (findis === false) {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('등록 되어있지 않는 서버 입니다')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                } else {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('알 수 없는 오류')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }

            } catch(err) {
                console.log(err)
            }
        })
    }

    if(request === "조회") {
        if (!message.member.permissions.has("ADMINISTRATOR")) return;
        db.all('SELECT * FROM Key', async (err, data) => {
                try {
                    let regex = new RegExp('"[^"]+"', 'g');
                    var arguments = [];
                    var json = message.content
                    json.match(regex)?.forEach(element => {
                        if (!element) return;
                        return arguments.push(element.replace(/"/g, ''));
                    })

                    if(arguments[0] === undefined) {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('복구 키를 입력 해 주세요\n> !조회 "복구 키" ')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }

                    let findis = data.some(v => v.backup_key === arguments[0])
                    let key_find = data.map(v => { 
                        if(v.backup_key === arguments[0]) {
                            return v
                        }
                    })
                    let key_set = key_find.filter((element, i) => element !== undefined);
                    if(findis === true) {
                        db.all('SELECT * FROM User', async (err, dataa) => {
                            let server_id = dataa.map(v => {
                                if(v.backup_key === arguments[0]) {
                                    return v
                                }
                            })
                            let server_id_data = server_id.filter((element, i) => element !== undefined);
                        let guild_name = client.guilds.cache.get(key_set[0].id).name;
                        var embeded = new MessageEmbed()
                        .setTitle("✅ Success ✅ ")
                        .setColor("GREEN")
                        .setDescription(`조회 성공!\nDM을 확인 해 주세요!`)
                        message.reply({embeds: [embeded]}).catch(console.error);
                        var embeded_author = new MessageEmbed()
                        .setTitle("✅ Success ✅ ")
                        .setColor("GREEN")
                        .setDescription(`**조회 정보**\n\n등록한 라이센스 : ${key_set[0].key}\n등록한 서버 : ${guild_name}(${key_set[0].id})\n만료일 : ${key_set[0].day}\n복구 키 : ${key_set[0].backup_key}\n가입한 유저 수 : ${server_id_data.length}`)
                        return message.author.send({embeds: [embeded_author]}).catch(console.error);
                    })
                    } else if (findis === false) {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('없는 복구 키 입니다')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    } else {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('올바르지 않은 복구 키 입니다')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }

                } catch(err) {
                    console.log(err)
                }
            })
        }
    
    if(request === "웹훅") {
        if (!message.member.permissions.has("ADMINISTRATOR")) return;
        db.all('SELECT * FROM Server', async (err, data) => {
            try {
                    let regex = new RegExp('"[^"]+"', 'g');
                    var arguments = [];
                    var json = message.content
                    json.match(regex)?.forEach(element => {
                        if (!element) return;
                        return arguments.push(element.replace(/"/g, ''));
                    })

                    if(arguments[0] === undefined) {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('웹훅 URL 을 입력해주세요\n> !웹훅 "URL" ')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }
                
                    let Server_data = data.some(v => v.id === message.guild.id)

                if(Server_data === true) {
                    db.run(`UPDATE Server SET web_hook = "${arguments[0]}" WHERE id = "${message.guild.id}"`, function (err) {
                        if (err) {
                            return console.error(err.message);
                        }
                        console.log(`Row(s) Web_hook updated: ${this.changes}`);
                    })

                    var embeded = new MessageEmbed()
                    .setTitle("✅ Success ✅ ")
                    .setColor("GREEN")
                    .setDescription(`웹훅을 등록했습니다!\n${arguments[0]}`)
                    return message.reply({embeds: [embeded]}).catch(console.error);
                } else if (Server_data === false) {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('등록되어있지 않은 서버입니다')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                } else {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('알 수 없는 이유로 서버를 찾지 못했습니다 잠시 후 에 재시도 해주세요')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }
            } catch(err) {
                console.log(err)
            }
        })
    }
});

app.listen(PORT, () => {
    console.log(`[+] 외부 포트를 ${PORT}로 열었습니다.`)
})
client.login(config.TOKEN)