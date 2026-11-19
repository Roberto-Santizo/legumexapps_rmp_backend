const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const projectRoot = path.resolve(__dirname, "..")
const output = path.resolve(projectRoot, "dist")
if (path.relative(projectRoot, output) !== "dist") throw new Error("Directorio de compilación inválido")
fs.rmSync(output, { recursive: true, force: true })
const result = spawnSync(process.execPath, [require.resolve("typescript/bin/tsc"), "-p", "tsconfig.build.json"], {
    cwd: projectRoot,
    stdio: "inherit",
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
