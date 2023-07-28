const path = require("path");
const fs = require("fs");

if (process.argv.indexOf("-u") === -1 || process.argv.indexOf("-m") === -1) {
    console.error("Expected '-u' flag for .zip url, and '-m' for short update message");
    process.exit();
}

const url = process.argv[process.argv.indexOf("-u") + 1];
const note = process.argv[process.argv.indexOf("-m") + 1];

if (note === "") {
    console.error("Provide a note for the version declaration");
    process.exit();
}

const packageJson = require("../package.json");
const baseBundlePath = path.resolve(__dirname, "..\\src-tauri\\target\\release\\bundle\\msi");

const dirs = fs.readdirSync(baseBundlePath);
const sigFile = dirs.find(x => x.includes(packageJson.version) && x.endsWith(".sig"));

const sigContents = fs.readFileSync(path.join(baseBundlePath, sigFile), "utf8");

const tauriVersionDecl = {
    "version": "v" + packageJson.version,
    "notes": note,
    "pub_date": new Date().toISOString(),
    "platforms": {
        "windows-x86_64": {
            "signature": sigContents,
            "url": url
        }
    }
};

fs.writeFileSync(path.resolve(__dirname, "./launcher_version.json"), JSON.stringify(tauriVersionDecl, undefined, 4), "utf8");