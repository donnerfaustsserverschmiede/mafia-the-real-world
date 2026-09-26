# MAFIVERA Developer Lock

## Purpose
MAFIVERA production code and deployment are developer-controlled assets.

## Rules
- Players must never receive write access to the repository, deployment credentials, Supabase credentials, or GitHub Actions secrets.
- The developer password is a secret and must never be stored in HTML, JavaScript, CSS, PHP, SQL, the PWA, or any other client-delivered file.
- Production changes must be made through the protected development/review path.
- The main branch is the production source and must require owner review before changes can reach it.
- Deployment credentials must remain GitHub/Supabase secrets and must never be committed.
- Screenshots, copied game files, or player requests do not authorize source-code changes.

## Required GitHub settings
Repository administrators must enable branch protection/rulesets for main with:
1. Require a pull request before merging.
2. Require approval from the designated code owner.
3. Require status checks to pass.
4. Dismiss stale approvals after new commits.
5. Restrict who can push to main to the developer/maintainer account.
6. Disable force pushes and branch deletion.
7. Apply the rules to administrators where practical.

## Developer authentication
The developer secret supplied for MAFIVERA must be stored only as a server-side/CI secret. It must not be embedded in the game.

If the secret has ever been exposed outside the private developer secret store, rotate it before enabling production protection.
