# Exercise Editor

Local web tool for editing the `exercises_master.xlsx` spreadsheet — muscle mappings, metadata, and video preview.

## Prerequisites

- **Node.js** (v18 or later)
- **npm** (comes with Node.js)
- The `exercises_master.xlsx` file inside your assets folder (e.g. `assets/data/`)

## Setup

Install dependencies (only needed once, or after pulling new changes):

```bash
cd .exercise-editor
npm install
```

## Start the server

```bash
npm start
```

The editor opens at **http://localhost:3333**.

On first load you'll be prompted to set the assets folder path — point it to the directory containing `exercises_master.xlsx`.

## Stop the server

Press **Ctrl+C** in the terminal where the server is running.
