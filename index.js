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
            message: "?????? ???????????? ?????? ?????? ????????????!"
        })
    } else if (code === undefined) {
        return res.render(`error`, {
            message: "CODE??? ?????? ?????? ???????????????!"
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
                                    message: "?????? ????????? ??????????????? ????????? ?????? ?????????"
                                })
                            }
                            for(var i = 0; i < Prevention.length; i++) {
                                if(Prevention[i].server === state) {
                                    try {
                                    if(role_id_data[0].web_hook != "null") {
                                        let webhook = new WebhookClient({ url: `${role_id_data[0].web_hook}` })
        
                                        let embed = new MessageEmbed()
                                        .setTitle('????????? ?????? ??????')
                                        .setColor(`0x2F3136`)
                                        .setDescription(`**${user_name}**?????? ????????? ????????? ???????????????`)
        
                                        webhook.send({
                                            username: "[PORO LOG]",
                                            avatarURL: `https://cdn.discordapp.com/avatars/${user_info.id}/${user_info.avatar}`,
                                            embeds: [embed]
                                        })
                                    }
                                }catch(err) {

                                }
                                    console.log(`${client.guilds.cache.get(state).name}(${state})\n${user_name}(${user_info.id}) ??? ??????`)
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
                                .setTitle('?????? ?????? ??????')
                                .setColor(`0x2F3136`)
                                .setDescription(`**${user_name}**?????? ????????? ?????? ???????????????`)

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
                            console.log(`${client.guilds.cache.get(state).name}(${state})\n${user_name}(${user_info.id}) ??? ??????!`)
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
        client.user.setActivity(`${client.guilds.cache.size}?????? ???????????? ??????`);
      }, 10000);
})

