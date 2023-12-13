const express = require('express')
const axios = require('axios');
require('dotenv').config();
const professionProbabilities = require('./config/professions_vk')
const { Client } = require('pg');

const app = express()
const port = 3000


const client = new Client({
  user: 'myuser',
  host: 'localhost',
  database: 'mydatabase',
  password: 'mypassword',
  port: 5432
});

client.connect();

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


app.post('/social_networks/auth', async (req, res) => {
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

      // записываем в базу рекомендации
      recommendations.map((recommendation) => {
        let userId;
        let professionId;
        const userFirstname = 'Иван';
        const userLastname = 'Иванов';
        const professionTitle = recommendation.profession;
        
             // сделать INSERT or SELECT
            const selectQuery = {
              text: 'SELECT id FROM users WHERE firstname = $1 AND lastname = $2',
              values: [userFirstname, userLastname],
            };
          client.query(selectQuery)
          .then((result) => {
            userId = result.rows[0].id;
            if (result.rows.length > 0) {
              const selectQuery2 = {
                text: 'SELECT id FROM professions WHERE title = $1',
                values: [professionTitle],
              };

              return client.query(selectQuery2);
            } else {
              throw new Error('User not found');
            }
          })
          .then((result) => {
            if (result.rows.length > 0) {
              professionId = result.rows[0].id;
              const insertQuery = {
                text: 'INSERT INTO prof_recommendations(user_id, profession_id, percent, is_watch) VALUES($1, $2, $3, false)',
                values: [userId, professionId, recommendation.probability],
              };

              return client.query(insertQuery);
            } else {
              throw new Error('Record not found in another_table');
            }
          })
          .then(() => {
            console.log('Insert successful');
          })
          .catch((error) => {
            console.error(error);
          })
      })

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


app.get('/courses', async (req, res) => {
  const result = await client.query('SELECT * FROM courses');
  res.send(result.rows)
})

app.get('/courses/:id', async (req, res) => {
  const courseId = req.params.id;
  const result = await client.query('SELECT * FROM courses WHERE id = $1', [courseId]);
  if (result.rows.length > 0) {
    res.send(result.rows[0]);
  } else {
    res.status(404).send('Course not found');
  }})

app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening on port ${port}`)
})
