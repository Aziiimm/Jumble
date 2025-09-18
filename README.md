# Jumble 🎮

## Project Scope

Jumble is a party game web app. The goal is to let people play casual games in real time with friends/AI (similar to jackbox/gamepigeon/jklm). The first game will be called **Word Hunter** (based on Word Hunt from gamepigeon). It will support up to 8 players per room for multiplayer, and track wins with a leaderboard system.

Frontend will be built using React, Tailwind, TypeScript, shadcn/ui. Scaffolding has already been done.

Backend will be built using Node, Database will use PostgreSQL, hosted on AWS RDS in prod. Aiming to use AWS S3 for uplaods, and possibly EC2 for hosting. Docker, Redis, Websockets will be used. Auth method has yet to be decided.

Multiplayer will work via room codes (user creates a room, gets a code, others join using it). Leaderboard tracks all-time wins. AI opponent will be require training a ML model (down the line).

Goal is to make a solid base for more games to be added later.

## To Dos:

- [ ] Change audio for successful input
- [ ] Adjust Letter Frequency
- [ ] Add Google Analytics
- [ ] Add CI/CD pipeline