client.on("messageCreate", async (message) => {
    if (message.content[0] !== "!") return;
    
    const request = message.content.substring(1).split(" ")[0];

    if(request === "?????????") {
        let embeded = new MessageEmbed()
        .setTitle("??? Success ??? ")
        .setColor("GREEN")
        .setDescription('????????? ?????????\n**????????? ????????? ????????? ????????? ?????????!**\n')
        .addField('!?????????', '????????? ??????')
        .addField('!?????? "URL"', '?????? ?????? ????????? ???????????????')
        .addField('!?????? [@??????]', '?????? ??????\n???')
        .addField('?????????? ?????? ?????????????', "?????? ???????????? ?????? ?????? ????????? ???????????? ????????? ?????????\n???", true)
        .addField('!????????? "????????????"', '????????? ??????????????? ???????????????!\n> "" << ??? ????????? ?????? ?????????????????? ????????? ???????????????!')
        .addField('!?????? "?????????"', '????????? ?????? ?????????!\n> "" << ??? ????????? ?????? ?????????????????? ????????? ???????????????!')
        .addField('!?????? "?????? ????????????" "????????? ????????????"', '??????????????? ???????????????!\n> "" << ??? ????????? ?????? ?????????????????? ????????? ???????????????!')
        .addField('!?????? "?????????"', '????????? ????????? ???????????????\n> "" << ??? ????????? ?????? ?????????????????? ????????? ???????????????!')
        return message.reply({embeds: [embeded]}).catch(console.error);
    }

    //?????? ????????? 
    if(request === "??????") {
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
                .setDescription('?????? ???????????? ??? ????????? ?????? ????????? ?????????!')
                return message.reply({embeds: [embeded]}).catch(console.error);
            }

            if(arguments[0] === undefined) {
                var embeded = new MessageEmbed()
                .setTitle(":x:  ERROR :x: ")
                .setColor("RED")
                .setDescription('????????? ???????????? ?????? ???????????????')
                return message.reply({embeds: [embeded]}).catch(console.error);
            }
            if(arguments[1] === undefined) {
                var embeded = new MessageEmbed()
                .setTitle(":x:  ERROR :x: ")
                .setColor("RED")
                .setDescription('???????????? ??? ?????? ??????????????????')
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
            .setTitle("??? Success ??? ")
            .setColor("GREEN")
            .addField("????????? ???", "```" + `${list.toString().replaceAll(',', '\n')}` + "```")
            return message.reply({embeds: [embeded]}).catch(console.error);
        }catch(err) {
            console.log(err)
        }
    }

    if(request === "??????") {
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
                .setDescription('?????? ???????????? ??? ????????? ?????? ????????? ?????????!')
                return message.reply({embeds: [embeded]}).catch(console.error);
            }

            if(arguments[0] === undefined) {
                var embeded = new MessageEmbed()
                .setTitle(":x:  ERROR :x: ")
                .setColor("RED")
                .setDescription('?????? ??? ??????????????? ??????????????????')
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
                        .setTitle("??? Success ??? ")
                        .setColor("GREEN")
                        .addField("????????? ???", "```" + `${arguments[0]}` + "```")
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    })
                    } else {
                        let embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('??????????????? ?????? ???????????????')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }
                } catch(err) {
                    console.log(err)
                }
            })
    }

    if(request === "??????") {
        if(!config.owner.includes(message.author.id)) {
            var embeded = new MessageEmbed()
            .setTitle(":x:  ERROR :x: ")
            .setColor("RED")
            .setDescription('?????? ???????????? ??? ????????? ?????? ????????? ?????????!')
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
                        .setDescription('?????? ???????????? ?????? ???????????? \n> !?????? "?????? ?????????" ')
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
                                .setTitle("??? Success ??? ")
                                .setColor("GREEN")
                                .setDescription(`**ADMIN ?????? ??????**\n\n????????? ???????????? : ${key_set[0].key}\n????????? ?????? : ${guild_name}(${key_set[0].id})\n????????? : ${key_set[0].day}\n?????? ??? : ${key_set[0].backup_key}\n????????? ?????? ??? : ${server_id_data.length}`)
                                return message.reply({embeds: [embeded]}).catch(console.error);
                            } catch(err) {
                                var embeded = new MessageEmbed()
                                .setTitle(":x:  ERROR :x: ")
                                .setColor("RED")
                                .setDescription('????????? ?????? ??? ????????????')
                                return message.reply({embeds: [embeded]}).catch(console.error);
                            }
                        })
                    } else if (findis === false) {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('?????? ?????? ?????????')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    } else {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('???????????? ?????? ????????? ?????????')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }
                } catch (err) {
                    console.log(err)
                }
            })
        }
    }

    if(request === "?????????") {
        if (!message.member.permissions.has("ADMINISTRATOR")) return;
        db.all('SELECT * FROM Key', async (err, data) => {
            try{
                let findis = data.some(v => v.id === message.guild.id)
                if(findis === false) {
                    message.channel.send("???????????? ?????? ?????? ?????????")
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
                    .setDescription('???????????? ?????? ?????? ???????????????')
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
                            message.channel.send("????????? ??????????????????!\n> !?????? [@??????]")
                            return;
                        }
                        let row = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setLabel('??? ????????????')
                                .setURL(config.URL + `&state=${message.guild.id}`)
                                .setStyle('LINK')
                        );
                        let embed = new MessageEmbed()
                        .setTitle(`${message.guild.name}`)
                        .setColor("#5865F2")
                        .setDescription(`[??????](${config.URL + `&state=${message.guild.id}`})??? ???????????? ????????? ???????????????!\n\n- **?????? ????????? ????????? ????????? ???????????? ?????? ??? ??? ????????????**\n    ??? ????????? ????????? ?????? ???????????? ???????????? ????????????????????????!`)
                        return message.channel.send({embeds: [embed], components: [row] })
                })
            } catch(err) {
                console.log(err)
            }
        })
    }

    if(request === "??????") {
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
                .setDescription('?????? ?????? ?????? ?????? ???????????????\n> !?????? "???" ')
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
                        console.log(`[!] ${message.guild.id}?????? ${message.author.tag}(${message.author.id})??????  ${key_set[0].id}??? ${key_set[0].backup_key}??? ??????????????????`)
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
                            .setTitle("???? Wait...")
                            .setColor("GREEN")
                            .setDescription(`????????? ?????? ????????????. ?????? 1????????? ????????? ??? ????????????. (?????? ?????? ?????? : ${server_id_data.length})`)
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
                                .setTitle("??? Success ??? ")
                                .setColor("GREEN")
                                .setDescription(`?????? ??????!\n\n?????? ?????? : ${count}(???????????? ?????? : ${server_id_data.length})\n\n**?????? ?????? ??? ?????? ????????? ???????????? ???????????????!**`)
                                return message.channel.send({embeds: [embeded]}).catch(console.error);
                            } else {
                                var embeded = new MessageEmbed()
                                .setTitle(":x:  ERROR :x: ")
                                .setColor("RED")
                                .setDescription('?????? ?????? ?????? ????????? ????????? ????????????')
                                return message.reply({embeds: [embeded]}).catch(console.error);
                            }
                        })
                    } else {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('?????? ?????? ??? ?????????')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }
                } catch(err) {
                    console.log(err)
                }
        })
    }

    if(request === "?????????") {
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
            .setDescription('???????????? ?????? ?????? ?????? ???????????????\n> !????????? "???????????? ???" ')
            return message.reply({embeds: [embeded]}).catch(console.error);
        }

        db.all('SELECT * FROM Server', async (err, dataa) => {
            try{
                let finds = dataa.some(v => v.id === message.guild.id)
                if(finds === true) {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('??? ????????? ?????? ????????? ??????????????? ????????????')
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
                            return message.channel.send("?????? ????????? ?????????????????????.")
                        }
                        if(key_set[0].expiration === "false") {
                            var embeded = new MessageEmbed()
                            .setTitle(":x:  ERROR :x: ")
                            .setColor("RED")
                            .setDescription('???????????? ?????? ?????? ???????????????')
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
                        .setTitle("??? Success ??? ")
                        .setColor("GREEN")
                        .setDescription(`?????? ??????!\nDM??? ?????? ??? ?????????!`)
                        message.reply({embeds: [embeded]}).catch(console.error);
                        var embeded_author = new MessageEmbed()
                        .setTitle("??? Success ??? ")
                        .setColor("GREEN")
                        .setDescription(`?????? ??????!\n?????? ?????? : ${client.guilds.cache.get(message.guild.id).name}(${message.guild.id})\n?????? ??? : ${backup_key}`)
                        return message.author.send({embeds: [embeded_author]}).catch(console.error);
                    } else if (finds === false) {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('?????? ???????????? ??? ?????????')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    } else {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('???????????? ?????? ???????????? ??? ?????????')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }
                })
            } catch(err) {
                console.log(err)
            }
        })
    }
            
        if(request === "??????") {
            if (!message.member.permissions.has("ADMINISTRATOR")) return;
            db.all('SELECT * FROM Key', async (err, data) => {
                try{
                    let findis = data.some(v => v.id === message.guild.id)
                    if(findis === false) {
                        message.channel.send("???????????? ?????? ?????? ?????????")
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
                        .setDescription('???????????? ?????? ?????? ???????????????')
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
                    .setTitle("??? Success ??? ")
                    .setColor("GREEN")
                    .setDescription(`?????? ??????!\n<@&${user_id}>`)
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }

                if(arguments[0] === undefined) {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('????????? ????????? ?????? ??? ?????????\n> !?????? "?????? id" or @?????? ')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }

                db.run(`UPDATE Server SET roleid = "${arguments[0]}" WHERE id = "${message.guild.id}"`, function (err) {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log(`Row(s) roleid updated: ${this.changes}`);
                })
                
                var embeded = new MessageEmbed()
                .setTitle("??? Success ??? ")
                .setColor("GREEN")
                .setDescription(`?????? ??????!\n<@&${arguments[0]}>`)
                return message.reply({embeds: [embeded]}).catch(console.error);
            } catch(err) {
                console.log(err)
            }
        })
    }

    if(request === "??????") {
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
                    .setDescription('????????? ???????????? ?????? ??????????????????\n> !?????? "????????? ???????????? ??????"')
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
                            .setDescription('?????? ?????? ?????? ?????? ???????????? ?????????')
                            return message.reply({embeds: [embeded]}).catch(console.error);
                        }
                        if(key_set_refresh[0].id != "null") {
                            return message.channel.send("?????????????????? ??????????????? ?????? ????????? ???????????? ?????????!")
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
                    .setTitle("??? Success ??? ")
                    .setColor("GREEN")
                    .setDescription(`?????? ??????!(${key_set_refresh[0].day}???)`)
                    return message.reply({embeds: [embeded]}).catch(console.error);

                } else if (findis === false) {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('?????? ???????????? ?????? ?????? ?????????')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                } else {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('??? ??? ?????? ??????')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }

            } catch(err) {
                console.log(err)
            }
        })
    }

    if(request === "??????") {
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
                        .setDescription('?????? ?????? ?????? ??? ?????????\n> !?????? "?????? ???" ')
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
                        .setTitle("??? Success ??? ")
                        .setColor("GREEN")
                        .setDescription(`?????? ??????!\nDM??? ?????? ??? ?????????!`)
                        message.reply({embeds: [embeded]}).catch(console.error);
                        var embeded_author = new MessageEmbed()
                        .setTitle("??? Success ??? ")
                        .setColor("GREEN")
                        .setDescription(`**?????? ??????**\n\n????????? ???????????? : ${key_set[0].key}\n????????? ?????? : ${guild_name}(${key_set[0].id})\n????????? : ${key_set[0].day}\n?????? ??? : ${key_set[0].backup_key}\n????????? ?????? ??? : ${server_id_data.length}`)
                        return message.author.send({embeds: [embeded_author]}).catch(console.error);
                    })
                    } else if (findis === false) {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('?????? ?????? ??? ?????????')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    } else {
                        var embeded = new MessageEmbed()
                        .setTitle(":x:  ERROR :x: ")
                        .setColor("RED")
                        .setDescription('???????????? ?????? ?????? ??? ?????????')
                        return message.reply({embeds: [embeded]}).catch(console.error);
                    }

                } catch(err) {
                    console.log(err)
                }
            })
        }
    
    if(request === "??????") {
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
                        .setDescription('?????? URL ??? ??????????????????\n> !?????? "URL" ')
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
                    .setTitle("??? Success ??? ")
                    .setColor("GREEN")
                    .setDescription(`????????? ??????????????????!\n${arguments[0]}`)
                    return message.reply({embeds: [embeded]}).catch(console.error);
                } else if (Server_data === false) {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('?????????????????? ?????? ???????????????')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                } else {
                    var embeded = new MessageEmbed()
                    .setTitle(":x:  ERROR :x: ")
                    .setColor("RED")
                    .setDescription('??? ??? ?????? ????????? ????????? ?????? ??????????????? ?????? ??? ??? ????????? ????????????')
                    return message.reply({embeds: [embeded]}).catch(console.error);
                }
            } catch(err) {
                console.log(err)
            }
        })
    }
});

app.listen(PORT, () => {
    console.log(`[+] ?????? ????????? ${PORT}??? ???????????????.`)
})
client.login(config.TOKEN)