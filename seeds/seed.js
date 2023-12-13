/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  await knex('users').del()
  await knex('users').insert([
    {id: 1, firstname: 'Иван', lastname: 'Иванов', email: 'test@test.ru', role: 'user'}
  ]);
  await knex('professions').del()
  await knex('professions').insert([
    {id: 1, title: 'Повар', description: 'Готовьте изысканные блюда и получайте за это деньги. Разве это не супер?)'}
  ]);
  await knex('prof_recommendations').del()
  await knex('prof_recommendations').insert([
    {id: 1, user_id: 1, profession_id: 1, percent: 0.7, is_watch: false}
  ]);
  await knex('courses').del()
  await knex('courses').insert([
    {id: 1, title: 'Жарка и варка от шеф повара', description: 'Научитесь очень многому', image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgbWEuxLS3myKtOsrn-Kf5G0ogVrCgl5XbCvTOrkDhGg&s'}
  ]);
  await knex('prof_courses').del()
  await knex('prof_courses').insert([
    {id: 1, course_id: 1, profession_id: 1}
  ]);
};
