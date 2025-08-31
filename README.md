# Jumble 🎮

## Project Scope

Jumble is a party game web app. The goal is to let people play casual games in real time with friends/AI (similar to jackbox/gamepigeon/jklm). The first game will be called **Word Hunter** (based on Word Hunt from gamepigeon). It will support up to 8 players per room for multiplayer, and track wins with a leaderboard system.

Frontend will be built using React, Tailwind, TypeScript, shadcn/ui. Scaffolding has already been done.

Backend will be built using Node, Database will use PostgreSQL, hosted on AWS RDS in prod. Aiming to use AWS S3 for uplaods, and possibly EC2 for hosting. Docker, Redis, Websockets will be used. Auth method has yet to be decided.

Multiplayer will work via room codes (user creates a room, gets a code, others join using it). Leaderboard tracks all-time wins. AI opponent will be require training a ML model (down the line).

Goal is to make a solid base for more games to be added later.

## To Dos:

- [ ] Add Guest Account feature (cannot participate in multiplayer games)

- [ ] Add Google Analytics

## Database Migrations Workflow

`npm run migrate:rollback`

We're going to use Knex migrations to keep our database schemas in sync for development (for prod later on too)

##### Applying Migrations

Whenever you need to pull new changes that include a migration (a change to the schema), run:

`npm run migrate:latest`

This will update your schema to match the latest code's.

#### Creating a New Migration

When you need to modify the schema (ex. adding a new table, add/drop/alter a column):

`npm run migrate:make create_games_table`

This creates a new file in the `migrations/` folder ( this example is for creating a new games table)

#### Writing the Migration

Inside the file, define the schema changes in the up function, and how to undo them in the down function, like this:

```
export async function up(knex) {
  return knex.schema.createTable('games', (table) => {
    table.increments('id').primary();
    table.string('code').notNullable().unique();
    table.integer('host_id').unsigned().references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('games');
}
```

#### Changing the schema later

If you need to change something (like renaming or dropping a column), **create a new migration** instead of editing the old one, so we can keep a clear history of everything, and so we can both just run `npm run migrate:latest` after pulling and keep our schemas in sync. Lets say you want to just add a column, instead of editing the migration, just make a new one with that instruction.

`npm run migrate:make add_username_to_users.js`

```
// /migrations/..._add_usernmame_to_users.js
export async function up(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('username').unique();
  });
}

export async function down(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('username');
  });
}
```

This migration alters the existing users table without recreating or dropping our existing one. Same logic applies for renaming or removing a column. Its important we make new ones instaed of editing old ones to keep our databases in sync. Runs the same sequence of migrations in order.

## Database Seeding Workflow

Seeds will let us populate the database with test data, this is useful so we're working with the same data, and no one has to go through the tedious work of populating the database.

#### Running Seeds

To insert the seed data into your DB, run:
`npm run seed:run`

This will execute all the seed files in the `seeds/` folder.

#### Creating a Seed File

If you want to define new seed data, make a new seed file:

`npm run seed:make initial_users`

This creates a new file in the `seeds/` folder.

#### Writing a Seed

Here's an example seed file for `users`:

```
// seeds/initial_users.js
export async function seed(knex) {
  // Deletes ALL existing entries
  await knex('users').del();

  // Inserts seed entries
  await knex('users').insert([
    { id: 1, email: 'test@example.com' },
    { id: 2, email: 'demo@example.com' },
  ]);
}
```

This will clear out the `users` table, then insert those test users.

#### Workflow

We both can just run `npm run seed:run` after pulling new changes with updates to the schema (new migrations) to get the same test data.
