// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { execSync } = require("child_process");
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const BASE_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR);
}

app.post("/create", async function (req, res) {
  const { repoUrl } = req.body;
  console.log(repoUrl);

  if (!repoUrl) {
    return res.status(400).json({ error: "Missing repoUrl in request body" });
  }

  const repoNameMatch = repoUrl.match(/\/([^\/]+)\.git$/);
  if (!repoNameMatch) {
    return res.status(400).json({ error: "Invalid repoUrl format" });
  }

  const repoName = repoNameMatch[1];
  const projectPath = path.join(BASE_DIR, repoName);

  try {
    // 🔄 Step 1: Clone the repo
    console.log("📥 Cloning repo...");
    execSync(`git clone ${repoUrl}`, {
      cwd: BASE_DIR,
      stdio: "inherit",
    });

    // ⚛️ Step 2: Create React app inside cloned folder
    console.log("⚛️ Installing React app in cloned repo...");
    execSync(`npx create-react-app .`, {
      cwd: projectPath,
      stdio: "inherit",
    });

    // 📄 Step 2.1: Create .gitignore
    console.log("📄 Creating .gitignore...");
    fs.writeFileSync(path.join(projectPath, ".gitignore"), "/node_modules\n", "utf8");

    // 🗑️ Step 2.5: Remove node_modules before commit
    console.log("🧼 Removing node_modules before commit...");
    execSync("rm -rf node_modules", { cwd: projectPath });

    // 🔑 ✅ Step 2.6: Set remote URL with token again before push
 
    console.log("🔑 Resetting origin with token-authenticated URL...");
    execSync(`git remote set-url origin ${repoUrl}`, {
      cwd: projectPath,
      stdio: "inherit",
    });

    // ✅ Step 3: Commit and push
    console.log("🚀 Pushing React app to GitHub...");
    execSync("git add .", { cwd: projectPath });
    execSync(`git commit -m "Add React app from EC2"`, { cwd: projectPath });
    execSync("git push", { cwd: projectPath });

    // 🧹 Step 4: Cleanup
    console.log("🧹 Cleaning up temp folder...");
    fs.rmSync(projectPath, { recursive: true, force: true });

    res.status(200).json({ success: true, message: "React app created and pushed to GitHub." });
  } catch (err) {
    console.error("❌ Error:", err.message);

    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }

    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(8000, () => console.log('server running on http://localhost:8000'));
