# ASPPM: Automated Supplier Performance & Price Monitoring

Supplier scorecards, material price tracking, purchase-order analytics and alerts for IPI.
Node.js + Express + Prisma + PostgreSQL, with a React (Vite + Tailwind) browser app. Built for Cloud Run and Cloud SQL, following the same layered structure as the IOVDIP project.

## What it does

| Area | Pages |
|---|---|
| Suppliers | list, performance scorecards, ranking, comparison |
| Materials | catalog, price monitoring, price trends, supplier price comparison |
| Purchasing | purchase orders, spend analytics |
| Analytics | supplier analytics, price analytics, what-if simulator |
| Data | CSV import (suppliers, materials, purchase orders), import history, data quality |
| Alerts & reports | rule-based alerts, executive reports |
| Admin | users, audit log, scoring weights and thresholds, alert rules, backup and restore |

**Scoring.** Each supplier gets a delivery, quality and price score from its purchase orders, plus responsiveness and compliance scores. The weights (default 30/30/20/10/10) are set in System Settings. Changing them rescores every supplier. Rating tiers: Excellent 90+, Good 80+, Satisfactory 70+, Needs improvement 60+, Poor below 60.

**Saving a purchase order** does all of this in one database transaction: derives the total and rejection rate, records the price movement against the material's previous price, updates the material price, rescores the supplier, and raises alerts (price spike, high rejection).

## Install and run

This is the **only** section you need to get ASPPM running. It starts from a blank computer, and you can run it again at any time: every step checks whether it is already done and skips itself, so a second run never breaks anything.

### What you will end up with

Node.js, PostgreSQL, the project's libraries, a private `.env` settings file (with a random secret key generated for you), a database with its tables, optional demo data, and the built website, ready to start.

### Windows

**1. Get the project.** Pick one:

- **No Git needed:** on the GitHub page click **Code → Download ZIP**, then right-click the ZIP and choose **Extract All**.
- **With Git:** `git clone https://github.com/IPI-MIS-Vibecoding/ASPPM.git`

**2. Open PowerShell inside the project folder.** In File Explorer, open the `ASPPM` folder (the one that contains `package.json`), click the address bar at the top, type `powershell` and press Enter. The window shows `PS C:\...\ASPPM>`.

> It must be **PowerShell** (`PS` at the start of the line), not Command Prompt.

**3. Run the installer.** Copy this line into the window and press Enter:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

The installer does everything and asks only what it must. Answer like this:

| It asks | What to do |
|---|---|
| `Node.js 20 or newer is not installed. Install it now? [Y/n]` | Press Enter. (Skipped if you already have Node 20+) |
| `PostgreSQL is not installed. Install it now? [Y/n]` | Press Enter. (Skipped if PostgreSQL is already installed) |
| `Administrator password` (only for a new PostgreSQL install) | Choose a password with letters and digits only, at least 8 characters, and **write it down**. It becomes the password of the database administrator (`postgres`) |
| `Database user [asppm_app]` | Press Enter |
| `Choose a password for that database user` | Type a new password and write it down. You will not see it as you type. It is **not** the administrator password above |
| `Database name [asppm]`, `PostgreSQL port [5432]` | Press Enter for both |
| `Port for the website [8080]` | Press Enter. If something else on your computer uses 8080, type `8091` |
| `First administrator email [admin@ipi.ph]` | Press Enter, or type yours |
| `Temporary password for that administrator` | At least 6 characters, with letters and a number, for example `Sunrise2026`. You must change it the first time you sign in |
| `Administrator user [postgres]` and `Administrator password` (only if PostgreSQL was already installed) | Press Enter, then type the administrator password you chose when you installed PostgreSQL |
| `Load demo data and four demo accounts? [Y/n]` | Press Enter to try the system out with sample data. Type `n` to start empty |

Windows may show a "Do you want to allow this app to make changes?" box while installing Node.js or PostgreSQL. Click **Yes**.

When it prints `All done`, continue with step 4. If it stops with an error, read the message, fix what it says (see **If something goes wrong** below), and run the same command again.

**4. Start the app.**

```powershell
npm run dev
```

