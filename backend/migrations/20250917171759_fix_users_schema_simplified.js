/**
 * Simplifies users table to only essential fields
 * - Removes unnecessary Auth0 fields (name, nickname, picture)
 * - Adds user-editable fields (display_name, profile_picture)
 * - Keeps only sub, email, and game tracking fields
 */

export async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    // Remove unnecessary Auth0 fields
    table.dropColumn("name");
    table.dropColumn("nickname");
    table.dropColumn("picture");

    // Add user-editable fields
    table.string("display_name").notNullable();
    table.string("profile_picture").notNullable();

    // Add indexes for performance
    table.index(["display_name"], "users_display_name_idx");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("users", (table) => {
    // Remove user-editable fields
    table.dropIndex(["display_name"], "users_display_name_idx");
    table.dropColumn("display_name");
    table.dropColumn("profile_picture");

    // Restore Auth0 fields
    table.string("name");
    table.string("nickname");
    table.string("picture");
  });
}
