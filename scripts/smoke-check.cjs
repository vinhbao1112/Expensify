const fs = require("fs")
const path = require("path")
const vm = require("vm")
const assert = require("assert")
const ts = require("typescript")

const rootDir = path.resolve(__dirname, "..")
const moduleCache = new Map()

function resolveModule(fromFile, request) {
  if (!request.startsWith(".")) return request
  const candidate = path.resolve(path.dirname(fromFile), request)
  const withTs = `${candidate}.ts`
  const withTsx = `${candidate}.tsx`
  const withJs = `${candidate}.js`

  if (fs.existsSync(candidate)) return candidate
  if (fs.existsSync(withTs)) return withTs
  if (fs.existsSync(withTsx)) return withTsx
  if (fs.existsSync(withJs)) return withJs
  return candidate
}

function loadTsModule(filePath) {
  const absolutePath = path.resolve(rootDir, filePath)
  if (moduleCache.has(absolutePath)) {
    return moduleCache.get(absolutePath)
  }

  const source = fs.readFileSync(absolutePath, "utf8")
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: absolutePath,
  }).outputText

  const module = { exports: {} }
  moduleCache.set(absolutePath, module.exports)

  const localRequire = (request) => {
    if (!request.startsWith(".")) {
      return require(request)
    }
    const resolved = resolveModule(absolutePath, request)
    if (resolved.endsWith(".ts") || resolved.endsWith(".tsx") || resolved.endsWith(".js")) {
      const relative = path.relative(rootDir, resolved)
      return loadTsModule(relative)
    }
    return require(resolved)
  }

  const script = new vm.Script(transpiled, { filename: absolutePath })
  const context = vm.createContext({
    require: localRequire,
    module,
    exports: module.exports,
    __dirname: path.dirname(absolutePath),
    __filename: absolutePath,
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    global,
    URL,
    Blob,
  })

  script.runInContext(context)
  moduleCache.set(absolutePath, module.exports)
  return module.exports
}

function run() {
  const automation = loadTsModule("lib/automation.ts")
  const backup = loadTsModule("lib/backup.ts")

  const demo = automation.createDemoTransactions("2026-06")
  assert.ok(Array.isArray(demo), "demo transactions should be an array")
  assert.ok(demo.length >= 4, "demo transactions should include sample rows")
  assert.strictEqual(demo[0].createdBy, undefined)

  const forecast = automation.forecastMonth(demo, "2026-06")
  assert.ok(Number.isFinite(forecast.projectedBalance), "forecast balance should be numeric")
  assert.ok(forecast.daysInMonth >= forecast.daysElapsed, "days in month should be valid")

  const snapshot = backup.buildBackupSnapshot("sheet-1", "06-2026", demo, "test")
  assert.strictEqual(snapshot.version, 1)
  assert.strictEqual(snapshot.transactions.length, demo.length)

  console.log("Smoke check passed")
}

try {
  run()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
