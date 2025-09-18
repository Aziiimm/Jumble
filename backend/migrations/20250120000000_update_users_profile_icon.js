/**
 * Updates users table to use profile icon numbers instead of profile picture URLs
 * - Changes profile_picture column to profile_icon (integer 1-8)
 * - Sets default value to random icon (1-8) for existing users
 * - Adds constraint to ensure icon numbers are between 1 and 8
 */

export async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    // Drop the old profile_picture column
    table.dropColumn("profile_picture");

    // Add new profile_icon column with constraint
    table.integer("profile_icon").notNullable().defaultTo(1);
  });

  // Add check constraint to ensure icon numbers are between 1 and 8
  await knex.raw(`
    ALTER TABLE users 
    ADD CONSTRAINT check_profile_icon_range 
    CHECK (profile_icon >= 1 AND profile_icon <= 8)
  `);

  // Update existing users with random icon numbers (1-8)
  await knex.raw(`
    UPDATE users 
    SET profile_icon = FLOOR(RANDOM() * 8) + 1
    WHERE profile_icon = 1
  `);
}

export async function down(knex) {
  // Remove the check constraint
  await knex.raw(`
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS check_profile_icon_range
  `);

  await knex.schema.alterTable("users", (table) => {
    // Drop the profile_icon column
    table.dropColumn("profile_icon");

    // Restore the profile_picture column
    table
      .string("profile_picture")
      .notNullable()
      .defaultTo("/default_profile.png");
  });
}