Wait for `Listening on port 8080` (or your port) and **leave the window open**: closing it stops the app. Open **http://localhost:8080** in your browser (use your port if you changed it). To stop the app press **Ctrl + C** in that window. To start it again another day, open PowerShell in the project folder and run `npm run dev` again.

### macOS and Linux

Install the tools once, then one command does the rest.

```bash
# macOS (Homebrew)
brew install node@22 postgresql@16 && brew services start postgresql@16

# Debian / Ubuntu
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'choose-an-admin-password';"
```

Then, in the project folder:

```bash
npm install
npm run setup
```

`npm run setup` asks the same questions as the table above (it does not ask to install anything). Start the app with `npm run dev`.

### Running the installer again

Run it again whenever you like, for example after an error, after updating the code, or on a half-finished install. Each step is checked first:

| Step | If it is already done |
|---|---|
| Node.js and PostgreSQL | Detected and skipped. A stopped PostgreSQL service is started |
| Project libraries and database client | Refreshed (harmless) |
| `.env` file | Kept as it is. To redo it: `npm run setup:env -- --force` |
| Database and database user | Skipped, or repaired if the user's password no longer matches `.env` |
| Tables | Only new changes are applied |
| Demo data | Never loaded twice: skipped when the database already has data |
| Website build | Rebuilt |

Useful options (run in the project folder):

```powershell
npm run setup -- --demo        # load demo data without asking (only into an empty database)
npm run setup -- --no-demo     # never load demo data
npm run secret                 # print a new random SESSION_SECRET to paste into .env
```

### Sign in

**With the demo data:**

| Role | Email | Password | Can do |
|---|---|---|---|
| Purchasing Manager | purchasing.manager@ipi.ph | manager@2026 | View everything, sign off alerts, change scoring weights |
| Purchasing Asst. Manager | assistant.manager@ipi.ph | asst.mgr@2026 | View everything, investigate alerts, read audit logs |
| Purchasing Analyst | purchasing.analyst@ipi.ph | analyst@2026 | Edit suppliers, materials and purchase orders, import CSV data |
| System Admin | admin.procure@ipi.ph | admin@ipi2026 | Everything, plus users, backup and restore |

**Started empty:** sign in with the administrator email and temporary password you gave the installer. The app asks you to choose your own password straight away.

**Add more people:** sign in as an administrator, open **Administration → Users → Create Authorized User**. The app shows a temporary password once; give it to the person and they choose their own at first sign-in.

> The demo passwords are public. Use the demo data only on your own computer, and never run `npm run seed:demo` against a shared or production database.

### If something goes wrong

Fix the cause, then run the installer again. It carries on from where it stopped.

| What you see | What to do |
|---|---|
| `winget is not available` | Install Node.js and PostgreSQL by hand (see the next section), then run the installer again |
| `running scripts is disabled` | Use the exact command in step 3 (it includes `-ExecutionPolicy Bypass`). For plain `npm` commands run once: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| `node` or `npm` is "not recognized" | You installed it but this window has not seen it yet. Close all PowerShell windows, open a new one in the project folder, run the installer again |
| `Could not sign in to PostgreSQL as "postgres"` | The password is the PostgreSQL **administrator** password, not the database-user password. Check the PostgreSQL service is running: `Get-Service *postgres*` |
| `Authentication failed ... credentials for asppm_app are not valid` | The password in `.env` does not match the database user. Run the installer again: it resets the user's password to the one in `.env` |
| `EADDRINUSE ... port 8080` | Something else uses that port. Open `.env`, change `PORT=8080` to `PORT=8091`, restart, and open http://localhost:8091 |
| `npm install` runs out of memory | Run `$env:NODE_OPTIONS="--max-old-space-size=4096"` and then the installer again |
| `Cannot find module '.prisma/client'` or `The database client has not been generated yet` | Run `npm run db:generate`, or the installer again |
| The page is blank or looks old | Run `npm run build`, restart `npm run dev`, then press **Ctrl + F5** in the browser |
| `There are no users yet and ADMIN_PASSWORD is not set` | Open `.env`, fill in `ADMIN_PASSWORD`, restart |
| An account is locked | After 5 wrong passwords it locks for 15 minutes. An administrator can reset the password under **Users** |
| You want to reset the demo data | Stop the app and run `npm run seed:demo`. It replaces all business data |

