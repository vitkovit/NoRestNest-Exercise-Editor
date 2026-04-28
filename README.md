# Exercise Editor

Local web tool for editing the `exercises_master.xlsx` spreadsheet — muscle mappings, metadata, and video preview.

## Prerequisites

- **Node.js** (v18 or later)
- **npm** (comes with Node.js)
- The `exercises_master.xlsx` file in the project root folder

## Setup

Install dependencies (only needed once, or after pulling new changes):

```bash
npm install
```

## Start the server

```bash
npm start
```

The editor opens at **http://localhost:3333**.

On first load you'll be prompted to set the video folder path — point it to the directory containing your `male/`, `female/`, and `universal/` video subfolders (e.g. `assets/video`). 
This is only needed for video previews; exercises load from `exercises_master.xlsx` in the project root automatically.

## Stop the server

Press **Ctrl+C** in the terminal where the server is running.
