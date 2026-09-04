# vim-todo

A tiny todo list that lives in your tray. Press a keyboard shortcut, it pops open centered on your current screen, you manage tasks with vim-style keys, and it hides itself again. Nothing else.

## Requirements

- Node.js 18 or newer
- pnpm

## Setup

```
pnpm install
pnpm start
```

The app has no window frame, no dock icon, and no menu bar. It runs quietly in the background and opens on demand.

## Opening the app

Default shortcut: `Control + Space`

Press it again, or press `Escape`, to hide the window.

You can change the shortcut at any time by clicking the gear icon in the title bar, pressing your new key combination, and saving.

## Keybinds

| Key | Action |
| --- | --- |
| `j` / `l` | Move selection down |
| `k` / `h` | Move selection up |
| `space` | Toggle the selected task done / not done |
| `i` | Insert a new task below the selected one |
| `e` | Edit the selected task |
| `d` `d` | Delete the selected task (press twice to confirm) |
| `s` | Resort: move completed tasks to the bottom |
| `q` `q` | Quit the app (press twice to confirm) |
| `Escape` | Hide the window |

While inserting or editing, `Enter` saves and `Escape` cancels.

## Data

Tasks and your chosen shortcut are saved automatically to disk and persist between restarts. No account, no sync, no network access required.

## Building an installable app

```
pnpm run dist:mac
pnpm run dist:win
pnpm run dist:linux
```

The packaged app is written to the `release/` folder.