### Installing the tools by hand

Only needed if the installer cannot do it (for example `winget` is missing).

- **Node.js:** download the **LTS** installer from https://nodejs.org, run it and accept the defaults. Then **open a new PowerShell** and check `node -v` shows v20 or higher.
- **PostgreSQL:** download version 16, 17 or 18 for Windows from https://www.postgresql.org/download/windows/, run it and keep the defaults (port 5432). When asked for the password of the `postgres` superuser, choose one and write it down. Check the service with `Get-Service *postgres*` (Status: Running).
- **Git (optional):** only needed for `git clone` or `git pull`. Download from https://git-scm.com/download/win.

After that, run the installer (step 3).

### Optional: edit the website with live reload

Open **two** PowerShell windows in the project folder. In the first run `npm run dev`. In the second run `npm run web`, then open http://localhost:5173. Edits to files in `web/` appear straight away. If your server is not on port 8080, start the second one like this (use your port):

```powershell
$env:API_URL="http://localhost:8091"; npm run web
```

## Loading ERP exports (Indirect PO)

Save the ERP export (`IndirectPO_Export.csv`, same columns as `data/erp_po_dump.csv`) in **`data/erp_inbox/`**, then run:

```powershell
npm run import:erp -- --dry-run   # report only: what is new, what is already there, which rows are bad
npm run import:erp                # import every .csv in data/erp_inbox/
```

Each file is moved to `data/erp_inbox/processed/` once it has been imported; a file that fails stays in the inbox. The inbox is git-ignored, so real exports are never committed. `--file C:\path\export.csv` imports one file from anywhere.

Real exports are large (the 2024-2026 file has about 49,000 lines), and the app sends every purchase order to the browser in one answer, so choose how much goes into the app pages:

```powershell
npm run import:erp -- --since 2026-01-01   # every valid line is kept raw; only lines from that date become suppliers, materials and POs
```

Without `--since` the importer refuses to load more than 25,000 POs into the app (`--force-large` overrides). The date can be moved earlier later: older lines are already in `erp_purchase_orders`, and POs that exist are skipped.

It is additive and safe to run twice. Nothing is deleted:

| Goes to | Rule |
|---|---|
| `erp_purchase_orders` | Every valid line as exported, whatever its date. Same document + item again = that row is replaced |
| Suppliers, materials | Created when the supplier code / material code is new; existing ones are left alone |
| Purchase orders | New ones are inserted in bulk, oldest first: price history and material prices update like a normal PO, and supplier scores are recalculated once at the end. A PO number already in the system is skipped |

Unlike saving one PO in the app, the bulk import writes one audit entry for the whole file and raises **no alerts** (a backfill would flood the list with old price spikes). Run **Alerts → Scan** in the app afterwards.

The export has no delivery or inspection results, so imported POs start as `PENDING` and do not affect delivery or quality scores until that data is entered. Unit price is the export's Gross Unit Price (Net Price if gross is empty). A line without a SAP material number gets a code from its material group plus a hash of its full description, so different items never merge (case, spacing and punctuation are ignored).

**In the cloud** the same script runs as the Cloud Run job `asppm-import`. It reads CSVs from `$DATA_DIR/erp_inbox` (the mounted bucket `vibe-coding-510806-asppm-data`) and moves them to `processed/` when done. Update its arguments to choose a dry run or the real import.

`npm run seed:erp` loads the sample file `data/erp_po_dump.csv` the same way. `scripts/import_erp_data.js` is the older one-time loader: it **wipes all business data** and rewrites `server/seed/data.json`, so do not use it for routine loads.

## Tests

```
npm test                                            # business rules (no database needed)
SMOKE_URL=http://localhost:8080 npm test            # also the API checks, against a running server with the demo data
```

The API checks change data (they add a PO, lock an account), so run `npm run seed:demo` afterwards.

## The server

`server.js` starts the app; everything else is in `server/`, in layers that each call only the one below:

