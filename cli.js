if (process.env.HEROKU_TIME_REQUIRE) require('time-require')

const config = require('./lib/config')
if (module.parent) config.init(module.parent)
const version = config.version
const plugins = require('./lib/plugins')
const errors = require('./lib/errors')
let argv = process.argv.slice(2)
argv.unshift(config.bin)

function onexit (options) {
  const ansi = require('ansi-escapes')
  if (process.stderr.isTTY) process.stderr.write(ansi.cursorShow)
  if (options.exit) process.exit(1)
}

process.on('exit', onexit)
process.on('SIGINT', onexit.bind(null, {exit: true}))
process.on('uncaughtException', err => {
  errors.logError(err)
  onexit({exit: true})
})

async function main (c) {
  Object.assign(config, c)
  let command
  try {
    const Update = require('./commands/update')
    const update = new Update({version})
    await update.autoupdate()
    let Command
    command = plugins.commands[argv[1] || config.defaultCommand]
    if (command) Command = command.fetch()
    if (!command) Command = require('./commands/no_command')
    if (!Command._version) {
      // v5 command
      const {convertLegacy} = require('heroku-cli-command')
      Command = convertLegacy(Command)
    }
    command = new Command({argv, version})
    await command.init()
    await command.run()
    await command.done()
    process.exit(0)
  } catch (err) {
    errors.logError(err)
    if (command && command.error) command.error(err)
    else console.error(err)
    process.exit(1)
  }
}

module.exports = main
