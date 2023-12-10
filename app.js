const express = require('express')
const axios = require('axios');
require('dotenv').config();
const professionProbabilities = require('./config/professions_vk')

const app = express()
const port = 3000

app.use(express.json());

function recommendProfessions(userSubscriptions) {
  const professionScores = {};

  // Подсчет вероятностей для каждой профессии
  userSubscriptions.forEach(category => {
    const professions = professionProbabilities[category];
    if (professions) {
      Object.entries(professions).forEach(([profession, probability]) => {
        professionScores[profession] = (professionScores[profession] || 0) + probability;
      });
    }
  });

  // Сортировка профессий по убыванию вероятностей
  const sortedProfessions = Object.entries(professionScores)
    .sort((a, b) => b[1] - a[1])
    .map(([profession, probability]) => ({ profession, probability }));

  return sortedProfessions;
}


app.get('/social_networks/auth', async (req, res) => {
  try {
    const { code, social_network } = req.body;

    if (social_network == 'vk') {
      const clientId = process.env.CLIENT_ID;
      const clientSecret = process.env.CLIENT_SECRET;

      const vkTokenUrl = `https://oauth.vk.com/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=http://mysite.ru&code=${code}`;

      const response = await axios.get(vkTokenUrl);

      const accessToken = response.data.access_token;

      // получаем данные о пользователя по api
      const vkUserUrl = 'https://api.vk.com/method/users.get';
      const userResponse = await axios.post(vkUserUrl, {
        extended: 1,
        access_token: accessToken,
        v: '5.199',
      });

      const userData = userResponse.data;

      // получаем данные о подписках пользователя
      const vkGroupsUrl = 'https://api.vk.com/method/groups.get';
      const groupsResponse = await axios.post(vkGroupsUrl, {
        extended: 1,
        access_token: accessToken,
        v: '5.199',
      });

      const groupsData = groupsResponse.data;
      const activitiesArray = groupsData.response.items.map(item => item.activity);

      const recommendations = recommendProfessions(activitiesArray);

      const result = {
        firstname: userData.response[0].first_name,
        lastname: userData.response[0].last_name,
        recommendations: recommendations
      }
      res.send(result)
    }
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening on port ${port}`)
})