| Folder | Job |
|---|---|
| `routes/` | Read the request, check the role's permission, send the response. `api.js` (data) and `auth.js` (sign-in and users) |
| `services/` | One use case each: save a purchase order, scan for alerts, change settings. They open the transactions and write the audit trail |
| `domain/` | Pure business rules with no database: scoring, price classification, alert rules, permissions |
| `queries/` | All the Prisma calls, one file per area |
| `middleware/` | Security headers, reading the session, requiring sign-in and permissions |
| `lib/` | Helpers: passwords, session cookie, HTTP errors, row/JSON conversion |
| `seed/` | The demo data set and the loader shared by the seed, "reset" and restore |

To change a rule, look in `domain/`; to change what a use case does, `services/`; to change what is read, `queries/`.

### The browser app

`web/src/` is the React app. `services/db.ts` (`dbService`) is its only door to the data: it keeps the last answer from `GET /api/snapshot` so pages can read it straight away, sends every change to the server, then refreshes. `context/AuthContext.tsx` handles the session; `lib/api.ts` makes the calls.

## Sign-in and roles

- Everyone signs in with email and password. Accounts are rows in the `users` table; passwords are salted scrypt hashes. After 5 wrong tries an account locks for 15 minutes. Sessions last 8 hours (httpOnly signed cookie) and end when a password changes or an account is deactivated.
- The server checks the role's permission on every route (`server/domain/permissions.js`). The browser only uses the list to hide buttons.
- A new or reset account must choose its own password at first sign-in. Password rules are in `server/lib/passwords.js`; the "Choose your password" page ticks them off live.
- **First administrator:** when there are no users, the app creates one from `ADMIN_EMAIL` (default `admin@ipi.ph`) and `ADMIN_PASSWORD`. It must change that password at first sign-in.
- **Adding people:** an administrator opens Users, enters name, email and role, and gives the person the generated temporary password (shown once). The same page resets passwords and suspends accounts.
- `SESSION_SECRET` signs the cookie and is required in production. In the cloud it comes from Secret Manager.
- Not built yet: password reset by email, two-step verification, single sign-on.

## Database

Schema: `prisma/schema.prisma`, tables `users`, `suppliers`, `materials`, `purchase_transactions`, `price_history`, `alerts`, `data_imports`, `audit_logs`, `system_settings`.

- Purchase orders point to a supplier and a material with `ON DELETE RESTRICT`. A supplier or material that has orders is deactivated instead of deleted, so history is never orphaned.
- Dates are real `DATE` columns, money is `DECIMAL`. The API still sends numbers and `YYYY-MM-DD` strings (`server/lib/serialize.js`).
- Scores on a supplier are computed. An edit from the browser cannot overwrite them.
- Backups (System Settings) contain business data only, never user accounts.

### Changing the database

1. Edit `prisma/schema.prisma`.
2. `npm run db:diff` prints the SQL. Save it as a new folder such as `prisma/migrations/20261101000000_add_something/migration.sql`.
3. Read it, then `npm run migrate`. `npm run db:status` shows whether the database is up to date.
4. Commit the schema and the migration together. Never edit a migration that has been applied.

The migrations also run by themselves each time the container starts. Prisma cannot express CHECK rules; they are written by hand at the end of the first migration.

## Deploy

The Dockerfile builds the React app, installs the server, generates the Prisma client, and starts with migrations. The GitHub Action in `.github/workflows/deploy.yml` deploys to Cloud Run through Workload Identity (no key file). Configure the repository variables listed at its top, and give the service `DATABASE_URL` (Cloud SQL socket), `SESSION_SECRET` and `ADMIN_PASSWORD` from Secret Manager.

## API

All routes need a session. `GET /api/snapshot` returns everything the role may see. Changes: `POST/PUT /api/suppliers|materials|purchases`, `POST /api/{suppliers|materials|purchases}/bulk` (imports), `DELETE /api/suppliers|materials/:id`, `PATCH /api/alerts/:id`, `POST /api/alerts/scan`, `POST /api/scoring/recalculate`, `PUT /api/settings`, `POST /api/imports`, `GET /api/audit-logs`, `GET /api/system/export`, `POST /api/system/import|reset`. Sign-in and users are under `/auth`.
