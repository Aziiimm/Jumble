export async function seed(knex) {
  // Deletes ALL existing entries
  await knex("users").del();

  // Inserts seed entries
  await knex("users").insert([
    { email: "user1@example.com" },
    { email: "user2@example.com" },
    { email: "user3@example.com" },
    { email: "user4@example.com" },
    { email: "user5@example.com" },
    { email: "user6@example.com" },
    { email: "user7@example.com" },
    { email: "user8@example.com" },
    { email: "user9@example.com" },
    { email: "user10@example.com" },
  ]);
}

// original seed file code

// /**
//  * @param { import("knex").Knex } knex
//  * @returns { Promise<void> }
//  */
// exports.seed = async function(knex) {
//   // Deletes ALL existing entries
//   await knex('table_name').del()
//   await knex('table_name').insert([
//     {id: 1, colName: 'rowValue1'},
//     {id: 2, colName: 'rowValue2'},
//     {id: 3, colName: 'rowValue3'}
//   ]);
// };
