# Push to GitHub

## 1. Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new **public** repository named `rideshare-pk` (or your preferred name)
3. **Do NOT** initialize with README, .gitignore, or license (we already have them)
4. Copy the repository URL (HTTPS or SSH)

## 2. Add Remote & Push

```bash
cd "C:\Users\ab158\Downloads\Uber Clone"

# Add the GitHub repo as remote (replace URL below)
git remote add origin https://github.com/YOUR_USERNAME/rideshare-pk.git

# Push to main branch
git branch -M main
git push -u origin main
```

**If you get an error:**
- **SSH key not found**: Use HTTPS instead of SSH, or [set up SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- **Auth failed**: Generate a [Personal Access Token](https://github.com/settings/tokens) and use it as the password

## 3. Verify

Visit `https://github.com/YOUR_USERNAME/rideshare-pk` — you should see:
- ✅ Initial commit (Uber-style app with Clerk)
- ✅ Second commit (README + UI cleanup)
- ✅ All source files (packages/, server/, web/)
- ✅ README.md with features & setup instructions
- ✅ CLAUDE.md for future AI assistants

## 4. Optional: Add GitHub Badges (README)

Add to the top of README.md:
```markdown
[![Node.js CI](https://github.com/YOUR_USERNAME/rideshare-pk/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/rideshare-pk/actions)
```

## 5. Share Your Repo

You're now ready to share the link:
- **Pitch**: Share with investors / stakeholders
- **Portfolio**: Add to resume / LinkedIn
- **Collaboration**: Invite others as contributors
