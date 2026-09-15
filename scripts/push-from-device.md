# How code gets to GitHub (internal note)

The cloud workspace cannot authenticate to GitHub with Chuck's token (the
egress proxy swaps in Claude's own GitHub identity). Pushes therefore run on
Chuck's computer via device_bash:

1. In the cloud: `zip -qr /mnt/user-data/outputs/isw-scheduler-repo.zip . -x "node_modules/*" "dist/*" ".env.local" "screenshots/*"`
2. `device_commit_files` the zip to `C:\Users\chuck\Documents\ISW Scheduler\isw-scheduler-repo.zip`
3. On the device (deletes are NOT allowed under mnt/, so work in $HOME):
   `rm -rf $HOME/isw && mkdir $HOME/isw && cd $HOME/isw && unzip -qo "$HOME/mnt/Documents/ISW Scheduler/isw-scheduler-repo.zip" && git push --force "https://indwreck:$TOKEN@github.com/indwreck/isw-scheduler.git" main`
   (force is fine — the cloud repo is the source of truth and only Claude pushes.)
4. Push to `main` triggers `.github/workflows/deploy.yml` → https://indwreck.github.io/isw-scheduler/

Token: fine-grained PAT "ISW Scheduler" (Contents/Pages/Variables/Workflows RW, no Administration/Actions), expires 2026-12-14. Stored in the cloud at /home/claude/.isw-gh-token (not in the repo).
Repo variables set: VITE_BASE, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
