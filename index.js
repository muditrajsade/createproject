// server/index.js
const express = require('express');

const cors = require('cors');
const path = require('path');
const { execSync } = require("child_process");

const app = express();

let bodyParser = require('body-parser');

let fs = require('fs');
app.use(
    cors({
        origin: '*',
    })
);

app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));

const BASE_DIR = path.join(__dirname, "tmp");

if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR);
}
app.post("/create", async function (req, res) {
  const { repoUrl } = req.body;

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
    // Step 1: Clone the repo
    console.log("📥 Cloning repo...");
    execSync(`git clone ${repoUrl}`, {
      cwd: BASE_DIR,
      stdio: "inherit",
    });

    // Step 2: Create React app *inside the cloned folder*
    console.log("⚛️ Creating React app in cloned repo...");
    execSync(`npx create-react-app .`, {
      cwd: projectPath, // creates React in-place
      stdio: "inherit",
    });

    // Step 3: Git commit & push
    console.log("🚀 Pushing React app to GitHub...");
    execSync("git add .", { cwd: projectPath });
    execSync(`git commit -m "Add React app from EC2"`, { cwd: projectPath });
    execSync("git push", { cwd: projectPath });

    // Step 4: Cleanup
    console.log("🧹 Cleaning up...");
    fs.rmSync(projectPath, { recursive: true, force: true });

    res.status(200).json({ success: true, message: "React app created inside cloned repo and pushed." });
  } catch (err) {
    console.error("❌ Error:", err.message);

    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }

    res.status(500).json({ success: false, error: err.message });
  }
});


app.listen(8000, () => console.log('server running on http://localhost:8000'));
