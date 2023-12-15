const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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
app.use(cors());

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

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] 
  const token = authHeader && authHeader.split(' ')[1] 
  if (!token) return res.sendStatus(401)
  jwt.verify(token, 'secret123', (err, user) => {
    console.log(err)
    if (err) return res.sendStatus(403)
    req.user = user
    next()
    })
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

app.get('/professions', authenticateToken, async (req, res) => {
  const result = await client.query('SELECT * FROM professions');
  res.send(result.rows)
})

app.get('/professions/:id', authenticateToken, async (req, res) => {
  const courseId = req.params.id;
  const result = await client.query('SELECT * FROM professions WHERE id = $1', [courseId]);
  if (result.rows.length > 0) {
    res.send(result.rows[0]);
  } else {
    res.status(404).send('Professions not found');
  }})

app.post('/profession', authenticateToken, async (req, res) => {
  try {
    const professionFind = await client.query('SELECT * FROM professions WHERE title = $1', [req.body.title]);

    if (!professionFind.rows[0]) {
      const insertQuery = {
        text: 'INSERT INTO professions(title, description) VALUES($1, $2)',
        values: [req.body.title, req.body.description],
      };
      await client.query(insertQuery);
      const profession = await client.query('SELECT * FROM professions WHERE title = $1', [req.body.title]);
    
      return res.json(profession.rows[0]);
  
    } else {
      return res.status(400).json({
        error: 'Такая профессия уже существует',
      });
    }

  } catch (err) {
    res.status(500).json({
      error: 'Не удалось создать курс',
    });
  }
})

app.get('/courses', authenticateToken, async (req, res) => {
  const result = await client.query('SELECT * FROM courses');
  res.send(result.rows)
})

app.get('/courses/:id', authenticateToken, async (req, res) => {
  const courseId = req.params.id;
  const result = await client.query('SELECT * FROM courses WHERE id = $1', [courseId]);
  if (result.rows.length > 0) {
    res.send(result.rows[0]);
  } else {
    res.status(404).send('Course not found');
  }})

app.post('/course', authenticateToken, async (req, res) => {
  try {
    const courseFind = await client.query('SELECT * FROM courses WHERE title = $1', [req.body.title]);

    if (!courseFind.rows[0]) {
      const insertQuery = {
        text: 'INSERT INTO courses(title, description, image_url) VALUES($1, $2, $3)',
        values: [req.body.title, req.body.description, req.body.image_url],
      };
      await client.query(insertQuery);
      const course = await client.query('SELECT * FROM courses WHERE title = $1', [req.body.title]);
    
      return res.json(course.rows[0]);
  
    } else {
      return res.status(400).json({
        error: 'Такой курс уже существует',
      });
    }

  } catch (err) {
    res.status(500).json({
      error: 'Не удалось создать курс',
    });
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const emailReq = req.body.email;
    const user = await client.query('SELECT * FROM users WHERE email = $1 limit 1', [emailReq]);

    if (!user.rows[0]) {
      return res.status(404).json({
        error: 'Пользователь не найден',
      });
    }

    const isValidPass = await bcrypt.compare(req.body.password, user.rows[0].password_hash);

    if (!isValidPass) {
      return res.status(400).json({
        error: 'Неверный логин или пароль',
      });
    }

    const token = jwt.sign(
        {
          _id: user.rows[0].id,
        },
        'secret123',
        {
          expiresIn: '30d',
        },
    );

    const {passwordHash, ...userData} = user.rows[0];

    res.json({
      ...userData,
      token,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Не удалось авторизоваться',
    });
  }
})

app.get('/user/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await client.query('SELECT * FROM users WHERE id = $1 limit 1', [userId]);

    if (!user.rows[0]) {
      return res.status(404).json({
        error: 'Пользователь не найден',
      });
    }

    return res.json(user.rows[0]);
  } catch (err) {
    res.status(500).json({
      error: 'Не удалось выполнить запрос',
    });
  }
})

app.get('/user_rec_profession/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const user_rec_prof = await client.query(
      'SELECT * FROM prof_recommendations left join professions on professions.id = prof_recommendations.profession_id WHERE user_id = $1',
      [userId]);

    if (!user_rec_prof.rows[0]) {
      return res.status(404).json({
        error: 'У пользователя нет рекомендованных курсов',
      });
    }

    return res.json(user_rec_prof.rows[0]);
  } catch (err) {
    res.status(500).json({
      error: 'Не удалось выполнить запрос',
    });
  }
})

app.get('/courses_for_prof/:prof_id', authenticateToken, async (req, res) => {
  try {
    const profId = req.params.prof_id;
    const prof_courses = await client.query(
      'SELECT * FROM prof_courses left join courses on courses.id = prof_courses.course_id WHERE profession_id = $1', 
    [profId]);

    if (!prof_courses.rows[0]) {
      return res.status(404).json({
        error: 'У профессии нет курсов',
      });
    }

    return res.json(prof_courses.rows[0]);
  } catch (err) {
    res.status(500).json({
      error: 'Не удалось выполнить запрос',
    });
  }
})

app.get('/prof_for_courses_/:course_id', authenticateToken, async (req, res) => {
  try {
    const courseId = req.params.course_id;
    const prof_courses = await client.query(
      'SELECT * FROM prof_courses left join professions on professions.id = prof_courses.profession_id WHERE course_id = $1', 
    [courseId]);

    if (!prof_courses.rows[0]) {
      return res.status(404).json({
        error: 'У курса нет профессий',
      });
    }

    return res.json(prof_courses.rows[0]);
  } catch (err) {
    res.status(500).json({
      error: 'Не удалось выполнить запрос',
    });
  }
})

app.post('/auth/register', async (req, res) => {
  try {
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const userFind = await client.query('SELECT * FROM users WHERE email = $1 limit 1', [req.body.email]);

    if (!userFind.rows[0]) {
      const insertQuery = {
        text: 'INSERT INTO users(firstname, lastname, email, password_hash, role) VALUES($1, $2, $3, $4, $5)',
        values: [req.body.firstname, req.body.lastname, req.body.email, hash, req.body.role],
      };
      await client.query(insertQuery);
  
      const emailReq = req.body.email;
      const user = await client.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
  
      const token = jwt.sign(
          {
            _id: user.rows[0].id,
          },
          'secret123',
          {
            expiresIn: '30d',
          },
      );
  
      const {passwordHash, ...userData} = user.rows[0];
  
      res.json({
        ...userData,
        token,
      });
  
    } else {
      return res.status(400).json({
        error: 'Пользователь с такой почтой уже существует',
      });
    }

  } catch (err) {
    res.status(500).json({
      error: 'Не удалось зарегистрироваться',
    });
  }
})



app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening on port ${port}`)
})
