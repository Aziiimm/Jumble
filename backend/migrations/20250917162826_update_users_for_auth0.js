/**
 * Updates users table for Auth0 integration
 * - Changes primary key from auto-increment id to Auth0 sub (string)
 * - Adds user profile fields (name, picture, nickname, etc.)
 * - Updates game_scores table to reference new user structure
 */

export async function up(knex) {
  // First, we need to handle existing data if any
  // Since this is likely a development environment, we'll drop and recreate

  // Drop foreign key constraint from game_scores first
  await knex.schema.alterTable("game_scores", (table) => {
    table.dropForeign(["game_id"]);
  });

  // Drop the existing tables
  await knex.schema.dropTableIfExists("game_scores");
  await knex.schema.dropTableIfExists("users");

  // Recreate users table with Auth0 structure
  await knex.schema.createTable("users", (table) => {
    table.string("sub").primary(); // Auth0 user ID (e.g., "auth0|1234567890")
    table.string("email").notNullable().unique();
    table.string("name"); // Full name from Auth0
    table.string("nickname"); // Username/nickname from Auth0
    table.string("picture"); // Profile picture URL from Auth0
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(["email"], "users_email_idx");
    table.index(["created_at"], "users_created_at_idx");
  });

  // Recreate game_scores table with proper foreign key
  await knex.schema.createTable("game_scores", (table) => {
    table.text("game_id").notNullable();
    table.string("player_id").notNullable(); // Now references users.sub
    table.text("display_name"); // Optional display name for the game
    table.integer("score").notNullable().defaultTo(0);

    table.primary(["game_id", "player_id"]);
    table.foreign("game_id").references("games.id").onDelete("CASCADE");
    table.foreign("player_id").references("users.sub").onDelete("CASCADE");

    table.index(["game_id"], "game_scores_game_id_idx");
    table.index(["player_id"], "game_scores_player_id_idx");
  });
}

export async function down(knex) {
  // Drop foreign key constraints first
  await knex.schema.alterTable("game_scores", (table) => {
    table.dropForeign(["game_id"]);
    table.dropForeign(["player_id"]);
  });

  // Drop tables
  await knex.schema.dropTableIfExists("game_scores");
  await knex.schema.dropTableIfExists("users");

  // Recreate original users table
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("email").notNullable().unique();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // Recreate original game_scores table
  await knex.schema.createTable("game_scores", (table) => {
    table.text("game_id").notNullable();
    table.text("player_id").notNullable();
    table.text("display_name");
    table.integer("score").notNullable().defaultTo(0);

    table.primary(["game_id", "player_id"]);
    table.foreign("game_id").references("games.id").onDelete("CASCADE");

    table.index(["game_id"], "game_scores_game_id_idx");
  });
}
