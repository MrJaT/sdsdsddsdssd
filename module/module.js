const axios = require('axios')
const url = require('url')
const config = require('../config.json')
const database = require('../module/db.js')
let db = database.db

const response = {
    token_data: async (data) => {
        const info_data = await axios.get(
            'https://discordapp.com/api/v8/users/@me',
            {
                headers: {
                    "Authorization" : "Bearer " + data.access_token
                },
            }
        )
        if(info_data.data == false) {
            return "권한이 부여되지 않았습니다"
        }

        return info_data.data

    },
    add_user: async (user_id, access_token, guild_id) => {
        try{
            const response = await axios(
                {
                    method: 'PUT',
                    url: `https://discord.com/api/v9/guilds/${guild_id}/members/${user_id}`,
                    data: {
                        "access_token": `${access_token}`,
                    },
                    headers: {
                        "Authorization": `Bot ${config.TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
            if(response.data) {
                return true
            } else {
                return false
            }
        } catch(err) {
            return err.response
        }
    },
    add_role: async (guildid, userid, roleid) => {
        try {
            const response = await axios(
                {  
                    method: 'PUT',
                    url: `https://discord.com/api/v9/guilds/${guildid}/members/${userid}/roles/${roleid}`,
                    headers: {
                        "Authorization": `Bot ${config.TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
            console.log(response.data)
        } catch(err) {
            return err.response
        }
    },
    refresh_token: async (refresh_token) => {
        try {
                const response = await axios(
                    {
                        method: 'POST',
                        url: `https://discord.com/api/v9/oauth2/token`,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        data: new URLSearchParams({
                            client_id: config.CLIENT_ID,
                            client_secret: config.CLIENT_SECRET,
                            grant_type: "refresh_token",
                            refresh_token: refresh_token
                        }),
                    }
                )

                if(response.data === undefined) {
                    return console.log("refresh is undefind")
                }

                let refresh = response.data
                db.run(`UPDATE User SET access_token = "${refresh.access_token}", refresh_token = "${refresh.refresh_token}" WHERE refresh_token = "${refresh_token}"`)
                return refresh.access_token
        } catch(err) {
            return err.response
        }
    }
}



module.exports = {
    response
}