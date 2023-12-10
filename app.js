const express = require('express')
const axios = require('axios');
require('dotenv').config();

const app = express()
const port = 3000

app.use(express.json());

app.get('/social_networks/auth', async (req, res) => {
  try {
  const { code } = req.body;

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  const vkTokenUrl = `https://oauth.vk.com/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=http://mysite.ru&code=${code}`;

  const response = await axios.get(vkTokenUrl);

  const { access_token } = response.data
  // тут должна быть логика получения групп и их анализ
  res.send({ status: 'ok' })
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening on port ${port}`)
})
